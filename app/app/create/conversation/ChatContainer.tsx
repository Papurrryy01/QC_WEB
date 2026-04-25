"use client";

import type { PropsWithChildren } from "react";
import { IconChevronLeft } from "@/app/components/icons/CoolIcons";

type ChatContainerProps = PropsWithChildren<{
  title?: string;
  onClose: () => void;
}>;

export default function ChatContainer({ title = "Start from a feeling", onClose, children }: ChatContainerProps) {
  return (
    <section className="qc-chat-surface">
      <header className="qc-chat-topbar">
        <button type="button" className="qc-chat-back" onClick={onClose} aria-label="Back to create flow">
          <IconChevronLeft />
        </button>
        <p className="qc-chat-title">{title}</p>
        <div className="qc-chat-spacer" aria-hidden="true" />
      </header>
      {children}
    </section>
  );
}
