from __future__ import annotations

import time
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.enums import GenerationType
from app.prompts.system import GLOBAL_QC_IDENTITY
from app.schemas.moment import (
    MomentIdeateRequest,
    MomentRewriteRequest,
    MomentRewriteResponse,
    RevealPlanRequest,
    RevealPlanResponse,
    StructuredBuilderResponse,
)
from app.services.openai_client import openai_service
from app.services.repository import create_ai_generation
from app.services.safety import evaluate_safety


class MomentEngine:
    async def ideate(self, db: AsyncSession, payload: MomentIdeateRequest) -> StructuredBuilderResponse:
        safety = evaluate_safety(payload.text)
        if safety.blocked:
            return StructuredBuilderResponse(
                moment_title="Respectful message",
                emotional_goal="Express feelings honestly without pressure",
                recipient_type="person",
                relationship_context="personal",
                tone_profile={"primary": "tender", "state": "balanced"},
                suggested_message="I wanted to share this with care and respect.",
                variations=[
                    "I’ve been meaning to tell you this in a calm and honest way.",
                    "This matters to me, and I wanted to say it clearly.",
                ],
                reveal_style="soft bloom",
                reveal_steps=["Teaser line", "Warm message", "Gentle close"],
                delivery_timing={"type": "scheduled", "window": "evening"},
                background_prompt="soft ambient gradient with warm light",
                voiceover_script=None,
                animation_preset="soft bloom",
                safety_flags=safety.flags,
            )

        schema_prompt = (
            f"{GLOBAL_QC_IDENTITY}\n\n"
            "You are Moment Architect. Return JSON with keys: "
            "moment_title, emotional_goal, recipient_type, relationship_context, tone_profile, "
            "suggested_message, variations, reveal_style, reveal_steps, delivery_timing, "
            "background_prompt, voiceover_script, animation_preset, safety_flags."
        )
        input_text = payload.text
        started = time.perf_counter()
        raw = await openai_service.create_json_response(
            model=settings.openai_chat_model,
            system_prompt=schema_prompt,
            user_input=input_text,
            temperature=0.72,
        )
        latency_ms = int((time.perf_counter() - started) * 1000)

        response = StructuredBuilderResponse(
            moment_title=str(raw.get("moment_title") or "Meaningful moment")[:160],
            emotional_goal=str(raw.get("emotional_goal") or "Express care with clarity")[:300],
            recipient_type=str(raw.get("recipient_type") or "person")[:80],
            relationship_context=str(raw.get("relationship_context") or "personal")[:400],
            tone_profile=raw.get("tone_profile") if isinstance(raw.get("tone_profile"), dict) else {"primary": "tender"},
            suggested_message=str(raw.get("suggested_message") or "")[:4000],
            variations=[str(x)[:2000] for x in (raw.get("variations") or []) if isinstance(x, str)][:3],
            reveal_style=str(raw.get("reveal_style") or "soft bloom")[:80],
            reveal_steps=[str(x)[:200] for x in (raw.get("reveal_steps") or []) if isinstance(x, str)][:8],
            delivery_timing=raw.get("delivery_timing") if isinstance(raw.get("delivery_timing"), dict) else {},
            background_prompt=str(raw.get("background_prompt") or "")[:400],
            voiceover_script=(str(raw.get("voiceover_script"))[:1200] if raw.get("voiceover_script") else None),
            animation_preset=str(raw.get("animation_preset") or "soft bloom")[:80],
            safety_flags=[str(x) for x in (raw.get("safety_flags") or []) if isinstance(x, str)],
        )

        await create_ai_generation(
            db,
            user_id=payload.user_id,
            conversation_id=payload.conversation_id,
            moment_id=None,
            generation_type=GenerationType.ideate,
            model=settings.openai_chat_model,
            prompt_input=payload.model_dump(),
            output_payload=response.model_dump(),
            latency_ms=latency_ms,
            safety_flags=safety.flags,
        )
        await db.commit()
        return response

    async def rewrite(self, db: AsyncSession, payload: MomentRewriteRequest) -> MomentRewriteResponse:
        safety = evaluate_safety(payload.text)
        prompt = (
            f"{GLOBAL_QC_IDENTITY}\n\n"
            "Rewrite the message preserving meaning and personal voice. "
            f"Target tone: {payload.target_tone or 'balanced'}. "
            f"Intensity: {payload.intensity:.2f}. "
            "Return JSON keys: rewritten_message, alternatives, preserved_meaning_summary, confidence."
        )
        started = time.perf_counter()
        raw = await openai_service.create_json_response(
            model=settings.openai_chat_model,
            system_prompt=prompt,
            user_input=payload.text,
            temperature=0.68,
        )
        latency_ms = int((time.perf_counter() - started) * 1000)

        response = MomentRewriteResponse(
            rewritten_message=str(raw.get("rewritten_message") or payload.text)[:4000],
            alternatives=[str(x)[:2000] for x in (raw.get("alternatives") or []) if isinstance(x, str)][:3],
            preserved_meaning_summary=str(raw.get("preserved_meaning_summary") or "Meaning preserved.")[:400],
            confidence=max(0.0, min(1.0, float(raw.get("confidence") or 0.7))),
        )

        await create_ai_generation(
            db,
            user_id=payload.user_id,
            conversation_id=None,
            moment_id=payload.moment_id,
            generation_type=GenerationType.rewrite,
            model=settings.openai_chat_model,
            prompt_input=payload.model_dump(),
            output_payload=response.model_dump(),
            latency_ms=latency_ms,
            safety_flags=safety.flags,
        )
        await db.commit()
        return response

    async def reveal_plan(self, db: AsyncSession, payload: RevealPlanRequest) -> RevealPlanResponse:
        prompt = (
            f"{GLOBAL_QC_IDENTITY}\n\n"
            "Create a cinematic reveal plan. Return JSON keys: "
            "reveal_style, reveal_steps, delivery_timing, animation_preset, scene_guidance."
        )
        started = time.perf_counter()
        raw = await openai_service.create_json_response(
            model=settings.openai_chat_model,
            system_prompt=prompt,
            user_input=f"Tone: {payload.tone or 'tender'}\nMessage:\n{payload.message}",
            temperature=0.7,
        )
        latency_ms = int((time.perf_counter() - started) * 1000)

        response = RevealPlanResponse(
            reveal_style=str(raw.get("reveal_style") or "cinematic countdown")[:120],
            reveal_steps=[str(x)[:200] for x in (raw.get("reveal_steps") or []) if isinstance(x, str)][:8],
            delivery_timing=raw.get("delivery_timing") if isinstance(raw.get("delivery_timing"), dict) else {},
            animation_preset=str(raw.get("animation_preset") or "liquid glass drift")[:120],
            scene_guidance=str(raw.get("scene_guidance") or "Soft emotional pacing with intentional reveal.")[:800],
        )

        await create_ai_generation(
            db,
            user_id=payload.user_id,
            conversation_id=None,
            moment_id=payload.moment_id,
            generation_type=GenerationType.reveal_plan,
            model=settings.openai_chat_model,
            prompt_input=payload.model_dump(),
            output_payload=response.model_dump(),
            latency_ms=latency_ms,
            safety_flags=[],
        )
        await db.commit()
        return response


moment_engine = MomentEngine()
