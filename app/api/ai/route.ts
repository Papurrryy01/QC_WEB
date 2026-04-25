import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  buildDirectionContext,
  CREATE_MOMENT_CONVERSATION_SYSTEM_PROMPT,
  normalizeConversationResult,
  sanitizeConversationDirection,
  sanitizeConversationHistory,
} from "@/lib/ai/createMomentConversation";

export const runtime = "nodejs";

type AiRequestBody = {
  mode?: "prompt" | "refine" | "analyze" | "conversation";
  prompt?: string;
  text?: string;
  message?: string;
  action?: "tone" | "deeper" | "shorter" | "emotional" | "clearer";
  tone?: string;
  history?: unknown;
  direction?: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

function safeTrim(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function POST(req: Request) {
  const client = getClient();
  if (!client) {
    return jsonError("Missing OPENAI_API_KEY on server.", 500);
  }

  const body = (await req.json().catch(() => null)) as AiRequestBody | null;
  if (!body) {
    return jsonError("Invalid request body.", 400);
  }

  const mode = body.mode ?? "prompt";
  const prompt = safeTrim(body.prompt, 6000);
  const text = safeTrim(body.text, 6000);
  const message = safeTrim(body.message, 2400);
  const tone = safeTrim(body.tone, 80);
  const action = body.action;

  try {
    if (mode === "prompt") {
      if (!prompt) {
        return jsonError("Prompt is required.", 400);
      }

      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content:
              "You help users write emotional, meaningful messages. Keep language natural and human.",
          },
          { role: "user", content: prompt },
        ],
      });

      return NextResponse.json({
        result: response.choices[0]?.message?.content?.trim() ?? "",
      });
    }

    if (mode === "refine") {
      if (!text) {
        return jsonError("Text is required for refine mode.", 400);
      }
      if (!action) {
        return jsonError("Action is required for refine mode.", 400);
      }

      const instructionMap: Record<NonNullable<AiRequestBody["action"]>, string> = {
        tone: `Improve the tone while keeping it natural and emotionally honest. Desired tone: ${tone || "Tender"}.`,
        deeper: "Make this deeper and more emotionally meaningful while staying concise.",
        shorter: "Shorten this while preserving emotional clarity and intent.",
        emotional: "Make this more emotional and heartfelt without sounding dramatic.",
        clearer: "Make this clearer and easier to understand while preserving intent.",
      };

      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content: [
              "You are an expert in emotional communication for meaningful personal messages.",
              "Always keep the message natural, warm, and human.",
              "Avoid robotic wording, cliches, and over-polishing.",
              "Return only the rewritten message text.",
            ].join(" "),
          },
          {
            role: "user",
            content: `${instructionMap[action]}\n\nMessage:\n${text}`,
          },
        ],
      });

      return NextResponse.json({
        result: response.choices[0]?.message?.content?.trim() ?? text,
      });
    }

    if (mode === "analyze") {
      if (!text) {
        return jsonError("Text is required for analyze mode.", 400);
      }

      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are an expert in emotional communication.",
              "Interpret user thoughts and return structured JSON with:",
              "moment_type (JUST BECAUSE|BIRTHDAY|ANNIVERSARY),",
              "tone (Tender|Playful|Grateful|Celebratory), mood, and message.",
              "Keep the generated message natural and human.",
            ].join(" "),
          },
          {
            role: "user",
            content: `Analyze this thought and return valid JSON only:\n\n${text}`,
          },
        ],
      });

      const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
      const parsed = JSON.parse(raw) as {
        moment_type?: string;
        tone?: string;
        mood?: string;
        message?: string;
      };

      const momentType = safeTrim(parsed.moment_type, 40);
      const normalizedMomentType =
        momentType === "BIRTHDAY" || momentType === "ANNIVERSARY" ? momentType : "JUST BECAUSE";

      const parsedTone = safeTrim(parsed.tone, 40);
      const normalizedTone =
        parsedTone === "Playful" ||
        parsedTone === "Grateful" ||
        parsedTone === "Celebratory" ||
        parsedTone === "Tender"
          ? parsedTone
          : "Tender";

      return NextResponse.json({
        result: {
          moment_type: normalizedMomentType,
          tone: normalizedTone,
          mood: safeTrim(parsed.mood, 40) || "intimate",
          message: safeTrim(parsed.message, 1200) || text,
        },
      });
    }

    if (mode === "conversation") {
      if (!message) {
        return jsonError("Message is required for conversation mode.", 400);
      }

      const history = sanitizeConversationHistory(body.history);
      const direction = sanitizeConversationDirection(body.direction);

      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.72,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: CREATE_MOMENT_CONVERSATION_SYSTEM_PROMPT,
          },
          {
            role: "system",
            content: `Current direction state: ${buildDirectionContext(direction)}`,
          },
          ...history.map((item) => ({
            role: item.role,
            content: item.content,
          })),
          {
            role: "user",
            content: message,
          },
        ],
      });

      const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
      const parsed = JSON.parse(raw) as unknown;
      const result = normalizeConversationResult(parsed, direction);

      return NextResponse.json({ result });
    }

    return jsonError("Unsupported mode.", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed.";
    return jsonError(message, 500);
  }
}
