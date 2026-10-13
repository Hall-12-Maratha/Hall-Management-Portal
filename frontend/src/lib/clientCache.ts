/**
 * Tiny per-browser cache for API responses that change rarely (menu, notices,
 * wastage summary). Keeps a page open from costing a server request every
 * time; a stale entry is simply ignored. Storage can be unavailable (private
 * mode, cleared data), so every access is guarded.
 */

interface Entry<T> {
  savedAt: number;
  value: T;
}

const PREFIX = "hmp.cache.";

export function readCache<T>(key: string, maxAgeMs: number): { value: T; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (typeof entry.savedAt !== "number" || Date.now() - entry.savedAt > maxAgeMs) return null;
    return { value: entry.value, savedAt: entry.savedAt };
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), value } satisfies Entry<T>));
  } catch {
    // storage unavailable or full: caching is best-effort
  }
}

export function clearCache(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

/** "just now", "5 min ago", "2 h ago" */
export function timeAgo(savedAt: number): string {
  const minutes = Math.round((Date.now() - savedAt) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
}
