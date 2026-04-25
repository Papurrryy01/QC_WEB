"use client";

import { useCallback, useState } from "react";

export type RealtimeSessionStatus = "idle" | "loading" | "ready" | "error";

export type RealtimeSessionPayload = {
  clientSecret: string;
  model: string;
  voice: string;
  expiresAt: number | null;
};

export function useRealtimeSession() {
  const [status, setStatus] = useState<RealtimeSessionStatus>("idle");
  const [session, setSession] = useState<RealtimeSessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async (input?: { languageHint?: string; voice?: string }) => {
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          languageHint: input?.languageHint ?? null,
          voice: input?.voice ?? null,
        }),
      });

      const payload = (await res.json().catch(() => null)) as
        | {
            result?: {
              clientSecret?: string;
              model?: string;
              voice?: string;
              expiresAt?: number | null;
            };
            error?: string;
          }
        | null;

      if (!res.ok || !payload?.result?.clientSecret) {
        throw new Error(payload?.error ?? "Could not create realtime session.");
      }

      const next: RealtimeSessionPayload = {
        clientSecret: payload.result.clientSecret,
        model: payload.result.model ?? "",
        voice: payload.result.voice ?? "alloy",
        expiresAt: payload.result.expiresAt ?? null,
      };

      setSession(next);
      setStatus("ready");
      return next;
    } catch (createError) {
      setStatus("error");
      setSession(null);
      setError(createError instanceof Error ? createError.message : "Failed to create session.");
      return null;
    }
  }, []);

  return {
    status,
    session,
    error,
    createSession,
  };
}
