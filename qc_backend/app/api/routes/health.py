from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.schemas.common import HealthResponse


router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="qc-backend",
        version="0.1.0",
        timestamp=datetime.now(timezone.utc),
    )
