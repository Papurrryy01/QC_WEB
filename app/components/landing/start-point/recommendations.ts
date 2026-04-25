import { validatePlacement } from "./rules";
import type { CandidatePair, StepKind } from "./types";

/**
 * Global fallback ranking when a step has no specific recommendation map.
 */
const FALLBACK_ORDER: StepKind[] = [
  "recipient",
  "gift",
  "message",
  "template",
  "background",
  "photos",
  "voice",
  "music",
  "occasion",
  "note",
  "timezone",
  "surprise",
  "delivery",
  "custom",
  "physical",
  "send",
];

/**
 * Step-specific ranking of "what should come next" before rule filtering.
 */
const BASE_RECOMMENDATIONS: Record<StepKind, StepKind[]> = {
  gift: ["recipient", "message", "template", "photos", "delivery", "surprise", "background"],
  message: ["template", "background", "photos", "recipient", "voice", "delivery", "music"],
  template: ["recipient", "message", "gift", "photos", "background", "delivery", "music"],
  recipient: ["gift", "message", "template", "occasion", "delivery", "physical", "surprise"],
  background: ["message", "template", "photos", "recipient", "delivery", "music", "surprise"],
  voice: ["message", "music", "recipient", "template", "delivery", "note"],
  photos: ["message", "template", "recipient", "background", "delivery", "music"],
  occasion: ["recipient", "message", "template", "gift", "delivery", "surprise"],
  note: ["message", "recipient", "template", "delivery", "music", "surprise"],
  timezone: ["delivery", "recipient", "message", "template", "surprise"],
  music: ["message", "surprise", "template", "delivery", "recipient", "background"],
  delivery: ["timezone", "message", "recipient", "surprise", "template", "music"],
  surprise: ["message", "music", "template", "delivery", "recipient", "background"],
  custom: ["template", "message", "recipient", "delivery", "gift", "background"],
  physical: ["recipient", "message", "delivery", "gift", "template", "surprise"],
  send: ["send"],
};

/**
 * Deduplicates while preserving first-seen order.
 */
function uniqueKinds(items: StepKind[]): StepKind[] {
  return Array.from(new Set(items));
}

/**
 * Returns the recommended primary and secondary candidates for a given level.
 * Output is always rule-filtered before being returned to the UI.
 */
export function getCandidatePair(
  currentKind: StepKind,
  usedKinds: StepKind[],
  index: number,
  totalSteps: number
): CandidatePair {
  if (index === totalSteps - 1) {
    return { primary: "send", secondary: null };
  }

  const currentRecommendations = BASE_RECOMMENDATIONS[currentKind] ?? FALLBACK_ORDER;
  const candidateOrder = uniqueKinds([...currentRecommendations, ...FALLBACK_ORDER]);

  const validCandidates = candidateOrder.filter((candidate) => {
    if (candidate === "send") return false;
    if (usedKinds.includes(candidate) && candidate !== "custom" && candidate !== "note") return false;
    return validatePlacement(candidate, index, totalSteps, usedKinds).valid;
  });

  if (validCandidates.length === 0) {
    const fallback = index >= totalSteps - 2 ? "delivery" : "message";
    return {
      primary: fallback,
      secondary: index >= totalSteps - 2 ? null : "recipient",
    };
  }

  const [primary, ...rest] = validCandidates;
  const secondary = rest.find((candidate) => candidate !== primary) ?? null;

  return { primary, secondary };
}
