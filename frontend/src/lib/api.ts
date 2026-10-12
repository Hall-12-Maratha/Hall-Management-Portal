/**
 * API fetch wrapper - same-origin route handlers under /api.
 *
 * - The access token lives only in memory (never in storage).
 * - The refresh token is an httpOnly cookie set by the server; every request
 *   is same-origin so the browser sends it automatically.
 * - A 401 triggers one refresh + retry. Concurrent 401s share a single
 *   in-flight refresh call so parallel requests never stampede /auth/refresh.
 */

import type { UserBrief } from "@/types";

export const API_BASE = "/api";

let accessToken: string | null = null;
let refreshPromise: Promise<RefreshResult | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export interface ApiError extends Error {
  status: number;
  data: { detail?: string; errors?: { field: string; message: string }[] } & Record<string, unknown>;
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export interface RefreshResult {
  access_token: string;
  token_type: string;
  user: UserBrief;
}

async function buildError(response: Response, fallback: string): Promise<ApiError> {
  const errorData = (await response.json().catch(() => ({}))) as ApiError["data"];
  const error = new Error(
    typeof errorData.detail === "string" ? errorData.detail : `${fallback}: ${response.status}`
  ) as ApiError;
  error.status = response.status;
  error.data = errorData;
  return error;
}

/**
 * Wrapper around fetch that:
 * 1. Prepends the API base path
 * 2. Attaches Authorization header if we have a token
 * 3. On 401, attempts token refresh once (deduplicated), then retries
 * 4. Always includes credentials for the cookie-based refresh token
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);

  if (!skipAuth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (
    !headers.has("Content-Type") &&
    !(fetchOptions.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${API_BASE}${path}`;

  let response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: "include",
  });

  // On 401, try refreshing the token once
  if (response.status === 401 && !skipAuth && accessToken) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${accessToken}`);
      response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: "include",
      });
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !skipAuth) {
      // The refresh also failed (or there was no session): send the user to login.
      accessToken = null;
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    throw await buildError(response, "API error");
  }

  // Handle empty responses (204, etc.)
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json();
  }

  return response as unknown as T;
}

/**
 * Refresh the access token using the httpOnly cookie. Also returns the user
 * profile so session restore needs a single request. Concurrent callers share
 * one in-flight request. Resolves to null when there is no valid session.
 */
export function refreshSession(): Promise<RefreshResult | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status === 401) return null;
          throw await buildError(response, "Refresh failed");
        }
        const data = (await response.json()) as RefreshResult;
        accessToken = data.access_token;
        return data;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/** Attempt to refresh the access token; true on success. Never throws. */
async function tryRefresh(): Promise<boolean> {
  try {
    return (await refreshSession()) !== null;
  } catch {
    return false;
  }
}

/**
 * Fetch a binary response (CSV download, QR image). Refreshes once on 401.
 */
export async function apiFetchBlob(path: string): Promise<Blob> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_BASE}${path}`, {
    headers,
    credentials: "include",
  });

  if (response.status === 401 && accessToken && (await tryRefresh())) {
    headers["Authorization"] = `Bearer ${accessToken}`;
    response = await fetch(`${API_BASE}${path}`, {
      headers,
      credentials: "include",
    });
  }

  if (!response.ok) {
    throw await buildError(response, "Failed to fetch file");
  }

  return response.blob();
}
