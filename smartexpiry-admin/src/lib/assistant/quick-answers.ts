import "server-only";
import { prisma } from "@/lib/prisma";
import { getOverview, queryActivity, queryEmployees, queryStock } from "./tools";
import type { ReplyBlock, Tone } from "./types";

/**
 * Built-in answers to common questions, computed from LIVE data without the AI.
 * Used when the AI limit is reached, the key is missing, or Gemini is down.
 * Understands simple English / Hinglish keywords.
 */

const rupees = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: n % 1 ? 2 : 0 })}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;
const qty = (n: number, unit: string) => `${n.toLocaleString("en-IN")} ${unit}`;

function dueLabel(daysLeft: number | null): { badge: string; tone: Tone } {
  if (daysLeft === null) return { badge: "No expiry", tone: "neutral" };
  if (daysLeft < -1) return { badge: `${-daysLeft} days ago`, tone: "danger" };
  if (daysLeft === -1) return { badge: "Yesterday", tone: "danger" };
  if (daysLeft === 0) return { badge: "Today", tone: "danger" };
  if (daysLeft === 1) return { badge: "Tomorrow", tone: "warning" };
  return { badge: `In ${daysLeft} days`, tone: daysLeft <= 7 ? "warning" : "success" };
}

const has = (q: string, re: RegExp) => re.test(q);

export const QUICK_QUESTIONS = [
  "Give me a summary",
  "What expires this week?",
  "How many expired products do I have?",
  "How much money is at risk?",
  "How many employees are in each store?",
  "Who removed stock recently?",
];

/** Returns blocks for a recognised question, or null if it needs the AI. */
export async function quickAnswer(adminId: string, question: string): Promise<ReplyBlock[] | null> {
  const q = ` ${question.toLowerCase().replace(/\s+/g, " ")} `;
  const ctx = { adminId };

  // A store named in the question narrows the answer ("expired in fresh mart").
  const stores = await prisma.store.findMany({ where: { adminId }, select: { id: true, name: true } });
  const store = stores.find((s) => q.includes(s.name.toLowerCase()));
  const where = store ? ` in **${store.name}**` : "";

  if (has(q, /^\s*(hi+|hello|hey|namaste|good (morning|afternoon|evening))\b/)) {
    return [{ type: "text", text: "Hi! I can answer questions about your stores, stock, expiry dates, employees and recent activity." }];
  }

  if (has(q, /\b(value|money|risk|loss|worth|rupee|paisa|paise|nuksan|nuksaan)\b|₹/)) {
    const o = await getOverview(ctx);
    const blocks: ReplyBlock[] = [
      { type: "text", text: `**${rupees(o.money.expiredValueAtCost + o.money.expiringSoonValueAtCost)}** of stock is at risk right now (at cost price).` },
      {
        type: "stats",
        items: [
          { label: "Expiring in 7 days", value: rupees(o.money.expiringSoonValueAtCost), tone: "warning" },
          { label: "Already expired", value: rupees(o.money.expiredValueAtCost), tone: "danger" },
          { label: "Total stock value", value: rupees(o.money.stockValueAtCost), tone: "success" },
        ],
      },
    ];
    if (o.money.batchesWithoutCostPrice > 0) {
      blocks.push({ type: "text", text: `${plural(o.money.batchesWithoutCostPrice, "stock item")} have no cost price, so they aren't counted.` });
    }
    return blocks;
  }

  const asksExpiring = has(q, /\b(expiring|expires|soon|this week|week|tomorrow|today|next|hafte|kal|aaj)\b/);
  if (has(q, /\b(expired|kharab|expire ho gay)/) && !asksExpiring) {
    const r = await queryStock(ctx, { status: "expired", store: store?.name, limit: 8 });
    if ("error" in r) return null;
    if (r.matchingBatches === 0) return [{ type: "text", text: `Good news: nothing is expired${where}.` }];
    return [
      { type: "text", text: `You have **${plural(r.matchingBatches, "expired product")}**${where}, worth **${rupees(r.valueAtCost)}** at cost.` },
      {
        type: "list",
        items: r.items.map((i) => ({ title: i.product, meta: `${i.store} · ${qty(i.quantity, i.unit)}`, ...dueLabel(i.daysLeft) })),
      },
      ...(r.moreItemsNotShown ? [{ type: "text" as const, text: `…and ${r.moreItemsNotShown} more.` }] : []),
      store
        ? { type: "link" as const, label: "View expired stock", href: `/stores/${store.id}/products?status=expired` }
        : { type: "link" as const, label: "Open notifications", href: "/notifications" },
    ];
  }

  if (asksExpiring || has(q, /\bexpir/)) {
    const days = has(q, /\btoday|aaj\b/) ? 0 : has(q, /\btomorrow|kal\b/) ? 1 : Number(q.match(/next (\d{1,3}) days?/)?.[1] ?? 7);
    const r = await queryStock(ctx, { status: "expiring_soon", expires_within_days: days, store: store?.name, limit: 8 });
    if ("error" in r) return null;
    const period = days === 0 ? "today" : days === 1 ? "today or tomorrow" : `in the next ${days} days`;
    if (r.matchingBatches === 0) return [{ type: "text", text: `Nothing expires ${period}${where}.` }];
    return [
      { type: "text", text: `**${plural(r.matchingBatches, "product")}** ${r.matchingBatches === 1 ? "expires" : "expire"} ${period}${where} (worth ${rupees(r.valueAtCost)} at cost). The most urgent:` },
      {
        type: "list",
        items: r.items.map((i) => ({ title: i.product, meta: `${i.store} · ${qty(i.quantity, i.unit)}`, ...dueLabel(i.daysLeft) })),
      },
      ...(r.moreItemsNotShown ? [{ type: "text" as const, text: `…and ${r.moreItemsNotShown} more.` }] : []),
      store
        ? { type: "link" as const, label: "View expiring stock", href: `/stores/${store.id}/products?status=expiring` }
        : { type: "link" as const, label: "Open notifications", href: "/notifications" },
    ];
  }

  if (has(q, /\b(employee|employees|staff|team|worker|workers|karmchari)\b/)) {
    const r = await queryEmployees(ctx, { store: store?.name });
    if ("error" in r) return null;
    if (store) {
      return [
        { type: "text", text: `**${store.name}** has **${plural(r.total, "employee")}** (${r.active} active).` },
        ...(r.employees.length
          ? [{ type: "list" as const, items: r.employees.map((e) => ({ title: e.name, meta: `${e.code} · ${e.designation}`, badge: e.status === "active" ? "Active" : "Inactive", tone: (e.status === "active" ? "success" : "neutral") as Tone })) }]
          : []),
        { type: "link", label: "Manage employees", href: "/employees" },
      ];
    }
    const o = await getOverview(ctx);
    return [
      { type: "text", text: `You have **${plural(o.employees.total, "employee")}** (${o.employees.active} active) across **${plural(o.stores, "store")}**:` },
      {
        type: "list",
        items: o.perStore.map((s) => ({ title: s.name, meta: s.city, badge: plural(s.employees, "employee"), tone: "neutral" as Tone })),
      },
      { type: "link", label: "Manage employees", href: "/employees" },
    ];
  }

  if (has(q, /\b(who|activity|history|removed|deleted|added|changed|updated|kisne)\b/)) {
    const r = await queryActivity(ctx, { days: 7, store: store?.name, limit: 8 });
    if ("error" in r) return null;
    if (r.totalChanges === 0) return [{ type: "text", text: `No stock changes${where} in the last 7 days.` }];
    const verb: Record<string, string> = { STOCK_ADDED: "Added", STOCK_UPDATED: "Updated", STOCK_REMOVED: "Removed", EXPIRED_CLEARED: "Cleared expired" };
    return [
      { type: "text", text: `**${plural(r.totalChanges, "stock change")}**${where} in the last 7 days. Latest:` },
      {
        type: "list",
        items: r.changes.map((c) => ({
          title: `${verb[c.action] ?? c.action}: ${c.product}`,
          meta: `${c.who} · ${c.store}${c.reason ? ` · ${c.reason}` : ""}`,
          badge: new Date(c.when).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: process.env.APP_TIMEZONE || "Asia/Kolkata" }),
          tone: (c.action === "STOCK_ADDED" ? "success" : c.action === "STOCK_UPDATED" ? "neutral" : "warning") as Tone,
        })),
      },
      { type: "link", label: "Open activity", href: "/activity" },
    ];
  }

  if (has(q, /\b(store|stores|shop|shops|branch|branches|dukan)\b/) || has(q, /\b(summary|overview|status|report|dashboard|total|kitne|kitna|how many|products?)\b/)) {
    const o = await getOverview(ctx);
    if (store) {
      const s = o.perStore.find((p) => p.storeId === store.id)!;
      return [
        { type: "text", text: `Here's **${s.name}** (${s.city}) right now:` },
        {
          type: "stats",
          items: [
            { label: "Products in stock", value: String(s.productBatches), tone: "success" },
            { label: "Expiring in 7 days", value: String(s.expiringSoon), tone: "warning" },
            { label: "Expired", value: String(s.expired), tone: "danger" },
          ],
        },
        { type: "link", label: "Open store", href: `/stores/${s.storeId}/products` },
      ];
    }
    return [
      { type: "text", text: `You have **${plural(o.stores, "store")}** with **${plural(o.productBatchesInStock, "product")}** in stock.` },
      {
        type: "stats",
        items: [
          { label: "Expiring in 7 days", value: String(o.expiringSoon.batches), tone: "warning" },
          { label: "Expired", value: String(o.expired.batches), tone: "danger" },
          { label: "Employees", value: String(o.employees.total), tone: "neutral" },
        ],
      },
      ...(o.perStore.length
        ? [
            {
              type: "list" as const,
              items: o.perStore.map((s) => ({
                title: s.name,
                meta: `${s.city} · ${plural(s.productBatches, "product")}`,
                badge: s.expired ? `${s.expired} expired` : s.expiringSoon ? `${s.expiringSoon} expiring` : "All fresh",
                tone: (s.expired ? "danger" : s.expiringSoon ? "warning" : "success") as Tone,
              })),
            },
          ]
        : []),
      { type: "link", label: "Open stores", href: "/stores" },
    ];
  }

  return null;
}

/** Shown when a question needs the AI but it isn't available. */
export function quickHelp(intro: string): ReplyBlock[] {
  return [
    { type: "text", text: intro },
    { type: "suggestions", items: QUICK_QUESTIONS },
  ];
}
