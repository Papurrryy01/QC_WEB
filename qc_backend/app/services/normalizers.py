from __future__ import annotations

from typing import Any

from app.schemas.conversation import DirectionState


def _read(obj: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in obj:
            return obj[key]
    return None


def normalize_direction(raw: dict[str, Any] | None, fallback: DirectionState) -> DirectionState:
    raw = raw or {}
    direction = DirectionState(
        moment_type=_read(raw, "moment_type", "momentType") or fallback.moment_type,
        tone=_read(raw, "tone") or fallback.tone,
        mood=_read(raw, "mood") or fallback.mood,
        intent=_read(raw, "intent") or fallback.intent,
        relationship_context=_read(raw, "relationship_context", "relationshipContext")
        or fallback.relationship_context,
        communication_goal=_read(raw, "communication_goal", "communicationGoal")
        or fallback.communication_goal,
        suggested_opening=_read(raw, "suggested_opening", "suggestedOpening")
        or fallback.suggested_opening,
        draft_direction=_read(raw, "draft_direction", "draftDirection") or fallback.draft_direction,
        confidence=float(_read(raw, "confidence") or fallback.confidence or 0.0),
    )
    direction.confidence = max(0.0, min(1.0, direction.confidence))
    return direction


def normalize_suggested_replies(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    replies: list[str] = []
    for item in raw:
        if isinstance(item, str):
            text = item.strip()
            if text:
                replies.append(text[:80])
    return replies[:3]
