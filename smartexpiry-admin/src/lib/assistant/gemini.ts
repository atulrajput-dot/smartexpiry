import "server-only";
import { aiConfig, nextMidnight } from "./config";

/**
 * Minimal Gemini REST client (generateContent + function calling) with:
 * - model fallback: tries GEMINI_MODELS in order,
 * - free-limit handling: a model that returns 429 is paused until its quota renews,
 * - a bounded tool loop.
 */

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_TOOL_ROUNDS = 6;
/** Longest wait for one Gemini request, and for one whole answer (all models, all tool rounds). */
const REQUEST_TIMEOUT_MS = 20_000;
const ANSWER_DEADLINE_MS = 45_000;

type Part = {
  text?: string;
  thought?: boolean;
  functionCall?: { id?: string; name: string; args?: Record<string, unknown> };
  functionResponse?: { id?: string; name: string; response: Record<string, unknown> };
  [key: string]: unknown; // e.g. thoughtSignature, passed back untouched
};
export type Content = { role: "user" | "model"; parts: Part[] };

export type GeminiAnswer = { text: string; model: string; inputTokens: number; outputTokens: number };

/** Every configured model is over its free limit; `resetAt` = when the first one renews. */
export class AiLimitError extends Error {
  constructor(
    public scope: "minute" | "day",
    public resetAt: Date,
  ) {
    super("AI limit reached");
  }
}
/** Key missing/invalid, or every model failed for another reason. */
export class AiUnavailableError extends Error {
  constructor(
    message: string,
    public reason: "no_key" | "bad_key" | "down",
  ) {
    super(message);
  }
}

/* ── Per-model pause after a 429 (kept for the life of the server process) ── */

type Pause = { until: number; scope: "minute" | "day" };
const store = globalThis as unknown as { __seGeminiPauses?: Map<string, Pause> };
const pauses = (store.__seGeminiPauses ??= new Map<string, Pause>());

/** Overloaded models (503 / timeouts) are skipped for a minute instead of being retried on every question. */
const COOLDOWN_MS = 120_000;
const cool = globalThis as unknown as { __seGeminiCooldown?: Map<string, number> };
const cooldowns = (cool.__seGeminiCooldown ??= new Map<string, number>());

function activePause(model: string) {
  const p = pauses.get(model);
  if (p && p.until > Date.now()) return p;
  if (p) pauses.delete(model);
  return null;
}

/** The current limit, if every model is paused (used to show the banner on page load). */
export function currentLimit(): { scope: "minute" | "day"; resetAt: Date } | null {
  const { models, apiKey } = aiConfig();
  if (!apiKey || models.length === 0) return null;
  const active = models.map(activePause);
  if (active.some((p) => !p)) return null;
  const first = active.reduce((a, b) => (a!.until <= b!.until ? a : b))!;
  return { scope: first.scope, resetAt: new Date(first.until) };
}

type GoogleError = {
  error?: {
    code?: number;
    status?: string;
    message?: string;
    details?: { "@type"?: string; retryDelay?: string; violations?: { quotaId?: string }[]; reason?: string }[];
  };
};

function pauseFrom429(body: GoogleError): Pause {
  const details = body.error?.details ?? [];
  const perDay = details.some((d) => d.violations?.some((v) => /PerDay/i.test(v.quotaId ?? "")));
  if (perDay) {
    // Free daily quotas renew at midnight Pacific time.
    return { scope: "day", until: nextMidnight("America/Los_Angeles").getTime() };
  }
  const retry = details.find((d) => d.retryDelay)?.retryDelay; // e.g. "37s" or "1.5s"
  const seconds = retry ? Number.parseFloat(retry) : NaN;
  return { scope: "minute", until: Date.now() + (Number.isFinite(seconds) ? Math.ceil(seconds) + 1 : 60) * 1000 };
}

class ModelFailed extends Error {
  constructor(
    public kind: "limit" | "skip" | "busy" | "bad_key",
    message: string,
    public pause?: Pause,
  ) {
    super(message);
  }
}

type GenerateResponse = {
  candidates?: { content?: Content; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
};

async function generate(model: string, apiKey: string, body: unknown, deadline: number): Promise<GenerateResponse> {
  const timeLeft = Math.min(REQUEST_TIMEOUT_MS, deadline - Date.now());
  if (timeLeft < 3000) throw new ModelFailed("busy", "out of time");
  let res: Response;
  try {
    res = await fetch(`${API}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeLeft),
      cache: "no-store",
    });
  } catch (error) {
    throw new ModelFailed("busy", `network: ${(error as Error).message}`);
  }
  if (res.ok) return (await res.json()) as GenerateResponse;

  const err = (await res.json().catch(() => ({}))) as GoogleError;
  const reason = err.error?.details?.find((d) => d.reason)?.reason ?? "";
  if (res.status === 429) throw new ModelFailed("limit", "rate limited", pauseFrom429(err));
  if (reason === "API_KEY_INVALID" || res.status === 401 || (res.status === 403 && /api key/i.test(err.error?.message ?? ""))) {
    throw new ModelFailed("bad_key", err.error?.message ?? "invalid key");
  }
  if (res.status >= 500) throw new ModelFailed("busy", `${res.status} ${err.error?.status ?? ""}`.trim());
  // 404 (model retired / unknown), 400 (model doesn't support a feature) → try the next model.
  throw new ModelFailed("skip", `${res.status} ${err.error?.status ?? ""} ${err.error?.message ?? ""}`.trim());
}

type RunInput = {
  system: string;
  contents: Content[];
  tools: readonly unknown[];
  execute: (name: string, args: Record<string, unknown>) => Promise<unknown>;
};

async function runWithModel(model: string, apiKey: string, input: RunInput, deadline: number): Promise<GeminiAnswer> {
  const contents: Content[] = [...input.contents];
  let inputTokens = 0;
  let outputTokens = 0;

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const lastRound = round === MAX_TOOL_ROUNDS;
    const data = await generate(model, apiKey, {
      systemInstruction: { parts: [{ text: input.system }] },
      contents,
      tools: [{ functionDeclarations: input.tools }],
      // On the last round, force a written answer from what was gathered so far.
      toolConfig: { functionCallingConfig: { mode: lastRound ? "NONE" : "AUTO" } },
      generationConfig: { maxOutputTokens: 4096 },
    }, deadline);
    inputTokens += data.usageMetadata?.promptTokenCount ?? 0;
    outputTokens += (data.usageMetadata?.candidatesTokenCount ?? 0) + (data.usageMetadata?.thoughtsTokenCount ?? 0);

    if (data.promptFeedback?.blockReason) {
      return { text: "I can't help with that request. Ask me about your stores, stock, expiry dates or employees.", model, inputTokens, outputTokens };
    }
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall!);

    if (calls.length > 0 && !lastRound) {
      contents.push({ role: "model", parts }); // keep thought signatures as returned
      const results = await Promise.all(calls.map((c) => input.execute(c.name, c.args ?? {})));
      contents.push({
        role: "user",
        parts: calls.map((c, i) => ({
          functionResponse: { ...(c.id ? { id: c.id } : {}), name: c.name, response: { result: results[i] } },
        })),
      });
      continue;
    }

    const text = parts
      .filter((p) => typeof p.text === "string" && !p.thought)
      .map((p) => p.text)
      .join("")
      .trim();
    if (text) return { text, model, inputTokens, outputTokens };
    if (candidate?.finishReason === "SAFETY" || candidate?.finishReason === "PROHIBITED_CONTENT") {
      return { text: "I can't help with that request. Ask me about your stores, stock, expiry dates or employees.", model, inputTokens, outputTokens };
    }
    throw new ModelFailed("skip", `empty answer (${candidate?.finishReason ?? "no candidate"})`);
  }
  throw new ModelFailed("skip", "too many tool rounds");
}

/** Answers with the first model that works. Throws AiLimitError / AiUnavailableError otherwise. */
export async function askGemini(input: RunInput): Promise<GeminiAnswer> {
  const { apiKey, models } = aiConfig();
  if (!apiKey) throw new AiUnavailableError("GEMINI_API_KEY is not set", "no_key");

  let earliestPause: Pause | null = null;
  const notePause = (p: Pause) => {
    if (!earliestPause || p.until < earliestPause.until) earliestPause = p;
  };

  // Overloaded models go last (not skipped), so a busy moment never leaves the user without the AI.
  const now = Date.now();
  const ordered = [...models.filter((m) => (cooldowns.get(m) ?? 0) <= now), ...models.filter((m) => (cooldowns.get(m) ?? 0) > now)];

  const deadline = Date.now() + ANSWER_DEADLINE_MS;
  let outOfTime = false;
  for (const model of ordered) {
    if (deadline - Date.now() < 3000) {
      outOfTime = true;
      break;
    }
    const paused = activePause(model);
    if (paused) {
      notePause(paused);
      continue;
    }
    try {
      return await runWithModel(model, apiKey, input, deadline);
    } catch (error) {
      if (!(error instanceof ModelFailed)) throw error;
      if (error.kind === "bad_key") throw new AiUnavailableError("The Gemini API key was rejected", "bad_key");
      if (error.kind === "limit" && error.pause) {
        pauses.set(model, error.pause);
        notePause(error.pause);
        console.warn(`[assistant] ${model} hit its ${error.pause.scope} limit until ${new Date(error.pause.until).toISOString()}`);
        continue;
      }
      if (error.kind === "busy") cooldowns.set(model, Date.now() + COOLDOWN_MS);
      console.warn(`[assistant] ${model} skipped: ${error.message}`);
    }
  }

  if (outOfTime) console.warn("[assistant] no model answered in time");
  const pause = earliestPause as Pause | null;
  if (pause) throw new AiLimitError(pause.scope, new Date(pause.until));
  throw new AiUnavailableError("No Gemini model answered", "down");
}
