from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.realtime import RealtimeSessionRequest, RealtimeSessionResponse
from app.services.realtime_engine import realtime_engine


router = APIRouter(prefix="/realtime", tags=["realtime"])


@router.post("/session", response_model=RealtimeSessionResponse)
async def create_realtime_session(payload: RealtimeSessionRequest) -> RealtimeSessionResponse:
    try:
        return await realtime_engine.create_session(payload)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc
