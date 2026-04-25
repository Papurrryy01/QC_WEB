"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LiveTurn = {
  id: string;
  role: "assistant" | "user";
  text: string;
  createdAt: number;
};

export type RealtimeVoiceStatus = "idle" | "connecting" | "connected" | "error";

type ConnectInput = {
  clientSecret: string;
  model?: string;
};

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `turn_${Math.random().toString(36).slice(2, 10)}`;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getNestedString(source: Record<string, unknown>, path: string[]): string {
  let cursor: unknown = source;
  for (const key of path) {
    if (!cursor || typeof cursor !== "object") return "";
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return asString(cursor);
}

function extractItemText(item: unknown): string {
  if (!item || typeof item !== "object") return "";
  const content = (item as Record<string, unknown>).content;
  if (!Array.isArray(content)) return "";

  const parts: string[] = [];
  for (const entry of content) {
    if (!entry || typeof entry !== "object") continue;
    const text =
      asString((entry as Record<string, unknown>).text) ||
      getNestedString(entry as Record<string, unknown>, ["transcript"]);
    if (text.trim()) {
      parts.push(text.trim());
    }
  }

  return parts.join(" ").trim();
}

export function useRealtimeVoiceSession() {
  const [status, setStatus] = useState<RealtimeVoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<LiveTurn[]>([]);
  const [assistantPartial, setAssistantPartial] = useState("");
  const [isMuted, setMuted] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const assistantPartialRef = useRef("");

  const appendTurn = useCallback((role: "assistant" | "user", text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    setTurns((previous) => [
      ...previous,
      {
        id: randomId(),
        role,
        text: cleaned,
        createdAt: Date.now(),
      },
    ]);
  }, []);

  const updatePartial = useCallback((delta: string) => {
    if (!delta) return;
    setAssistantPartial((previous) => {
      const next = `${previous}${delta}`;
      assistantPartialRef.current = next;
      return next;
    });
  }, []);

  const commitPartial = useCallback(
    (explicit?: string) => {
      const text = (explicit?.trim() || assistantPartialRef.current.trim()).trim();
      if (text) {
        appendTurn("assistant", text);
      }
      assistantPartialRef.current = "";
      setAssistantPartial("");
    },
    [appendTurn]
  );

  const disconnect = useCallback(() => {
    const channel = dataChannelRef.current;
    dataChannelRef.current = null;
    if (channel) {
      try {
        channel.close();
      } catch {
        // noop
      }
    }

    const pc = pcRef.current;
    pcRef.current = null;
    if (pc) {
      try {
        pc.getSenders().forEach((sender) => {
          sender.track?.stop();
        });
      } catch {
        // noop
      }
      try {
        pc.close();
      } catch {
        // noop
      }
    }

    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    const audio = remoteAudioRef.current;
    remoteAudioRef.current = null;
    if (audio) {
      try {
        audio.pause();
      } catch {
        // noop
      }
      audio.srcObject = null;
    }

    assistantPartialRef.current = "";
    setAssistantPartial("");
    setMuted(false);
    setStatus("idle");
  }, []);

  const handleRealtimeEvent = useCallback(
    (raw: string) => {
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = asString(event.type);
      if (!type) return;

      if (type === "error") {
        const message =
          getNestedString(event, ["error", "message"]) ||
          asString(event.message) ||
          "Live QC encountered an error.";
        setError(message);
        setStatus("error");
        return;
      }

      if (type === "conversation.item.input_audio_transcription.completed") {
        const transcript = asString(event.transcript) || extractItemText(event.item);
        if (transcript) {
          appendTurn("user", transcript);
        }
        return;
      }

      if (
        type === "response.audio_transcript.delta" ||
        type === "response.output_text.delta" ||
        type === "response.text.delta"
      ) {
        const delta = asString(event.delta) || asString(event.text) || asString(event.output_text);
        if (delta) {
          updatePartial(delta);
        }
        return;
      }

      if (
        type === "response.audio_transcript.done" ||
        type === "response.output_text.done" ||
        type === "response.text.done"
      ) {
        const text =
          asString(event.transcript) ||
          asString(event.text) ||
          asString(event.output_text) ||
          extractItemText(event.item);
        commitPartial(text);
        return;
      }

      if (type === "response.done") {
        commitPartial();
      }
    },
    [appendTurn, commitPartial, updatePartial]
  );

  const connect = useCallback(
    async ({ clientSecret, model }: ConnectInput) => {
      if (!clientSecret.trim()) {
        setError("Missing realtime session token.");
        setStatus("error");
        return false;
      }

      if (typeof window === "undefined" || typeof RTCPeerConnection === "undefined") {
        setError("Realtime voice is unavailable in this browser.");
        setStatus("error");
        return false;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Microphone is unavailable in this browser.");
        setStatus("error");
        return false;
      }

      disconnect();
      setError(null);
      setTurns([]);
      assistantPartialRef.current = "";
      setAssistantPartial("");
      setStatus("connecting");

      try {
        const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = localStream;

        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        const remoteAudio = new Audio();
        remoteAudio.autoplay = true;
        remoteAudio.setAttribute("playsinline", "true");
        remoteAudio.muted = false;
        remoteAudioRef.current = remoteAudio;

        pc.ontrack = (event) => {
          const [stream] = event.streams;
          if (stream) {
            remoteAudio.srcObject = stream;
            void remoteAudio.play().catch(() => {
              // User gesture handled by button tap. Ignore playback races.
            });
          }
        };

        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          if (state === "connected") {
            setStatus("connected");
            setError(null);
            return;
          }

          if (state === "failed") {
            setError("Live QC connection failed. Try again.");
            setStatus("error");
            return;
          }

          if (state === "disconnected") {
            setError("Live QC disconnected.");
            setStatus("error");
          }
        };

        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });

        const events = pc.createDataChannel("oai-events");
        dataChannelRef.current = events;

        events.onmessage = (event) => {
          if (typeof event.data === "string") {
            handleRealtimeEvent(event.data);
          }
        };

        events.onopen = () => {
          const greeting = {
            type: "response.create",
            response: {
              modalities: ["audio", "text"],
              instructions:
                "Give a short warm greeting and invite the user to speak naturally. Keep it brief.",
            },
          };
          events.send(JSON.stringify(greeting));
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const realtimeModel = model?.trim() || "gpt-realtime";
        const baseUrl = `https://api.openai.com/v1/realtime?model=${encodeURIComponent(realtimeModel)}`;

        const sdpRes = await fetch(baseUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${clientSecret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp || "",
        });

        if (!sdpRes.ok) {
          const details = await sdpRes.text().catch(() => "");
          throw new Error(details || "Failed to establish realtime connection.");
        }

        const answerSdp = await sdpRes.text();
        await pc.setRemoteDescription({
          type: "answer",
          sdp: answerSdp,
        });

        return true;
      } catch (connectError) {
        const message =
          connectError instanceof Error
            ? connectError.message
            : "Could not start Live QC right now.";
        setError(message);
        setStatus("error");
        disconnect();
        return false;
      }
    },
    [disconnect, handleRealtimeEvent]
  );

  const toggleMute = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const next = !isMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }, [isMuted]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    error,
    turns,
    assistantPartial,
    isMuted,
    connect,
    disconnect,
    toggleMute,
  };
}
