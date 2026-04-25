from __future__ import annotations

import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import GenerationType


class AIGeneration(TimestampMixin, Base):
    __tablename__ = "ai_generations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    moment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("moments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    generation_type: Mapped[GenerationType] = mapped_column(
        Enum(GenerationType, name="generation_type"), nullable=False
    )
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    prompt_input: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    output_payload: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    safety_flags: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)

    user = relationship("User", back_populates="generations")
    conversation = relationship("Conversation", back_populates="generations")
    moment = relationship("Moment", back_populates="generations")
