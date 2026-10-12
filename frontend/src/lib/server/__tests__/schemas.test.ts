import { ZodError } from "zod";
import { describe, expect, it } from "vitest";

import { parseCsv, toCsv } from "../csv";
import { addDays, combineDateWithUtcTime, isValidYmd, istNow, weekdayMon0 } from "../dates";
import { formatZodError } from "../http";
import { loginSchema, setupCompleteSchema } from "../schemas/auth";
import { bookingQtyQuerySchema, itemCreateSchema } from "../schemas/extras";
import { allowedRollCreateSchema, staffCreateSchema } from "../schemas/hallOffice";

describe("schemas", () => {
  it("validates login", () => {
    expect(loginSchema.safeParse({ identifier: "MS-001", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ identifier: "", password: "x" }).success).toBe(false);
  });

  it("enforces setup-complete password and length rules", () => {
    const base = { roll_no: "230001", setup_code: "ABCD1234", name: "A" };
    expect(setupCompleteSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
    expect(setupCompleteSchema.safeParse({ ...base, setup_code: "ABC", password: "longenough" }).success).toBe(false);
    const ok = setupCompleteSchema.parse({ ...base, password: "longenough" });
    expect(ok.room_no).toBeNull();
  });

  it("parses item creation with ISO closes_at and defaults", () => {
    const parsed = itemCreateSchema.parse({
      name: "Paneer",
      price: 40,
      date: "2026-10-13",
      meal_type: "dinner",
      closes_at: "2026-10-13T14:00:00.000Z",
    });
    expect(parsed.closes_at.toISOString()).toBe("2026-10-13T14:00:00.000Z");
    expect(parsed.is_recurring).toBe(false);
    expect(itemCreateSchema.safeParse({ ...parsed, price: 0 }).success).toBe(false);
    expect(itemCreateSchema.safeParse({ ...parsed, date: "2026-13-01" }).success).toBe(false);
  });

  it("coerces query qty and rejects out of range", () => {
    expect(bookingQtyQuerySchema.parse({ qty: "3" }).qty).toBe(3);
    expect(bookingQtyQuerySchema.safeParse({ qty: "11" }).success).toBe(false);
  });

  it("restricts staff roles and roll number format", () => {
    expect(staffCreateSchema.safeParse({ name: "X", role: "student" }).success).toBe(false);
    expect(allowedRollCreateSchema.safeParse({ roll_no: "23 0001" }).success).toBe(false);
    expect(allowedRollCreateSchema.safeParse({ roll_no: "230001" }).success).toBe(false);
    expect(allowedRollCreateSchema.parse({ roll_no: "230001", email: "Abc24@IITK.ac.in" }).email).toBe("abc24@iitk.ac.in");
  });

  it("formats zod errors FastAPI-style", () => {
    const result = loginSchema.safeParse({ identifier: "", password: "" });
    expect(result.success).toBe(false);
    const formatted = formatZodError(result.error as ZodError);
    expect(formatted.detail.startsWith("identifier: ")).toBe(true);
    expect(formatted.errors).toHaveLength(2);
  });
});

describe("dates", () => {
  it("computes India time, weekdays and date arithmetic", () => {
    // 2026-10-12 20:00 UTC == 2026-10-13 01:30 IST (Tuesday)
    const ist = istNow(new Date("2026-10-12T20:00:00Z"));
    expect(ist.date).toBe("2026-10-13");
    expect(ist.minutes).toBe(90);
    expect(ist.weekday).toBe(1);
    expect(weekdayMon0("2026-10-12")).toBe(0);
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(isValidYmd("2026-02-30")).toBe(false);
    expect(
      combineDateWithUtcTime("2026-10-20", new Date("2026-10-13T14:30:00Z")).toISOString()
    ).toBe("2026-10-20T14:30:00.000Z");
  });
});

describe("csv", () => {
  it("writes RFC 4180 with CRLF and quotes", () => {
    expect(toCsv([["a", 'b "q"', "c,d"], [1, null, "x"]])).toBe('a,"b ""q""","c,d"\r\n1,,x\r\n');
  });

  it("parses quoted cells and mixed line endings", () => {
    expect(parseCsv('r1,"a, b",x\r\nr2,,\n"r3 ""q""",,\n')).toEqual([
      ["r1", "a, b", "x"],
      ["r2", "", ""],
      ['r3 "q"', "", ""],
    ]);
  });
});
