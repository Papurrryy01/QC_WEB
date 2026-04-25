import { useMemo, useState } from "react";
import {
  REQUIRED_CORE_KINDS,
  allStartOptions,
  createStep,
  titleForKind,
} from "./data";
import { getCandidatePair } from "./recommendations";
import { validatePath, validatePlacement } from "./rules";
import type { JourneyLevel, JourneyState, JourneyStep, StepKind } from "./types";

/**
 * Kinds that can be intentionally repeated without being rejected.
 */
const MULTI_USE_KINDS = new Set<StepKind>(["custom", "note"]);
const DEFAULT_ERROR = "Choose a valid sequence to continue.";

/**
 * Immutable array move helper used for drag reordering.
 */
function move<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Prevents empty inline labels when users edit step titles.
 */
function normalizeInlineTitle(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Untitled step";
}

/**
 * Guarantees one trailing `send` step and removes any earlier duplicates.
 */
function ensureSingleSendAtEnd(path: JourneyStep[]): JourneyStep[] {
  const withoutSend = path.filter((step) => step.kind !== "send");
  return [...withoutSend, createStep("send", titleForKind("send"))];
}

/**
 * Ensures all core required actions appear before final send.
 */
function ensureCoreCoverage(path: JourneyStep[]): JourneyStep[] {
  const next = [...path];
  const nonSendKinds = new Set(next.filter((step) => step.kind !== "send").map((step) => step.kind));

  REQUIRED_CORE_KINDS.forEach((kind) => {
    if (nonSendKinds.has(kind)) return;

    const deliveryIndex = next.findIndex((step) => step.kind === "delivery");
    const insertIndex =
      kind === "delivery"
        ? next.length
        : deliveryIndex >= 0
          ? deliveryIndex
          : next.length;

    next.splice(insertIndex, 0, createStep(kind, titleForKind(kind)));
    nonSendKinds.add(kind);
  });

  return next;
}

/**
 * Removes duplicate non-repeatable kinds while preserving first occurrence.
 */
function dedupeNonRepeatable(path: JourneyStep[]): JourneyStep[] {
  const seen = new Set<StepKind>();
  const deduped: JourneyStep[] = [];

  path.forEach((step, index) => {
    if (step.kind === "send") return;
    if (index === 0) {
      deduped.push(step);
      seen.add(step.kind);
      return;
    }

    if (MULTI_USE_KINDS.has(step.kind) || !seen.has(step.kind)) {
      deduped.push(step);
      seen.add(step.kind);
    }
  });

  return deduped;
}

/**
 * Full normalization pipeline before validating and rendering the path.
 */
function normalizePath(path: JourneyStep[]): JourneyStep[] {
  const deduped = dedupeNonRepeatable(path);
  const withCore = ensureCoreCoverage(deduped);
  return ensureSingleSendAtEnd(withCore);
}

/**
 * Derives branch levels from the current primary path.
 */
function buildLevelsFromPrimary(primaryPath: JourneyStep[]): JourneyLevel[] {
  const levels: JourneyLevel[] = [];
  const totalSteps = primaryPath.length;

  for (let index = 1; index < primaryPath.length; index += 1) {
    const source = primaryPath[index - 1];
    const selected = primaryPath[index];

    if (selected.kind === "send") {
      levels.push({
        index,
        selected,
        alternative: null,
        sourceStepId: source.id,
      });
      continue;
    }

    const usedKinds = primaryPath.slice(0, index).map((step) => step.kind);
    const pair = getCandidatePair(source.kind, usedKinds, index, totalSteps);

    const alternativeKind =
      pair.primary === selected.kind
        ? pair.secondary
        : pair.secondary === selected.kind
          ? pair.primary
          : pair.primary;

    levels.push({
      index,
      selected,
      alternative:
        alternativeKind && alternativeKind !== "send"
          ? createStep(alternativeKind)
          : null,
      sourceStepId: source.id,
    });
  }

  return levels;
}

/**
 * Converts a path into full component state, including validation and branch levels.
 */
function deriveStateFromPath(nextPath: JourneyStep[]): {
  state: JourneyState | null;
  error: string | null;
} {
  const normalized = normalizePath(nextPath);

  const pathValidation = validatePath(normalized);
  if (!pathValidation.valid) {
    return { state: null, error: pathValidation.reason ?? DEFAULT_ERROR };
  }

  const placementError = normalized
    .map((step, index) => validatePlacement(step.kind, index, normalized.length, normalized))
    .find((result) => !result.valid);

  if (placementError && !placementError.valid) {
    return { state: null, error: placementError.reason ?? DEFAULT_ERROR };
  }

  const levels = buildLevelsFromPrimary(normalized);
  return {
    state: {
      start: normalized[0] ?? null,
      levels,
      primaryPath: normalized,
      inlineError: null,
    },
    error: null,
  };
}

/**
 * Builds an initial path from the selected start kind while prioritizing core steps.
 */
function buildPrimaryPathFromStart(startKind: StepKind, startTitle: string): JourneyStep[] {
  const pathKinds: StepKind[] = [startKind];
  const remainingCore = REQUIRED_CORE_KINDS.filter((kind) => kind !== startKind);
  let currentKind = startKind;

  while (remainingCore.length > 0) {
    const index = pathKinds.length;
    const projectedTotal = index + remainingCore.length + 1;
    const pair = getCandidatePair(currentKind, pathKinds, index, projectedTotal);
    const candidates = [pair.primary, pair.secondary].filter(Boolean) as StepKind[];

    const chosen =
      candidates.find((candidate) => remainingCore.includes(candidate)) ??
      remainingCore[0];

    pathKinds.push(chosen);
    currentKind = chosen;

    const chosenIndex = remainingCore.indexOf(chosen);
    if (chosenIndex >= 0) remainingCore.splice(chosenIndex, 1);
  }

  const draftPath = pathKinds.map((kind, index) =>
    createStep(kind, index === 0 ? startTitle : titleForKind(kind))
  );
  return normalizePath(draftPath);
}

type StartFromPayload = {
  kind: StepKind;
  title?: string;
};

/**
 * Main state machine for the branching start-point builder:
 * start, append, swap alternative, edit titles, reorder, reset.
 */
export function useBranchingJourney() {
  const [state, setState] = useState<JourneyState>({
    start: null,
    levels: [],
    primaryPath: [],
    inlineError: null,
  });

  const startOptionsByKind = useMemo(
    () => new Map(allStartOptions.map((option) => [option.kind, option])),
    []
  );

  /**
   * Writes a user-facing inline error into state.
   */
  function setError(reason: string) {
    setState((current) => ({ ...current, inlineError: reason }));
  }

  /**
   * Clears existing inline error if one is currently shown.
   */
  function clearError() {
    setState((current) =>
      current.inlineError ? { ...current, inlineError: null } : current
    );
  }

  /**
   * Resets the builder to its empty initial state.
   */
  function resetJourney() {
    setState({
      start: null,
      levels: [],
      primaryPath: [],
      inlineError: null,
    });
  }

  /**
   * Validates + commits an updated primary path.
   */
  function commitPrimaryPath(nextPath: JourneyStep[]) {
    const derived = deriveStateFromPath(nextPath);
    if (!derived.state) {
      setError(derived.error ?? DEFAULT_ERROR);
      return;
    }

    setState(derived.state);
  }

  /**
   * Starts/restarts the flow from a selected start option.
   */
  function startFrom(payload: StartFromPayload) {
    if (payload.kind === "send") {
      setError(DEFAULT_ERROR);
      return;
    }

    const option = startOptionsByKind.get(payload.kind);
    const startTitle = payload.title ?? option?.title ?? titleForKind(payload.kind);
    const nextPath = buildPrimaryPathFromStart(payload.kind, startTitle);
    commitPrimaryPath(nextPath);
  }

  /**
   * Appends a user-selected step to the current flow before normalization.
   */
  function appendStep(payload: StartFromPayload) {
    if (payload.kind === "send") {
      setError(DEFAULT_ERROR);
      return;
    }

    if (state.primaryPath.length === 0) {
      startFrom(payload);
      return;
    }

    const duplicate =
      !MULTI_USE_KINDS.has(payload.kind) &&
      state.primaryPath.some((step) => step.kind === payload.kind);

    if (duplicate) {
      setError("That step is already included.");
      return;
    }

    const title = payload.title ?? titleForKind(payload.kind);
    const withoutSend = state.primaryPath.filter((step) => step.kind !== "send");
    const nextPath = [...withoutSend, createStep(payload.kind, title)];
    commitPrimaryPath(nextPath);
  }

  /**
   * Promotes the level alternative to primary and rebuilds downstream levels.
   */
  function selectAlternative(levelIndex: number) {
    const targetLevel = state.levels.find((level) => level.index === levelIndex);

    if (!targetLevel || !targetLevel.alternative) return;

    const currentSelected = targetLevel.selected;
    const selectedAlternative = targetLevel.alternative;
    const nextPath = state.primaryPath.map((step, index) => {
      if (index !== levelIndex) return step;
      return createStep(selectedAlternative.kind, selectedAlternative.title);
    });

    const derived = deriveStateFromPath(nextPath);
    if (!derived.state) {
      setError(derived.error ?? DEFAULT_ERROR);
      return;
    }

    const swappedLevel = derived.state.levels.find((level) => level.index === levelIndex);
    if (swappedLevel) {
      swappedLevel.alternative = createStep(currentSelected.kind, currentSelected.title);
    }

    setState(derived.state);
  }

  /**
   * Applies inline title edits for editable steps.
   */
  function editStep(stepId: string, title: string) {
    const normalizedTitle = normalizeInlineTitle(title);
    const nextPath = state.primaryPath.map((step) => {
      if (step.id !== stepId || step.locked) return step;
      return { ...step, title: normalizedTitle };
    });

    commitPrimaryPath(nextPath);
  }

  /**
   * Reorders only interior primary steps (excluding step 1 and final send).
   */
  function reorderPrimary(fromIndex: number, toIndex: number) {
    if (state.primaryPath.length === 0) return;

    const minIndex = 1;
    const maxIndex = Math.max(1, state.primaryPath.length - 2);

    if (
      fromIndex < minIndex ||
      fromIndex > maxIndex ||
      toIndex < minIndex ||
      toIndex > maxIndex
    ) {
      setError(DEFAULT_ERROR);
      return;
    }

    const nextPath = move(state.primaryPath, fromIndex, toIndex);
    commitPrimaryPath(nextPath);
  }

  return {
    state,
    startFrom,
    appendStep,
    selectAlternative,
    editStep,
    reorderPrimary,
    clearError,
    resetJourney,
  };
}
