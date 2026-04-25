from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import Field

from app.schemas.common import APIModel


AudioFormat = Literal["mp3", "wav", "aac"]


class GenerateBackgroundRequest(APIModel):
    user_id: UUID
    moment_id: UUID | None = None
    prompt: str = Field(min_length=4, max_length=2000)
    size: str = Field(default="1536x1024")


class GenerateBackgroundResponse(APIModel):
    job_id: UUID
    status: str
    image_b64: str | None = None
    mime_type: str | None = None
    result_url: str | None = None


class GenerateVoiceRequest(APIModel):
    user_id: UUID
    moment_id: UUID | None = None
    text: str = Field(min_length=1, max_length=5000)
    voice: str = Field(default="alloy", max_length=40)
    format: AudioFormat = "mp3"


class GenerateVoiceResponse(APIModel):
    job_id: UUID
    status: str
    audio_b64: str | None = None
    mime_type: str | None = None
    result_url: str | None = None
