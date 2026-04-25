from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.conversation import DirectionState
from app.schemas.common import APIModel


class MomentIdeateRequest(APIModel):
    user_id: UUID
    conversation_id: UUID | None = None
    text: str = Field(min_length=1, max_length=6000)
    direction: DirectionState | None = None


class StructuredBuilderResponse(APIModel):
    moment_title: str
    emotional_goal: str
    recipient_type: str
    relationship_context: str
    tone_profile: dict
    suggested_message: str
    variations: list[str]
    reveal_style: str
    reveal_steps: list[str]
    delivery_timing: dict
    background_prompt: str | None = None
    voiceover_script: str | None = None
    animation_preset: str | None = None
    safety_flags: list[str] = Field(default_factory=list)


class MomentRewriteRequest(APIModel):
    user_id: UUID
    moment_id: UUID | None = None
    text: str = Field(min_length=1, max_length=6000)
    target_tone: str | None = Field(default=None, max_length=40)
    intensity: float = Field(default=0.5, ge=0.0, le=1.0)


class MomentRewriteResponse(APIModel):
    rewritten_message: str
    alternatives: list[str]
    preserved_meaning_summary: str
    confidence: float = Field(ge=0.0, le=1.0)


class RevealPlanRequest(APIModel):
    user_id: UUID
    moment_id: UUID | None = None
    message: str = Field(min_length=1, max_length=6000)
    tone: str | None = None


class RevealPlanResponse(APIModel):
    reveal_style: str
    reveal_steps: list[str]
    delivery_timing: dict
    animation_preset: str
    scene_guidance: str


class MomentRecord(APIModel):
    id: UUID
    title: str
    status: str
    scheduled_for: datetime | None = None
