/**
 * POST /api/auth/setup/lookup - does this identifier belong to a student who
 * still has to set up their account? Lets the login page switch to the inline
 * setup flow after a failed login instead of sending students to a separate
 * signup page.
 *
 * New in the Next.js version (no FastAPI equivalent).
 */

import { and, eq, or, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/server/db/client";
import { allowedRollNumbers, users } from "@/lib/server/db/schema";
import { handleRoute, json, parseJsonBody } from "@/lib/server/http";
import { SETUP_LIMIT_DETAIL, consumeOrReject } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOOKUP_LIMIT = 20;

const lookupSchema = z.object({
  identifier: z.string().trim().min(1).max(255),
});

export const POST = handleRoute(async (req: NextRequest) => {
  const { identifier } = await parseJsonBody(req, lookupSchema);
  const isEmail = identifier.includes("@");
  const key = isEmail ? identifier.toLowerCase() : identifier.toUpperCase();

  await consumeOrReject(`lookup:${key}`, LOOKUP_LIMIT, SETUP_LIMIT_DETAIL);

  const db = getDb();
  const [allowed] = await db
    .select({
      rollNo: allowedRollNumbers.rollNo,
      email: allowedRollNumbers.email,
      hasSetupCode: sql<boolean>`${allowedRollNumbers.setupCode} is not null`,
    })
    .from(allowedRollNumbers)
    .where(
      isEmail
        ? sql`lower(${allowedRollNumbers.email}) = ${key}`
        : eq(allowedRollNumbers.rollNo, key)
    )
    .limit(1);

  if (!allowed) {
    return json({ needs_setup: false, roll_no: null, has_setup_code: false });
  }

  const emailLower = allowed.email?.toLowerCase() ?? null;
  const [registered] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.role, "student"),
        eq(users.passwordSet, true),
        emailLower
          ? or(eq(users.rollNo, allowed.rollNo), sql`lower(${users.identifier}) = ${emailLower}`)
          : eq(users.rollNo, allowed.rollNo)
      )
    )
    .limit(1);

  return json({
    needs_setup: !registered,
    roll_no: registered ? null : allowed.rollNo,
    has_setup_code: registered ? false : allowed.hasSetupCode,
  });
});
