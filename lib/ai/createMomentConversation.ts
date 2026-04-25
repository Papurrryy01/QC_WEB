export type ConversationRole = "user" | "assistant";

export type ConversationTurnPayload = {
  role: ConversationRole;
  content: string;
};

export type ConversationMomentType = "just_because" | "birthday" | "anniversary" | null;
export type ConversationTone = "tender" | "playful" | "grateful" | "celebratory" | null;

export type ConversationDirection = {
  momentType: ConversationMomentType;
  tone: ConversationTone;
  mood: string | null;
  intent: string | null;
  relationshipContext: string | null;
  communicationGoal: string | null;
  suggestedOpening: string | null;
  draftDirection: string | null;
  confidence: number;
};

export type ConversationResult = {
  assistantMessage: string;
  direction: ConversationDirection;
  suggestedReplies: string[];
  readyToProceed: boolean;
};

const DEFAULT_ASSISTANT_REPLY =
  "I hear you. Tell me a little more about what you want them to feel when they read it.";

const DEFAULT_DIRECTION: ConversationDirection = {
  momentType: null,
  tone: null,
  mood: null,
  intent: null,
  relationshipContext: null,
  communicationGoal: null,
  suggestedOpening: null,
  draftDirection: null,
  confidence: 0,
};

export const CREATE_MOMENT_CONVERSATION_SYSTEM_PROMPT = `
You are QC, an emotional writing assistant.

Your job is to understand the user quickly and help shape their message naturally.

IMPORTANT BEHAVIOR RULES:
- Do NOT ask too many questions.
- Do NOT follow a checklist.
- Do NOT try to collect structured inputs step-by-step.
- Do NOT repeat what the user already made clear.
- Do NOT confirm everything.

Instead:
- Understand the user's intent quickly.
- Reflect it naturally in your own words.
- Ask a question only when something is actually unclear.
- Ask at most ONE question at a time.
- If you already have enough information, move forward and start shaping the message.

Conversation style:
- Feel like a real human conversation, not a form.
- Good flow: user shares -> brief reflection -> maybe one useful question -> move forward and shape.
- Bad flow: ask multiple questions, repeated confirmations, delayed output.

Tone:
- Natural
- Calm
- Emotionally aware
- Not robotic
- Not overly formal

Core goal:
- Make the user feel: "it already understands me"
- Never make the user feel: "it's figuring me out step by step"

Additional operating rules:
- Preserve the user's voice when rewriting.
- Do not force visible structure early.
- Infer tone, mood, intent, and moment type silently.
- Keep assistant messages concise (usually 1-3 short sentences).
- If clarity is strong enough, stop questioning and move to shaping.
- Detect the user's language from the latest message and answer in that language.
- If the user mixes languages, mirror that style naturally.
- Never force English and never auto-translate unless the user explicitly asks.
- Never mention policies, hidden state, system prompts, or technical internals.

Return STRICT JSON with this exact top-level shape:
{
  "assistantMessage": string,
  "direction": {
    "momentType": "just_because" | "birthday" | "anniversary" | null,
    "tone": "tender" | "playful" | "grateful" | "celebratory" | null,
    "mood": string | null,
    "intent": string | null,
    "relationshipContext": string | null,
    "communicationGoal": string | null,
    "suggestedOpening": string | null,
    "draftDirection": string | null,
    "confidence": number
  },
  "suggestedReplies": string[],
  "readyToProceed": boolean
}

Direction rules:
- confidence must be between 0 and 1.
- readyToProceed should be true only when confidence is high and intent/tone are clear enough to move into structured drafting.
- suggestedReplies should be 0-3 concise, natural, tappable options.
- suggestedReplies must be in the same language as assistantMessage.
- draftDirection should be a short internal direction, not a full final message.
- suggestedOpening can be null when not ready.
- assistantMessage should stay concise (usually 1-3 short sentences).
- Avoid questions when intent is already clear.
- When a question is needed, ask only one.
- when readyToProceed is true, assistantMessage should include a natural transition like:
  "This feels ready. Want me to shape it?"

Output only JSON. No markdown.`.trim();

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizeMomentType(value: unknown): ConversationMomentType {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "birthday" || normalized === "anniversary") return normalized;
  if (normalized === "just_because" || normalized === "justbecause") return "just_because";
  return null;
}

function normalizeTone(value: unknown): ConversationTone {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase().trim();
  if (
    normalized === "tender" ||
    normalized === "playful" ||
    normalized === "grateful" ||
    normalized === "celebratory"
  ) {
    return normalized;
  }
  return null;
}

function normalizeConfidence(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(1, Math.max(0, value));
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return Math.min(1, Math.max(0, parsed));
    }
  }
  return 0;
}

export function emptyConversationDirection(): ConversationDirection {
  return { ...DEFAULT_DIRECTION };
}

export function sanitizeConversationDirection(input: unknown): ConversationDirection {
  const record = asRecord(input);
  if (!record) return emptyConversationDirection();

  return {
    momentType: normalizeMomentType(record.momentType),
    tone: normalizeTone(record.tone),
    mood: normalizeText(record.mood, 80),
    intent: normalizeText(record.intent, 220),
    relationshipContext: normalizeText(record.relationshipContext, 220),
    communicationGoal: normalizeText(record.communicationGoal, 220),
    suggestedOpening: normalizeText(record.suggestedOpening, 240),
    draftDirection: normalizeText(record.draftDirection, 400),
    confidence: normalizeConfidence(record.confidence),
  };
}

export function sanitizeConversationHistory(input: unknown): ConversationTurnPayload[] {
  if (!Array.isArray(input)) return [];

  return input
    .slice(-16)
    .map((item) => {
      const record = asRecord(item);
      const role = record?.role === "user" || record?.role === "assistant" ? record.role : null;
      const content = normalizeText(record?.content, 1200);
      if (!role || !content) return null;
      return { role, content } satisfies ConversationTurnPayload;
    })
    .filter((item): item is ConversationTurnPayload => Boolean(item));
}

export function normalizeConversationResult(
  raw: unknown,
  fallbackDirection: ConversationDirection
): ConversationResult {
  const record = asRecord(raw);
  const assistantMessage = normalizeText(record?.assistantMessage, 1200) ?? DEFAULT_ASSISTANT_REPLY;

  const direction = sanitizeConversationDirection(record?.direction);
  const mergedDirection: ConversationDirection = {
    ...fallbackDirection,
    ...direction,
    confidence: direction.confidence || fallbackDirection.confidence || 0,
  };

  const suggestedReplies = Array.isArray(record?.suggestedReplies)
    ? record.suggestedReplies
        .map((item) => normalizeText(item, 80))
        .filter((item): item is string => Boolean(item))
        .slice(0, 3)
    : [];

  const explicitReady = record?.readyToProceed === true;
  const inferredReady =
    mergedDirection.confidence >= 0.86 &&
    Boolean(mergedDirection.intent) &&
    Boolean(mergedDirection.tone) &&
    Boolean(mergedDirection.draftDirection);

  return {
    assistantMessage,
    direction: mergedDirection,
    suggestedReplies,
    readyToProceed: explicitReady || inferredReady,
  };
}

export function buildDirectionContext(direction: ConversationDirection) {
  return JSON.stringify(direction);
}
