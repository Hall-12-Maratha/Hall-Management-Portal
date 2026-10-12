/**
 * Server environment configuration.
 *
 * Mirrors backend/app/config.py (pydantic-settings). Read lazily so that
 * `next build` does not require secrets, and validated once per process.
 */

import { z } from "zod";

const boolish = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return defaultValue;
    if (typeof value === "boolean") return value;
    const normalized = String(value).trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
    return defaultValue;
  }, z.boolean());

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_ALGORITHM: z.literal("HS256").default("HS256"),
  ACCESS_TOKEN_EXPIRE_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_EXPIRE_DAYS: z.coerce.number().int().positive().default(7),

  COOKIE_SECURE: boolish(process.env.NODE_ENV === "production"),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),

  QR_SCANNING_ENABLED: boolish(false),

  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().default("noreply@hall12.iitk.ac.in"),

  CRON_SECRET: z.string().default(""),
  ENABLE_IN_PROCESS_SCHEDULER: boolish(false),

  SEED_ADMIN_PASSWORD: z.string().optional(),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | null = null;

/** Validated server environment (memoized). Throws a descriptive error if invalid. */
export function getEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment: ${problems}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test helper: forget the memoized environment. */
export function resetEnvCache(): void {
  cached = null;
}
