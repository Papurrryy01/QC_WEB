from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

from app.services.audio_analysis import AudioFeatures

EmotionState = Literal["warm", "cool", "neutral", "mixed"]


WARM_PATTERNS = re.compile(
    r"\b(thank|grateful|love|miss|appreciate|te quiero|gracias|amor|cari|proud|hug)\b",
    re.IGNORECASE,
)
COOL_PATTERNS = re.compile(
    r"\b(apology|sorry|distance|hard|unclear|boundar|cold|perdon|disculpa|dificil)\b",
    re.IGNORECASE,
)


def emotion_from_text(text: str) -> EmotionState:
    warm = bool(WARM_PATTERNS.search(text))
    cool = bool(COOL_PATTERNS.search(text))
    if warm and cool:
        return "mixed"
    if warm:
        return "warm"
    if cool:
        return "cool"
    return "neutral"


def emotion_from_audio(features: AudioFeatures) -> EmotionState:
    if features.volume > 0.55 and features.energy > 0.3:
        return "warm"
    if features.volume < 0.22 and features.pitch < 0.2:
        return "cool"
    if features.energy > 0.45 and 0.2 < features.pitch < 0.55:
        return "mixed"
    return "neutral"


def merge_emotion_states(*states: EmotionState) -> EmotionState:
    unique = {state for state in states if state}
    if len(unique) > 1 and "neutral" not in unique:
        return "mixed"
    if "warm" in unique:
        return "warm"
    if "cool" in unique:
        return "cool"
    if "mixed" in unique:
        return "mixed"
    return "neutral"


def pulse_palette_for_emotion(state: EmotionState) -> dict[str, str]:
    if state == "warm":
        return {"start": "#f5c37a", "end": "#e6a95b", "glow": "rgba(244,179,96,0.36)"}
    if state == "cool":
        return {"start": "#76b8f5", "end": "#57a3f0", "glow": "rgba(95,170,241,0.34)"}
    if state == "mixed":
        return {"start": "#8ca6ff", "end": "#d59be7", "glow": "rgba(150,145,241,0.32)"}
    return {"start": "#e9ebf4", "end": "#cfd4e6", "glow": "rgba(229,232,245,0.28)"}
