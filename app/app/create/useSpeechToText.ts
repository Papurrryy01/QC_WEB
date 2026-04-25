"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SpeechState =
  | "idle"
  | "listening"
  | "transcribing"
  | "ready"
  | "error"
  | "unsupported";

type BrowserSpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type TranscribeResult = {
  text: string;
  language: string | null;
};

type SpeechToTextOptions = {
  languageHint?: string;
};

function getRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const fromWindow = window as typeof window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };
  return fromWindow.SpeechRecognition ?? fromWindow.webkitSpeechRecognition ?? null;
}

function getPreferredLanguage() {
  if (typeof navigator === "undefined") return "";
  const first = navigator.languages?.[0] || navigator.language || "";
  return first || "";
}

function pickAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function fileExtensionFromMimeType(mimeType: string) {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

function normalizeLanguageHint(language: string) {
  const raw = language.trim();
  if (!raw) return "";
  const normalized = raw.replace("_", "-");
  const [base, region] = normalized.split("-");
  if (!base) return "";
  const safeBase = base.toLowerCase().replace(/[^a-z]/g, "");
  if (!safeBase) return "";
  if (!region) return safeBase;
  const safeRegion = region.toUpperCase().replace(/[^A-Z]/g, "");
  return safeRegion ? `${safeBase}-${safeRegion}` : safeBase;
}

async function transcribeAudioBlob(blob: Blob, languageHint: string): Promise<TranscribeResult> {
  const mimeType = blob.type || "audio/webm";
  const ext = fileExtensionFromMimeType(mimeType);
  const file = new File([blob], `qc-voice-${Date.now()}.${ext}`, {
    type: mimeType,
  });

  const form = new FormData();
  form.append("audio", file);
  if (languageHint) {
    form.append("languageHint", languageHint);
  }

  const res = await fetch("/api/ai/transcribe", {
    method: "POST",
    body: form,
  });

  const payload = (await res.json().catch(() => null)) as
    | { result?: TranscribeResult; error?: string }
    | null;

  if (!res.ok || !payload?.result?.text?.trim()) {
    throw new Error(payload?.error ?? "Transcription failed.");
  }

  return {
    text: payload.result.text.trim(),
    language: payload.result.language ?? null,
  };
}

export type SpeechToTextApi = {
  isSupported: boolean;
  state: SpeechState;
  transcript: string;
  interimTranscript: string;
  speechLevel: number;
  detectedLanguage: string | null;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  cancelListening: () => void;
  clearTranscript: () => void;
  retryTranscription: () => Promise<void>;
};

export function useSpeechToText(options: SpeechToTextOptions = {}): SpeechToTextApi {
  const recognitionConstructor = getRecognitionConstructor();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const analyserFrameRef = useRef<number | null>(null);
  const analyserLastEmitRef = useRef(0);
  const analyserLastLevelRef = useRef(0);
  const shouldTranscribeOnStopRef = useRef(true);
  const previewRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const lastBlobRef = useRef<Blob | null>(null);

  const [state, setState] = useState<SpeechState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechLevel, setSpeechLevel] = useState(0);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const languageHint = useMemo(
    () => normalizeLanguageHint(options.languageHint ?? ""),
    [options.languageHint]
  );

  const previewLanguage = useMemo(() => {
    if (languageHint) return languageHint;
    return normalizeLanguageHint(getPreferredLanguage()) || "en-US";
  }, [languageHint]);

  const stopLevelMeter = useCallback(() => {
    if (analyserFrameRef.current !== null) {
      window.cancelAnimationFrame(analyserFrameRef.current);
      analyserFrameRef.current = null;
    }

    try {
      analyserSourceRef.current?.disconnect();
    } catch {
      // best-effort cleanup
    }

    try {
      analyserRef.current?.disconnect();
    } catch {
      // best-effort cleanup
    }

    analyserSourceRef.current = null;
    analyserRef.current = null;
    analyserDataRef.current = null;
    analyserLastEmitRef.current = 0;
    analyserLastLevelRef.current = 0;
    setSpeechLevel(0);

    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== "closed") {
      void audioContext.close().catch(() => {
        // best-effort cleanup
      });
    }
  }, []);

  const startLevelMeter = useCallback((stream: MediaStream) => {
    if (typeof window === "undefined") return;
    if (!("AudioContext" in window || "webkitAudioContext" in window)) return;

    stopLevelMeter();

    const AudioContextCtor = (
      window as typeof window & { webkitAudioContext?: typeof AudioContext }
    ).AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) return;

    try {
      const audioContext = new AudioContextCtor();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.84;
      source.connect(analyser);

      const data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      analyserSourceRef.current = source;
      analyserDataRef.current = data;

      const loop = (timestamp: number) => {
        const currentAnalyser = analyserRef.current;
        const currentData = analyserDataRef.current;
        if (!currentAnalyser || !currentData) return;

        currentAnalyser.getByteTimeDomainData(currentData);

        let sum = 0;
        for (let i = 0; i < currentData.length; i += 1) {
          const centered = (currentData[i] - 128) / 128;
          sum += centered * centered;
        }

        const rms = Math.sqrt(sum / currentData.length);
        const normalized = Math.min(1, Math.max(0, (rms - 0.015) * 7.2));
        const smoothed = normalized * 0.72 + analyserLastLevelRef.current * 0.28;

        if (
          timestamp - analyserLastEmitRef.current > 48 ||
          Math.abs(smoothed - analyserLastLevelRef.current) > 0.028
        ) {
          analyserLastEmitRef.current = timestamp;
          analyserLastLevelRef.current = smoothed;
          setSpeechLevel(smoothed);
        }

        analyserFrameRef.current = window.requestAnimationFrame(loop);
      };

      analyserFrameRef.current = window.requestAnimationFrame(loop);
    } catch {
      stopLevelMeter();
    }
  }, [stopLevelMeter]);

  const stopStream = useCallback(() => {
    if (!streamRef.current) return;
    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    stopLevelMeter();
  }, [stopLevelMeter]);

  const stopPreviewRecognition = useCallback(() => {
    if (!previewRecognitionRef.current) return;
    previewRecognitionRef.current.onstart = null;
    previewRecognitionRef.current.onresult = null;
    previewRecognitionRef.current.onerror = null;
    previewRecognitionRef.current.onend = null;
    try {
      previewRecognitionRef.current.abort();
    } catch {
      // best-effort cleanup
    }
    previewRecognitionRef.current = null;
  }, []);

  const runTranscription = useCallback(
    async (blob: Blob) => {
      setState("transcribing");
      setError(null);
      setInterimTranscript("");

      try {
        const result = await transcribeAudioBlob(blob, languageHint);
        setTranscript(result.text);
        setDetectedLanguage(result.language);
        setState("ready");
      } catch (transcriptionError) {
        const message =
          transcriptionError instanceof Error
            ? transcriptionError.message
            : "Could not transcribe this audio. Please try again.";
        setError(message);
        setState("error");
      }
    },
    [languageHint]
  );

  const startListening = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (state === "listening" || state === "transcribing") return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("unsupported");
      setError("Microphone capture is not available in this browser.");
      return;
    }

    setError(null);
    setTranscript("");
    setInterimTranscript("");
    setSpeechLevel(0);
    setDetectedLanguage(null);
    audioChunksRef.current = [];
    shouldTranscribeOnStopRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startLevelMeter(stream);

      const mimeType = pickAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setError("Recording failed. Try again.");
        setState("error");
        stopStream();
        stopPreviewRecognition();
      };

      recorder.onstop = () => {
        stopStream();
        stopPreviewRecognition();

        if (!shouldTranscribeOnStopRef.current) {
          shouldTranscribeOnStopRef.current = true;
          audioChunksRef.current = [];
          setState("idle");
          return;
        }

        const blob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        });
        audioChunksRef.current = [];

        if (!blob.size) {
          setError("No audio captured. Try speaking a little longer.");
          setState("error");
          return;
        }

        lastBlobRef.current = blob;
        void runTranscription(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setState("listening");

      if (recognitionConstructor) {
        try {
          const recognition = new recognitionConstructor();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = previewLanguage;

          recognition.onresult = (event) => {
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
              const result = event.results[i];
              if (result.isFinal) continue;
              const chunk = result?.[0]?.transcript?.trim() ?? "";
              if (!chunk) continue;
              interim += `${chunk} `;
            }
            setInterimTranscript(interim.trim());
          };

          recognition.onerror = () => {
            // Preview-only speech recognition can fail depending on browser/language.
          };

          recognition.start();
          previewRecognitionRef.current = recognition;
        } catch {
          previewRecognitionRef.current = null;
        }
      }
    } catch {
      stopStream();
      stopPreviewRecognition();
      setError("Microphone access was blocked. Allow access and try again.");
      setState("error");
    }
  }, [
    previewLanguage,
    recognitionConstructor,
    runTranscription,
    startLevelMeter,
    state,
    stopPreviewRecognition,
    stopStream,
  ]);

  const stopListening = useCallback(() => {
    if (state !== "listening") return;
    stopPreviewRecognition();

    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      setError("Recorder unavailable. Try again.");
      setState("error");
      return;
    }

    try {
      recorder.stop();
      setState("transcribing");
    } catch {
      setError("Could not stop recording cleanly. Try again.");
      setState("error");
    }
  }, [state, stopPreviewRecognition]);

  const cancelListening = useCallback(() => {
    if (state !== "listening") return;
    shouldTranscribeOnStopRef.current = false;
    stopPreviewRecognition();
    setTranscript("");
    setInterimTranscript("");
    setSpeechLevel(0);
    setDetectedLanguage(null);
    setError(null);

    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      stopStream();
      setState("idle");
      return;
    }

    try {
      if (recorder.state !== "inactive") {
        recorder.stop();
      } else {
        stopStream();
        setState("idle");
      }
    } catch {
      stopStream();
      setState("idle");
    }
  }, [state, stopPreviewRecognition, stopStream]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setSpeechLevel(0);
    setDetectedLanguage(null);
    setError(null);
    if (state !== "listening" && state !== "transcribing") {
      setState("idle");
    }
  }, [state]);

  const retryTranscription = useCallback(async () => {
    if (!lastBlobRef.current) {
      setError("No recording available to retry.");
      return;
    }
    await runTranscription(lastBlobRef.current);
  }, [runTranscription]);

  useEffect(() => {
    return () => {
      stopPreviewRecognition();
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // best-effort cleanup
        }
      }
      stopStream();
      stopLevelMeter();
    };
  }, [stopLevelMeter, stopPreviewRecognition, stopStream]);

  return {
    isSupported:
      typeof window !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined",
    state,
    transcript,
    interimTranscript,
    speechLevel,
    detectedLanguage,
    error,
    startListening,
    stopListening,
    cancelListening,
    clearTranscript,
    retryTranscription,
  };
}
