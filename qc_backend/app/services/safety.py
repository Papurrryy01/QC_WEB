from __future__ import annotations

import re
from dataclasses import dataclass


BLOCK_PATTERNS = [
    re.compile(r"\bmanipulat(e|ion|ive)\b", re.IGNORECASE),
    re.compile(r"\bcoerc(e|ion|ive)\b", re.IGNORECASE),
    re.compile(r"\bobsess(ive|ion)\b", re.IGNORECASE),
    re.compile(r"\bstalk(ing)?\b", re.IGNORECASE),
    re.compile(r"\bthreat(en|s|ing)?\b", re.IGNORECASE),
]


@dataclass(slots=True)
class SafetyCheckResult:
    blocked: bool
    flags: list[str]


def evaluate_safety(text: str) -> SafetyCheckResult:
    flags: list[str] = []
    for pattern in BLOCK_PATTERNS:
        if pattern.search(text):
            flags.append(pattern.pattern)
    return SafetyCheckResult(blocked=bool(flags), flags=flags)
