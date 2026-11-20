import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma clients cached on globalThis so dev hot reloads don't open a new
 * connection pool every time.
 *
 * Next bundles server code separately (pages, route handlers, proxy), so each
 * bundle has its OWN PrismaClient class. Clients are therefore cached per class:
 * bundles never replace — or close — each other's client. A cached client is
 * replaced only when DATABASE_URL changes (editing .env reloads it without a
 * restart). After `prisma generate`, the reloaded module brings a new class and
 * gets a fresh client; the old one's idle connections are closed by pg itself.
 */
type Entry = { client: PrismaClient; url: string };
const globalForPrisma = globalThis as unknown as { prismaClients?: Map<typeof PrismaClient, Entry> };
const clients = (globalForPrisma.prismaClients ??= new Map());

function getPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (check .env)");

  const cached = clients.get(PrismaClient);
  if (cached?.url === url) return cached.client;

  // Same bundle, new connection settings: close this bundle's old pool.
  if (cached) void cached.client.$disconnect().catch(() => {});

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  clients.set(PrismaClient, { client, url });
  return client;
}

/** Proxy so `prisma.employee…` always uses this bundle's client for the current DATABASE_URL. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
