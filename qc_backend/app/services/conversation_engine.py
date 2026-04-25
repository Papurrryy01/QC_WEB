from __future__ import annotations

import time
from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.prompts.system import build_mode_prompt
from app.schemas.conversation import (
    ConversationMessageInput,
    ConversationRequest,
    ConversationResponse,
    DirectionState,
)
from app.services.emotion_mapping import emotion_from_text
from app.services.normalizers import normalize_direction, normalize_suggested_replies
from app.services.openai_client import openai_service
from app.services.orchestration import orchestration_engine
from app.services.repository import add_message, create_ai_generation, get_or_create_conversation
from app.services.safety import evaluate_safety
from app.models.enums import GenerationType, MessageRole


class ConversationEngine:
    async def run(self, db: AsyncSession, payload: ConversationRequest) -> ConversationResponse:
        safety = evaluate_safety(payload.message)
        if safety.blocked:
            return ConversationResponse(
                assistant_message=(
                    "I can’t help with coercive or harmful emotional tactics. "
                    "If you want, I can help you write something honest and respectful instead."
                ),
                direction=payload.direction,
                suggested_replies=["Write something respectful", "Start over"],
                ready_to_proceed=False,
                emotional_tone="neutral",
                response_type="conversational_response",
            )

        conversation = await get_or_create_conversation(
            db,
            user_id=payload.user_id,
            conversation_id=payload.conversation_id,
            mode=payload.mode,
        )

        await add_message(
            db,
            conversation_id=conversation.id,
            role=MessageRole.user,
            content=payload.message,
            language=payload.language_hint,
        )

        prompt = build_mode_prompt(payload.mode, payload.direction)
        history_blob = "\n".join(f"{item.role}: {item.content}" for item in payload.history[-14:])
        user_input = (
            f"Conversation history:\n{history_blob}\n\n"
            f"Latest user message:\n{payload.message}\n\n"
            "Return JSON only."
        )

        started = time.perf_counter()
        raw = await openai_service.create_json_response(
            model=settings.openai_chat_model,
            system_prompt=prompt,
            user_input=user_input,
            temperature=0.66,
        )
        latency_ms = int((time.perf_counter() - started) * 1000)

        direction = normalize_direction(raw.get("direction") if isinstance(raw, dict) else None, payload.direction)
        assistant_message = ""
        if isinstance(raw, dict):
            assistant_message = str(raw.get("assistantMessage") or raw.get("assistant_message") or "").strip()

        if not assistant_message:
            assistant_message = (
                "I hear what you mean. Do you want this to stay soft and reflective, "
                "or be a little more direct?"
            )

        suggested_replies = normalize_suggested_replies(raw.get("suggestedReplies") if isinstance(raw, dict) else None)
        ready_to_proceed = bool(raw.get("readyToProceed") if isinstance(raw, dict) else False)

        emotional_tone = emotion_from_text(payload.message)
        decision = orchestration_engine.decide(
            endpoint="chat",
            ready_to_proceed=ready_to_proceed or direction.confidence > 0.88,
        )
        response = ConversationResponse(
            assistant_message=assistant_message,
            direction=direction,
            suggested_replies=suggested_replies,
            ready_to_proceed=ready_to_proceed or direction.confidence > 0.88,
            emotional_tone=emotional_tone,
            response_type=decision.response_type,
        )

        await add_message(
            db,
            conversation_id=conversation.id,
            role=MessageRole.assistant,
            content=response.assistant_message,
            language=payload.language_hint,
            structured_payload={
                "direction": response.direction.model_dump(),
                "ready_to_proceed": response.ready_to_proceed,
                "suggested_replies": response.suggested_replies,
            },
        )

        await create_ai_generation(
            db,
            user_id=payload.user_id,
            conversation_id=conversation.id,
            moment_id=None,
            generation_type=GenerationType.conversation,
            model=settings.openai_chat_model,
            prompt_input={"mode": payload.mode, "message": payload.message, "direction": payload.direction.model_dump()},
            output_payload=response.model_dump(),
            latency_ms=latency_ms,
            safety_flags=safety.flags,
        )
        await db.commit()

        return response

    async def stream(
        self,
        payload: ConversationRequest,
    ) -> AsyncGenerator[str, None]:
        prompt = build_mode_prompt(payload.mode, payload.direction)
        history_blob = "\n".join(f"{item.role}: {item.content}" for item in payload.history[-14:])
        user_input = (
            f"Conversation history:\n{history_blob}\n\n"
            f"Latest user message:\n{payload.message}\n\n"
            "Respond naturally and concisely in the user's language."
        )

        async for delta in openai_service.stream_text_response(
            model=settings.openai_chat_stream_model,
            system_prompt=prompt,
            user_input=user_input,
            temperature=0.62,
        ):
            yield delta


conversation_engine = ConversationEngine()
