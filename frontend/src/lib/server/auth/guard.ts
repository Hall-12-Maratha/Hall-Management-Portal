/**
 * Authentication and role guards for route handlers.
 *
 * Port of backend/app/dependencies.py `get_current_user` / `require_role`.
 * Reads only the `Authorization: Bearer <access token>` header.
 */

import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getDb } from "../db/client";
import { users, type UserRole, type UserRow } from "../db/schema";
import { httpError } from "../http";
import { decodeToken, subjectToUserId } from "./jwt";

export async function findUserById(id: number): Promise<UserRow | undefined> {
  const [user] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

/** Resolve the current user from the Bearer token or throw 401/403. */
export async function requireUser(req: NextRequest): Promise<UserRow> {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    httpError(401, "Missing or invalid authorization header.");
  }

  const token = header.slice("Bearer ".length).trim();
  const payload = await decodeToken(token);
  if (!payload) {
    httpError(401, "Invalid or expired token.");
  }
  if (payload.type !== "access") {
    httpError(401, "Invalid token type.");
  }

  const userId = subjectToUserId(payload);
  if (userId === null) {
    httpError(401, "Token missing subject.");
  }

  const user = await findUserById(userId);
  if (!user) {
    httpError(401, "User not found.");
  }
  if (!user.isActive) {
    httpError(403, "Account is deactivated.");
  }

  return user;
}

/** Like requireUser, but also enforces one of the allowed roles (403 otherwise). */
export async function requireRole(req: NextRequest, ...roles: UserRole[]): Promise<UserRow> {
  const user = await requireUser(req);
  if (!roles.includes(user.role)) {
    httpError(403, `Access denied. Required role(s): ${roles.join(", ")}.`);
  }
  return user;
}
