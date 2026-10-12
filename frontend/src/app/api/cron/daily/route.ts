/**
 * GET|POST /api/cron/daily - scheduled maintenance (replaces APScheduler).
 *
 * Vercel Cron calls this once a day (see vercel.json) with
 * `Authorization: Bearer <CRON_SECRET>`. The same jobs also run lazily from
 * the read endpoints that depend on them, so this is a safety net.
 */

import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

import { getEnv } from "@/lib/server/env";
import { handleRoute, httpError, json } from "@/lib/server/http";
import { runAllJobs } from "@/lib/server/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const secret = getEnv().CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const handler = handleRoute(async (req: NextRequest) => {
  if (!isAuthorized(req)) {
    httpError(401, "Unauthorized.");
  }
  const result = await runAllJobs();
  return json({ ok: true, ran_at: new Date().toISOString(), ...result });
});

export const GET = handler;
export const POST = handler;
