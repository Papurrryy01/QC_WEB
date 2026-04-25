"use client";

import type { PropsWithChildren } from "react";

type GlassCardContainerProps = PropsWithChildren<{
  onClose: () => void;
  title: string;
}>;

export default function GlassCardContainer({ onClose, title, children }: GlassCardContainerProps) {
  return (
    <aside
      className="qc-chat-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="qc-chat-glass-card" onMouseDown={(event) => event.stopPropagation()}>
        {children}
      </section>
    </aside>
  );
}
