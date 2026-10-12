/**
 * GET /api/health - liveness probe (port of main.py health_check).
 */

import { json } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return json({ status: "ok", service: "Hall 12 Marathas Portal" });
}
