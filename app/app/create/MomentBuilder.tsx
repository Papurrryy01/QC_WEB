"use client";

import { useMemo } from "react";

export type MomentBuilderData = {
  momentTitle: string;
  emotionalGoal: string;
  toneProfile: string;
  revealStyle: string;
  suggestedMessage: string;
};

type MomentBuilderProps = {
  data: MomentBuilderData;
  onUse: () => void;
  onRefine: () => void;
};

export default function MomentBuilder({ data, onUse, onRefine }: MomentBuilderProps) {
  const summary = useMemo(() => {
    return `${data.toneProfile} tone • ${data.revealStyle}`;
  }, [data.revealStyle, data.toneProfile]);

  return (
    <section className="qc-builder-surface" aria-label="Moment direction">
      <p className="qc-builder-kicker">Direction</p>
      <h3 className="qc-builder-title">{data.momentTitle}</h3>
      <p className="qc-builder-summary">{data.emotionalGoal}</p>
      <p className="qc-builder-meta">{summary}</p>
      <p className="qc-builder-message">{data.suggestedMessage}</p>
      <div className="qc-builder-actions">
        <button type="button" className="qc-builder-btn is-primary" onClick={onUse}>
          Use this
        </button>
        <button type="button" className="qc-builder-btn" onClick={onRefine}>
          Refine
        </button>
      </div>
    </section>
  );
}
