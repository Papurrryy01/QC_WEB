"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { useRealtimeSession } from "../hooks/useRealtimeSession";

type VoiceSessionManagerProps = {
  languageHint?: string;
  voice?: string;
  children: (api: {
    isConnecting: boolean;
    isConnected: boolean;
    error: string | null;
    sessionToken: string | null;
    connect: () => Promise<void>;
    disconnect: () => void;
  }) => ReactNode;
};

export default function VoiceSessionManager({ languageHint, voice, children }: VoiceSessionManagerProps) {
  const realtime = useRealtimeSession();
  const [isConnected, setConnected] = useState(false);

  const connect = useCallback(async () => {
    const session = await realtime.createSession({ languageHint, voice });
    if (session?.clientSecret) {
      setConnected(true);
    }
  }, [languageHint, realtime, voice]);

  const disconnect = useCallback(() => {
    setConnected(false);
  }, []);

  return (
    <>
      {children({
        isConnecting: realtime.status === "loading",
        isConnected,
        error: realtime.error,
        sessionToken: realtime.session?.clientSecret ?? null,
        connect,
        disconnect,
      })}
    </>
  );
}
