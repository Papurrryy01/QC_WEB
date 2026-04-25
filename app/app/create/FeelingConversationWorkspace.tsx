"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type ConversationDirection,
  type ConversationResult,
  type ConversationTurnPayload,
} from "@/lib/ai/createMomentConversation";
import { useAudioAnalyzer } from "./hooks/useAudioAnalyzer";
import { useEmotionState } from "./hooks/useEmotionState";
import { useRealtimeSession } from "./hooks/useRealtimeSession";
import { useRealtimeVoiceSession } from "./hooks/useRealtimeVoiceSession";
import { useSpeechToText } from "./useSpeechToText";
import GlassCardContainer from "./conversation/GlassCardContainer";
import ChatContainer from "./conversation/ChatContainer";
import MessageList from "./conversation/MessageList";
import LiveQcSessionPanel from "./conversation/LiveQcSessionPanel";
import Composer, { type ComposerActionId } from "./conversation/Composer";
import { useConversationState } from "./conversation/useConversationState";

type FeelingConversationWorkspaceProps = {
  recipientName: string;
  onClose: () => void;
  onApplyDirection: (payload: {
    direction: ConversationDirection;
    seededMessage: string;
  }) => void;
};

function mergeTranscript(existing: string, transcript: string) {
  const base = existing.trimEnd();
  const next = transcript.trim();
  if (!next) return base;
  if (!base) return next;
  return `${base} ${next}`;
}

function fallbackAssistantReply(text: string): ConversationResult {
  const lowered = text.toLowerCase();
  const likelySpanish = /\b(quiero|siento|gracias|amor|hola|como|digo|importa|mensaje)\b/.test(lowered);

  return {
    assistantMessage: likelySpanish
      ? "Suena a que quieres decir algo sincero sin que se sienta pesado. Quieres que lo mantengamos suave o un poco mas expresivo?"
      : "It sounds like you want this to feel sincere without feeling too heavy. Do you want it to stay soft, or be a little more expressive?",
    direction: {
      momentType: lowered.includes("birthday") ? "birthday" : "just_because",
      tone: lowered.includes("thank") || lowered.includes("gracias") ? "grateful" : "tender",
      mood: likelySpanish ? "calido" : "warm",
      intent: likelySpanish ? "expresar cuidado sin presion" : "express care without pressure",
      relationshipContext: null,
      communicationGoal: null,
      suggestedOpening: likelySpanish
        ? "He estado pensando en ti y queria decirte esto con calma..."
        : "I've been thinking about you, and I wanted to say this in a calm way...",
      draftDirection: likelySpanish
        ? "Una nota honesta, cercana y suave que se sienta personal."
        : "A soft, honest note that feels personal and grounded.",
      confidence: 0.76,
    },
    suggestedReplies: likelySpanish
      ? ["Mantenlo suave", "Hazlo mas expresivo", "Algo en medio"]
      : ["Keep it soft", "More expressive", "Somewhere in between"],
    readyToProceed: false,
  };
}

export default function FeelingConversationWorkspace({
  recipientName,
  onClose,
  onApplyDirection,
}: FeelingConversationWorkspaceProps) {
  const initialAssistant = useMemo(() => {
    if (recipientName.trim()) {
      return `Tell me how you want ${recipientName.trim()} to feel when they read this.`;
    }
    return "Tell me what you want them to feel. Say it naturally, I will help shape it.";
  }, [recipientName]);

  const [conversation, conversationActions] = useConversationState(initialAssistant);
  const [draftInput, setDraftInput] = useState("");
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [isLiveOpen, setIsLiveOpen] = useState(false);

  const {
    isSupported: speechSupported,
    state: speechState,
    transcript,
    speechLevel,
    detectedLanguage,
    error: speechError,
    startListening,
    stopListening,
    cancelListening,
    clearTranscript,
    retryTranscription,
  } = useSpeechToText();
  const realtimeSession = useRealtimeSession();
  const liveSession = useRealtimeVoiceSession();
  const {
    status: liveStatus,
    error: liveError,
    turns: liveTurns,
    assistantPartial: liveAssistantPartial,
    isMuted: liveMuted,
    connect: connectLive,
    disconnect: disconnectLive,
    toggleMute: toggleLiveMute,
  } = liveSession;

  const lastAppliedTranscriptRef = useRef("");
  const audioMetrics = useAudioAnalyzer(speechLevel, speechState === "listening" || speechState === "transcribing");

  const latestUserText =
    [...conversation.turns].reverse().find((turn) => turn.role === "user")?.content ?? "";
  const latestAssistantText =
    [...conversation.turns].reverse().find((turn) => turn.role === "assistant")?.content ?? "";

  const emotionState = useEmotionState({
    userText: draftInput || latestUserText,
    assistantText: latestAssistantText,
    audio: audioMetrics,
  });

  const handleCloseWorkspace = useCallback(() => {
    if (speechState === "listening" || speechState === "transcribing") {
      cancelListening();
    }
    disconnectLive();
    onClose();
  }, [cancelListening, disconnectLive, onClose, speechState]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseWorkspace();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleCloseWorkspace]);

  useEffect(() => {
    if (speechState !== "ready") return;
    const normalized = transcript.trim();
    if (!normalized) return;
    if (normalized === lastAppliedTranscriptRef.current) return;

    setDraftInput((previous) => mergeTranscript(previous, normalized));
    lastAppliedTranscriptRef.current = normalized;
    setStatusNote(
      detectedLanguage
        ? `Transcript ready (${detectedLanguage.toUpperCase()}). Edit or send.`
        : "Transcript ready. Edit or send."
    );
  }, [speechState, transcript, detectedLanguage]);

  const sendMessage = useCallback(
    async (nextInput?: string) => {
      const userText = (nextInput ?? draftInput).trim();
      if (!userText || conversation.isSending) return;

      const history: ConversationTurnPayload[] = conversation.turns
        .slice(-16)
        .map((turn) => ({ role: turn.role, content: turn.content }));

      conversationActions.setError(null);
      conversationActions.setSending(true);
      conversationActions.appendUserTurn(userText);
      setDraftInput("");
      setStatusNote(null);

      try {
        const response = await fetch("/api/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userText,
            history,
            direction: conversation.direction,
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { result?: ConversationResult; error?: string }
          | null;

        if (!response.ok || !payload?.result) {
          throw new Error(payload?.error ?? "Could not process this thought right now.");
        }

        conversationActions.appendAssistantTurn(payload.result);
      } catch {
        const fallback = fallbackAssistantReply(userText);
        conversationActions.appendAssistantTurn(fallback);
        conversationActions.setError("AI is temporarily unavailable. QC used local guidance for now.");
      } finally {
        conversationActions.setSending(false);
      }
    },
    [conversation.direction, conversation.isSending, conversation.turns, conversationActions, draftInput]
  );

  const seededMessage = useMemo(() => {
    const parts = [conversation.direction.suggestedOpening, conversation.direction.draftDirection].filter(
      (value): value is string => Boolean(value?.trim())
    );
    return parts.join("\n\n").trim();
  }, [conversation.direction.draftDirection, conversation.direction.suggestedOpening]);

  const canSend = draftInput.trim().length > 0 && !conversation.isSending;

  const handleComposerAction = useCallback(
    (action: ComposerActionId) => {
      if (action === "start_from_template") {
        setDraftInput((previous) =>
          previous.trim()
            ? previous
            : "I want this to feel honest and warm, like I care without sounding too intense."
        );
        setStatusNote("Template starter added.");
        return;
      }

      if (action === "save_draft") {
        try {
          const payload = {
            text: draftInput,
            direction: conversation.direction,
            timestamp: Date.now(),
          };
          window.localStorage.setItem("qc:create:feeling-draft", JSON.stringify(payload));
          setStatusNote("Draft saved.");
        } catch {
          setStatusNote("Could not save draft on this device.");
        }
        return;
      }

      const actionStatus: Record<Exclude<ComposerActionId, "save_draft" | "start_from_template">, string> = {
        generate_background: "Background generation queued from this direction.",
        generate_animated_moment: "Animated moment generation queued.",
        add_voiceover: "Voiceover generation opened for this draft.",
        choose_reveal_style: "Reveal style picker opened.",
        attach_media: "Media picker opened.",
      };

      setStatusNote(actionStatus[action]);
    },
    [conversation.direction, draftInput]
  );

  const handleStartLive = useCallback(async () => {
    if (isLiveOpen || liveStatus === "connecting" || liveStatus === "connected") {
      return;
    }

    if (speechState === "listening" || speechState === "transcribing") {
      cancelListening();
    }

    const session = await realtimeSession.createSession({
      languageHint: detectedLanguage ?? undefined,
      voice: "alloy",
    });

    if (!session?.clientSecret) {
      return;
    }

    const connected = await connectLive({
      clientSecret: session.clientSecret,
      model: session.model,
    });

    if (connected) {
      setIsLiveOpen(true);
      setStatusNote("Live QC is connected. Speak naturally.");
    }
  }, [
    cancelListening,
    detectedLanguage,
    isLiveOpen,
    connectLive,
    liveStatus,
    realtimeSession,
    speechState,
  ]);

  const handleEndLive = useCallback(() => {
    disconnectLive();
    setIsLiveOpen(false);
    setStatusNote("Live QC ended.");
  }, [disconnectLive]);

  return (
    <GlassCardContainer onClose={handleCloseWorkspace} title="Start from a feeling">
      <ChatContainer title="Start from a feeling" onClose={handleCloseWorkspace}>
        <div className="qc-chat-body">
          {isLiveOpen ? (
            <LiveQcSessionPanel
              status={liveStatus}
              turns={liveTurns}
              assistantPartial={liveAssistantPartial}
              isMuted={liveMuted}
              error={liveError}
              onToggleMute={toggleLiveMute}
              onEnd={handleEndLive}
            />
          ) : (
            <>
              <MessageList turns={conversation.turns} isSending={conversation.isSending} />

              <div className="qc-chat-inline-actions">
                {conversation.readyToProceed ? (
                  <>
                    <button
                      type="button"
                      className="qc-chat-action-chip is-primary"
                      onClick={() =>
                        onApplyDirection({
                          direction: conversation.direction,
                          seededMessage,
                        })
                      }
                    >
                      Use this
                    </button>
                    <button
                      type="button"
                      className="qc-chat-action-chip"
                      onClick={() => {
                        void sendMessage("Refine it a little more.");
                      }}
                      disabled={conversation.isSending}
                    >
                      Refine
                    </button>
                  </>
                ) : conversation.suggestedReplies.length > 0 ? (
                  conversation.suggestedReplies.map((reply) => (
                    <button
                      key={reply}
                      type="button"
                      className="qc-chat-action-chip"
                      onClick={() => {
                        void sendMessage(reply);
                      }}
                      disabled={conversation.isSending}
                    >
                      {reply}
                    </button>
                  ))
                ) : null}
              </div>

              <div className="qc-chat-meta" aria-live="polite">
                {!speechSupported && <span>Voice input is unavailable in this browser.</span>}
                {statusNote && <span>{statusNote}</span>}
                {speechError && (
                  <span>
                    {speechError}{" "}
                    <button
                      type="button"
                      className="qc-create-voice-retry"
                      onClick={() => {
                        void retryTranscription();
                      }}
                    >
                      Retry
                    </button>
                  </span>
                )}
                {conversation.error && <span>{conversation.error}</span>}
                {realtimeSession.error && <span>{realtimeSession.error}</span>}
                {liveError && <span>{liveError}</span>}
              </div>
            </>
          )}
        </div>

        {!isLiveOpen ? (
          <Composer
            value={draftInput}
            onChange={(next) => setDraftInput(next)}
            onSend={() => {
              void sendMessage();
            }}
            onActionSelect={handleComposerAction}
            onStartMic={() => {
              if (!speechSupported) return;
              if (speechState === "ready") {
                clearTranscript();
              }
              void startListening();
            }}
            onCancelMic={() => {
              cancelListening();
            }}
            onStopMic={() => {
              stopListening();
            }}
            onStartLive={() => {
              void handleStartLive();
            }}
            canSend={canSend}
            isSending={conversation.isSending}
            isLiveConnecting={
              realtimeSession.status === "loading" || liveStatus === "connecting"
            }
            speechSupported={speechSupported}
            speechState={speechState}
            audio={audioMetrics}
            emotion={emotionState.state}
            pulsePalette={emotionState.palette}
          />
        ) : null}
      </ChatContainer>
    </GlassCardContainer>
  );
}
