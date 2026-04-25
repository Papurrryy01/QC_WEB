import type {
  ConversationDirection,
  ConversationResult,
} from "@/lib/ai/createMomentConversation";

export type ConversationTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type ConversationState = {
  turns: ConversationTurn[];
  direction: ConversationDirection;
  suggestedReplies: string[];
  readyToProceed: boolean;
  isSending: boolean;
  error: string | null;
};

export type ConversationActions = {
  setSending: (value: boolean) => void;
  setError: (message: string | null) => void;
  appendUserTurn: (content: string) => void;
  appendAssistantTurn: (result: ConversationResult) => void;
};
