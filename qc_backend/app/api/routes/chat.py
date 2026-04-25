from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.schemas.conversation import ConversationRequest, ConversationResponse
from app.services.conversation_engine import conversation_engine


router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ConversationResponse)
async def chat(payload: ConversationRequest, db: AsyncSession = Depends(get_db)) -> ConversationResponse:
    try:
        return await conversation_engine.run(db, payload)
    except Exception as exc:  # pragma: no cover - runtime guard
        raise HTTPException(status_code=500, detail=str(exc)) from exc


async def _sse_stream(payload: ConversationRequest) -> AsyncGenerator[str, None]:
    heartbeat = settings.sse_heartbeat_seconds
    last_emit = asyncio.get_running_loop().time()

    async for chunk in conversation_engine.stream(payload):
        now = asyncio.get_running_loop().time()
        if now - last_emit >= heartbeat:
            yield ": heartbeat\n\n"
            last_emit = now
        yield f"event: token\ndata: {json.dumps({'delta': chunk})}\n\n"

    yield "event: done\ndata: {}\n\n"


@router.post("/stream")
async def chat_stream(payload: ConversationRequest) -> StreamingResponse:
    return StreamingResponse(_sse_stream(payload), media_type="text/event-stream")
