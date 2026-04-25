from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: Literal["development", "staging", "production"] = "development"
    app_name: str = "QC Backend"
    app_host: str = "127.0.0.1"
    app_port: int = 8080
    api_prefix: str = "/api"

    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/qc"
    )
    redis_url: str = "redis://localhost:6379/0"

    openai_api_key: str
    openai_chat_model: str = "gpt-4.1"
    openai_chat_stream_model: str = "gpt-4.1"
    openai_transcribe_model: str = "gpt-4o-mini-transcribe"
    openai_tts_model: str = "gpt-4o-mini-tts"
    openai_image_model: str = "gpt-image-1"
    openai_realtime_model: str = "gpt-realtime"
    openai_realtime_voice: str = "alloy"

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    max_upload_mb: int = 25
    sse_heartbeat_seconds: int = 8

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
