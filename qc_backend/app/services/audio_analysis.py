from __future__ import annotations

import audioop
from dataclasses import dataclass


@dataclass(slots=True)
class AudioFeatures:
    volume: float
    pitch: float
    energy: float


def extract_audio_features(pcm16le: bytes, sample_rate: int = 16000) -> AudioFeatures:
    if not pcm16le:
        return AudioFeatures(volume=0.0, pitch=0.0, energy=0.0)

    rms = audioop.rms(pcm16le, 2)
    max_possible = 32767
    volume = min(1.0, rms / max_possible)

    zero_crossings = 0
    prev_sign = 0
    for i in range(0, len(pcm16le), 2):
        sample = int.from_bytes(pcm16le[i : i + 2], byteorder="little", signed=True)
        sign = 1 if sample >= 0 else -1
        if prev_sign and sign != prev_sign:
            zero_crossings += 1
        prev_sign = sign

    duration_seconds = max(1e-3, len(pcm16le) / 2 / sample_rate)
    crossings_per_second = zero_crossings / duration_seconds
    pitch_proxy = min(1.0, crossings_per_second / 2000.0)

    chunks = []
    chunk_size = 3200
    for idx in range(0, len(pcm16le), chunk_size):
        window = pcm16le[idx : idx + chunk_size]
        if len(window) >= 2:
            chunks.append(audioop.rms(window, 2) / max_possible)

    if len(chunks) <= 1:
        energy = volume
    else:
        mean = sum(chunks) / len(chunks)
        variance = sum((x - mean) ** 2 for x in chunks) / len(chunks)
        energy = min(1.0, variance * 6.0)

    return AudioFeatures(volume=round(volume, 4), pitch=round(pitch_proxy, 4), energy=round(energy, 4))
