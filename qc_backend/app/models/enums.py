from __future__ import annotations

import enum


class MessageRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class GenerationType(str, enum.Enum):
    conversation = "conversation"
    ideate = "ideate"
    rewrite = "rewrite"
    reveal_plan = "reveal_plan"
    render_scene = "render_scene"
    image = "image"
    voice = "voice"


class JobType(str, enum.Enum):
    image = "image"
    voice = "voice"
    scene = "scene"


class JobStatus(str, enum.Enum):
    queued = "queued"
    processing = "processing"
    done = "done"
    failed = "failed"


class AssetType(str, enum.Enum):
    background = "background"
    voice = "voice"
    scene = "scene"


class MomentStatus(str, enum.Enum):
    draft = "draft"
    ready = "ready"
    scheduled = "scheduled"
    delivered = "delivered"
