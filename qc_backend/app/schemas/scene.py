from __future__ import annotations

from uuid import UUID

from pydantic import Field

from app.schemas.common import APIModel


class SceneRenderRequest(APIModel):
    user_id: UUID
    moment_id: UUID | None = None
    message: str = Field(min_length=1, max_length=8000)
    tone: str | None = None
    reveal_style: str | None = None


class TimedTextBlock(APIModel):
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)
    text: str


class RenderableSceneResponse(APIModel):
    scene_title: str
    background_prompt: str
    animation_preset: str
    voiceover: str | None = None
    timed_text_blocks: list[TimedTextBlock]
    reveal_sequence: list[str]
    audio_mood: str
    end_state: str
