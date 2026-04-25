import base64
import json
import os
import urllib.error
import urllib.parse
import urllib.request

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST


def _env_enabled(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _send_sms_via_twilio(*, to: str, body: str) -> str:
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_FROM_NUMBER")

    if not account_sid or not auth_token or not from_number:
        raise ValueError("Missing Twilio environment variables.")

    payload = urllib.parse.urlencode(
        {
            "To": to,
            "From": from_number,
            "Body": body,
        }
    ).encode("utf-8")
    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"

    request = urllib.request.Request(
        url=url,
        data=payload,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    auth = base64.b64encode(f"{account_sid}:{auth_token}".encode("utf-8")).decode("ascii")
    request.add_header("Authorization", f"Basic {auth}")

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Twilio request failed ({error.code}): {details}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Twilio connection failed: {error.reason}") from error

    sid = result.get("sid")
    if not sid:
        raise RuntimeError("Twilio did not return a message SID.")
    return sid


def _build_reveal_url(site_url: str, public_id: str, token: str) -> str:
    base = site_url.rstrip("/")
    return f"{base}/m/{public_id}?t={token}"


@csrf_exempt
@require_POST
def send_moment(request):
    api_token = os.getenv("DJANGO_API_TOKEN", "").strip()
    provided_token = request.headers.get("X-API-Key", "").strip()
    if api_token and api_token != provided_token:
        return JsonResponse(
            {"ok": False, "error": "Unauthorized"},
            status=401,
        )

    try:
        payload = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse(
            {"ok": False, "error": "Invalid JSON payload"},
            status=400,
        )

    recipient_phone = (payload.get("recipient_phone") or "").strip()
    public_id = (payload.get("public_id") or "").strip()
    token = (payload.get("token") or "").strip()
    site_url = (payload.get("site_url") or os.getenv("NEXT_PUBLIC_SITE_URL") or "http://127.0.0.1:3000").strip()

    if not recipient_phone:
        return JsonResponse(
            {"ok": False, "error": "recipient_phone is required"},
            status=400,
        )
    if not public_id:
        return JsonResponse(
            {"ok": False, "error": "public_id is required"},
            status=400,
        )
    if not token:
        return JsonResponse(
            {"ok": False, "error": "token is required"},
            status=400,
        )

    reveal_url = _build_reveal_url(site_url, public_id, token)
    sms_body = payload.get("sms_body")
    if not sms_body:
        sms_body = (
            "You have a QV Moment waiting 💛\n\n"
            f"Tap to reveal:\n{reveal_url}"
        )

    sms_delivery_enabled = _env_enabled("QC_ENABLE_SMS_DELIVERY", default=False)
    if not sms_delivery_enabled:
        return JsonResponse(
            {
                "ok": True,
                "simulated": True,
                "message": "SMS delivery disabled by QC_ENABLE_SMS_DELIVERY.",
                "reveal_url": reveal_url,
            }
        )

    try:
        sid = _send_sms_via_twilio(to=recipient_phone, body=sms_body)
    except (ValueError, RuntimeError) as error:
        return JsonResponse(
            {
                "ok": False,
                "error": str(error),
            },
            status=502,
        )

    return JsonResponse(
        {
            "ok": True,
            "sid": sid,
            "simulated": False,
            "reveal_url": reveal_url,
        }
    )
