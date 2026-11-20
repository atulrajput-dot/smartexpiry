import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { ProductsTable, type ProductTab } from "@/components/stores/ProductsTable";
import { requireEmployee } from "@/lib/auth/dal";
import { getStoreInventory, type InventoryRow } from "@/lib/inventory/store-inventory";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Store products" };

const TABS: { key: ProductTab; label: string }[] = [
  { key: "all", label: "All products" },
  { key: "fresh", label: "Fresh" },
  { key: "expiring", label: "Expiring soon" },
  { key: "expired", label: "Expired" },
];

function parseTab(value: string | string[] | undefined): ProductTab {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "fresh" || v === "expiring" || v === "expired" ? v : "all";
}

/** Order that makes each list actionable: soonest first, most recently expired first. */
function sortFor(tab: ProductTab, products: InventoryRow[]) {
  const copy = [...products];
  // No-expiry items (daysLeft null) go last.
  const key = (p: InventoryRow) => p.daysLeft ?? Number.MAX_SAFE_INTEGER;
  if (tab === "expired") return copy.sort((a, b) => key(b) - key(a));
  return copy.sort((a, b) => key(a) - key(b));
}

export default function StoreProductsPage({ params, searchParams }: PageProps<"/stores/[storeId]/products">) {
  return (
    <Suspense fallback={<ProductsSkeleton />}>
      <ProductsContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ProductsContent({
  params,
  searchParams,
}: {
  params: PageProps<"/stores/[storeId]/products">["params"];
  searchParams: PageProps<"/stores/[storeId]/products">["searchParams"];
}) {
  const [me, { storeId }, query] = await Promise.all([requireEmployee(), params, searchParams]);
  const tab = parseTab(query.status);

  // Only stores this employee is assigned to; any other store id is a 404.
  const store = await prisma.store.findFirst({
    where: { id: storeId, adminId: me.adminId, employees: { some: { employeeId: me.id } } },
    select: { id: true, name: true, code: true },
  });
  if (!store) notFound();

  const { rows: products } = await getStoreInventory(store.id);
  const counts: Record<ProductTab, number> = {
    all: products.length,
    fresh: products.filter((p) => p.status === "fresh").length,
    expiring: products.filter((p) => p.status === "expiring").length,
    expired: products.filter((p) => p.status === "expired").length,
  };
  const visible = sortFor(tab, tab === "all" ? products : products.filter((p) => p.status === tab));

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/stores" className="inline-flex items-center gap-1.5 hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          My stores
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link href={`/stores/${store.id}`} className="truncate hover:text-foreground">
          {store.name}
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="text-foreground">Products</span>
      </nav>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Products</h1>
        <p className="text-sm text-muted-foreground">
          Stock and expiry dates at <span className="font-medium text-foreground">{store.name}</span>{" "}
          <span className="font-mono text-xs">({store.code})</span>.
        </p>
      </div>

      <ProductsTable key={tab} storeId={store.id} tab={tab} tabs={TABS.map((t) => ({ ...t, count: counts[t.key] }))} products={visible} />
    </div>
  );
}

function ProductsSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="h-5 w-56 rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-9 w-40 rounded-lg bg-muted" />
        <div className="h-4 w-72 max-w-full rounded bg-muted" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="h-28 border-b border-border bg-muted/60" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-16 border-b border-border bg-muted/30" />
        ))}
      </div>
    </div>
  );
}
