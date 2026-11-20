"use server";

import { requireAdmin } from "@/lib/auth/dal";
import { deleteConversation, renameConversation, sendMessage } from "@/lib/assistant/chat";
import { MAX_QUESTION_LENGTH, type SendMessageResult } from "@/lib/assistant/types";

/** Sends a question in a chat (new chat when conversationId is null) and returns the saved reply. */
export async function sendMessageAction(conversationId: string | null, text: string): Promise<SendMessageResult> {
  const admin = await requireAdmin();
  const question = typeof text === "string" ? text.trim() : "";
  if (!question) return { ok: false, message: "Type a question first." };
  if (question.length > MAX_QUESTION_LENGTH) return { ok: false, message: `Keep questions under ${MAX_QUESTION_LENGTH} characters.` };
  const id = typeof conversationId === "string" && conversationId ? conversationId : null;
  try {
    return await sendMessage({ id: admin.id, name: admin.name }, id, question);
  } catch (error) {
    console.error("[assistant:send] failed", error);
    return { ok: false, message: "We couldn't send your message. Please try again." };
  }
}

export async function renameConversationAction(id: string, title: string): Promise<{ ok: boolean }> {
  const admin = await requireAdmin();
  const clean = typeof title === "string" ? title.replace(/\s+/g, " ").trim().slice(0, 120) : "";
  if (typeof id !== "string" || !id || !clean) return { ok: false };
  return { ok: await renameConversation(admin.id, id, clean) };
}

export async function deleteConversationAction(id: string): Promise<{ ok: boolean }> {
  const admin = await requireAdmin();
  if (typeof id !== "string" || !id) return { ok: false };
  return { ok: await deleteConversation(admin.id, id) };
}
