from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation
from app.services.repository import list_conversation_messages


class ConversationStore:
    async def create_conversation(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        title: str | None,
        mode: str,
    ) -> Conversation:
        conversation = Conversation(user_id=user_id, title=title, mode=mode)
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
        return conversation

    async def get_conversation(self, db: AsyncSession, *, conversation_id: UUID) -> Conversation | None:
        return await db.get(Conversation, conversation_id)

    async def get_conversation_with_messages(self, db: AsyncSession, *, conversation_id: UUID):
        conversation = await db.get(Conversation, conversation_id)
        if not conversation:
            return None, []
        messages = await list_conversation_messages(db, conversation_id=conversation_id)
        return conversation, messages


conversation_store = ConversationStore()
