/**
 * Password / OTP hashing and random-secret generation.
 *
 * bcryptjs produces and verifies `$2b$` hashes compatible with the Python
 * `bcrypt` library used by the FastAPI backend (cost 12, the gensalt default).
 */

import { randomBytes, randomInt } from "node:crypto";

import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

/** bcrypt only hashes the first 72 bytes; the API rejects longer passwords. */
export const MAX_PASSWORD_BYTES = 72;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hashed);
  } catch {
    return false;
  }
}

/** Random 6-digit numeric OTP. */
export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** 16-character URL-safe temporary password (Python `secrets.token_urlsafe(12)`). */
export function generateTempPassword(): string {
  return randomBytes(12).toString("base64url");
}

const SETUP_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** 8-character setup code from [A-Z0-9], cryptographically random. */
export function generateSetupCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += SETUP_CODE_ALPHABET[randomInt(0, SETUP_CODE_ALPHABET.length)];
  }
  return code;
}

/** 32-hex-character token (Python `uuid.uuid4().hex`). */
export function generateQrToken(): string {
  return randomBytes(16).toString("hex");
}
