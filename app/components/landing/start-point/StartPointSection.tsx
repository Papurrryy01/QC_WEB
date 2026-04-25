"use client";

import {
  type Active,
  closestCenter,
  pointerWithin,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  allStartOptions,
  badgeForKind,
  extraStartOptions,
  featuredStartOptions,
} from "./data";
import { useBranchingJourney } from "./useBranchingJourney";
import type { JourneyLevel, JourneyStep, StartOption, StepKind } from "./types";

/**
 * Draw instruction for one SVG connector segment.
 */
type ConnectorPath = {
  id: string;
  d: string;
  variant: "primary" | "secondary";
  delayMs: number;
};

/**
 * Represents the currently dragged entity for the DragOverlay preview.
 */
type ActiveDrag =
  | { type: "start-option"; option: StartOption }
  | { type: "start-node"; step: JourneyStep }
  | { type: "primary-step"; step: JourneyStep }
  | null;

/**
 * Start option card props for both featured and compact popover variants.
 */
type StartOptionCardProps = {
  option: StartOption;
  compact?: boolean;
  onSelect: (option: StartOption) => void;
};

/**
 * Primary path card props for inline editing + sortable behavior.
 */
type PrimaryStepCardProps = {
  step: JourneyStep;
  index: number;
  isEditing: boolean;
  editingValue: string;
  onEditStart: (step: JourneyStep) => void;
  onEditChange: (value: string) => void;
  onEditCommit: (stepId: string) => void;
  onEditCancel: () => void;
  registerPrimaryRef: (index: number, node: HTMLDivElement | null) => void;
};

/**
 * Tiny className join helper to keep JSX readable.
 */
function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Keeps edited card titles non-empty.
 */
function normalizeInlineTitle(value: string): string {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : "Untitled step";
}

/**
 * Builds an elegant cubic bezier between source and target card centers.
 * Orientation switches between desktop-horizontal and mobile-vertical flow.
 */
function buildConnectorPath(
  from: DOMRect,
  to: DOMRect,
  rootRect: DOMRect,
  orientation: "horizontal" | "vertical"
): string {
  if (orientation === "vertical") {
    const startX = from.left + from.width * 0.5 - rootRect.left;
    const startY = from.bottom - rootRect.top;
    const endX = to.left + to.width * 0.5 - rootRect.left;
    const endY = to.top - rootRect.top;
    const deltaY = endY - startY;
    const spread = Math.max(34, Math.min(120, Math.abs(deltaY) * 0.45));
    const direction = Math.sign(deltaY) || 1;

    return [
      `M ${startX.toFixed(2)} ${startY.toFixed(2)}`,
      `C ${startX.toFixed(2)} ${(startY + direction * spread).toFixed(2)}`,
      `${endX.toFixed(2)} ${(endY - direction * spread).toFixed(2)}`,
      `${endX.toFixed(2)} ${endY.toFixed(2)}`,
    ].join(" ");
  }

  const startX = from.right - rootRect.left;
  const startY = from.top + from.height * 0.5 - rootRect.top;
  const endX = to.left - rootRect.left;
  const endY = to.top + to.height * 0.5 - rootRect.top;
  const deltaX = endX - startX;
  const spread = Math.max(44, Math.min(132, Math.abs(deltaX) * 0.46));
  const direction = Math.sign(deltaX) || 1;

  return [
    `M ${startX.toFixed(2)} ${startY.toFixed(2)}`,
    `C ${(startX + direction * spread).toFixed(2)} ${startY.toFixed(2)}`,
    `${(endX - direction * spread).toFixed(2)} ${endY.toFixed(2)}`,
    `${endX.toFixed(2)} ${endY.toFixed(2)}`,
  ].join(" ");
}

/**
 * Shared drag preview used by start cards and step cards.
 */
function CleanDragPreview({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="w-[244px] rounded-[22px] border border-zinc-300 bg-white p-4 shadow-[0_24px_60px_-28px_rgba(10,10,10,0.34)]">
      <p className="m-0 text-[0.64rem] uppercase tracking-[0.16em] text-zinc-400">
        {eyebrow}
      </p>
      <p className="mt-2 mb-0 text-[1.05rem] tracking-[-0.02em] text-zinc-950">
        {title}
      </p>
      {subtitle ? (
        <p className="mt-1 mb-0 text-[0.84rem] leading-[1.35] text-zinc-500">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Draggable/selectable start option card.
 */
function StartOptionCard({ option, compact = false, onSelect }: StartOptionCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `start-option-${option.id}`,
    data: {
      type: "start-option",
      optionKind: option.kind,
      optionTitle: option.title,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onSelect(option)}
      style={style}
      {...listeners}
      {...attributes}
      className={cx(
        "group flex rounded-[24px] border border-zinc-200 bg-white text-left shadow-[0_10px_28px_-24px_rgba(10,10,10,0.22)] transition duration-200 ease-out",
        "hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_18px_36px_-28px_rgba(10,10,10,0.28)]",
        compact ? "min-h-[104px] p-3.5" : "min-h-[178px] p-5",
        isDragging && "opacity-0"
      )}
    >
      <div className={cx("flex h-full w-full flex-col", compact ? "gap-2.5" : "gap-3.5")}>
        <span
          className={cx(
            "inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-[0.64rem] font-semibold tracking-[0.14em] text-zinc-600",
            compact ? "h-8 w-8" : "h-9 w-9"
          )}
          aria-hidden="true"
        >
          {option.badge}
        </span>

        <div className="grid gap-1.5">
          <p
            className={cx(
              "m-0 font-medium tracking-[-0.016em] text-zinc-900",
              compact ? "text-[1rem]" : "text-[1.22rem]"
            )}
          >
            {option.title}
          </p>
          <p
            className={cx(
              "m-0 text-zinc-600",
              compact ? "text-[0.88rem] leading-[1.35]" : "text-[0.98rem] leading-[1.45]"
            )}
          >
            {option.description}
          </p>
        </div>

        <p className="mt-auto mb-0 text-[0.68rem] uppercase tracking-[0.14em] text-zinc-400">
          {option.cue}
        </p>
      </div>
    </button>
  );
}

/**
 * One primary path card with inline edit + optional reorder handle.
 */
function PrimaryStepCard({
  step,
  index,
  isEditing,
  editingValue,
  onEditStart,
  onEditChange,
  onEditCommit,
  onEditCancel,
  registerPrimaryRef,
}: PrimaryStepCardProps) {
  const canReorder = index > 0 && step.kind !== "send";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: step.id,
    data: {
      type: "primary-step",
      index,
    },
    disabled: !canReorder,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    registerPrimaryRef(index, node);
  };

  const editable = step.kind !== "send";

  return (
    <div
      ref={setRefs}
      style={style}
      className={cx(
        "qc-builder-step-card relative rounded-[22px] border border-zinc-200 bg-white p-4 shadow-[0_10px_24px_-28px_rgba(10,10,10,0.34)] transition duration-200 ease-out",
        isDragging && "opacity-0",
        isOver && canReorder && "border-zinc-400 shadow-[0_20px_44px_-34px_rgba(10,10,10,0.28)]"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-[0.64rem] uppercase tracking-[0.16em] text-zinc-400">
          Step {index + 1}
        </p>
        <span className="inline-flex items-center rounded-full border border-zinc-200 px-2 py-0.5 text-[0.62rem] tracking-[0.12em] text-zinc-500">
          {badgeForKind(step.kind)}
        </span>
      </div>

      {isEditing ? (
        <input
          autoFocus
          value={editingValue}
          onChange={(event) => onEditChange(event.target.value)}
          onBlur={() => onEditCommit(step.id)}
          onKeyDown={(event: ReactKeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onEditCommit(step.id);
              return;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              onEditCancel();
            }
          }}
          className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-[0.98rem] leading-[1.3] tracking-[-0.012em] text-zinc-900 outline-none ring-0 focus:border-zinc-500"
        />
      ) : (
        <button
          type="button"
          disabled={!editable}
          onClick={() => editable && onEditStart(step)}
          className={cx(
            "mt-2 block w-full border-0 bg-transparent p-0 text-left text-[1.08rem] leading-[1.25] tracking-[-0.02em]",
            editable ? "cursor-text text-zinc-900" : "cursor-default text-zinc-800"
          )}
        >
          {step.title}
        </button>
      )}

      <div className="mt-3 flex items-center justify-between">
        <p className="m-0 text-[0.7rem] uppercase tracking-[0.14em] text-zinc-400">
          {canReorder ? "Drag to reorder" : step.kind === "send" ? "Final step" : "Start"}
        </p>

        {canReorder && (
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 text-zinc-500"
            aria-label="Drag step"
            {...attributes}
            {...listeners}
          >
            ⋮
          </button>
        )}
      </div>
    </div>
  );
}

export default function StartPointSection() {
  const {
    state,
    startFrom,
    appendStep,
    selectAlternative,
    editStep,
    reorderPrimary,
    clearError,
    resetJourney,
  } = useBranchingJourney();

  const [showOther, setShowOther] = useState(false);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [visibleLevelCount, setVisibleLevelCount] = useState(0);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [connectorPaths, setConnectorPaths] = useState<ConnectorPath[]>([]);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isMobileFlow, setIsMobileFlow] = useState(false);

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const revealTimersRef = useRef<number[]>([]);
  const hadPathRef = useRef(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const primaryRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const alternativeRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  /**
   * Index start options by kind for constant-time lookup during drag events.
   */
  const startOptionByKind = useMemo(
    () => new Map(allStartOptions.map((option) => [option.kind, option])),
    []
  );

  /**
   * Pointer + keyboard sensors for dnd-kit.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 2 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /**
   * Droppable area that resets the builder when step 1 is dropped on it.
   */
  const { setNodeRef: setResetDropRef, isOver: isResetDropOver } = useDroppable({
    id: "builder-reset-drop",
    data: { type: "reset-drop" },
  });

  /**
   * Droppable area for start-node replacement and first-step docking.
   */
  const { setNodeRef: setStartNodeDropRef, isOver: isStartNodeOver } = useDroppable({
    id: "builder-start-node-drop",
    data: { type: "start-node-drop" },
  });

  /**
   * Makes the rendered start node itself draggable so users can reset by dragging it out.
   */
  const {
    attributes: startDragAttributes,
    listeners: startDragListeners,
    setNodeRef: setStartDragRef,
    transform: startDragTransform,
    isDragging: isStartDragging,
  } = useDraggable({
    id: state.start ? `builder-start-node-${state.start.id}` : "builder-start-node",
    data: { type: "start-node" },
    disabled: !state.start,
  });

  /**
   * Clears pending stagger timers to prevent duplicate reveal animations.
   */
  const clearRevealTimers = useCallback(() => {
    revealTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    revealTimersRef.current = [];
  }, []);

  /**
   * Path currently visible based on stagger reveal count.
   */
  const visiblePrimaryPath = useMemo(
    () => state.primaryPath.slice(0, Math.min(state.primaryPath.length, visibleLevelCount + 1)),
    [state.primaryPath, visibleLevelCount]
  );
  const visibleGeneratedPath = useMemo(() => visiblePrimaryPath.slice(1), [visiblePrimaryPath]);

  /**
   * Maps visible levels by index for quick lookup while rendering alternatives.
   */
  const visibleLevelMap = useMemo(() => {
    const map = new Map<number, JourneyLevel>();
    state.levels
      .filter((level) => level.index <= visibleLevelCount)
      .forEach((level) => {
        map.set(level.index, level);
      });
    return map;
  }, [state.levels, visibleLevelCount]);

  /**
   * Keeps edit mode valid when steps regenerate/reorder.
   */
  const activeEditing = useMemo(() => {
    if (!editing) return null;
    const exists = state.primaryPath.some((step) => step.id === editing.id);
    return exists ? editing : null;
  }, [editing, state.primaryPath]);

  const isHoveringStart = dragOverId === "builder-start-node-drop" || isStartNodeOver;

  /**
   * Unified click behavior: first click starts the flow; later clicks append.
   */
  function handleSelectStart(option: StartOption) {
    clearError();
    setShowOther(false);
    setEditing(null);

    if (!state.start) {
      startFrom({ kind: option.kind, title: option.title });
      return;
    }

    appendStep({ kind: option.kind, title: option.title });
  }

  /**
   * Same behavior as featured cards, but closes popover first.
   */
  function handleSelectOther(option: StartOption) {
    clearError();
    setShowOther(false);
    setEditing(null);

    if (!state.start) {
      startFrom({ kind: option.kind, title: option.title });
      return;
    }

    appendStep({ kind: option.kind, title: option.title });
  }

  /**
   * Controls first-load stagger reveal and subsequent instant sync of levels.
   */
  useEffect(() => {
    clearRevealTimers();

    if (state.primaryPath.length === 0) {
      hadPathRef.current = false;
      const timer = window.setTimeout(() => {
        setVisibleLevelCount(0);
      }, 0);
      revealTimersRef.current.push(timer);
      return;
    }

    if (!hadPathRef.current) {
      hadPathRef.current = true;
      const firstTimer = window.setTimeout(() => {
        setVisibleLevelCount(0);
      }, 0);
      revealTimersRef.current.push(firstTimer);

      state.levels.forEach((_, index) => {
        const timer = window.setTimeout(() => {
          setVisibleLevelCount((current) => Math.max(current, index + 1));
        }, 130 + index * 170);
        revealTimersRef.current.push(timer);
      });
      return;
    }

    const syncTimer = window.setTimeout(() => {
      setVisibleLevelCount(state.levels.length);
    }, 0);
    revealTimersRef.current.push(syncTimer);
  }, [state.primaryPath, state.levels, clearRevealTimers]);

  /**
   * Safety cleanup for pending animation timers.
   */
  useEffect(() => {
    return () => clearRevealTimers();
  }, [clearRevealTimers]);

  /**
   * Closes "Other" popover when user clicks outside of it.
   */
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!popoverRef.current) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!popoverRef.current.contains(target)) {
        setShowOther(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  /**
   * Mobile breakpoint switch for vertical flow canvas behavior.
   */
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileFlow(mediaQuery.matches);
    sync();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", sync);
      return () => mediaQuery.removeEventListener("change", sync);
    }

    mediaQuery.addListener(sync);
    return () => mediaQuery.removeListener(sync);
  }, []);

  /**
   * Measures card positions and recomputes solid/dashed connector paths.
   */
  const recalculateConnectors = useCallback(() => {
    const root = canvasRef.current;
    if (!root) return;

    const rootRect = root.getBoundingClientRect();
    setCanvasSize({
      width: Math.ceil(root.scrollWidth),
      height: Math.ceil(root.scrollHeight),
    });

    if (visiblePrimaryPath.length <= 1) {
      setConnectorPaths([]);
      return;
    }

    const nextPaths: ConnectorPath[] = [];

    for (let index = 1; index < visiblePrimaryPath.length; index += 1) {
      const source = primaryRefs.current.get(index - 1);
      const primaryTarget = primaryRefs.current.get(index);
      if (!source || !primaryTarget) continue;

      nextPaths.push({
        id: `primary-${index}`,
        d: buildConnectorPath(
          source.getBoundingClientRect(),
          primaryTarget.getBoundingClientRect(),
          rootRect,
          isMobileFlow ? "vertical" : "horizontal"
        ),
        variant: "primary",
        delayMs: 120 + index * 120,
      });

      const level = visibleLevelMap.get(index);
      const alternativeNode = alternativeRefs.current.get(index);
      if (level?.alternative && alternativeNode) {
        nextPaths.push({
          id: `secondary-${index}`,
          d: buildConnectorPath(
            source.getBoundingClientRect(),
            alternativeNode.getBoundingClientRect(),
            rootRect,
            isMobileFlow ? "vertical" : "horizontal"
          ),
          variant: "secondary",
          delayMs: 170 + index * 120,
        });
      }
    }

    setConnectorPaths(nextPaths);
  }, [visiblePrimaryPath, visibleLevelMap, isMobileFlow]);

  /**
   * Rebuild connectors right after DOM layout updates.
   */
  useLayoutEffect(() => {
    recalculateConnectors();
  }, [recalculateConnectors]);

  /**
   * Recompute connectors on card/canvas resize and on viewport resize.
   */
  useEffect(() => {
    const root = canvasRef.current;
    if (!root) return;

    const observer = new ResizeObserver(() => {
      recalculateConnectors();
    });

    observer.observe(root);
    primaryRefs.current.forEach((node) => observer.observe(node));
    alternativeRefs.current.forEach((node) => observer.observe(node));

    const onWindowResize = () => recalculateConnectors();
    window.addEventListener("resize", onWindowResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onWindowResize);
    };
  }, [recalculateConnectors, visiblePrimaryPath, visibleLevelMap]);

  /**
   * Registers/unregisters the DOM node for a primary card index.
   */
  function registerPrimaryRef(index: number, node: HTMLDivElement | null) {
    if (node) {
      primaryRefs.current.set(index, node);
      return;
    }
    primaryRefs.current.delete(index);
  }

  /**
   * Registers/unregisters the DOM node for an alternative card index.
   */
  function registerAlternativeRef(index: number, node: HTMLButtonElement | null) {
    if (node) {
      alternativeRefs.current.set(index, node);
      return;
    }
    alternativeRefs.current.delete(index);
  }

  /**
   * Resolves a dnd-kit active item to a known start option, if applicable.
   */
  function optionFromActive(active: Active): StartOption | null {
    const activeKind = active.data.current?.optionKind as StepKind | undefined;
    if (activeKind && activeKind !== "send") {
      const byKind = startOptionByKind.get(activeKind as Exclude<StepKind, "send">);
      if (byKind) return byKind;
    }

    if (typeof active.id === "string" && active.id.startsWith("start-option-")) {
      const rawId = active.id.replace("start-option-", "");
      const byId = allStartOptions.find((option) => option.id === rawId);
      if (byId) return byId;
    }

    return null;
  }

  /**
   * Clears transient drag UI state after drop/cancel.
   */
  function cleanupDragState() {
    setActiveDrag(null);
    setDragOverId(null);
  }

  /**
   * Captures metadata for DragOverlay preview at drag start.
   */
  function handleDragStart(event: DragStartEvent) {
    const activeType = event.active.data.current?.type as string | undefined;
    const draggedOption = optionFromActive(event.active);
    const isStartNode =
      activeType === "start-node" ||
      (typeof event.active.id === "string" &&
        event.active.id.startsWith("builder-start-node"));

    setDragOverId(null);

    if (draggedOption) {
      setActiveDrag({ type: "start-option", option: draggedOption });
      return;
    }

    if (isStartNode && state.start) {
      setActiveDrag({ type: "start-node", step: state.start });
      return;
    }

    if (activeType === "primary-step") {
      const stepId = event.active.id as string;
      const step = state.primaryPath.find((entry) => entry.id === stepId);
      if (step) {
        setActiveDrag({ type: "primary-step", step });
      }
    }
  }

  /**
   * Tracks current hovered droppable id for visual highlighting.
   */
  function handleDragOver(event: DragOverEvent) {
    setDragOverId(event.over?.id ? String(event.over.id) : null);
  }

  /**
   * Handles all drop paths:
   * - start option -> start node (replace) or flow append
   * - start node -> reset drop or outside canvas (reset)
   * - primary step -> primary step reorder
   */
  function handleDragEnd(event: DragEndEvent) {
    const activeType = event.active.data.current?.type as string | undefined;
    const overId = event.over?.id ? String(event.over.id) : null;
    const overType = event.over?.data.current?.type as string | undefined;
    const draggedOption = optionFromActive(event.active);

    const isStartNode =
      activeType === "start-node" ||
      (typeof event.active.id === "string" &&
        event.active.id.startsWith("builder-start-node"));

    if (draggedOption) {
      clearError();
      setEditing(null);
      setShowOther(false);

      if (!state.start) {
        startFrom({ kind: draggedOption.kind, title: draggedOption.title });
        cleanupDragState();
        return;
      }

      if (overId === "builder-start-node-drop") {
        startFrom({ kind: draggedOption.kind, title: draggedOption.title });
        cleanupDragState();
        return;
      }

      if (overType === "primary-step") {
        appendStep({ kind: draggedOption.kind, title: draggedOption.title });
      }

      cleanupDragState();
      return;
    }

    if (isStartNode) {
      if (overId === "builder-reset-drop" || overId === null) {
        setEditing(null);
        setShowOther(false);
        clearError();
        resetJourney();
      }
      cleanupDragState();
      return;
    }

    if (activeType === "primary-step" && overType === "primary-step") {
      const fromIndex = event.active.data.current?.index as number | undefined;
      const toIndex = event.over?.data.current?.index as number | undefined;

      if (typeof fromIndex === "number" && typeof toIndex === "number" && fromIndex !== toIndex) {
        setEditing(null);
        reorderPrimary(fromIndex, toIndex);
      }
    }

    cleanupDragState();
  }

  /**
   * Clears drag state if drag is cancelled by the interaction engine.
   */
  function handleDragCancel() {
    cleanupDragState();
  }

  /**
   * Commits inline step title edits.
   */
  function commitEdit(stepId: string) {
    if (!activeEditing || activeEditing.id !== stepId) return;
    const nextTitle = normalizeInlineTitle(activeEditing.value);
    editStep(stepId, nextTitle);
    setEditing(null);
  }

  const overlay = (() => {
    if (!activeDrag) return null;

    if (activeDrag.type === "start-option") {
      return (
        <CleanDragPreview
          eyebrow={activeDrag.option.cue}
          title={activeDrag.option.title}
          subtitle={activeDrag.option.description}
        />
      );
    }

    return (
      <CleanDragPreview
        eyebrow="Step"
        title={activeDrag.step.title}
        subtitle="Drop to move, replace, or reset"
      />
    );
  })();

  return (
    <section className="qc-section overflow-x-clip pt-7 md:pt-10">
      <div className="qc-container">
        <DndContext
          id="start-point-builder-dnd"
          collisionDetection={(args) => {
            const pointerHits = pointerWithin(args);
            return pointerHits.length > 0 ? pointerHits : closestCenter(args);
          }}
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="mx-auto grid max-w-[1240px] gap-7 md:gap-9">
            <header className="mx-auto grid max-w-[860px] gap-3 text-center md:gap-4">
              <p className="m-0 text-[0.72rem] uppercase tracking-[0.34em] text-zinc-400">
                Builder
              </p>
              <h2 className="m-0 font-[var(--font-display)] text-[clamp(2.15rem,5.1vw,4.65rem)] leading-[0.97] tracking-[-0.045em] text-zinc-950">
                Choose your start point...
              </h2>
              <p className="m-0 text-[clamp(0.98rem,1.35vw,1.16rem)] leading-[1.5] text-zinc-600">
                Start with the part that matters most. We&apos;ll shape the rest.
              </p>
              <p className="m-0 text-[0.78rem] tracking-[0.08em] text-zinc-500">
                Click to edit.
              </p>
            </header>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {featuredStartOptions.map((option) => (
                <StartOptionCard key={option.id} option={option} onSelect={handleSelectStart} />
              ))}
            </div>

            <div
              className="relative mx-auto flex w-fit flex-wrap items-center justify-center gap-2.5"
              ref={popoverRef}
            >
              <button
                type="button"
                onClick={() => setShowOther((current) => !current)}
                className="inline-flex min-h-[2.55rem] items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-[0.93rem] text-zinc-800 shadow-[0_8px_20px_-22px_rgba(10,10,10,0.3)] transition hover:border-zinc-300 hover:shadow-[0_14px_24px_-24px_rgba(10,10,10,0.38)]"
                aria-expanded={showOther}
                aria-controls="other-start-options"
              >
                Other
                <span aria-hidden="true" className="text-zinc-500">
                  {showOther ? "−" : "+"}
                </span>
              </button>

              <div
                ref={setResetDropRef}
                className={cx("rounded-full transition", isResetDropOver && "ring-2 ring-zinc-300")}
              >
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setShowOther(false);
                    clearError();
                    resetJourney();
                  }}
                  className="inline-flex min-h-[2.55rem] items-center rounded-full border border-zinc-200 bg-white px-4 text-[0.93rem] text-zinc-700 transition hover:border-zinc-300"
                >
                  Reset
                </button>
              </div>

              {showOther && (
                <div
                  id="other-start-options"
                  role="dialog"
                  aria-label="Additional start options"
                  className="absolute left-1/2 top-[calc(100%+0.75rem)] z-30 w-[min(720px,calc(100vw-1.6rem))] -translate-x-1/2 rounded-[24px] border border-zinc-200 bg-white p-3 shadow-[0_24px_48px_-34px_rgba(10,10,10,0.35)]"
                >
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {extraStartOptions.map((option) => (
                      <StartOptionCard
                        key={option.id}
                        option={option}
                        compact
                        onSelect={handleSelectOther}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className={cx(
                "relative pb-7",
                isMobileFlow ? "mx-0 overflow-visible" : "-mx-2 overflow-x-auto md:-mx-4"
              )}
            >
              <div
                ref={canvasRef}
                className={cx(
                  "relative items-start py-7",
                  isMobileFlow
                    ? "mx-auto grid w-full max-w-[420px] gap-4 px-4"
                    : "flex min-w-max gap-6 pl-2 pr-6 md:pl-4 md:pr-10"
                )}
              >
                {connectorPaths.length > 0 && (
                  <svg
                    width={Math.max(canvasSize.width, 1)}
                    height={Math.max(canvasSize.height, 1)}
                    viewBox={`0 0 ${Math.max(canvasSize.width, 1)} ${Math.max(canvasSize.height, 1)}`}
                    className="pointer-events-none absolute left-0 top-0 z-0"
                    aria-hidden="true"
                  >
                    {connectorPaths.map((path) => (
                      <path
                        key={path.id}
                        d={path.d}
                        className={cx(
                          "qc-builder-connector",
                          path.variant === "secondary" && "qc-builder-connector--secondary"
                        )}
                        style={{ animationDelay: `${path.delayMs}ms` }}
                      />
                    ))}
                  </svg>
                )}

                <SortableContext
                  items={visibleGeneratedPath.map((step) => step.id)}
                  strategy={isMobileFlow ? verticalListSortingStrategy : horizontalListSortingStrategy}
                >
                  <div className={cx("relative z-10", isMobileFlow ? "w-full" : "w-[244px] shrink-0")}>
                    <div
                      ref={(node) => {
                        setStartNodeDropRef(node);
                        setStartDragRef(node);
                        registerPrimaryRef(0, node);
                      }}
                      style={state.start ? { transform: CSS.Transform.toString(startDragTransform) } : undefined}
                      {...(state.start ? startDragAttributes : {})}
                      {...(state.start ? startDragListeners : {})}
                      className={cx(
                        "rounded-[22px] border border-dashed bg-white p-4 shadow-[0_10px_24px_-28px_rgba(10,10,10,0.36)] transition duration-200 ease-out select-none touch-none",
                        isHoveringStart && "border-zinc-500",
                        state.start && "cursor-grab active:cursor-grabbing",
                        isStartDragging && "opacity-0"
                      )}
                    >
                      {state.start ? (
                        <div className="grid gap-2">
                          <p className="m-0 text-[0.64rem] uppercase tracking-[0.16em] text-zinc-400">
                            Step 1 • Start
                          </p>
                          <p className="m-0 text-[1.15rem] tracking-[-0.02em] text-zinc-900">
                            {visiblePrimaryPath[0]?.title ?? state.start.title}
                          </p>
                          <p className="m-0 text-[0.78rem] uppercase tracking-[0.12em] text-zinc-500">
                            Drop another start card here to replace
                          </p>
                        </div>
                      ) : (
                        <div className="grid min-h-[122px] content-center gap-1.5">
                          <p className="m-0 text-[0.64rem] uppercase tracking-[0.16em] text-zinc-400">
                            Step 1 • Start
                          </p>
                          <p className="m-0 text-[0.95rem] leading-[1.35] text-zinc-600">
                            Drag a start card here, or tap one above.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {visibleGeneratedPath.map((step, generatedIndex) => {
                    const index = generatedIndex + 1;
                    const level = visibleLevelMap.get(index);
                    const isEditing = activeEditing?.id === step.id;

                    return (
                      <div
                        key={step.id}
                        className={cx("relative z-10", isMobileFlow ? "w-full" : "w-[244px] shrink-0")}
                      >
                        <PrimaryStepCard
                          step={step}
                          index={index}
                          isEditing={isEditing}
                          editingValue={activeEditing?.value ?? ""}
                          onEditStart={(target) => setEditing({ id: target.id, value: target.title })}
                          onEditChange={(value) =>
                            setEditing((current) =>
                              current && current.id === step.id ? { ...current, value } : current
                            )
                          }
                          onEditCommit={commitEdit}
                          onEditCancel={() => setEditing(null)}
                          registerPrimaryRef={registerPrimaryRef}
                        />

                        {level?.alternative && (
                          <button
                            ref={(node) => registerAlternativeRef(index, node)}
                            type="button"
                            onClick={() => {
                              clearError();
                              setEditing(null);
                              selectAlternative(index);
                            }}
                            className={cx(
                              "mt-3 rounded-[18px] border border-zinc-200 bg-white p-3 text-left opacity-60 transition duration-200 hover:opacity-100",
                              isMobileFlow ? "w-full translate-x-0" : "w-[88%] translate-x-3"
                            )}
                          >
                            <p className="m-0 text-[0.62rem] uppercase tracking-[0.16em] text-zinc-400">
                              Alternative
                            </p>
                            <p className="mt-1 mb-0 text-[0.98rem] tracking-[-0.014em] text-zinc-800">
                              {level.alternative.title}
                            </p>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </SortableContext>
              </div>
            </div>

          </div>

          <DragOverlay dropAnimation={null}>{overlay}</DragOverlay>
        </DndContext>
      </div>
    </section>
  );
}
