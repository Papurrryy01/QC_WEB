from __future__ import annotations

import uuid

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    conversations = relationship("Conversation", back_populates="user", cascade="all,delete-orphan")
    moments = relationship("Moment", back_populates="user", cascade="all,delete-orphan")
    generations = relationship("AIGeneration", back_populates="user", cascade="all,delete-orphan")
    jobs = relationship("GenerationJob", back_populates="user", cascade="all,delete-orphan")
