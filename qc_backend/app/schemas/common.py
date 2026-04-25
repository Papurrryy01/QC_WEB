from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class APIModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )


class APIMessage(APIModel):
    message: str


class HealthResponse(APIModel):
    status: str = "ok"
    service: str
    version: str
    timestamp: datetime


class ErrorResponse(APIModel):
    error: str
    detail: str | None = None


class Pagination(APIModel):
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class JobReference(APIModel):
    id: UUID
    status: str
    type: str


class BaseORMModel(APIModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )
