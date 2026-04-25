"use client";

import type { ConversationTurn } from "./types";

type MessageBubbleProps = {
  turn: ConversationTurn;
};

export default function MessageBubble({ turn }: MessageBubbleProps) {
  const isUser = turn.role === "user";
  return (
    <article className={`qc-chat-turn ${isUser ? "is-user" : "is-assistant"}`}>
      <p className="qc-chat-turn-text">{turn.content}</p>
    </article>
  );
}
