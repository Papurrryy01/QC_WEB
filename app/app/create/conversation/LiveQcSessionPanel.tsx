"use client";

import { useEffect, useRef } from "react";
import type { LiveTurn, RealtimeVoiceStatus } from "../hooks/useRealtimeVoiceSession";

type LiveQcSessionPanelProps = {
  status: RealtimeVoiceStatus;
  turns: LiveTurn[];
  assistantPartial: string;
  isMuted: boolean;
  error: string | null;
  onToggleMute: () => void;
  onEnd: () => void;
};

function statusLabel(status: RealtimeVoiceStatus) {
  if (status === "connecting") return "Connecting";
  if (status === "connected") return "Live";
  if (status === "error") return "Issue";
  return "Idle";
}

export default function LiveQcSessionPanel({
  status,
  turns,
  assistantPartial,
  isMuted,
  error,
  onToggleMute,
  onEnd,
}: LiveQcSessionPanelProps) {
  const tailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tailRef.current?.scrollIntoView({ block: "end" });
  }, [turns, assistantPartial, status, error]);

  return (
    <section className="qc-live-stage" aria-label="Live QC voice session">
      <header className="qc-live-stage-head">
        <div className="qc-live-stage-heading">
          <p className="qc-live-stage-kicker">Live session</p>
          <h3 className="qc-live-stage-title">Talk with QC</h3>
        </div>
        <span className={`qc-live-stage-status is-${status}`}>{statusLabel(status)}</span>
      </header>

      <div className="qc-live-stage-list" aria-live="polite">
        {turns.length === 0 && status === "connecting" ? (
          <p className="qc-live-stage-empty">Setting up your live session…</p>
        ) : null}
        {turns.length === 0 && status === "connected" ? (
          <p className="qc-live-stage-empty">Speak naturally. QC is listening.</p>
        ) : null}

        {turns.map((turn) => (
          <article
            key={turn.id}
            className={`qc-chat-turn qc-live-turn ${turn.role === "user" ? "is-user" : "is-assistant"}`}
          >
            <p className="qc-chat-turn-text">{turn.text}</p>
          </article>
        ))}

        {assistantPartial.trim() ? (
          <article className="qc-chat-turn qc-live-turn is-assistant is-pending">
            <p className="qc-chat-turn-text">{assistantPartial}</p>
          </article>
        ) : null}

        {error ? <p className="qc-live-stage-error">{error}</p> : null}
        <div ref={tailRef} />
      </div>

      <footer className="qc-live-stage-controls">
        <button type="button" className="qc-live-control" onClick={onToggleMute}>
          {isMuted ? "Unmute mic" : "Mute mic"}
        </button>
        <button type="button" className="qc-live-control is-danger" onClick={onEnd}>
          End live
        </button>
      </footer>
    </section>
  );
}
