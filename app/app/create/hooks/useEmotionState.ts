"use client";

import { useMemo } from "react";
import type { AudioMetrics } from "./useAudioAnalyzer";

export type EmotionState = "warm" | "cool" | "neutral" | "mixed";

const WARM_RE =
  /\b(thank|grateful|love|miss|proud|care|hug|te\s+quiero|gracias|amor|abrazo|aprecio|quiero\s+que\s+sepas)\b/i;
const COOL_RE =
  /\b(sorry|hard|distance|cold|unclear|boundary|perdon|disculpa|dificil|miedo|tension)\b/i;

export function useEmotionState(input: {
  userText: string;
  assistantText: string;
  audio: AudioMetrics;
}): {
  state: EmotionState;
  palette: { start: string; end: string; glow: string };
} {
  const { userText, assistantText, audio } = input;

  return useMemo(() => {
    const source = `${userText} ${assistantText}`.trim();
    const warm = WARM_RE.test(source);
    const cool = COOL_RE.test(source);

    let state: EmotionState = "neutral";
    if (warm && cool) {
      state = "mixed";
    } else if (warm || (audio.amplitude > 0.42 && audio.energy > 0.3)) {
      state = "warm";
    } else if (cool || (audio.amplitude < 0.16 && audio.pitch < 0.22)) {
      state = "cool";
    }

    if (audio.energy > 0.58 && (state === "warm" || state === "cool")) {
      state = "mixed";
    }

    const palette =
      state === "warm"
        ? { start: "#f7c887", end: "#e5a767", glow: "rgba(238, 182, 111, 0.34)" }
        : state === "cool"
          ? { start: "#7dbbf2", end: "#63a9ef", glow: "rgba(104, 177, 245, 0.34)" }
          : state === "mixed"
            ? { start: "#9eaaf6", end: "#d2a3e9", glow: "rgba(161, 154, 240, 0.32)" }
            : { start: "#e7ebf7", end: "#cfd7ea", glow: "rgba(215, 221, 238, 0.3)" };

    return { state, palette };
  }, [assistantText, audio.amplitude, audio.energy, audio.pitch, userText]);
}
