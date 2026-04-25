"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

function toIsoFromLocal(value: string) {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function QuickDraftButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [scheduledForLocal, setScheduledForLocal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/moments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipient_email: recipientEmail,
          message_body: messageBody,
          scheduled_for_utc: toIsoFromLocal(scheduledForLocal),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; moment?: { id?: string } }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not create this draft.");
      }

      setOpen(false);
      setRecipientEmail("");
      setMessageBody("");
      setScheduledForLocal("");
      router.refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create this draft.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button type="button" className="qc-button qc-button--secondary" onClick={() => setOpen(true)}>
        Quick draft
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[560px] rounded-[28px] border border-[var(--qc-border)] bg-[color:color-mix(in_srgb,var(--qc-surface-strong)_90%,white)] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="qc-kicker">Home draft</p>
                <h2 className="mt-2 text-[1.9rem] leading-[1.02] tracking-[-0.04em] text-[var(--qc-text)]">
                  Add a moment without leaving Home.
                </h2>
                <p className="mt-3 text-[0.98rem] leading-6 text-[var(--qc-text-soft)]">
                  Start with the essentials here. You can shape the rest later in the editor.
                </p>
              </div>

              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--qc-border)] bg-[var(--qc-surface)] text-[1.1rem] text-[var(--qc-text-soft)] transition hover:border-[var(--qc-border-strong)] hover:text-[var(--qc-text)]"
                onClick={() => setOpen(false)}
                aria-label="Close quick draft"
              >
                ×
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="block text-[0.76rem] font-medium uppercase tracking-[0.18em] text-[var(--qc-text-faint)]">
                  Recipient email
                </span>
                <input
                  className="qc-input h-12 w-full"
                  type="email"
                  placeholder="recipient@email.com"
                  value={recipientEmail}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="block text-[0.76rem] font-medium uppercase tracking-[0.18em] text-[var(--qc-text-faint)]">
                  Message
                </span>
                <textarea
                  className="qc-input min-h-[120px] w-full px-4 py-3"
                  placeholder="Write the first version of what you want them to receive."
                  value={messageBody}
                  onChange={(event) => setMessageBody(event.target.value)}
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="block text-[0.76rem] font-medium uppercase tracking-[0.18em] text-[var(--qc-text-faint)]">
                  Delivery time
                </span>
                <input
                  className="qc-input h-12 w-full"
                  type="datetime-local"
                  value={scheduledForLocal}
                  onChange={(event) => setScheduledForLocal(event.target.value)}
                />
              </label>

              {error ? <div className="qc-status qc-status--danger">{error}</div> : null}

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="qc-button qc-button--secondary"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="qc-button qc-button--primary" disabled={submitting}>
                  {submitting ? "Creating..." : "Create draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
