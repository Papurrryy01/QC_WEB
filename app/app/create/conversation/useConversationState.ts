"use client";

import { useMemo, useState } from "react";
import {
  emptyConversationDirection,
  type ConversationResult,
} from "@/lib/ai/createMomentConversation";
import type { ConversationActions, ConversationState, ConversationTurn } from "./types";

function createTurnId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useConversationState(initialAssistantMessage: string): [ConversationState, ConversationActions] {
  const [state, setState] = useState<ConversationState>(() => ({
    turns: [{ id: createTurnId(), role: "assistant", content: initialAssistantMessage }],
    direction: emptyConversationDirection(),
    suggestedReplies: [],
    readyToProceed: false,
    isSending: false,
    error: null,
  }));

  const actions = useMemo<ConversationActions>(
    () => ({
      setSending(value) {
        setState((current) => ({ ...current, isSending: value }));
      },
      setError(message) {
        setState((current) => ({ ...current, error: message }));
      },
      appendUserTurn(content) {
        const userTurn: ConversationTurn = {
          id: createTurnId(),
          role: "user",
          content,
        };
        setState((current) => ({
          ...current,
          turns: [...current.turns, userTurn],
          suggestedReplies: [],
          error: null,
        }));
      },
      appendAssistantTurn(result: ConversationResult) {
        const assistantTurn: ConversationTurn = {
          id: createTurnId(),
          role: "assistant",
          content: result.assistantMessage,
        };

        setState((current) => ({
          ...current,
          turns: [...current.turns, assistantTurn],
          direction: result.direction,
          suggestedReplies: result.suggestedReplies ?? [],
          readyToProceed: result.readyToProceed,
        }));
      },
    }),
    []
  );

  return [state, actions];
}
