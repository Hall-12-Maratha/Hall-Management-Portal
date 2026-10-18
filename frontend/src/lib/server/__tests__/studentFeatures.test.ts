import { describe, expect, it } from "vitest";

import { formatIstClock, reminderBody } from "../jobs/closingReminders";
import { parsePersonalNoticesCsv } from "../personalNotices";
import { previewText } from "../push";
import { personalNoticeCreateSchema } from "../schemas/personalNotice";
import { pushSubscribeSchema } from "../schemas/push";

describe("personal notices CSV", () => {
  it("skips the header, upper-cases rolls and reports bad rows without throwing", () => {
    const csv = [
      "roll,title,notice",
      "230001,October bill,Pay INR 3450 by 10 Nov",
      "",
      "ab,Too short roll,text",
      "230002,,Missing title",
      "230003,Missing notice,",
      '"230004","Quoted, title","Line one\nline two"',
    ].join("\r\n");
    const { rows, skipped } = parsePersonalNoticesCsv(csv);
    expect(rows.map((r) => r.rollNo)).toEqual(["230001", "230004"]);
    expect(rows[1].title).toBe("Quoted, title");
    expect(rows[1].notice).toBe("Line one\nline two");
    expect(skipped.map((s) => s.row)).toEqual([4, 5, 6]);
    expect(skipped[0].reason).toMatch(/roll/i);
  });

  it("treats a file without a header as data", () => {
    const { rows, skipped } = parsePersonalNoticesCsv("230001,Hi,There\n");
    expect(rows).toHaveLength(1);
    expect(skipped).toHaveLength(0);
  });

  it("validates the single-notice body", () => {
    const ok = personalNoticeCreateSchema.parse({ roll_no: " 230001 ", title: " Bill ", notice: "x" });
    expect(ok.roll_no).toBe("230001");
    expect(ok.title).toBe("Bill");
    expect(personalNoticeCreateSchema.safeParse({ roll_no: "23 0001", title: "a", notice: "b" }).success).toBe(false);
    expect(personalNoticeCreateSchema.safeParse({ roll_no: "230001", title: "", notice: "b" }).success).toBe(false);
  });
});

describe("push", () => {
  it("accepts a browser PushSubscription JSON and rejects http endpoints", () => {
    const sub = {
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      expirationTime: null,
      keys: { p256dh: "BPx", auth: "a1" },
    };
    expect(pushSubscribeSchema.safeParse(sub).success).toBe(true);
    expect(pushSubscribeSchema.safeParse({ ...sub, endpoint: "http://x.example/1" }).success).toBe(false);
    expect(pushSubscribeSchema.safeParse({ ...sub, keys: { p256dh: "", auth: "a" } }).success).toBe(false);
  });

  it("trims notification previews to one line", () => {
    expect(previewText("  a\n\nb   c ")).toBe("a b c");
    expect(previewText("x".repeat(200)).length).toBe(120);
    expect(previewText("x".repeat(200)).endsWith("…")).toBe(true);
  });

  it("formats reminder times in IST", () => {
    // 14:00 UTC = 19:30 IST
    expect(formatIstClock(new Date("2026-10-13T14:00:00.000Z"))).toBe("7:30 pm");
    expect(formatIstClock(new Date("2026-10-13T18:30:00.000Z"))).toBe("12:00 am");
    expect(
      reminderBody([
        { name: "Paneer", mealType: "dinner", closesAt: new Date("2026-10-13T14:00:00.000Z") },
        { name: "Dosa", mealType: "breakfast", closesAt: new Date("2026-10-13T02:30:00.000Z") },
      ])
    ).toBe("Paneer (dinner) closes at 7:30 pm · Dosa (breakfast) closes at 8:00 am");
  });
});
