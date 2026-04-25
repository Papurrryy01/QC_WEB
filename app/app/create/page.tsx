"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { ConversationDirection } from "@/lib/ai/createMomentConversation";
import {
  detectCurrentTimezone,
  formatAbsoluteInTimezone,
  formatArrivalLine as formatArrivalLineWithTimezone,
  formatTimingPill as formatTimingPillWithTimezone,
  toUtcIsoFromLocalParts,
} from "@/lib/momentScheduling";
import { getTimezoneOptions, toFriendlyTimezoneLabel } from "@/lib/timezone";
import FeelingConversationWorkspace from "./FeelingConversationWorkspace";

type MomentPayload = {
  recipient_email: string | null;
  recipient_phone: string | null;
  message_body: string | null;
  scheduled_for_utc: string | null;
  delivery_timezone: string | null;
  category: string | null;
};

type MomentApiResponse = {
  error?: string;
  moment?: {
    id: string;
    status: "draft" | "published" | "sent";
  };
};

type Step = 1 | 2 | 3 | 4 | 5 | 6;
type MomentCategoryValue = "JUST BECAUSE" | "BIRTHDAY" | "ANNIVERSARY";
type ToneValue = "Tender" | "Playful" | "Grateful" | "Celebratory";
type EmotionalLayerBlock = "visual" | "voice" | "atmosphere";
type EmotionalLayerMood = "neutral" | "warm" | "cool" | "mixed";

const DEFAULT_CATEGORY: MomentCategoryValue = "JUST BECAUSE";
const DEFAULT_TONE: ToneValue = "Tender";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const MOMENT_TYPE_OPTIONS: Array<{
  value: MomentCategoryValue;
  label: string;
  description: string;
}> = [
  { value: "JUST BECAUSE", label: "Just because", description: "A quiet, meaningful surprise." },
  { value: "BIRTHDAY", label: "Birthday", description: "Celebrate the day with intention." },
  { value: "ANNIVERSARY", label: "Anniversary", description: "Honor shared milestones." },
];

const TONE_OPTIONS: Array<{ value: ToneValue; label: string }> = [
  { value: "Tender", label: "Tender" },
  { value: "Playful", label: "Playful" },
  { value: "Grateful", label: "Grateful" },
  { value: "Celebratory", label: "Celebratory" },
];

const QUICK_STARTERS = [
  "Thank you for...",
  "I've been thinking about...",
  "I'm proud of you for...",
  "I miss...",
];

const AI_ACTIONS = [
  { id: "tone", label: "Improve tone" },
  { id: "deeper", label: "Make it deeper" },
  { id: "shorter", label: "Shorten" },
  { id: "emotional", label: "Make it more emotional" },
  { id: "clearer", label: "Make it clearer" },
] as const;

type AiActionId = (typeof AI_ACTIONS)[number]["id"];

const STEP_LABELS: Record<Step, string> = {
  1: "Recipient",
  2: "Moment type",
  3: "Message",
  4: "Media + voice",
  5: "Schedule",
  6: "Preview",
};

const STEP_HERO: Record<Step, { kicker: string; title: string; subtitle: string }> = {
  1: {
    kicker: "Create moment",
    title: "Who is this for?",
    subtitle: "Start with a recipient. Everything else can follow.",
  },
  2: {
    kicker: "Create moment",
    title: "Choose the moment type",
    subtitle: "Set the tone before writing.",
  },
  3: {
    kicker: "Create moment",
    title: "Start composing",
    subtitle: "Say what matters. We'll help you shape it.",
  },
  4: {
    kicker: "Create moment",
    title: "Build the emotional layer",
    subtitle: "Add media, voice, and atmosphere.",
  },
  5: {
    kicker: "Create moment",
    title: "Set delivery timing",
    subtitle: "Choose the exact date and time.",
  },
  6: {
    kicker: "Step 6 of 6",
    title: "Review before sending",
    subtitle: "Make sure everything looks right before your moment goes live.",
  },
};

const LAYER_ORDER: EmotionalLayerBlock[] = ["visual", "voice", "atmosphere"];

function summarizeLayerValue(value: string, max = 108) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max).trim()}...`;
}

function inferEmotionalLayerMood(input: {
  message: string;
  mediaPlan: string;
  voicePlan: string;
  musicPlan: string;
  tone: ToneValue;
}): EmotionalLayerMood {
  const corpus = `${input.message} ${input.mediaPlan} ${input.voicePlan} ${input.musicPlan}`.toLowerCase();
  const warmHits =
    (corpus.match(/\b(warm|sunset|golden|love|grateful|celebrate|celebration|tender|hug|heart)\b/g)?.length ?? 0) +
    (input.tone === "Tender" || input.tone === "Grateful" || input.tone === "Celebratory" ? 1 : 0);
  const coolHits =
    (corpus.match(/\b(cool|night|midnight|calm|quiet|gentle|reflective|blue|soft|dusk)\b/g)?.length ?? 0) +
    (input.tone === "Playful" ? 1 : 0);

  if (warmHits > 0 && coolHits > 0) return "mixed";
  if (warmHits > coolHits) return "warm";
  if (coolHits > warmHits) return "cool";
  return "neutral";
}

function rewriteMessage(text: string, action: AiActionId, tone: ToneValue) {
  const base = text.trim();
  if (!base) return base;

  if (action === "clearer") {
    return base
      .replace(/\s+/g, " ")
      .replace(/ ,/g, ",")
      .replace(/ \./g, ".")
      .trim();
  }

  if (action === "shorter") {
    const sentences = base.split(/(?<=[.!?])\s+/).filter(Boolean);
    const shorter = sentences.slice(0, 2).join(" ");
    return shorter.length > 220 ? `${shorter.slice(0, 217).trim()}...` : shorter;
  }

  if (action === "deeper") {
    if (/means to me|from my heart|deeply/i.test(base)) return base;
    return `${base}\n\nI wanted you to know how deeply this moment means to me.`;
  }

  if (action === "emotional") {
    if (/heart|love|feel|means/i.test(base)) return `${base}\n\nThis comes from the heart.`;
    return `${base}\n\nI really feel this, and I wanted you to hear it from me.`;
  }

  if (action === "tone") {
    if (tone === "Playful") return `This made me smile, so I had to send it your way.\n\n${base}`;
    if (tone === "Grateful") return `I'm genuinely grateful for you.\n\n${base}`;
    if (tone === "Celebratory") return `This deserves to be celebrated.\n\n${base}`;
    return `I wanted to share this with care.\n\n${base}`;
  }

  return base;
}

function toMomentPayload({
  recipientEmail,
  message,
  date,
  time,
  deliveryTimezone,
  category,
}: {
  recipientEmail: string;
  message: string;
  date: string;
  time: string;
  deliveryTimezone: string;
  category: string;
}) {
  const normalizedEmail = recipientEmail.trim().toLowerCase();
  const normalizedMessage = message.trim();
  const scheduledForIso = toUtcIsoFromLocalParts({
    date,
    time,
    timezone: deliveryTimezone,
  });

  const payload: MomentPayload = {
    recipient_email: normalizedEmail || null,
    // Keep legacy field populated for existing views still reading recipient_phone.
    recipient_phone: normalizedEmail || null,
    message_body: normalizedMessage || null,
    scheduled_for_utc: scheduledForIso,
    delivery_timezone: deliveryTimezone.trim() || null,
    category: category.trim() || null,
  };

  return payload;
}

function formatPreviewSchedule(value: string | null, timezone: string) {
  return formatAbsoluteInTimezone(value, timezone, {
    includeWeekday: true,
    includeYear: true,
    includeTimezone: true,
  });
}

function normalizeStepSixError(message: string) {
  if (/schema cache|column/i.test(message)) {
    return {
      userMessage: "Moment settings are syncing. Please try again in a few seconds.",
      technical: message,
    };
  }

  if (/required/i.test(message)) {
    return {
      userMessage: "A few required details are missing. Please review before scheduling.",
      technical: message,
    };
  }

  return {
    userMessage: "Could not schedule this moment right now. Please try again.",
    technical: message,
  };
}

export default function CreateMomentPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [category, setCategory] = useState<MomentCategoryValue>(DEFAULT_CATEGORY);
  const [templateTone, setTemplateTone] = useState<ToneValue>(DEFAULT_TONE);
  const [message, setMessage] = useState("");
  const [mediaPlan, setMediaPlan] = useState("");
  const [voicePlan, setVoicePlan] = useState("");
  const [musicPlan, setMusicPlan] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [deliveryTimezone, setDeliveryTimezone] = useState(() => detectCurrentTimezone());
  const [conversationOpen, setConversationOpen] = useState(false);
  const [activeLayerBlock, setActiveLayerBlock] = useState<EmotionalLayerBlock>("visual");
  const [layerNote, setLayerNote] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [aiPending, setAiPending] = useState<AiActionId | null>(null);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"send" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);

  const isBusy = loadingAction !== null || aiPending !== null;
  const totalSteps = 6;
  const normalizedRecipientEmail = recipientEmail.trim().toLowerCase();
  const hasValidRecipientEmail = EMAIL_REGEX.test(normalizedRecipientEmail);
  const hasMeaningfulInput =
    recipientName.trim().length > 0 ||
    recipientEmail.trim().length > 0 ||
    message.trim().length > 0 ||
    mediaPlan.trim().length > 0 ||
    voicePlan.trim().length > 0 ||
    musicPlan.trim().length > 0 ||
    date.length > 0 ||
    time.length > 0 ||
    deliveryTimezone.trim().length > 0 ||
    category !== DEFAULT_CATEGORY ||
    templateTone !== DEFAULT_TONE;

  const stepComplete = useMemo(() => {
    return {
      1: hasValidRecipientEmail,
      2: category.trim().length > 0 && templateTone.trim().length > 0,
      3: message.trim().length > 0,
      4: true,
      5: date.length > 0 && time.length > 0 && deliveryTimezone.trim().length > 0,
      6: false,
    } as Record<Step, boolean>;
  }, [hasValidRecipientEmail, category, templateTone, message, date, time, deliveryTimezone]);

  const isSendReady =
    hasValidRecipientEmail &&
    message.trim().length > 0 &&
    date.length > 0 &&
    time.length > 0 &&
    deliveryTimezone.trim().length > 0;

  const layerCompletion = useMemo(
    () =>
      ({
        visual: mediaPlan.trim().length > 0,
        voice: voicePlan.trim().length > 0,
        atmosphere: musicPlan.trim().length > 0,
      }) satisfies Record<EmotionalLayerBlock, boolean>,
    [mediaPlan, musicPlan, voicePlan]
  );

  const completedLayerCount = useMemo(
    () => LAYER_ORDER.filter((block) => layerCompletion[block]).length,
    [layerCompletion]
  );

  const nextIncompleteLayer = useMemo(
    () => LAYER_ORDER.find((block) => !layerCompletion[block]) ?? null,
    [layerCompletion]
  );

  const stepFourCtaLabel = useMemo(() => {
    if (completedLayerCount >= 3) return "Bring it to life →";
    if (completedLayerCount >= 2) return "Preview your moment →";
    return "Continue building →";
  }, [completedLayerCount]);

  const layerMood = useMemo(
    () =>
      inferEmotionalLayerMood({
        message,
        mediaPlan,
        voicePlan,
        musicPlan,
        tone: templateTone,
      }),
    [message, mediaPlan, musicPlan, templateTone, voicePlan]
  );

  const ensureAuthenticated = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabaseBrowser.auth.getUser();

    if (userError || !user) {
      throw new Error("You must be logged in to continue.");
    }
  }, []);

  const saveDraft = useCallback(async (): Promise<string> => {
    const payload = toMomentPayload({
      recipientEmail,
      message,
      date,
      time,
      deliveryTimezone,
      category,
    });
    const endpoint = draftId ? `/api/moments/${draftId}` : "/api/moments";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const response = (await res.json().catch(() => null)) as MomentApiResponse | null;

    if (!res.ok) {
      throw new Error(response?.error ?? "Failed to save draft.");
    }

    const id = response?.moment?.id ?? draftId;
    if (!id) {
      throw new Error("Draft saved but no id was returned.");
    }

    setDraftId(id);
    return id;
  }, [recipientEmail, message, date, time, deliveryTimezone, category, draftId]);

  const callAi = useCallback(
    async <T,>(payload: Record<string, unknown>) => {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as { result?: T; error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "AI request failed.");
      }
      if (!data?.result) {
        throw new Error("AI response was empty.");
      }
      return data.result;
    },
    []
  );

  async function handleSend() {
    if (isBusy) return;

    setLoadingAction("send");
    setError(null);
    setReviewNotice(null);

    try {
      await ensureAuthenticated();

      if (!isSendReady) {
        throw new Error("Recipient email, message, date, time, and timezone are required.");
      }

      const id = await saveDraft();
      const sendRes = await fetch(`/api/moments/${id}/publish`, {
        method: "POST",
      });

      const sendPayload = (await sendRes.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!sendRes.ok) {
        throw new Error(sendPayload?.error ?? "Failed to send moment.");
      }

      router.push(`/app/moments/${id}?sent=1`);
      router.refresh();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send moment.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleSaveDraftNow() {
    if (isBusy) return;

    setLoadingAction("save");
    setError(null);
    setReviewNotice(null);

    try {
      await ensureAuthenticated();
      await saveDraft();
      setReviewNotice("Draft saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save draft.");
    } finally {
      setLoadingAction(null);
    }
  }

  function goNextStep() {
    if (step === 6) return;
    if (!stepComplete[step]) {
      setError("Complete the current step first.");
      return;
    }
    setError(null);
    setStep((prev) => (Math.min(6, prev + 1) as Step));
  }

  function handleContinueStep() {
    if (step === 4) {
      if (completedLayerCount < 2) {
        setLayerNote("Add one more layer so QC can preview the full emotional direction.");
        setError(null);
        setActiveLayerBlock(nextIncompleteLayer ?? "visual");
        return;
      }

      setLayerNote(null);
    }

    goNextStep();
  }

  function goPreviousStep() {
    if (step === 1) return;
    setError(null);
    setStep((prev) => (Math.max(1, prev - 1) as Step));
  }

  function handleApplyConversationDirection(payload: {
    direction: ConversationDirection;
    seededMessage: string;
  }) {
    const nextCategory: MomentCategoryValue =
      payload.direction.momentType === "birthday"
        ? "BIRTHDAY"
        : payload.direction.momentType === "anniversary"
          ? "ANNIVERSARY"
          : "JUST BECAUSE";

    const nextTone: ToneValue =
      payload.direction.tone === "playful"
        ? "Playful"
        : payload.direction.tone === "grateful"
          ? "Grateful"
          : payload.direction.tone === "celebratory"
            ? "Celebratory"
            : "Tender";

    setCategory(nextCategory);
    setTemplateTone(nextTone);
    setMessage((current) => {
      if (current.trim()) return current;
      return payload.seededMessage.trim();
    });
    setConversationOpen(false);
    setError(null);
    setStep(3);
  }

  function handleAssistAction(action: "full_scene" | "flow" | "build") {
    const recipient = recipientName.trim() || "them";
    const toneWord = templateTone.toLowerCase();

    if (action === "full_scene") {
      setMediaPlan((current) =>
        current.trim()
          ? current
          : `Soft cinematic visuals focused on ${recipient}, with ${toneWord} pacing and warm transitions.`
      );
      setVoicePlan((current) =>
        current.trim()
          ? current
          : `Steady voice delivery with a calm pace, slight pauses, and a ${toneWord} emotional lift at the end.`
      );
      setMusicPlan((current) =>
        current.trim()
          ? current
          : "Ambient piano and gentle textures, low volume, no heavy percussion."
      );
      setLayerNote("QC drafted a full scene direction. Refine any layer you want.");
      return;
    }

    if (action === "flow") {
      setMediaPlan((current) =>
        current.trim()
          ? current
          : "Start with a quiet reveal, then move into close personal details and soft light."
      );
      setVoicePlan((current) =>
        current.trim()
          ? current
          : "Open softly, deepen in the middle, then close with reassurance."
      );
      setLayerNote("QC suggested an emotional flow across visual and voice layers.");
      return;
    }

    setMediaPlan((current) =>
      current.trim()
        ? current
        : `A curated visual sequence that feels ${toneWord}, intentional, and personal.`
    );
    setVoicePlan((current) =>
      current.trim()
        ? current
        : "A human, grounded voice guide that keeps the message intimate."
    );
    setMusicPlan((current) =>
      current.trim()
        ? current
        : "Subtle atmospheric bed to support emotion without distracting from the message."
    );
    setLayerNote("QC built a starter layer set for you.");
  }

  function handleUseStarter(starter: string) {
    setMessage((current) => {
      const trimmed = current.trimEnd();
      if (!trimmed) return `${starter} `;
      return `${trimmed}\n${starter} `;
    });
  }

  async function handleAiAction(action: AiActionId) {
    if (!message.trim()) {
      setError("Start with a message first, then refine it.");
      return;
    }
    setError(null);
    setAiPending(action);
    try {
      const result = await callAi<string>({
        mode: "refine",
        action,
        tone: templateTone,
        text: message,
      });
      setMessage(result.trim() || message);
    } catch {
      setMessage((current) => rewriteMessage(current, action, templateTone));
    } finally {
      setAiPending(null);
    }
  }

  useEffect(() => {
    if (!hasMeaningfulInput) return;
    if (isBusy) return;

    const timer = window.setTimeout(async () => {
      try {
        setIsAutoSaving(true);
        await ensureAuthenticated();
        await saveDraft();
      } catch {
        // Keep autosave silent to avoid interrupting composition.
      } finally {
        setIsAutoSaving(false);
      }
    }, 1300);

    return () => window.clearTimeout(timer);
  }, [ensureAuthenticated, hasMeaningfulInput, isBusy, saveDraft]);

  useEffect(() => {
    if (step !== 4) {
      setLayerNote(null);
    }
  }, [step]);

  const scheduledIso = toMomentPayload({
    recipientEmail,
    message,
    date,
    time,
    deliveryTimezone,
    category,
  }).scheduled_for_utc;
  const scheduledPreviewLabel = formatPreviewSchedule(scheduledIso, deliveryTimezone);
  const scheduledArrivalLine = formatArrivalLineWithTimezone(scheduledIso, deliveryTimezone);
  const scheduledTimingPill = formatTimingPillWithTimezone(scheduledIso, deliveryTimezone);
  const previewRecipientLabel =
    recipientName.trim() ||
    normalizedRecipientEmail.split("@")[0]?.trim() ||
    "your person";
  const deliveryTimezoneLabel = toFriendlyTimezoneLabel(deliveryTimezone);
  const reviewStatusLabel = isSendReady ? "Ready to schedule" : "Needs attention";
  const reviewError = step === 6 && error ? normalizeStepSixError(error) : null;
  const createFlowVariantClass =
    step === 4 ? ` qc-create-flow--${layerMood}` : step === 6 ? " qc-create-flow--review" : "";
  const hero = STEP_HERO[step];

  return (
    <div className={`qc-app-section qc-create-flow${createFlowVariantClass}`}>
      <section className="qc-card qc-card--hero qc-create-hero">
        <div className="qc-create-hero-head">
          <button
            type="button"
            onClick={goPreviousStep}
            className="qc-create-back"
            disabled={step === 1 || isBusy}
            aria-label="Go to previous step"
          >
            <span aria-hidden="true">←</span>
          </button>
          <div className="qc-create-hero-copy-wrap">
            <p className="qc-kicker">{hero.kicker}</p>
            <h1 className="qc-heading-xl qc-create-hero-title">{hero.title}</h1>
            <p className="qc-copy qc-create-hero-copy">{hero.subtitle}</p>
          </div>
        </div>
        {step !== 6 && (
          <p className="qc-create-progress-label">
            Step {step} of {totalSteps} · {STEP_LABELS[step]}
          </p>
        )}
      </section>

      <section className="qc-card">
        {step === 1 && (
          <div className="qc-form-grid qc-create-step">
            <div className="qc-form-grid qc-form-grid--2 qc-create-input-grid">
              <div className="qc-create-field">
                <label className="qc-create-field-label" htmlFor="recipient-name">Name</label>
                <input
                  id="recipient-name"
                  value={recipientName}
                  onChange={(event) => setRecipientName(event.target.value)}
                  placeholder="Name (optional)"
                  className="qc-input"
                />
              </div>
              <div className="qc-create-field">
                <label className="qc-create-field-label" htmlFor="recipient-email">Email *</label>
                <input
                  id="recipient-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={recipientEmail}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                  placeholder="recipient@email.com"
                  className="qc-input"
                />
              </div>
            </div>
            <p className="qc-copy qc-create-helper">They&apos;ll receive a private email link.</p>
            {recipientName.trim() && (
              <p className="qc-copy qc-create-emotion">
                Creating something for {recipientName.trim()}...
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="qc-form-grid qc-create-step">
            <div className="qc-create-choice-block">
              <p className="qc-create-field-label">Moment type</p>
              <div className="qc-create-pill-grid" role="radiogroup" aria-label="Select moment type">
                {MOMENT_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={category === option.value}
                    className={`qc-create-pill-card ${category === option.value ? "is-selected" : ""}`}
                    onClick={() => setCategory(option.value)}
                  >
                    <span className="qc-create-pill-title">{option.label}</span>
                    <span className="qc-create-pill-copy">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="qc-create-choice-block">
              <p className="qc-create-field-label">Tone</p>
              <div className="qc-create-pill-row" role="radiogroup" aria-label="Select tone">
                {TONE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={templateTone === option.value}
                    className={`qc-create-pill ${templateTone === option.value ? "is-selected" : ""}`}
                    onClick={() => setTemplateTone(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="qc-copy qc-create-emotion">
              This will feel {templateTone.toLowerCase()} and personal.
            </p>

            <button
              type="button"
              className="qc-create-express-trigger"
              onClick={() => {
                setConversationOpen(true);
                setError(null);
              }}
            >
              Start from a feeling
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="qc-form-grid qc-create-step">
            {recipientName.trim() && (
              <p className="qc-copy qc-create-writing-to">
                Writing to {recipientName.trim()}...
              </p>
            )}
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="What do you wish they truly understood?"
              className="qc-textarea qc-compose-textarea"
            />
            <div className="qc-create-chip-wrap">
              {QUICK_STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  className="qc-create-chip"
                  onClick={() => handleUseStarter(starter)}
                >
                  {starter}
                </button>
              ))}
            </div>
            <div className="qc-create-ai-block">
              <p className="qc-create-field-label">Refine with AI</p>
              <div className="qc-create-chip-wrap">
                {AI_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="qc-create-chip qc-create-chip--ai"
                    onClick={() => handleAiAction(action.id)}
                    disabled={aiPending !== null}
                  >
                    {aiPending === action.id ? "Refining..." : action.label}
                  </button>
                ))}
              </div>
            </div>
            {message.length > 0 && <p className="qc-copy">{message.length} characters</p>}
          </div>
        )}

        {step === 4 && (
          <div className="qc-form-grid qc-create-step qc-layer-builder">
            <section className="qc-layer-assist">
              <p className="qc-layer-assist-title">Need help building this?</p>
              <div className="qc-layer-assist-actions">
                <button type="button" className="qc-create-chip qc-create-chip--ai" onClick={() => handleAssistAction("full_scene")}>
                  Generate full scene
                </button>
                <button type="button" className="qc-create-chip qc-create-chip--ai" onClick={() => handleAssistAction("flow")}>
                  Suggest emotional flow
                </button>
                <button type="button" className="qc-create-chip qc-create-chip--ai" onClick={() => handleAssistAction("build")}>
                  Build for me
                </button>
              </div>
            </section>

            <div className="qc-layer-stack">
              <motion.article
                layout
                className={`qc-layer-block ${activeLayerBlock === "visual" ? "is-active" : ""} ${
                  layerCompletion.visual ? "is-complete" : ""
                }`}
              >
                <button
                  type="button"
                  className="qc-layer-head"
                  onClick={() => setActiveLayerBlock("visual")}
                >
                  <div>
                    <p className="qc-layer-kicker">Visual story</p>
                    <p className="qc-layer-title">What should they see when this moment begins?</p>
                  </div>
                  <span className={`qc-layer-status ${layerCompletion.visual ? "is-complete" : ""}`}>
                    {layerCompletion.visual ? "Ready" : "Open"}
                  </span>
                </button>
                <AnimatePresence initial={false} mode="wait">
                  {activeLayerBlock === "visual" ? (
                    <motion.div
                      key="visual-expanded"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="qc-layer-body"
                    >
                      <textarea
                        id="media-plan"
                        value={mediaPlan}
                        onChange={(event) => setMediaPlan(event.target.value)}
                        onFocus={() => setActiveLayerBlock("visual")}
                        placeholder="Describe the opening visuals, mood, and movement."
                        className="qc-textarea qc-layer-textarea"
                      />
                      <div className="qc-layer-actions">
                        <button
                          type="button"
                          className="qc-create-chip"
                          onClick={() =>
                            setMediaPlan((current) =>
                              current.trim()
                                ? current
                                : "Soft opening frame, close personal details, and warm cinematic transitions."
                            )
                          }
                        >
                          + Generate background
                        </button>
                        <button
                          type="button"
                          className="qc-create-chip"
                          onClick={() =>
                            setMediaPlan((current) =>
                              current.trim()
                                ? current
                                : "Gentle close-ups, ambient light, and subtle depth motion."
                            )
                          }
                        >
                          + Suggest visuals
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.p
                      key="visual-collapsed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="qc-layer-preview"
                    >
                      {layerCompletion.visual
                        ? summarizeLayerValue(mediaPlan)
                        : "Tap to build this layer."}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.article>

              <motion.article
                layout
                className={`qc-layer-block ${activeLayerBlock === "voice" ? "is-active" : ""} ${
                  layerCompletion.voice ? "is-complete" : ""
                }`}
              >
                <button
                  type="button"
                  className="qc-layer-head"
                  onClick={() => setActiveLayerBlock("voice")}
                >
                  <div>
                    <p className="qc-layer-kicker">Voice & emotion</p>
                    <p className="qc-layer-title">How should this feel when heard?</p>
                  </div>
                  <span className={`qc-layer-status ${layerCompletion.voice ? "is-complete" : ""}`}>
                    {layerCompletion.voice ? "Ready" : "Open"}
                  </span>
                </button>
                <AnimatePresence initial={false} mode="wait">
                  {activeLayerBlock === "voice" ? (
                    <motion.div
                      key="voice-expanded"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="qc-layer-body"
                    >
                      <textarea
                        id="voice-plan"
                        value={voicePlan}
                        onChange={(event) => setVoicePlan(event.target.value)}
                        onFocus={() => setActiveLayerBlock("voice")}
                        placeholder="Describe pace, warmth, and delivery style."
                        className="qc-textarea qc-layer-textarea"
                      />
                      <div className="qc-layer-actions">
                        <button
                          type="button"
                          className="qc-create-chip"
                          onClick={() =>
                            setVoicePlan((current) =>
                              current.trim()
                                ? current
                                : "Warm, steady tone with pauses after meaningful lines."
                            )
                          }
                        >
                          🎙 Record voice
                        </button>
                        <button
                          type="button"
                          className="qc-create-chip"
                          onClick={() =>
                            setVoicePlan((current) =>
                              current.trim()
                                ? current
                                : "Keep the voice intimate, clear, and softly expressive."
                            )
                          }
                        >
                          ✨ Let QC shape it
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.p
                      key="voice-collapsed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="qc-layer-preview"
                    >
                      {layerCompletion.voice
                        ? summarizeLayerValue(voicePlan)
                        : "Tap to build this layer."}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.article>

              <motion.article
                layout
                className={`qc-layer-block ${activeLayerBlock === "atmosphere" ? "is-active" : ""} ${
                  layerCompletion.atmosphere ? "is-complete" : ""
                }`}
              >
                <button
                  type="button"
                  className="qc-layer-head"
                  onClick={() => setActiveLayerBlock("atmosphere")}
                >
                  <div>
                    <p className="qc-layer-kicker">Atmosphere</p>
                    <p className="qc-layer-title">What should this feel like in the background?</p>
                  </div>
                  <span className={`qc-layer-status ${layerCompletion.atmosphere ? "is-complete" : ""}`}>
                    {layerCompletion.atmosphere ? "Ready" : "Open"}
                  </span>
                </button>
                <AnimatePresence initial={false} mode="wait">
                  {activeLayerBlock === "atmosphere" ? (
                    <motion.div
                      key="atmosphere-expanded"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="qc-layer-body"
                    >
                      <input
                        id="music-plan"
                        value={musicPlan}
                        onChange={(event) => setMusicPlan(event.target.value)}
                        onFocus={() => setActiveLayerBlock("atmosphere")}
                        placeholder="Ambient piano, airy textures, or no music."
                        className="qc-input"
                      />
                      <div className="qc-layer-actions">
                        <button
                          type="button"
                          className="qc-create-chip"
                          onClick={() =>
                            setMusicPlan((current) =>
                              current.trim()
                                ? current
                                : "Suggest music: soft piano with warm ambient bed."
                            )
                          }
                        >
                          + Suggest music
                        </button>
                        <button
                          type="button"
                          className="qc-create-chip"
                          onClick={() =>
                            setMusicPlan((current) =>
                              current.trim()
                                ? current
                                : "Ambient tone: calm, cinematic, low intensity."
                            )
                          }
                        >
                          + Ambient tone
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.p
                      key="atmosphere-collapsed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="qc-layer-preview"
                    >
                      {layerCompletion.atmosphere
                        ? summarizeLayerValue(musicPlan)
                        : "Tap to build this layer."}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.article>
            </div>

            {layerNote ? <p className="qc-copy qc-layer-note">{layerNote}</p> : null}
          </div>
        )}

        {step === 5 && (
          <div className="qc-form-grid">
            <h2 className="qc-heading-lg">Set delivery date and time</h2>
            <div className="qc-form-grid qc-form-grid--2">
              <div>
                <label className="qc-kicker" htmlFor="schedule-date">Date *</label>
                <input
                  id="schedule-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="qc-input"
                />
              </div>
              <div>
                <label className="qc-kicker" htmlFor="schedule-time">Time *</label>
                <input
                  id="schedule-time"
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="qc-input"
                />
              </div>
            </div>
            <div>
              <label className="qc-kicker" htmlFor="schedule-timezone">Timezone *</label>
              <select
                id="schedule-timezone"
                value={deliveryTimezone}
                onChange={(event) => setDeliveryTimezone(event.target.value)}
                className="qc-input"
              >
                {getTimezoneOptions(deliveryTimezone).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="qc-copy">
              QC will deliver at exactly this time in {deliveryTimezoneLabel}, then store the delivery instant in UTC.
            </p>
          </div>
        )}

        {step === 6 && (
          <div className="qc-review-layout">
            <article className="qc-card qc-review-preview">
              <header className="qc-review-preview-head">
                <p className="qc-kicker">Moment preview</p>
                <div className="qc-review-chip-row">
                  <span className="qc-review-chip">Email</span>
                  <span className="qc-review-chip">Scheduled</span>
                  <span className="qc-review-chip">Private</span>
                </div>
              </header>

              <article className="qc-review-stage">
                <p className="qc-review-message-display">
                  {message.trim() || "Your moment message appears here."}
                </p>
                <div className="qc-review-meta">
                  <p className="qc-review-meta-line">For {previewRecipientLabel}</p>
                  <p className="qc-review-meta-line">{scheduledArrivalLine}</p>
                </div>
                <p className="qc-review-timing-pill">{scheduledTimingPill}</p>
              </article>
            </article>

            <aside className="qc-card qc-review-confirm">
              <p className="qc-kicker">Confirmation</p>

              <div className="qc-review-list">
                <section className="qc-review-item">
                  <div className="qc-review-item-head">
                    <p className="qc-review-label">Deliver to</p>
                    <button type="button" className="qc-review-edit" onClick={() => setStep(1)}>
                      Edit
                    </button>
                  </div>
                  <p className="qc-review-item-value">{recipientEmail || "No email added"}</p>
                </section>

                <section className="qc-review-item">
                  <div className="qc-review-item-head">
                    <p className="qc-review-label">Message</p>
                    <button type="button" className="qc-review-edit" onClick={() => setStep(3)}>
                      Edit
                    </button>
                  </div>
                  <p className="qc-review-item-value qc-review-item-value--message">
                    {message.trim() || "No message added"}
                  </p>
                </section>

                <section className="qc-review-item">
                  <div className="qc-review-item-head">
                    <p className="qc-review-label">Scheduled for</p>
                    <button type="button" className="qc-review-edit" onClick={() => setStep(5)}>
                      Edit
                    </button>
                  </div>
                  <p className="qc-review-item-value">{scheduledPreviewLabel}</p>
                  <p className="qc-review-item-meta">{deliveryTimezoneLabel}</p>
                </section>

                <section className="qc-review-item">
                  <p className="qc-review-label">Status</p>
                  <p className="qc-review-item-value">{reviewStatusLabel}</p>
                </section>
              </div>

              <div className="qc-review-actions">
                {reviewNotice && <p className="qc-status qc-status--success">{reviewNotice}</p>}
                {reviewError && (
                  <div className="qc-review-alert" role="alert" aria-live="polite">
                    <p className="qc-review-alert-title">{reviewError.userMessage}</p>
                    {process.env.NODE_ENV !== "production" && (
                      <p className="qc-review-alert-detail">{reviewError.technical}</p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSend}
                  className="qc-button qc-button--primary qc-review-primary-cta"
                  disabled={isBusy || !isSendReady}
                >
                  {loadingAction === "send" ? "Scheduling..." : "Schedule moment"}
                </button>

                <div className="qc-review-secondary-actions">
                  <button
                    type="button"
                    onClick={handleSaveDraftNow}
                    className="qc-button qc-button--secondary"
                    disabled={isBusy}
                  >
                    {loadingAction === "save" ? "Saving..." : "Save draft"}
                  </button>
                  <button
                    type="button"
                    onClick={goPreviousStep}
                    className="qc-button qc-button--secondary"
                    disabled={isBusy}
                  >
                    Back
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}

        {error && step !== 6 && <p className="qc-status qc-status--danger">{error}</p>}
        {isAutoSaving && !loadingAction && (
          <p className="qc-copy qc-create-autosave">Saving draft...</p>
        )}

        {step < 6 && (
          <div className="qc-create-action-row">
            <button
              type="button"
              onClick={handleContinueStep}
              className="qc-button qc-button--primary"
              disabled={isBusy}
            >
              {step === 4 ? stepFourCtaLabel : "Continue →"}
            </button>
          </div>
        )}
      </section>

      {conversationOpen && (
        <FeelingConversationWorkspace
          recipientName={recipientName}
          onClose={() => setConversationOpen(false)}
          onApplyDirection={handleApplyConversationDirection}
        />
      )}
    </div>
  );
}
