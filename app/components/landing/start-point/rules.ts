import { REQUIRED_CORE_KINDS } from "./data";
import type { JourneyStep, StepKind, ValidationResult } from "./types";

/**
 * Centralized user-facing validation messages.
 */
const INVALID_SEND_MESSAGE = "Send must be the final step.";
const INVALID_SEQUENCE_MESSAGE = "Choose a valid sequence to continue.";
const MISSING_CORE_MESSAGE = "Complete the core steps to finish this request.";

type PathInput = Array<StepKind | JourneyStep>;

/**
 * Normalizes mixed path input (`StepKind` or `JourneyStep`) into only `StepKind`.
 */
function toKinds(path: PathInput): StepKind[] {
  return path.map((entry) => (typeof entry === "string" ? entry : entry.kind));
}

/**
 * Validates whether a single step kind can be placed at a target index.
 */
export function validatePlacement(
  stepKind: StepKind,
  targetIndex: number,
  totalSteps: number,
  path: PathInput = []
): ValidationResult {
  const kinds = toKinds(path);

  if (targetIndex < 0 || targetIndex >= totalSteps) {
    return { valid: false, reason: INVALID_SEQUENCE_MESSAGE };
  }

  if (stepKind === "send" && targetIndex !== totalSteps - 1) {
    return { valid: false, reason: INVALID_SEND_MESSAGE };
  }

  if (totalSteps > 1 && stepKind !== "send" && targetIndex === totalSteps - 1) {
    return { valid: false, reason: INVALID_SEND_MESSAGE };
  }

  const existingSendIndex = kinds.indexOf("send");
  if (existingSendIndex >= 0 && targetIndex > existingSendIndex) {
    return { valid: false, reason: INVALID_SEND_MESSAGE };
  }

  return { valid: true };
}

/**
 * Validates a whole path for end-state constraints:
 * - exactly one `send`
 * - `send` must be last
 * - required core kinds must exist
 */
export function validatePath(path: Array<JourneyStep | StepKind>): ValidationResult {
  const kinds = toKinds(path);

  if (kinds.length === 0) {
    return { valid: true };
  }

  for (let index = 0; index < kinds.length; index += 1) {
    const current = kinds[index];

    if (current === "send" && index !== kinds.length - 1) {
      return { valid: false, reason: INVALID_SEND_MESSAGE };
    }
  }

  const sendCount = kinds.filter((kind) => kind === "send").length;
  if (sendCount > 1) {
    return { valid: false, reason: INVALID_SEND_MESSAGE };
  }

  if (kinds[kinds.length - 1] !== "send") {
    return { valid: false, reason: INVALID_SEND_MESSAGE };
  }

  const missingCore = REQUIRED_CORE_KINDS.filter((kind) => !kinds.includes(kind));
  if (missingCore.length > 0) {
    return { valid: false, reason: MISSING_CORE_MESSAGE };
  }

  return { valid: true };
}
