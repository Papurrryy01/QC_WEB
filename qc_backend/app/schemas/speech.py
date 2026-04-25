from __future__ import annotations

from app.schemas.common import APIModel


class TranscriptionResponse(APIModel):
    text: str
    language: str | None = None
    duration_seconds: float | None = None
