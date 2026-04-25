"use client";

import { useEffect, useRef } from "react";
import type { ConversationTurn } from "./types";
import MessageBubble from "./MessageBubble";

type MessageListProps = {
  turns: ConversationTurn[];
  isSending: boolean;
};

export default function MessageList({ turns, isSending }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current || !tailRef.current) return;
    tailRef.current.scrollIntoView({ block: "end" });
  }, [turns, isSending]);

  return (
    <div className="qc-chat-list" ref={listRef}>
      {turns.map((turn) => (
        <MessageBubble key={turn.id} turn={turn} />
      ))}
      {isSending && (
        <article className="qc-chat-turn is-assistant is-pending" aria-live="polite">
          <p className="qc-chat-turn-text">QC is shaping this…</p>
        </article>
      )}
      <div ref={tailRef} />
    </div>
  );
}
