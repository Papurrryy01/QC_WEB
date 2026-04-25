from __future__ import annotations

from pydantic import Field

from app.schemas.common import APIModel


class RealtimeSessionRequest(APIModel):
    language_hint: str | None = Field(default=None, max_length=16)
    voice: str | None = Field(default=None, max_length=32)


class RealtimeSessionResponse(APIModel):
    client_secret: str
    expires_at: int | None = None
    model: str
    voice: str
    instructions: str
