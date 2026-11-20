/**
 * Chat shapes shared by the AI assistant's server code and its UI.
 */
export type Tone = "danger" | "warning" | "success" | "neutral";

/** Structured pieces used by quick answers (the AI itself replies in Markdown). */
export type ReplyBlock =
  | { type: "text"; text: string } // supports **bold**
  | { type: "stats"; items: { label: string; value: string; tone?: Tone }[] }
  | { type: "list"; items: { title: string; meta: string; badge?: string; tone?: Tone }[] }
  | { type: "link"; label: string; href: string }
  /** Tappable follow-up questions. */
  | { type: "suggestions"; items: string[] };

/** ai = answered by the AI model · quick = built-in answer from live data · error = couldn't answer. */
export type ReplySource = "ai" | "quick" | "error";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  /** Markdown for AI replies; plain text for user messages and quick answers. */
  text: string;
  blocks?: ReplyBlock[] | null;
  source?: ReplySource | null;
  createdAt: string;
};

export type ConversationSummary = { id: string; title: string; updatedAt: string };

/** Shown as a banner while the AI can't be used. */
export type AiNotice =
  | { kind: "limit"; scope: "minute" | "day" | "app"; resetAt: string; message: string }
  | { kind: "unavailable"; message: string };

export type SendMessageResult =
  | {
      ok: true;
      conversation: ConversationSummary;
      created: boolean;
      userMessage: ChatMessage;
      reply: ChatMessage;
      notice: AiNotice | null;
    }
  | { ok: false; message: string };

export const MAX_QUESTION_LENGTH = 2000;

export const SUGGESTIONS = [
  { title: "What expires this week?", hint: "Across all stores" },
  { title: "How many expired products do I have?", hint: "With value at cost" },
  { title: "How many employees are in each store?", hint: "Team overview" },
  { title: "How much money is at risk?", hint: "Expiring and expired stock" },
] as const;
