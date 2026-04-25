# Django Moments Delivery Service

This service exposes a Django endpoint used by the Next.js site to send a published moment via SMS.

## Endpoint

- `POST /api/moments/send/`

### JSON body

```json
{
  "recipient_phone": "+15555550123",
  "public_id": "abc123",
  "token": "secure_token",
  "site_url": "http://127.0.0.1:3000",
  "sms_body": "You have a QV Moment waiting ..."
}
```

## Environment Variables

- `DJANGO_SECRET_KEY`: Django secret key.
- `DJANGO_DEBUG`: `true` or `false` (default: `true`).
- `DJANGO_ALLOWED_HOSTS`: comma-separated hosts (default: `127.0.0.1,localhost`).
- `DJANGO_API_TOKEN`: optional shared secret; if set, requests must include `X-API-Key`.
- `QC_ENABLE_SMS_DELIVERY`: set to `true` to actually send SMS.
- `TWILIO_ACCOUNT_SID`: Twilio Account SID.
- `TWILIO_AUTH_TOKEN`: Twilio Auth token.
- `TWILIO_FROM_NUMBER`: Twilio sender number.
- `NEXT_PUBLIC_SITE_URL`: site URL used to generate reveal links.

## Run Locally

From `web/`:

```bash
cd django_backend
cp .env.example .env
set -a
source .env
set +a
python3 -m pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py runserver 127.0.0.1:8001
```

Then set these in `web/.env.local` for Next.js:

```bash
DJANGO_API_BASE_URL=http://127.0.0.1:8001
DJANGO_API_TOKEN=change_me
```
