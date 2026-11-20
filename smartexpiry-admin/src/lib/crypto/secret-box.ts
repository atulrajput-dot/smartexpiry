import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Reversible encryption for secrets the app must show again later
 * (employee passwords). AES-256-GCM: confidential + tamper-evident.
 * Format: v1.<iv>.<authTag>.<ciphertext>, each part base64url.
 */

function key() {
  const raw = Buffer.from(env().EMPLOYEE_PASSWORD_KEY, "base64");
  if (raw.length !== 32) throw new Error("EMPLOYEE_PASSWORD_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32).");
  return raw;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv, tag, ciphertext].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, ciphertext] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Unrecognized encrypted value format.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
