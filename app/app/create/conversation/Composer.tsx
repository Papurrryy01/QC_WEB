"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { IconArrowUp, IconMicrophone, IconPlus } from "@/app/components/icons/CoolIcons";
import type { EmotionState } from "../hooks/useEmotionState";
import type { AudioMetrics } from "../hooks/useAudioAnalyzer";
import PulseNode from "./PulseNode";
import VoiceRecorder from "./VoiceRecorder";

export type ComposerActionId =
  | "generate_background"
  | "generate_animated_moment"
  | "add_voiceover"
  | "choose_reveal_style"
  | "start_from_template"
  | "attach_media"
  | "save_draft";

const ACTION_ITEMS: Array<{ id: ComposerActionId; label: string; description: string }> = [
  {
    id: "generate_background",
    label: "Generate background",
    description: "Create a cinematic visual backdrop from your message direction.",
  },
  {
    id: "generate_animated_moment",
    label: "Generate animated moment",
    description: "Build a reveal-ready animation sequence from this conversation.",
  },
  {
    id: "add_voiceover",
    label: "Add voiceover",
    description: "Draft and attach an emotionally matched voice script.",
  },
  {
    id: "choose_reveal_style",
    label: "Choose reveal style",
    description: "Select how this moment opens, unfolds, and lands.",
  },
  {
    id: "start_from_template",
    label: "Start from template",
    description: "Inject a refined starter prompt and shape from there.",
  },
  {
    id: "attach_media",
    label: "Attach media",
    description: "Add photos, clips, or supporting visuals for this moment.",
  },
  {
    id: "save_draft",
    label: "Save draft",
    description: "Store the current direction and continue later.",
  },
];

type ComposerProps = {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  onActionSelect: (action: ComposerActionId) => void;
  onStartMic: () => void;
  onCancelMic: () => void;
  onStopMic: () => void;
  onStartLive: () => void;
  canSend: boolean;
  isSending: boolean;
  isLiveConnecting: boolean;
  speechSupported: boolean;
  speechState: "idle" | "listening" | "transcribing" | "ready" | "error" | "unsupported";
  audio: AudioMetrics;
  emotion: EmotionState;
  pulsePalette: { start: string; end: string; glow: string };
};

export default function Composer({
  value,
  onChange,
  onSend,
  onActionSelect,
  onStartMic,
  onCancelMic,
  onStopMic,
  onStartLive,
  canSend,
  isSending,
  isLiveConnecting,
  speechSupported,
  speechState,
  audio,
  emotion,
  pulsePalette,
}: ComposerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "0px";
    const nextHeight = Math.min(node.scrollHeight, 180);
    node.style.height = `${Math.max(44, nextHeight)}px`;
  }, [value]);

  const micListening = speechState === "listening";
  const isProcessing = speechState === "transcribing";
  const hasText = value.trim().length > 0;
  const showSend = hasText;
  const showLive = !hasText;

  const pulseState = micListening
    ? "listening"
    : isProcessing
      ? "processing"
      : isFocused || isHovered || hasText
        ? "proximity"
        : "idle";

  useEffect(() => {
    if (!isActionSheetOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!target || !(target instanceof Node)) return;
      if (!wrapperRef.current?.contains(target)) {
        setIsActionSheetOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsActionSheetOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActionSheetOpen]);

  return (
    <div ref={wrapperRef} className="qc-chat-composer-wrap">
      <AnimatePresence>
        {isActionSheetOpen ? (
          <motion.section
            key="composer-actions"
            className="qc-chat-plus-sheet"
            role="menu"
            aria-label="Moment actions"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <p className="qc-chat-plus-sheet-title">Moment actions</p>
            <div className="qc-chat-plus-sheet-list">
              {ACTION_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className="qc-chat-plus-item"
                  onClick={() => {
                    onActionSelect(item.id);
                    setIsActionSheetOpen(false);
                  }}
                >
                  <span className="qc-chat-plus-item-label">{item.label}</span>
                  <span className="qc-chat-plus-item-desc">{item.description}</span>
                </button>
              ))}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {micListening ? (
        <div className="qc-chat-composer is-recording">
          <VoiceRecorder audio={audio} onCancel={onCancelMic} onStop={onStopMic} />
        </div>
      ) : isProcessing ? (
        <div className="qc-chat-composer is-processing" aria-live="polite">
          <div className="qc-voice-processing">
            <PulseNode
              state="processing"
              emotion={emotion}
              palette={pulsePalette}
              audio={audio}
              onPress={onCancelMic}
            />
            <span className="qc-voice-spinner" aria-hidden="true" />
            <span>Processing voice</span>
          </div>
        </div>
      ) : (
        <div
          className="qc-chat-composer"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            type="button"
            className="qc-chat-plus"
            onClick={() => {
              setIsActionSheetOpen((previous) => !previous);
            }}
            disabled={isSending || isLiveConnecting}
            aria-haspopup="menu"
            aria-expanded={isActionSheetOpen}
            aria-label="Open moment actions"
          >
            <IconPlus />
          </button>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="qc-chat-input"
            placeholder="Say what you feel..."
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canSend) onSend();
              }
            }}
          />

          <div className={`qc-chat-mic${speechState === "ready" ? " is-ready" : ""}`}>
            <PulseNode
              state={pulseState}
              emotion={emotion}
              palette={pulsePalette}
              audio={audio}
              onPress={onStartMic}
              disabled={!speechSupported || isSending || isLiveConnecting}
            />
            <span className="qc-chat-mic-icon" aria-hidden="true">
              <IconMicrophone />
            </span>
          </div>

          <div className="qc-chat-right-slot">
            <AnimatePresence mode="wait" initial={false}>
              {showSend ? (
                <motion.button
                  key="send-action"
                  type="button"
                  className="qc-chat-send"
                  onClick={onSend}
                  disabled={!canSend}
                  aria-label={isSending ? "Sending message" : "Send message"}
                  initial={{ opacity: 0, x: 8, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -8, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  <IconArrowUp />
                </motion.button>
              ) : showLive ? (
                <motion.button
                  key="live-action"
                  type="button"
                  className={`qc-chat-live${isLiveConnecting ? " is-loading" : ""}`}
                  onClick={onStartLive}
                  disabled={isSending || isLiveConnecting}
                  aria-label={isLiveConnecting ? "Connecting to Live QC" : "Start live conversation with QC"}
                  initial={{ opacity: 0, x: 8, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -8, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  <span className="qc-chat-live-dot" aria-hidden="true" />
                  <span className="qc-chat-live-label">
                    {isLiveConnecting ? "Connecting" : "Live QC"}
                  </span>
                </motion.button>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
