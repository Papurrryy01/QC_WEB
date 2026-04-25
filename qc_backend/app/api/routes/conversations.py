from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.conversation import (
    ConversationCreateRequest,
    ConversationDetail,
    ConversationSummary,
    ConversationThreadMessage,
)
from app.services.conversation_store import conversation_store


router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", response_model=ConversationSummary)
async def create_conversation(
    payload: ConversationCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> ConversationSummary:
    try:
        conversation = await conversation_store.create_conversation(
            db,
            user_id=payload.user_id,
            title=payload.title,
            mode=payload.mode,
        )
        return ConversationSummary.model_validate(conversation)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> ConversationDetail:
    conversation, messages = await conversation_store.get_conversation_with_messages(
        db,
        conversation_id=conversation_id,
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    thread = [
        ConversationThreadMessage(
            id=message.id,
            role=message.role.value,
            content=message.content,
            language=message.language,
            created_at=message.created_at,
        )
        for message in messages
    ]

    return ConversationDetail(
        conversation=ConversationSummary.model_validate(conversation),
        messages=thread,
    )
