import type { ReplyBlock } from "./types";

/** Plain-text version of quick-answer blocks (saved as chat context, used by "Copy"). */
export function blocksToText(blocks: ReplyBlock[]) {
  return blocks
    .map((b) =>
      b.type === "text"
        ? b.text
        : b.type === "stats"
          ? b.items.map((s) => `- ${s.label}: ${s.value}`).join("\n")
          : b.type === "list"
            ? b.items.map((i) => `- ${i.title} (${i.meta}${i.badge ? `, ${i.badge}` : ""})`).join("\n")
            : b.type === "suggestions"
              ? b.items.map((t) => `- ${t}`).join("\n")
              : `[${b.label}](${b.href})`,
    )
    .filter(Boolean)
    .join("\n\n");
}

/** Short chat title from the first question. */
export function titleFrom(question: string) {
  const clean = question.replace(/\s+/g, " ").trim().replace(/[?.!]+$/, "");
  return clean.length > 60 ? `${clean.slice(0, 58).trimEnd()}…` : clean || "New chat";
}
