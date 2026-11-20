"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowRight, Check, Copy, ThumbsDown, ThumbsUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, ReplyBlock, Tone } from "@/lib/assistant/types";
import { AiMark } from "./AskAiBar";
import { Markdown } from "./Markdown";

const toneText: Record<Tone, string> = {
  danger: "text-danger",
  warning: "text-warning",
  success: "text-success",
  neutral: "text-foreground",
};
const toneBadge: Record<Tone, string> = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  neutral: "bg-muted text-muted-foreground",
};

function Block({ block, onAsk }: { block: ReplyBlock; onAsk?: (question: string) => void }) {
  switch (block.type) {
    case "suggestions":
      return (
        <div className="flex flex-wrap gap-2">
          {block.items.map((q) => (
            <button
              key={q}
              type="button"
              disabled={!onAsk}
              onClick={() => onAsk?.(q)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-secondary disabled:pointer-events-none"
            >
              <Zap className="size-3.5 text-primary" aria-hidden />
              {q}
            </button>
          ))}
        </div>
      );
    case "text":
      return <Markdown text={block.text} />;
    case "stats":
      return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {block.items.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-background px-3.5 py-3">
              <p className={cn("text-xl font-semibold tabular-nums", toneText[s.tone ?? "neutral"])}>{s.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      );
    case "list":
      return (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
          {block.items.map((item) => (
            <li key={item.title} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">{item.meta}</p>
              </div>
              {item.badge && (
                <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", toneBadge[item.tone ?? "neutral"])}>
                  {item.badge}
                </span>
              )}
            </li>
          ))}
        </ul>
      );
    case "link":
      return (
        <Link
          href={block.href}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:border-primary/40 hover:bg-secondary"
        >
          {block.label}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      );
  }
}

function IconButton({ label, onClick, children, active }: { label: string; onClick: () => void; children: ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "text-primary",
      )}
    >
      {children}
    </button>
  );
}

function AssistantActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  return (
    <div className="flex items-center gap-0.5">
      <IconButton
        label={copied ? "Copied" : "Copy answer"}
        onClick={() => {
          navigator.clipboard?.writeText(text.replace(/\*\*/g, "")).then(
            () => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            },
            () => {},
          );
        }}
      >
        {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      </IconButton>
      <IconButton label="Good answer" active={vote === "up"} onClick={() => setVote(vote === "up" ? null : "up")}>
        <ThumbsUp className="size-4" aria-hidden />
      </IconButton>
      <IconButton label="Bad answer" active={vote === "down"} onClick={() => setVote(vote === "down" ? null : "down")}>
        <ThumbsDown className="size-4" aria-hidden />
      </IconButton>
    </div>
  );
}

export function MessageView({ message, onAsk }: { message: ChatMessage; onAsk?: (question: string) => void }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] animate-pop-in whitespace-pre-wrap break-words rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-sm sm:max-w-[75%]">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <AiMark className="mt-0.5" />
      <div className={cn("min-w-0 flex-1 space-y-3 text-sm text-foreground/90", message.source === "error" && "text-danger")}>
        {message.blocks?.length ? (
          message.blocks.map((block, i) => (
            <div key={i} className="animate-pop-in" style={{ animationDelay: `${i * 90}ms`, animationFillMode: "backwards" }}>
              <Block block={block} onAsk={onAsk} />
            </div>
          ))
        ) : (
          <div className="animate-pop-in">
            <Markdown text={message.text} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {message.source !== "error" && <AssistantActions text={message.text} />}
          {message.source === "quick" && (
            <span
              title="Answered from your live data without the AI"
              className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 text-[11px] font-medium text-info"
            >
              <Zap className="size-3" aria-hidden />
              Quick answer · live data
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-3" role="status" aria-label="SmartExpiry AI is thinking">
      <AiMark />
      <div className="flex items-center gap-1.5 rounded-2xl bg-muted px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${i * 140}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
