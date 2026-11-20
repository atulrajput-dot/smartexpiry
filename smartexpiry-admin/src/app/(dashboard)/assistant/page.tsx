import type { Metadata } from "next";
import { Suspense } from "react";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { getAiNotice, getConversation, listConversations } from "@/lib/assistant/chat";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Ask AI" };

/** SmartExpiry AI chat: ?c=<conversation id> opens a saved chat, ?q=<question> starts a new one. */
export default function AssistantPage({ searchParams }: PageProps<"/assistant">) {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <Chat searchParams={searchParams} />
    </Suspense>
  );
}

async function Chat({ searchParams }: { searchParams: PageProps<"/assistant">["searchParams"] }) {
  const [admin, query] = await Promise.all([requireAdmin(), searchParams]);
  const c = typeof query.c === "string" ? query.c : null;
  const q = typeof query.q === "string" ? query.q.slice(0, 2000) : null;

  const [conversations, active, notice] = await Promise.all([
    listConversations(admin.id),
    c ? getConversation(admin.id, c) : null,
    getAiNotice(admin.id),
  ]);

  return (
    <AssistantChat
      key={active?.id ?? `new:${q ?? ""}`}
      adminName={admin.name}
      conversations={conversations}
      active={active}
      initialQuestion={active ? null : q}
      initialNotice={notice}
    />
  );
}

function ChatSkeleton() {
  return (
    <div className="flex h-full animate-pulse" aria-hidden>
      <div className="hidden w-72 border-r border-border bg-card/60 md:block" />
      <div className="flex flex-1 flex-col">
        <div className="h-14 border-b border-border" />
        <div className="flex-1" />
        <div className="mx-auto mb-6 h-24 w-full max-w-3xl rounded-3xl bg-muted" />
      </div>
    </div>
  );
}
