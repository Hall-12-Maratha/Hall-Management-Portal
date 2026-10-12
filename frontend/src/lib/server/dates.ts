/**
 * Date helpers.
 *
 * The database stores naive UTC timestamps and plain calendar dates. Business
 * rules (meal cutoffs, "today") use India Standard Time, which has no DST, so a
 * fixed +05:30 offset is exact.
 */

export const IST_OFFSET_MINUTES = 330;

export const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True when `value` is a real calendar date in YYYY-MM-DD form. */
export function isValidYmd(value: string): boolean {
  if (!YMD_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export interface IstNow {
  /** Calendar date in India, YYYY-MM-DD */
  date: string;
  /** Minutes since midnight in India */
  minutes: number;
  /** Weekday in India, 0=Monday .. 6=Sunday */
  weekday: number;
}

/** Current India time broken down for business-rule checks. */
export function istNow(now: Date = new Date()): IstNow {
  const shifted = new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000);
  return {
    date: shifted.toISOString().slice(0, 10),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    weekday: (shifted.getUTCDay() + 6) % 7,
  };
}

/** Today's calendar date in India (YYYY-MM-DD). */
export function istToday(now: Date = new Date()): string {
  return istNow(now).date;
}

/** Add `days` to a YYYY-MM-DD string. */
export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Weekday of a YYYY-MM-DD string, 0=Monday .. 6=Sunday (Python's weekday()). */
export function weekdayMon0(ymd: string): number {
  return (new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/**
 * Python's `datetime.combine(date, dt.time())` for naive-UTC datetimes:
 * keep the UTC time-of-day of `timeSource`, put it on calendar day `ymd`.
 */
export function combineDateWithUtcTime(ymd: string, timeSource: Date): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(
    Date.UTC(
      y,
      m - 1,
      d,
      timeSource.getUTCHours(),
      timeSource.getUTCMinutes(),
      timeSource.getUTCSeconds(),
      timeSource.getUTCMilliseconds()
    )
  );
}

/** ISO-8601 string with `Z` suffix, or null. */
export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

/** "YYYY-MM-DD HH:MM" in UTC (Python `strftime("%Y-%m-%d %H:%M")` on naive UTC). */
export function formatUtcMinute(value: Date): string {
  return value.toISOString().slice(0, 16).replace("T", " ");
}

/** "YYYYMMDD_HHmmss" in India time, for download filenames. */
export function timestampForFilename(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 19).replace(/-|:/g, "").replace("T", "_");
}

export const MS_PER_HOUR = 60 * 60 * 1000;
