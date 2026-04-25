from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_generation import AIGeneration
from app.models.conversation import Conversation
from app.models.enums import GenerationType, JobStatus, MessageRole
from app.models.generation_job import GenerationJob
from app.models.message import Message


async def get_or_create_conversation(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: UUID | None,
    title: str | None = None,
    mode: str = "moment_architect",
) -> Conversation:
    if conversation_id:
        existing = await db.get(Conversation, conversation_id)
        if existing and existing.user_id == user_id:
            return existing

    conversation = Conversation(user_id=user_id, title=title, mode=mode)
    db.add(conversation)
    await db.flush()
    return conversation


async def add_message(
    db: AsyncSession,
    *,
    conversation_id: UUID,
    role: MessageRole,
    content: str,
    language: str | None = None,
    structured_payload: dict | None = None,
) -> Message:
    message = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        language=language,
        structured_payload=structured_payload or {},
    )
    db.add(message)
    await db.flush()
    return message


async def list_conversation_messages(db: AsyncSession, *, conversation_id: UUID) -> list[Message]:
    query = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_ai_generation(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: UUID | None,
    moment_id: UUID | None,
    generation_type: GenerationType,
    model: str,
    prompt_input: dict,
    output_payload: dict,
    latency_ms: int | None,
    safety_flags: list[str] | None = None,
) -> AIGeneration:
    generation = AIGeneration(
        user_id=user_id,
        conversation_id=conversation_id,
        moment_id=moment_id,
        generation_type=generation_type,
        model=model,
        prompt_input=prompt_input,
        output_payload=output_payload,
        latency_ms=latency_ms,
        safety_flags=safety_flags or [],
    )
    db.add(generation)
    await db.flush()
    return generation


async def create_generation_job(
    db: AsyncSession,
    *,
    user_id: UUID,
    moment_id: UUID | None,
    job_type,
    metadata: dict | None = None,
) -> GenerationJob:
    job = GenerationJob(
        user_id=user_id,
        moment_id=moment_id,
        type=job_type,
        status=JobStatus.queued,
        metadata_json=metadata or {},
    )
    db.add(job)
    await db.flush()
    return job
