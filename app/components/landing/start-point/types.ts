/**
 * Every step type that can appear in the branching builder flow.
 */
export type StepKind =
  | "gift"
  | "message"
  | "template"
  | "recipient"
  | "background"
  | "voice"
  | "photos"
  | "occasion"
  | "note"
  | "timezone"
  | "music"
  | "delivery"
  | "surprise"
  | "custom"
  | "physical"
  | "send";

/**
 * A selectable starting option shown in featured cards and "Other" popover.
 */
export type StartOption = {
  id: string;
  title: string;
  description: string;
  kind: Exclude<StepKind, "send">;
  badge: string;
  cue: string;
  featured?: boolean;
};

/**
 * A concrete step instance rendered in the journey canvas.
 */
export type JourneyStep = {
  id: string;
  kind: StepKind;
  title: string;
  locked?: boolean;
};

/**
 * One generated level in the branch model:
 * selected = primary recommendation currently active
 * alternative = secondary option the user can swap to
 */
export type JourneyLevel = {
  index: number;
  selected: JourneyStep;
  alternative: JourneyStep | null;
  sourceStepId: string;
};

/**
 * Complete UI state for the branching journey section.
 */
export type JourneyState = {
  start: JourneyStep | null;
  levels: JourneyLevel[];
  primaryPath: JourneyStep[];
  inlineError: string | null;
};

/**
 * Generic validation response shape used by rules and reorder checks.
 */
export type ValidationResult = {
  valid: boolean;
  reason?: string;
};

/**
 * Pair of recommended next step kinds for the current level.
 */
export type CandidatePair = {
  primary: StepKind;
  secondary: StepKind | null;
};
