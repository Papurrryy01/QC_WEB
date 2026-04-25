"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { EmotionState } from "../hooks/useEmotionState";
import type { AudioMetrics } from "../hooks/useAudioAnalyzer";

type PulseNodeState = "idle" | "proximity" | "listening" | "processing" | "speaking";

type PulseNodeProps = {
  state: PulseNodeState;
  emotion: EmotionState;
  palette: { start: string; end: string; glow: string };
  audio: AudioMetrics;
  onPress: () => void;
  disabled?: boolean;
};

function computeScale(state: PulseNodeState, audio: AudioMetrics) {
  if (state === "listening" || state === "speaking") {
    return 1 + audio.amplitude * 0.32;
  }
  if (state === "processing") {
    return 0.94;
  }
  if (state === "proximity") {
    return 1.06;
  }
  return 1;
}

function computeOpacity(state: PulseNodeState, audio: AudioMetrics) {
  if (state === "listening" || state === "speaking") {
    return 0.42 + audio.energy * 0.4;
  }
  if (state === "processing") {
    return 0.3;
  }
  if (state === "proximity") {
    return 0.3;
  }
  return 0.24;
}

export default function PulseNode({ state, emotion, palette, audio, onPress, disabled = false }: PulseNodeProps) {
  const scale = computeScale(state, audio);
  const glowOpacity = computeOpacity(state, audio);

  return (
    <motion.button
      type="button"
      className={`qc-pulse-node is-${state} is-${emotion}`}
      onClick={onPress}
      disabled={disabled}
      aria-label={state === "listening" ? "Stop voice input" : "Start voice input"}
      style={
        {
          "--pulse-start": palette.start,
          "--pulse-end": palette.end,
          "--pulse-glow": palette.glow,
          "--pulse-glow-opacity": glowOpacity.toFixed(3),
        } as CSSProperties
      }
      animate={{
        scale,
      }}
      transition={{
        type: "spring",
        stiffness: state === "listening" ? 170 : 220,
        damping: state === "listening" ? 18 : 22,
        mass: 0.75,
      }}
      whileHover={disabled ? undefined : { scale: scale + 0.03 }}
      whileTap={disabled ? undefined : { scale: Math.max(0.94, scale - 0.05) }}
    >
      <motion.span
        className="qc-pulse-core"
        animate={{
          scale:
            state === "processing"
              ? [0.9, 1.02, 0.92]
              : state === "listening" || state === "speaking"
                ? [1, 1.1 + audio.amplitude * 0.2, 0.98]
                : [0.95, 1.04, 0.95],
        }}
        transition={{
          duration: state === "listening" || state === "speaking" ? 0.68 : 2.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.span
        className="qc-pulse-ring"
        animate={{
          scale:
            state === "listening" || state === "speaking"
              ? [1, 1.22 + audio.pitch * 0.12, 1]
              : state === "processing"
                ? [1, 1.07, 1]
                : [1, 1.12, 1],
          opacity:
            state === "listening" || state === "speaking"
              ? [0.22, 0.54, 0.22]
              : state === "processing"
                ? [0.18, 0.3, 0.18]
                : [0.14, 0.24, 0.14],
        }}
        transition={{
          duration: state === "listening" || state === "speaking" ? 0.9 : 2.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.button>
  );
}
