import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 24 * 1024 * 1024;

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/oga",
  "audio/aac",
  "audio/flac",
  "video/webm",
]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function trimText(value: unknown, maxLength = 200) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function toIsoLanguage(value: string) {
  const normalized = value.replace("_", "-").toLowerCase();
  const [base] = normalized.split("-");
  if (!base) return null;
  if (!/^[a-z]{2,3}$/.test(base)) return null;
  return base;
}

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

export async function POST(req: Request) {
  const client = getClient();
  if (!client) {
    return jsonError("Missing OPENAI_API_KEY on server.", 500);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError("Invalid audio upload.", 400);
  }

  const audioField = formData.get("audio");
  if (!(audioField instanceof File)) {
    return jsonError("Audio file is required.", 400);
  }

  if (audioField.size <= 0) {
    return jsonError("Audio file is empty.", 400);
  }

  if (audioField.size > MAX_AUDIO_BYTES) {
    return jsonError("Audio is too large. Keep it under 24MB.", 400);
  }

  if (audioField.type && !ALLOWED_AUDIO_TYPES.has(audioField.type.toLowerCase())) {
    return jsonError("Unsupported audio type.", 400);
  }

  const languageHintRaw = trimText(formData.get("languageHint"), 32);
  const languageHint = toIsoLanguage(languageHintRaw);

  try {
    const transcription = await client.audio.transcriptions.create({
      file: audioField,
      model: "gpt-4o-mini-transcribe",
      response_format: "json",
      ...(languageHint ? { language: languageHint } : {}),
      prompt:
        "Transcribe exactly what was spoken. Preserve the original language and wording. Do not translate.",
    });

    const text = trimText(transcription.text, 8000);
    if (!text) {
      return jsonError("Transcription was empty. Try again.", 422);
    }

    const maybeLanguage =
      "language" in transcription && typeof transcription.language === "string"
        ? toIsoLanguage(transcription.language)
        : null;

    return NextResponse.json({
      result: {
        text,
        language: maybeLanguage,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcription failed.";
    return jsonError(message, 500);
  }
}
