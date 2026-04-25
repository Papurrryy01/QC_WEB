from __future__ import annotations

import time

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.enums import GenerationType
from app.prompts.system import GLOBAL_QC_IDENTITY
from app.schemas.scene import RenderableSceneResponse, SceneRenderRequest, TimedTextBlock
from app.services.openai_client import openai_service
from app.services.repository import create_ai_generation


class SceneEngine:
    async def render_scene(self, db: AsyncSession, payload: SceneRenderRequest) -> RenderableSceneResponse:
        prompt = (
            f"{GLOBAL_QC_IDENTITY}\n\n"
            "Create renderable scene JSON with keys: scene_title, background_prompt, animation_preset, voiceover, "
            "timed_text_blocks, reveal_sequence, audio_mood, end_state. "
            "timed_text_blocks is an array of {start_ms,end_ms,text}."
        )
        started = time.perf_counter()
        raw = await openai_service.create_json_response(
            model=settings.openai_chat_model,
            system_prompt=prompt,
            user_input=(
                f"Tone: {payload.tone or 'tender'}\n"
                f"Reveal style: {payload.reveal_style or 'soft bloom'}\n"
                f"Message:\n{payload.message}"
            ),
            temperature=0.62,
        )
        latency_ms = int((time.perf_counter() - started) * 1000)

        blocks: list[TimedTextBlock] = []
        for item in raw.get("timed_text_blocks", []):
            if isinstance(item, dict):
                try:
                    blocks.append(
                        TimedTextBlock(
                            start_ms=max(0, int(item.get("start_ms", 0))),
                            end_ms=max(0, int(item.get("end_ms", 0))),
                            text=str(item.get("text", "")).strip()[:300],
                        )
                    )
                except Exception:
                    continue

        response = RenderableSceneResponse(
            scene_title=str(raw.get("scene_title") or "Moment Scene")[:160],
            background_prompt=str(raw.get("background_prompt") or "soft cinematic gradient with emotional depth")[:800],
            animation_preset=str(raw.get("animation_preset") or "liquid glass drift")[:120],
            voiceover=(str(raw.get("voiceover"))[:2000] if raw.get("voiceover") else None),
            timed_text_blocks=blocks,
            reveal_sequence=[str(x)[:160] for x in (raw.get("reveal_sequence") or []) if isinstance(x, str)][:10],
            audio_mood=str(raw.get("audio_mood") or "ambient_warm")[:120],
            end_state=str(raw.get("end_state") or "gentle_resolve")[:240],
        )

        await create_ai_generation(
            db,
            user_id=payload.user_id,
            conversation_id=None,
            moment_id=payload.moment_id,
            generation_type=GenerationType.render_scene,
            model=settings.openai_chat_model,
            prompt_input=payload.model_dump(),
            output_payload=response.model_dump(mode="json"),
            latency_ms=latency_ms,
            safety_flags=[],
        )
        await db.commit()
        return response


scene_engine = SceneEngine()
