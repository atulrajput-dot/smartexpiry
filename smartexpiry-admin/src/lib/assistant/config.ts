import "server-only";

/**
 * AI assistant settings (from .env):
 *   GEMINI_API_KEY   Google AI Studio key. Empty → quick answers only.
 *   GEMINI_MODELS    Comma-separated models, tried in order. When one hits its free limit
 *                    (or is retired), the next one answers.
 *   AI_DAILY_LIMIT   AI answers per admin per day (protects the shared free quota). 0 = no app limit.
 */
const DEFAULT_MODELS = "gemini-3.8-flash,gemini-3.5-flash-lite,gemini-flash-lite-latest,gemini-3.5-flash";

export function aiConfig() {
  const dailyLimit = Number.parseInt(process.env.AI_DAILY_LIMIT ?? "", 10);
  return {
    apiKey: (process.env.GEMINI_API_KEY ?? "").trim(),
    models: (process.env.GEMINI_MODELS || DEFAULT_MODELS)
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean),
    dailyLimit: Number.isFinite(dailyLimit) && dailyLimit >= 0 ? dailyLimit : 50,
    timeZone: process.env.APP_TIMEZONE || "Asia/Kolkata",
  };
}

/* ── Time helpers (time-zone aware, no extra libraries) ── */

function offsetMs(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** The next midnight in `timeZone`, as a real instant. */
export function nextMidnight(timeZone: string, now = new Date()) {
  const local = new Date(now.getTime() + offsetMs(now, timeZone));
  const midnightLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1);
  const guess = new Date(midnightLocal - offsetMs(now, timeZone));
  return new Date(midnightLocal - offsetMs(guess, timeZone));
}

export function startOfDay(timeZone: string, now = new Date()) {
  return new Date(nextMidnight(timeZone, now).getTime() - 86_400_000);
}

/** "3:45 pm" / "Tomorrow, 12:00 am" in the app's time zone. */
export function formatResetTime(date: Date, timeZone: string, now = new Date()) {
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" }).format(d);
  const time = new Intl.DateTimeFormat("en-IN", { timeZone, hour: "numeric", minute: "2-digit" }).format(date);
  if (day(date) === day(now)) return time;
  if (day(date) === day(new Date(now.getTime() + 86_400_000))) return `tomorrow, ${time}`;
  return `${new Intl.DateTimeFormat("en-IN", { timeZone, day: "numeric", month: "short" }).format(date)}, ${time}`;
}
