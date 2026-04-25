from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import JobStatus, JobType
from app.schemas.assets import GenerateVoiceRequest, GenerateVoiceResponse
from app.schemas.speech import TranscriptionResponse
from app.services.openai_client import openai_service
from app.services.repository import create_generation_job


class SpeechEngine:
    async def transcribe(
        self,
        *,
        file_name: str,
        content_type: str,
        audio_bytes: bytes,
        language_hint: str | None,
    ) -> TranscriptionResponse:
        result = await openai_service.transcribe_audio(
            file_name=file_name,
            content_type=content_type,
            audio_bytes=audio_bytes,
            language_hint=language_hint,
        )
        return TranscriptionResponse(
            text=result["text"],
            language=result.get("language"),
            duration_seconds=result.get("duration_seconds"),
        )

    async def generate_voice(
        self,
        db: AsyncSession,
        payload: GenerateVoiceRequest,
    ) -> GenerateVoiceResponse:
        job = await create_generation_job(
            db,
            user_id=payload.user_id,
            moment_id=payload.moment_id,
            job_type=JobType.voice,
            metadata={"voice": payload.voice, "format": payload.format},
        )
        await db.flush()

        job.status = JobStatus.processing
        await db.flush()

        result = await openai_service.synthesize_speech(
            text=payload.text,
            voice=payload.voice,
            audio_format=payload.format,
        )

        job.status = JobStatus.done if result.audio_b64 else JobStatus.failed
        if not result.audio_b64:
            job.error_message = "No audio generated"

        await db.commit()

        return GenerateVoiceResponse(
            job_id=job.id,
            status=job.status.value,
            audio_b64=result.audio_b64,
            mime_type=result.mime_type,
            result_url=job.result_url,
        )


speech_engine = SpeechEngine()
