from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import assets, chat, conversations, health, moments, realtime


api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(chat.router)
api_router.include_router(moments.router)
api_router.include_router(assets.router)
api_router.include_router(realtime.router)
api_router.include_router(conversations.router)
