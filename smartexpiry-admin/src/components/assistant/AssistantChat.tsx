"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from "react";
import {
  ArrowUp,
  Check,
  Clock,
  History,
  MessageSquare,
  Mic,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { deleteConversationAction, renameConversationAction, sendMessageAction } from "@/app/(dashboard)/assistant/actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { MAX_QUESTION_LENGTH, SUGGESTIONS, type AiNotice, type ChatMessage, type ConversationSummary } from "@/lib/assistant/types";
import { cn } from "@/lib/utils";
import { AiMark } from "./AskAiBar";
import { MessageView, TypingIndicator } from "./ChatMessages";

type ActiveConversation = ConversationSummary & { messages: ChatMessage[] };

/* ─────────────────────────── History sidebar ─────────────────────────── */

function groupByDay(list: ConversationSummary[]) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const today = start.getTime();
  const day = 86_400_000;
  const groups: { label: string; items: ConversationSummary[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];
  for (const c of list) {
    const t = Date.parse(c.updatedAt);
    groups[t >= today ? 0 : t >= today - day ? 1 : t >= today - 7 * day ? 2 : 3]!.items.push(c);
  }
  return groups.filter((g) => g.items.length > 0);
}

function HistoryItem({
  conversation,
  active,
  onOpen,
  onRename,
  onDelete,
}: {
  conversation: ConversationSummary;
  active: boolean;
  onOpen: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);

  if (editing) {
    const save = () => {
      const next = title.trim();
      if (next && next !== conversation.title) onRename(next);
      setEditing(false);
    };
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex items-center gap-1 rounded-xl bg-muted px-2 py-1.5"
      >
        <input
          autoFocus
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          aria-label="Chat name"
          className="min-w-0 flex-1 rounded-md bg-card px-2 py-1 text-sm outline-none ring-1 ring-border focus:ring-primary"
        />
        <button type="submit" aria-label="Save name" className="rounded-md p-1 text-primary hover:bg-card">
          <Check className="size-4" aria-hidden />
        </button>
      </form>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex items-center rounded-xl transition-colors",
        active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? "page" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-3 pr-16 text-left text-sm"
      >
        <MessageSquare className="size-4 shrink-0 opacity-60" aria-hidden />
        <span className={cn("truncate", active && "font-medium")}>{conversation.title}</span>
      </button>
      <div
        className={cn(
          "absolute right-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
          active && "opacity-100",
        )}
      >
        <button
          type="button"
          onClick={() => {
            setTitle(conversation.title);
            setEditing(true);
          }}
          aria-label={`Rename "${conversation.title}"`}
          title="Rename"
          className="rounded-md p-1.5 hover:bg-card hover:text-foreground"
        >
          <Pencil className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete "${conversation.title}"`}
          title="Delete"
          className="rounded-md p-1.5 hover:bg-card hover:text-danger"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function HistoryPanel({
  conversations,
  activeId,
  onOpen,
  onNew,
  onRename,
  onDelete,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onRename: (c: ConversationSummary, title: string) => void;
  onDelete: (c: ConversationSummary) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? conversations.filter((c) => c.title.toLowerCase().includes(q)) : conversations;
  }, [conversations, query]);
  const groups = groupByDay(filtered);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
        >
          <Plus className="size-4" aria-hidden />
          New chat
        </button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      <nav aria-label="Chat history" className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.length === 0 ? (
          <div className="px-3 py-10 text-center text-sm text-muted-foreground">
            <History className="mx-auto mb-2 size-6 opacity-50" aria-hidden />
            {query ? "No chats match your search." : "Your chats will appear here."}
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.label} className="mt-3 first:mt-0">
              <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">{g.label}</p>
              <div className="space-y-0.5">
                {g.items.map((c) => (
                  <HistoryItem
                    key={c.id}
                    conversation={c}
                    active={c.id === activeId}
                    onOpen={() => onOpen(c.id)}
                    onRename={(title) => onRename(c, title)}
                    onDelete={() => onDelete(c)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </nav>
    </div>
  );
}

/* ─────────────────────────── AI limit banner ─────────────────────────── */

// A clock that ticks every 15 s (null on the server, so the countdown never mismatches hydration).
const TICK = 15_000;
const subscribeClock = (onChange: () => void) => {
  const t = setInterval(onChange, TICK);
  return () => clearInterval(t);
};
const clockSnapshot = () => Math.floor(Date.now() / TICK) * TICK;

function timeLeft(ms: number) {
  const min = Math.ceil(ms / 60_000);
  if (min <= 1) return "in under a minute";
  if (min < 60) return `in ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `in ${h} h${m ? ` ${m} min` : ""}`;
}

function NoticeBanner({ notice }: { notice: AiNotice }) {
  const now = useSyncExternalStore(subscribeClock, clockSnapshot, () => null);
  if (notice.kind === "limit") {
    const left = now === null ? null : Date.parse(notice.resetAt) - now;
    if (left !== null && left <= 0) return null; // renewed: the next question goes to the AI
    return (
      <div role="status" className="mx-auto mb-2.5 flex max-w-3xl items-start gap-3 rounded-2xl border border-amber-300/60 bg-warning-soft px-4 py-3 text-sm dark:border-amber-500/30">
        <Clock className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            {notice.message}
            {left !== null && <span className="font-normal text-muted-foreground"> ({timeLeft(left)})</span>}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Until then, common questions get quick answers from your live data.</p>
        </div>
      </div>
    );
  }
  return (
    <div role="status" className="mx-auto mb-2.5 flex max-w-3xl items-start gap-3 rounded-2xl border border-border bg-muted px-4 py-3 text-sm">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <p className="text-foreground">{notice.message}</p>
    </div>
  );
}

/* ─────────────────────────────── Composer ─────────────────────────────── */

function Composer({ onSend, busy }: { onSend: (text: string) => void; busy: boolean }) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const send = (e?: FormEvent) => {
    e?.preventDefault();
    const text = value.trim();
    if (!text || busy) return;
    onSend(text);
    setValue("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <form onSubmit={send} className="mx-auto w-full max-w-3xl">
      <div className="rounded-3xl border border-border bg-card p-2 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.2)] transition-shadow focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/15">
        <label htmlFor="assistant-input" className="sr-only">
          Message SmartExpiry AI
        </label>
        <textarea
          id="assistant-input"
          ref={ref}
          rows={1}
          autoFocus
          value={value}
          maxLength={MAX_QUESTION_LENGTH}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about stock, expiry, stores or employees…"
          className="block max-h-44 w-full resize-none bg-transparent px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between gap-2 px-1 pt-1">
          <div className="flex items-center gap-1 text-muted-foreground">
            <button type="button" disabled title="Attach a photo (coming soon)" aria-label="Attach a photo (coming soon)" className="rounded-full p-2 disabled:opacity-50">
              <Paperclip className="size-4" aria-hidden />
            </button>
            <button type="button" disabled title="Voice input (coming soon)" aria-label="Voice input (coming soon)" className="rounded-full p-2 disabled:opacity-50">
              <Mic className="size-4" aria-hidden />
            </button>
          </div>
          <button
            type="submit"
            aria-label="Send message"
            disabled={!value.trim() || busy}
            className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
          >
            <ArrowUp className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        SmartExpiry AI reads your live data and can make mistakes. Check important numbers. Enter to send, Shift + Enter for a new line.
      </p>
    </form>
  );
}

/* ─────────────────────────────── Chat page ─────────────────────────────── */

const localMessage = (text: string): ChatMessage => ({
  id: `local-${Date.now()}`,
  role: "assistant",
  text,
  source: "error",
  createdAt: new Date().toISOString(),
});

export function AssistantChat({
  adminName,
  conversations: initialConversations,
  active,
  initialQuestion,
  initialNotice,
}: {
  adminName: string;
  conversations: ConversationSummary[];
  active: ActiveConversation | null;
  initialQuestion: string | null;
  initialNotice: AiNotice | null;
}) {
  const router = useRouter();
  const [conversations, setConversations] = useState(initialConversations);
  const [current, setCurrent] = useState<ConversationSummary | null>(active);
  const [messages, setMessages] = useState<ChatMessage[]>(active?.messages ?? []);
  const [thinking, setThinking] = useState(false);
  const [notice, setNotice] = useState<AiNotice | null>(initialNotice);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ConversationSummary | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const askedInitial = useRef(false);

  const go = (id: string | null) => {
    setHistoryOpen(false);
    router.push(id ? `/assistant?c=${id}` : "/assistant", { scroll: false });
  };

  async function send(text: string) {
    if (thinking) return;
    const temp: ChatMessage = { id: `temp-${Date.now()}`, role: "user", text, createdAt: new Date().toISOString() };
    setMessages((m) => [...m, temp]);
    setThinking(true);
    try {
      const res = await sendMessageAction(current?.id ?? null, text);
      if (!res.ok) {
        setMessages((m) => [...m, localMessage(res.message)]);
        return;
      }
      setMessages((m) => [...m.filter((x) => x.id !== temp.id), res.userMessage, res.reply]);
      setCurrent(res.conversation);
      setConversations((list) => [res.conversation, ...list.filter((c) => c.id !== res.conversation.id)]);
      setNotice(res.notice);
      // Give a new chat its own address (without reloading, so a follow-up being typed isn't lost).
      if (res.created) window.history.replaceState(null, "", `/assistant?c=${res.conversation.id}`);
    } catch {
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      setMessages((m) => [
        ...m,
        localMessage(offline ? "You're offline. Check your internet connection and send the question again." : "We couldn't reach the server. Please try again."),
      ]);
    } finally {
      setThinking(false);
    }
  }

  // A question from the floating "Ask AI" bar arrives as ?q=… → ask it in this new chat.
  useEffect(() => {
    if (!initialQuestion || askedInitial.current) return;
    askedInitial.current = true;
    void send(initialQuestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, []);

  // Empty state starts at the top; an open chat follows its newest message.
  const hasMessages = messages.length > 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: hasMessages ? el.scrollHeight : 0, behavior: hasMessages ? "smooth" : "auto" });
  }, [messages.length, thinking, hasMessages]);

  async function rename(c: ConversationSummary, title: string) {
    const previousList = conversations;
    const previousCurrent = current;
    setConversations((list) => list.map((x) => (x.id === c.id ? { ...x, title } : x)));
    if (current?.id === c.id) setCurrent({ ...current, title });
    const res = await renameConversationAction(c.id, title).catch(() => ({ ok: false }));
    if (!res.ok) {
      setConversations(previousList);
      setCurrent(previousCurrent);
      toast.error("Couldn't rename the chat");
    }
  }

  async function remove(c: ConversationSummary) {
    setToDelete(null);
    const res = await deleteConversationAction(c.id).catch(() => ({ ok: false }));
    if (!res.ok) {
      toast.error("Couldn't delete the chat");
      return;
    }
    setConversations((list) => list.filter((x) => x.id !== c.id));
    toast.success("Chat deleted");
    if (current?.id === c.id) go(null);
  }

  const firstName = adminName.split(" ")[0] || "there";
  const history = (
    <HistoryPanel
      conversations={conversations}
      activeId={current?.id ?? null}
      onOpen={(id) => id !== current?.id && go(id)}
      onNew={() => go(null)}
      onRename={rename}
      onDelete={setToDelete}
    />
  );

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background">
      {/* Desktop history */}
      <aside className="hidden w-72 shrink-0 border-r border-border bg-card/60 md:block">{history}</aside>

      {/* Mobile history drawer */}
      {historyOpen && (
        <div className="fixed inset-0 z-60 md:hidden" role="dialog" aria-modal="true" aria-label="Chat history">
          <button type="button" aria-label="Close chat history" className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={() => setHistoryOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-xs animate-pop-in border-r border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="font-semibold">Chats</p>
              <button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="h-[calc(100%-3.5rem)]">{history}</div>
          </div>
        </div>
      )}

      {/* Conversation */}
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-label="Show chat history"
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            >
              <History className="size-5" aria-hidden />
            </button>
            <h1 className="truncate text-sm font-semibold sm:text-base">{current ? current.title : "SmartExpiry AI"}</h1>
          </div>
          <button
            type="button"
            onClick={() => go(null)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Plus className="size-4" aria-hidden />
            <span className="hidden sm:inline">New chat</span>
          </button>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          {!hasMessages ? (
            <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center-safe px-4 py-8 text-center sm:py-10">
              <div className="relative">
                <div aria-hidden className="absolute inset-0 -z-10 scale-150 rounded-full bg-linear-to-br from-emerald-400/30 to-indigo-400/30 blur-2xl" />
                <AiMark className="size-16 [&>svg]:size-7" />
              </div>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">Hi {firstName}, how can I help?</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Ask about stock, expiry dates, stores, employees or recent activity. Answers come from your live data.
              </p>
              <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    disabled={thinking}
                    onClick={() => send(s.title)}
                    className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md disabled:opacity-60"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Sparkles className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{s.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{s.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
              {messages.map((m) => (
                <MessageView key={m.id} message={m} onAsk={thinking ? undefined : send} />
              ))}
              {thinking && <TypingIndicator />}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border/60 bg-background/80 px-3 pb-3 pt-3 backdrop-blur sm:px-5">
          {notice && <NoticeBanner notice={notice} />}
          <Composer onSend={send} busy={thinking} />
        </div>
      </section>

      {toDelete && (
        <ConfirmDialog
          title="Delete this chat?"
          description={`"${toDelete.title}" and all its messages will be deleted permanently.`}
          confirmLabel="Delete chat"
          variant="danger"
          onCancel={() => setToDelete(null)}
          onConfirm={() => remove(toDelete)}
        />
      )}
    </div>
  );
}
