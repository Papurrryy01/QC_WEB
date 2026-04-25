from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import MomentStatus


class Moment(TimestampMixin, Base):
    __tablename__ = "moments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="SET NULL"), index=True, nullable=True
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    emotional_goal: Mapped[str | None] = mapped_column(Text, nullable=True)
    recipient_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    relationship_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    tone_profile: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    suggested_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    variations: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    reveal_style: Mapped[str | None] = mapped_column(String(120), nullable=True)
    reveal_steps: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    delivery_timing: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    status: Mapped[MomentStatus] = mapped_column(
        Enum(MomentStatus, name="moment_status"), default=MomentStatus.draft, nullable=False
    )
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="moments")
    conversation = relationship("Conversation", back_populates="moments")
    generations = relationship("AIGeneration", back_populates="moment")
    jobs = relationship("GenerationJob", back_populates="moment")
    assets = relationship("MomentAsset", back_populates="moment")
