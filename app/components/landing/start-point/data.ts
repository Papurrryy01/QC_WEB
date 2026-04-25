import type { JourneyStep, StartOption, StepKind } from "./types";

/**
 * Required actions that must exist somewhere in a valid journey.
 */
export const REQUIRED_CORE_KINDS: StepKind[] = [
  "gift",
  "message",
  "template",
  "recipient",
  "delivery",
];

const dragCue = "Drag to start";

type StepDefinition = {
  kind: StepKind;
  title: string;
  badge: string;
};

/**
 * Canonical title/badge metadata for every supported step kind.
 */
export const STEP_DEFINITIONS: Record<StepKind, StepDefinition> = {
  gift: { kind: "gift", title: "Choose gift", badge: "GF" },
  message: { kind: "message", title: "Write message", badge: "MS" },
  template: { kind: "template", title: "Choose template", badge: "TP" },
  recipient: { kind: "recipient", title: "Pick recipient", badge: "RC" },
  background: { kind: "background", title: "Add background image", badge: "BG" },
  voice: { kind: "voice", title: "Record voice note", badge: "VN" },
  photos: { kind: "photos", title: "Attach photo set", badge: "PH" },
  occasion: { kind: "occasion", title: "Set occasion context", badge: "OC" },
  note: { kind: "note", title: "Add private note", badge: "NT" },
  timezone: { kind: "timezone", title: "Confirm timezone", badge: "TZ" },
  music: { kind: "music", title: "Add music", badge: "MU" },
  delivery: { kind: "delivery", title: "Schedule delivery", badge: "DT" },
  surprise: { kind: "surprise", title: "Set surprise reveal", badge: "SR" },
  custom: { kind: "custom", title: "Define custom start", badge: "CU" },
  physical: { kind: "physical", title: "Choose physical gift", badge: "PG" },
  send: { kind: "send", title: "Send", badge: "SN" },
};

/**
 * High-priority start options shown in the main 4-card row.
 */
export const featuredStartOptions: StartOption[] = [
  {
    id: "gift",
    title: "Gift",
    description: "Start with something tangible.",
    kind: "gift",
    badge: "GF",
    cue: dragCue,
    featured: true,
  },
  {
    id: "message",
    title: "Message",
    description: "Start with the words.",
    kind: "message",
    badge: "MS",
    cue: dragCue,
    featured: true,
  },
  {
    id: "template",
    title: "Template",
    description: "Start with the look and mood.",
    kind: "template",
    badge: "TP",
    cue: dragCue,
    featured: true,
  },
  {
    id: "recipient",
    title: "Recipient",
    description: "Start with the person.",
    kind: "recipient",
    badge: "RC",
    cue: dragCue,
    featured: true,
  },
];

/**
 * Secondary start options shown inside the "Other" popover.
 */
export const extraStartOptions: StartOption[] = [
  {
    id: "background",
    title: "Background image",
    description: "Set visual atmosphere first.",
    kind: "background",
    badge: "BG",
    cue: dragCue,
  },
  {
    id: "photos",
    title: "Photo set",
    description: "Layer memory visuals in sequence.",
    kind: "photos",
    badge: "PH",
    cue: dragCue,
  },
  {
    id: "voice",
    title: "Voice note",
    description: "Add presence with voice.",
    kind: "voice",
    badge: "VN",
    cue: dragCue,
  },
  {
    id: "music",
    title: "Music",
    description: "Lead with tone and pacing.",
    kind: "music",
    badge: "MU",
    cue: dragCue,
  },
  {
    id: "delivery",
    title: "Delivery time",
    description: "Lock timing first.",
    kind: "delivery",
    badge: "DT",
    cue: dragCue,
  },
  {
    id: "occasion",
    title: "Occasion",
    description: "Frame the moment with context.",
    kind: "occasion",
    badge: "OC",
    cue: dragCue,
  },
  {
    id: "timezone",
    title: "Timezone check",
    description: "Prevent timing mistakes early.",
    kind: "timezone",
    badge: "TZ",
    cue: dragCue,
  },
  {
    id: "note",
    title: "Private note",
    description: "Add one personal detail.",
    kind: "note",
    badge: "NT",
    cue: dragCue,
  },
  {
    id: "surprise",
    title: "Surprise reveal",
    description: "Design anticipation first.",
    kind: "surprise",
    badge: "SR",
    cue: dragCue,
  },
  {
    id: "custom",
    title: "Custom",
    description: "Start from a custom idea.",
    kind: "custom",
    badge: "CU",
    cue: dragCue,
  },
  {
    id: "physical",
    title: "Physical gift",
    description: "Anchor around a real delivery.",
    kind: "physical",
    badge: "PG",
    cue: dragCue,
  },
];

export const allStartOptions = [...featuredStartOptions, ...extraStartOptions];

/**
 * Creates a stable-enough runtime id for UI interactions in this local flow builder.
 */
function makeId(kind: StepKind): string {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Builds a concrete journey step object from the step kind and optional title override.
 */
export function createStep(kind: StepKind, titleOverride?: string): JourneyStep {
  const definition = STEP_DEFINITIONS[kind];
  return {
    id: makeId(kind),
    kind,
    title: titleOverride ?? definition.title,
    locked: kind === "send",
  };
}

/**
 * Returns the default UI title for a step kind.
 */
export function titleForKind(kind: StepKind): string {
  return STEP_DEFINITIONS[kind].title;
}

/**
 * Returns the short badge code for a step kind.
 */
export function badgeForKind(kind: StepKind): string {
  return STEP_DEFINITIONS[kind].badge;
}
