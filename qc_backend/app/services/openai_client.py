from __future__ import annotations

import base64
import json
import re
from collections.abc import AsyncGenerator, Sequence
from dataclasses import dataclass
from typing import Any

import httpx
from openai import AsyncOpenAI

from app.core.config import settings


@dataclass(slots=True)
class ImageGenerationResult:
    b64_json: str | None
    revised_prompt: str | None


@dataclass(slots=True)
class SpeechSynthesisResult:
    audio_b64: str
    mime_type: str


class OpenAIService:
    def __init__(self) -> None:
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def create_json_response(
        self,
        *,
        model: str,
        system_prompt: str,
        user_input: str,
        temperature: float = 0.65,
    ) -> dict[str, Any]:
        response = await self.client.responses.create(
            model=model,
            input=[
                {"role": "system", "content": [{"type": "text", "text": system_prompt}]},
                {"role": "user", "content": [{"type": "text", "text": user_input}]},
            ],
            temperature=temperature,
        )
        text_payload = self.extract_output_text(response)
        return self.extract_json_payload(text_payload)

    async def stream_text_response(
        self,
        *,
        model: str,
        system_prompt: str,
        user_input: str,
        temperature: float = 0.6,
    ) -> AsyncGenerator[str, None]:
        stream = await self.client.responses.create(
            model=model,
            input=[
                {"role": "system", "content": [{"type": "text", "text": system_prompt}]},
                {"role": "user", "content": [{"type": "text", "text": user_input}]},
            ],
            temperature=temperature,
            stream=True,
        )

        async for event in stream:
            event_type = getattr(event, "type", None)
            if event_type == "response.output_text.delta":
                delta = getattr(event, "delta", "")
                if delta:
                    yield delta
            elif event_type == "response.completed":
                break

    async def transcribe_audio(
        self,
        *,
        file_name: str,
        content_type: str,
        audio_bytes: bytes,
        language_hint: str | None = None,
    ) -> dict[str, Any]:
        transcript = await self.client.audio.transcriptions.create(
            model=settings.openai_transcribe_model,
            file=(file_name, audio_bytes, content_type),
            response_format="verbose_json",
            language=language_hint,
            prompt="Transcribe exactly as spoken. Keep original language. Do not translate.",
        )

        data = transcript.model_dump() if hasattr(transcript, "model_dump") else dict(transcript)
        text = (data.get("text") or "").strip()
        return {
            "text": text,
            "language": data.get("language"),
            "duration_seconds": data.get("duration"),
        }

    async def synthesize_speech(self, *, text: str, voice: str, audio_format: str) -> SpeechSynthesisResult:
        response = await self.client.audio.speech.create(
            model=settings.openai_tts_model,
            voice=voice,
            input=text,
            format=audio_format,
        )
        audio_bytes = await response.aread()
        mime = "audio/mpeg" if audio_format == "mp3" else f"audio/{audio_format}"
        return SpeechSynthesisResult(audio_b64=base64.b64encode(audio_bytes).decode("utf-8"), mime_type=mime)

    async def generate_image(self, *, prompt: str, size: str = "1536x1024") -> ImageGenerationResult:
        response = await self.client.images.generate(
            model=settings.openai_image_model,
            prompt=prompt,
            size=size,
        )
        first = response.data[0] if response.data else None
        b64_json = getattr(first, "b64_json", None) if first else None
        revised_prompt = getattr(first, "revised_prompt", None) if first else None
        return ImageGenerationResult(b64_json=b64_json, revised_prompt=revised_prompt)

    async def create_realtime_session(
        self,
        *,
        voice: str | None = None,
        instructions: str,
    ) -> dict[str, Any]:
        url = "https://api.openai.com/v1/realtime/sessions"
        payload = {
            "model": settings.openai_realtime_model,
            "voice": voice or settings.openai_realtime_voice,
            "modalities": ["audio", "text"],
            "instructions": instructions,
            "input_audio_transcription": {"model": settings.openai_transcribe_model},
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    @staticmethod
    def extract_output_text(response: Any) -> str:
        if hasattr(response, "output_text") and response.output_text:
            return str(response.output_text)

        output = getattr(response, "output", None)
        if output:
            chunks: list[str] = []
            for item in output:
                content = getattr(item, "content", None)
                if not content:
                    continue
                for block in content:
                    block_type = getattr(block, "type", None)
                    if block_type == "output_text":
                        text = getattr(block, "text", None)
                        if text:
                            chunks.append(str(text))
            if chunks:
                return "\n".join(chunks)

        dumped = response.model_dump() if hasattr(response, "model_dump") else {}
        if isinstance(dumped, dict):
            text_value = dumped.get("output_text")
            if isinstance(text_value, str) and text_value.strip():
                return text_value

        raise ValueError("OpenAI response did not include text output")

    @staticmethod
    def extract_json_payload(text_payload: str) -> dict[str, Any]:
        cleaned = text_payload.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)

        try:
            parsed = json.loads(cleaned)
            return parsed if isinstance(parsed, dict) else {"result": parsed}
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
            if not match:
                return {"assistantMessage": cleaned}
            parsed = json.loads(match.group(0))
            return parsed if isinstance(parsed, dict) else {"result": parsed}


openai_service = OpenAIService()
