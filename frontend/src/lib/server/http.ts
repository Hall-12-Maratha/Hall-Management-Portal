/**
 * HTTP helpers for route handlers.
 *
 * Error contract (identical to FastAPI's): every error response is JSON
 * `{ "detail": "<message>" }`. Validation failures are 422 with a readable
 * `detail` plus an `errors` array of individual issues.
 */

import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type z } from "zod";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class HttpError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly extra?: Record<string, unknown>;

  constructor(status: number, detail: string, extra?: Record<string, unknown>) {
    super(detail);
    this.name = "HttpError";
    this.status = status;
    this.detail = detail;
    this.extra = extra;
  }
}

/** Throw an HttpError (typed as `never` so it can end a code path). */
export function httpError(
  status: number,
  detail: string,
  extra?: Record<string, unknown>
): never {
  throw new HttpError(status, detail, extra);
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export function formatZodError(error: ZodError): { detail: string; errors: ValidationIssue[] } {
  const errors = error.issues.map((issue) => ({
    field: issue.path.length ? issue.path.map(String).join(".") : "body",
    message: issue.message,
  }));
  const first = errors[0];
  return {
    detail: first ? `${first.field}: ${first.message}` : "Invalid request.",
    errors,
  };
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

export function json<T>(body: T, status = 200, headers?: HeadersInit): NextResponse {
  return NextResponse.json(body, { status, headers });
}

export function message(text: string, status = 200): NextResponse {
  return json({ message: text }, status);
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${filename}`,
      "Cache-Control": "no-store",
    },
  });
}

// ---------------------------------------------------------------------------
// Input parsing
// ---------------------------------------------------------------------------

/** Parse and validate a JSON body. Invalid JSON or schema failure -> 422. */
export async function parseJsonBody<S extends z.ZodType>(
  req: NextRequest,
  schema: S
): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    httpError(422, "body: Invalid JSON.");
  }
  return schema.parse(raw);
}

/** Parse and validate query-string parameters (first value per key). */
export function parseQuery<S extends z.ZodType>(req: NextRequest, schema: S): z.output<S> {
  const record: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    if (!(key in record)) record[key] = value;
  });
  return schema.parse(record);
}

/** Parse an integer path parameter (FastAPI `int` semantics) or 422. */
export function parseIntParam(value: string, name: string): number {
  if (!/^-?\d+$/.test(value)) {
    httpError(422, `${name}: must be an integer.`);
  }
  return Number(value);
}

// ---------------------------------------------------------------------------
// Route wrapper
// ---------------------------------------------------------------------------

type RouteHandler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/**
 * Wrap a route handler so thrown errors become FastAPI-style JSON responses:
 * HttpError -> its status, ZodError -> 422, anything else -> 500 (logged).
 */
export function handleRoute<C = unknown>(fn: RouteHandler<C>): RouteHandler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      return errorToResponse(err, req);
    }
  };
}

export function errorToResponse(err: unknown, req?: NextRequest): NextResponse {
  if (err instanceof HttpError) {
    return json({ detail: err.detail, ...(err.extra ?? {}) }, err.status);
  }
  if (err instanceof ZodError) {
    return json(formatZodError(err), 422);
  }
  const where = req ? `${req.method} ${req.nextUrl.pathname}` : "route";
  console.error(`[api] Unhandled error in ${where}:`, err);
  return json({ detail: "Internal server error." }, 500);
}
