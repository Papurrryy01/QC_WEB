from __future__ import annotations

from app.prompts.system import GLOBAL_QC_IDENTITY
from app.schemas.realtime import RealtimeSessionRequest, RealtimeSessionResponse
from app.services.openai_client import openai_service


REALTIME_INSTRUCTIONS = """
You are QC voice presence.
- Speak calmly and concisely.
- Be emotionally aware without being dramatic.
- Preserve user's language (English, Spanish, mixed) naturally.
- Ask at most one question if needed.
- Move toward clarity and shaping quickly.
""".strip()


class RealtimeEngine:
    async def create_session(self, payload: RealtimeSessionRequest) -> RealtimeSessionResponse:
        data = await openai_service.create_realtime_session(
            voice=payload.voice,
            instructions=f"{GLOBAL_QC_IDENTITY}\n\n{REALTIME_INSTRUCTIONS}",
        )

        client_secret = data.get("client_secret", {}) if isinstance(data, dict) else {}
        value = client_secret.get("value") if isinstance(client_secret, dict) else None

        return RealtimeSessionResponse(
            client_secret=value or "",
            expires_at=data.get("expires_at") if isinstance(data, dict) else None,
            model=str(data.get("model") if isinstance(data, dict) else ""),
            voice=str(data.get("voice") if isinstance(data, dict) else payload.voice or "alloy"),
            instructions=REALTIME_INSTRUCTIONS,
        )


realtime_engine = RealtimeEngine()
