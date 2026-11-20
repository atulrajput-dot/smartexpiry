import { createHash, randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

/**
 * JWT helpers. Kept free of Prisma / next/headers so the proxy can import it.
 *
 * - Access token:  short-lived, proves identity on every request.
 * - Refresh token: long-lived, only used to obtain a new access token. Its
 *   SHA-256 hash is stored in the DB so it can be rotated and revoked.
 */

export type AccessTokenPayload = { sub: string; email: string; name: string };
export type RefreshTokenPayload = { sub: string; jti: string };

const encoder = new TextEncoder();

function secret(name: "ACCESS_TOKEN_SECRET" | "REFRESH_TOKEN_SECRET") {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new Error(`${name} is missing or shorter than 32 characters (check .env)`);
  }
  return encoder.encode(value);
}

export function accessTokenTtlSeconds() {
  return Number(process.env.ACCESS_TOKEN_TTL_MINUTES ?? 15) * 60;
}

export function refreshTokenTtlSeconds() {
  return Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7) * 24 * 60 * 60;
}

export async function signAccessToken(payload: AccessTokenPayload) {
  return new SignJWT({ email: payload.email, name: payload.name, typ: "employee_access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${accessTokenTtlSeconds()}s`)
    .sign(secret("ACCESS_TOKEN_SECRET"));
}

export async function signRefreshToken(sub: string) {
  const jti = randomUUID();
  const token = await new SignJWT({ typ: "employee_refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${refreshTokenTtlSeconds()}s`)
    .sign(secret("REFRESH_TOKEN_SECRET"));
  return { token, jti };
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret("ACCESS_TOKEN_SECRET"), {
      algorithms: ["HS256"],
    });
    if (payload.typ !== "employee_access" || !payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret("REFRESH_TOKEN_SECRET"), {
      algorithms: ["HS256"],
    });
    if (payload.typ !== "employee_refresh" || !payload.sub || !payload.jti) return null;
    return { sub: payload.sub, jti: payload.jti };
  } catch {
    return null;
  }
}

/** SHA-256 hex digest — used to store tokens without keeping the raw value. */
export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
