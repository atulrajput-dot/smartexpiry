import "server-only";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/**
 * A valid bcrypt hash of a random string. Compared against when the email does
 * not exist, so a login takes the same time whether or not the account exists.
 */
export const DUMMY_PASSWORD_HASH =
  "$2b$12$4NctN.a9iJvsm4TPkHXo6ubSvm.W/W1zpV5K/qEiK0Pi2.6bIHd36";
