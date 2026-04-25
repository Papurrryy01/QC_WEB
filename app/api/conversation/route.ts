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

type ConversationRequestBody = {
  message?: string;
  history?: unknown;
  direction?: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function safeTrim(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function safeParseModelJson(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { assistantMessage: raw } satisfies Record<string, unknown>;
  }
}

export async function POST(req: Request) {
  const client = getClient();
  if (!client) {
    return jsonError("Missing OPENAI_API_KEY on server.", 500);
  }

  const body = (await req.json().catch(() => null)) as ConversationRequestBody | null;
  if (!body) {
    return jsonError("Invalid request body.", 400);
  }

  const message = safeTrim(body.message, 2400);
  if (!message) {
    return jsonError("Message is required.", 400);
  }

  const history = sanitizeConversationHistory(body.history);
  const direction = sanitizeConversationDirection(body.direction);

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.72,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CREATE_MOMENT_CONVERSATION_SYSTEM_PROMPT },
        {
          role: "system",
          content: `Current direction state (internal memory): ${buildDirectionContext(direction)}`,
        },
        ...history.map((item) => ({
          role: item.role,
          content: item.content,
        })),
        { role: "user", content: message },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
    const parsed = safeParseModelJson(raw);
    const result = normalizeConversationResult(parsed, direction);
    return NextResponse.json({ result });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Conversation request failed.";
    return jsonError(messageText, 500);
  }
}
