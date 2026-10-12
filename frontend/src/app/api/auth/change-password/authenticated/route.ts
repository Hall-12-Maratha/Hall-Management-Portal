/**
 * POST /api/auth/change-password/authenticated - change password while logged in.
 * Port of routers/auth.py::change_authenticated_password.
 */

import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { requireUser } from "@/lib/server/auth/guard";
import { hashPassword, verifyPassword } from "@/lib/server/auth/password";
import { getDb } from "@/lib/server/db/client";
import { users } from "@/lib/server/db/schema";
import { handleRoute, httpError, message, parseJsonBody } from "@/lib/server/http";
import { authenticatedChangePasswordSchema } from "@/lib/server/schemas/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requireUser(req);
  const body = await parseJsonBody(req, authenticatedChangePasswordSchema);

  if (!(await verifyPassword(body.old_password, user.passwordHash))) {
    httpError(400, "Current password is incorrect.");
  }
  if (body.old_password === body.new_password) {
    httpError(400, "New password must be different from the current password.");
  }

  await getDb()
    .update(users)
    .set({ passwordHash: await hashPassword(body.new_password) })
    .where(eq(users.id, user.id));

  return message("Password changed successfully.");
});
