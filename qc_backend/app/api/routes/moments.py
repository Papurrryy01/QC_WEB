from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.moment import (
    MomentIdeateRequest,
    MomentRewriteRequest,
    MomentRewriteResponse,
    RevealPlanRequest,
    RevealPlanResponse,
    StructuredBuilderResponse,
)
from app.schemas.scene import RenderableSceneResponse, SceneRenderRequest
from app.services.moment_engine import moment_engine
from app.services.scene_engine import scene_engine


router = APIRouter(prefix="/moments", tags=["moments"])


@router.post("/ideate", response_model=StructuredBuilderResponse)
async def ideate(payload: MomentIdeateRequest, db: AsyncSession = Depends(get_db)) -> StructuredBuilderResponse:
    try:
        return await moment_engine.ideate(db, payload)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/rewrite", response_model=MomentRewriteResponse)
async def rewrite(payload: MomentRewriteRequest, db: AsyncSession = Depends(get_db)) -> MomentRewriteResponse:
    try:
        return await moment_engine.rewrite(db, payload)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/reveal-plan", response_model=RevealPlanResponse)
async def reveal_plan(payload: RevealPlanRequest, db: AsyncSession = Depends(get_db)) -> RevealPlanResponse:
    try:
        return await moment_engine.reveal_plan(db, payload)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/render-scene", response_model=RenderableSceneResponse)
async def render_scene(payload: SceneRenderRequest, db: AsyncSession = Depends(get_db)) -> RenderableSceneResponse:
    try:
        return await scene_engine.render_scene(db, payload)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc
