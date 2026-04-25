from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import ConfigDict, Field

from app.schemas.common import APIModel, BaseORMModel


MessageRole = Literal["user", "assistant", "system"]
MomentType = Literal["just_because", "birthday", "anniversary"]
ToneType = Literal["tender", "playful", "grateful", "celebratory"]
EmotionTone = Literal["warm", "cool", "neutral", "mixed"]
ResponseType = Literal[
    "conversational_response",
    "structured_builder_response",
    "renderable_scene_response",
]


class DirectionState(APIModel):
    moment_type: MomentType | None = None
    tone: ToneType | None = None
    mood: str | None = None
    intent: str | None = None
    relationship_context: str | None = None
    communication_goal: str | None = None
    suggested_opening: str | None = None
    draft_direction: str | None = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ConversationMessageInput(APIModel):
    role: MessageRole
    content: str = Field(min_length=1, max_length=4000)
    language: str | None = Field(default=None, max_length=16)


class ConversationRequest(APIModel):
    user_id: UUID
    conversation_id: UUID | None = None
    message: str = Field(min_length=1, max_length=4000)
    history: list[ConversationMessageInput] = Field(default_factory=list)
    direction: DirectionState = Field(default_factory=DirectionState)
    mode: str = Field(default="moment_architect", max_length=40)
    language_hint: str | None = Field(default=None, max_length=16)


class ConversationResponse(APIModel):
    assistant_message: str
    direction: DirectionState
    suggested_replies: list[str] = Field(default_factory=list)
    ready_to_proceed: bool = False
    emotional_tone: EmotionTone = "neutral"
    response_type: ResponseType = "conversational_response"


class ConversationCreateRequest(APIModel):
    user_id: UUID
    title: str | None = Field(default=None, max_length=180)
    mode: str = Field(default="moment_architect", max_length=40)


class ConversationSummary(BaseORMModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    id: UUID
    user_id: UUID
    title: str | None = None
    mode: str
    language: str | None = None
    emotion_state: str | None = None
    created_at: datetime
    updated_at: datetime


class ConversationThreadMessage(APIModel):
    id: UUID
    role: MessageRole
    content: str
    language: str | None = None
    created_at: datetime


class ConversationDetail(APIModel):
    conversation: ConversationSummary
    messages: list[ConversationThreadMessage]
