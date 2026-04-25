import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  languageHint?: string | null;
  voice?: string | null;
};

const REALTIME_INSTRUCTIONS = [
  "You are QC, an emotional writing assistant.",
  "Speak calmly, naturally, and concisely.",
  "Do not ask too many questions.",
  "Ask at most one useful question only when needed.",
  "If meaning is clear, start shaping immediately.",
  "Preserve the user's voice and language (English, Spanish, mixed).",
  "Never sound robotic, formal, or theatrical.",
].join(" ");

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeHint(value: string | null | undefined) {
  if (!value || typeof value !== "string") return null;
  const normalized = value.trim().replace("_", "-");
  if (!normalized) return null;
  const [base, region] = normalized.split("-");
  if (!base) return null;
  const safeBase = base.toLowerCase().replace(/[^a-z]/g, "");
  if (!safeBase) return null;
  if (!region) return safeBase;
  const safeRegion = region.toUpperCase().replace(/[^A-Z]/g, "");
  return safeRegion ? `${safeBase}-${safeRegion}` : safeBase;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonError("Missing OPENAI_API_KEY on server.", 500);
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const languageHint = normalizeHint(body?.languageHint ?? null);
  const voice = typeof body?.voice === "string" && body.voice.trim() ? body.voice.trim() : "alloy";

  const instructions = languageHint
    ? `${REALTIME_INSTRUCTIONS} User language hint: ${languageHint}.`
    : REALTIME_INSTRUCTIONS;

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-realtime",
        voice,
        modalities: ["audio", "text"],
        instructions,
        input_audio_transcription: {
          model: "gpt-4o-mini-transcribe",
        },
      }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          client_secret?: { value?: string };
          model?: string;
          voice?: string;
          expires_at?: number;
          error?: { message?: string };
        }
      | null;

    if (!response.ok || !payload?.client_secret?.value) {
      return jsonError(payload?.error?.message ?? "Failed to create realtime session.", response.status || 500);
    }

    return NextResponse.json({
      result: {
        clientSecret: payload.client_secret.value,
        model: payload.model ?? "gpt-realtime",
        voice: payload.voice ?? voice,
        expiresAt: payload.expires_at ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Realtime session request failed.";
    return jsonError(message, 500);
  }
}
