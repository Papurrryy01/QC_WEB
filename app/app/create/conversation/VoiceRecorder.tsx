"use client";

import { useEffect, useRef } from "react";
import { IconCheckBig, IconClose } from "@/app/components/icons/CoolIcons";
import type { AudioMetrics } from "../hooks/useAudioAnalyzer";

type VoiceRecorderProps = {
  audio: AudioMetrics;
  onCancel: () => void;
  onStop: () => void;
};

function VoiceWaveform({ audio }: { audio: AudioMetrics }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef(audio);

  useEffect(() => {
    audioRef.current = audio;
  }, [audio]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let phase = 0;
    let smoothedLevel = 0;

    const render = () => {
      const node = canvasRef.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        raf = window.requestAnimationFrame(render);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const pixelWidth = Math.max(1, Math.floor(rect.width * dpr));
      const pixelHeight = Math.max(1, Math.floor(rect.height * dpr));

      if (node.width !== pixelWidth || node.height !== pixelHeight) {
        node.width = pixelWidth;
        node.height = pixelHeight;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, node.width, node.height);
      ctx.scale(dpr, dpr);

      const metrics = audioRef.current;
      smoothedLevel += (metrics.amplitude - smoothedLevel) * 0.16;
      phase += 0.05 + smoothedLevel * 0.26 + metrics.energy * 0.12;

      const width = rect.width;
      const height = rect.height;
      const centerY = height / 2;
      const barSpacing = 7;
      const barCount = Math.max(56, Math.floor(width / barSpacing));
      const barWidth = Math.max(1.9, Math.min(3.3, barSpacing * 0.44));
      const maxHalf = height * 0.46;

      ctx.lineCap = "round";
      ctx.lineWidth = barWidth;
      ctx.strokeStyle = "rgba(14, 18, 28, 0.92)";

      for (let i = 0; i < barCount; i += 1) {
        const progress = i / Math.max(1, barCount - 1);
        const x = progress * width;

        const moving = Math.sin(progress * 24 + phase * 1.4) * 0.45;
        const detail = Math.sin(progress * 72 - phase * 0.9) * 0.21;
        const lowPulse = Math.sin(phase * 1.1 + i * 0.08) * 0.08;
        const liveResponse = 0.18 + smoothedLevel * (0.36 + Math.abs(Math.sin(i * 0.19 + phase * 0.45)));
        const silentMotion = 0.08 + Math.abs(lowPulse) * 0.14;

        const shape = Math.abs(moving + detail) * (liveResponse + silentMotion);
        const half = Math.min(maxHalf, maxHalf * Math.max(0.07, shape));

        if (half < 2.3) {
          ctx.beginPath();
          ctx.arc(x, centerY, 1.08, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(18, 24, 38, 0.78)";
          ctx.fill();
          continue;
        }

        ctx.beginPath();
        ctx.moveTo(x, centerY - half);
        ctx.lineTo(x, centerY + half);
        ctx.stroke();
      }

      raf = window.requestAnimationFrame(render);
    };

    raf = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} className="qc-voice-canvas" aria-hidden="true" />;
}

export default function VoiceRecorder({ audio, onCancel, onStop }: VoiceRecorderProps) {
  return (
    <div className="qc-voice-recorder" role="group" aria-label="Voice recording controls">
      <div className="qc-voice-wave-shell">
        <p className="qc-voice-label">Listening</p>
        <VoiceWaveform audio={audio} />
      </div>

      <div className="qc-voice-controls">
        <button type="button" className="qc-voice-cancel" onClick={onCancel} aria-label="Cancel recording">
          <IconClose />
        </button>
        <button
          type="button"
          className="qc-voice-stop"
          aria-label="Stop recording and use transcript"
          onClick={onStop}
        >
          <IconCheckBig />
        </button>
      </div>
    </div>
  );
}
