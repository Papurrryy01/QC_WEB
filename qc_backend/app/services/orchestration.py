from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


ResponseType = Literal[
    "conversational_response",
    "structured_builder_response",
    "renderable_scene_response",
]


@dataclass(slots=True)
class OrchestrationDecision:
    response_type: ResponseType
    mode: str


class OrchestrationEngine:
    def decide(self, *, endpoint: str, ready_to_proceed: bool = False) -> OrchestrationDecision:
        if endpoint == "render_scene":
            return OrchestrationDecision(response_type="renderable_scene_response", mode="scene_renderer")
        if endpoint in {"ideate", "rewrite", "reveal_plan"}:
            return OrchestrationDecision(response_type="structured_builder_response", mode="moment_architect")
        if endpoint in {"chat", "chat_stream"} and ready_to_proceed:
            return OrchestrationDecision(response_type="structured_builder_response", mode="moment_architect")
        return OrchestrationDecision(response_type="conversational_response", mode="conversation")


orchestration_engine = OrchestrationEngine()
