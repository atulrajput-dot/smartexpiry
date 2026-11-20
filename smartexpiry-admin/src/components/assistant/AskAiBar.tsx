"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Maximize2, Mic, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUGGESTIONS } from "@/lib/assistant/types";

/** Gradient "AI" badge used by the bar and the chat page. */
export function AiMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 via-teal-500 to-indigo-500 text-white shadow-sm",
        className,
      )}
      aria-hidden
    >
      <Sparkles className="size-4" />
    </span>
  );
}

/**
 * Floating "Ask SmartExpiry AI" bar shown at the bottom of every admin page.
 * Submitting opens the full chat page with the question. Ctrl/⌘ + K focuses it.
 */
export function AskAiBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q) return;
    setOpen(false);
    setValue("");
    inputRef.current?.blur();
    router.push(`/assistant?q=${encodeURIComponent(q)}`);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(value);
  };

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none sticky bottom-0 z-30 flex justify-center px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-2 lg:pb-6"
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          inputRef.current?.blur();
        }
      }}
    >
      <div className="pointer-events-auto relative w-full max-w-xl">
        {/* Suggestions, shown while the empty bar is focused */}
        {open && !value && (
          <div className="absolute inset-x-0 bottom-full mb-2 animate-pop-in overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-xl">
            <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Try asking</p>
            <ul>
              {SUGGESTIONS.map((s) => (
                <li key={s.title}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => ask(s.title)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                    <span className="hidden text-xs text-muted-foreground sm:inline">{s.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form
          onSubmit={submit}
          className="group flex h-14 items-center gap-2 rounded-full border border-border bg-card/95 pl-2.5 pr-2 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5 backdrop-blur-md transition-shadow focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/15"
        >
          <AiMark />
          <label htmlFor="ask-ai-input" className="sr-only">
            Ask SmartExpiry AI
          </label>
          <input
            id="ask-ai-input"
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Ask SmartExpiry AI…"
            autoComplete="off"
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground md:inline group-focus-within:hidden">
            Ctrl K
          </kbd>
          <button
            type="button"
            title="Voice input (coming soon)"
            aria-label="Voice input (coming soon)"
            disabled
            className="hidden size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground disabled:opacity-50 sm:flex"
          >
            <Mic className="size-4" aria-hidden />
          </button>
          <Link
            href="/assistant"
            title="Open full chat"
            aria-label="Open full chat"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Maximize2 className="size-4" aria-hidden />
          </Link>
          <button
            type="submit"
            aria-label="Ask"
            disabled={!value.trim()}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary-hover disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
          >
            <ArrowUp className="size-4" aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}
