"use client";

import { useEffect, useRef, useState } from "react";

export type AudioMetrics = {
  amplitude: number;
  pitch: number;
  energy: number;
};

function clamp(value: number) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function useAudioAnalyzer(rawLevel: number, active: boolean): AudioMetrics {
  const [metrics, setMetrics] = useState<AudioMetrics>({
    amplitude: 0,
    pitch: 0,
    energy: 0,
  });

  const rawRef = useRef(rawLevel);
  const frameRef = useRef<number | null>(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    rawRef.current = clamp(rawLevel);
  }, [rawLevel]);

  useEffect(() => {
    const loop = () => {
      phaseRef.current += 0.048;

      setMetrics((previous) => {
        const base = rawRef.current;

        const targetAmplitude = active
          ? Math.min(1, base * 0.84 + Math.abs(Math.sin(phaseRef.current * 2.2)) * 0.14)
          : Math.max(0.04, Math.abs(Math.sin(phaseRef.current * 1.2)) * 0.08);

        const amplitude = previous.amplitude + (targetAmplitude - previous.amplitude) * 0.2;

        const pitchSeed = Math.abs(Math.sin(phaseRef.current * 0.75 + base * 2.8));
        const targetPitch = active
          ? Math.min(1, 0.22 + base * 0.56 + pitchSeed * 0.22)
          : 0.2 + pitchSeed * 0.12;
        const pitch = previous.pitch + (targetPitch - previous.pitch) * 0.15;

        const delta = Math.abs(amplitude - previous.amplitude);
        const targetEnergy = active
          ? Math.min(1, delta * 3.2 + base * 0.58)
          : Math.max(0.08, delta * 1.4);
        const energy = previous.energy + (targetEnergy - previous.energy) * 0.18;

        return {
          amplitude: clamp(amplitude),
          pitch: clamp(pitch),
          energy: clamp(energy),
        };
      });

      frameRef.current = window.requestAnimationFrame(loop);
    };

    frameRef.current = window.requestAnimationFrame(loop);
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [active]);

  return metrics;
}
