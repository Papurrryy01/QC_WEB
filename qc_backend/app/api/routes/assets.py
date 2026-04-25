from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.schemas.assets import (
    GenerateBackgroundRequest,
    GenerateBackgroundResponse,
    GenerateVoiceRequest,
    GenerateVoiceResponse,
)
from app.schemas.speech import TranscriptionResponse
from app.services.image_engine import image_engine
from app.services.speech_engine import speech_engine


router = APIRouter(prefix="/assets", tags=["assets"])


@router.post("/generate-background", response_model=GenerateBackgroundResponse)
async def generate_background(
    payload: GenerateBackgroundRequest,
    db: AsyncSession = Depends(get_db),
) -> GenerateBackgroundResponse:
    try:
        return await image_engine.generate_background(db, payload)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/generate-voice", response_model=GenerateVoiceResponse)
async def generate_voice(
    payload: GenerateVoiceRequest,
    db: AsyncSession = Depends(get_db),
) -> GenerateVoiceResponse:
    try:
        return await speech_engine.generate_voice(db, payload)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
    language_hint: str | None = Form(default=None, alias="languageHint"),
) -> TranscriptionResponse:
    content = await audio.read()
    if not content:
        raise HTTPException(status_code=400, detail="Audio file is empty")
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Audio file exceeds max size of {settings.max_upload_mb}MB",
        )

    try:
        return await speech_engine.transcribe(
            file_name=audio.filename or "audio.webm",
            content_type=audio.content_type or "audio/webm",
            audio_bytes=content,
            language_hint=language_hint,
        )
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc
