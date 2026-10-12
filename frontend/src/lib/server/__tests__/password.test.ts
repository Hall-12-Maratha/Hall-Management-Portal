import { describe, expect, it } from "vitest";

import {
  generateOtp,
  generateQrToken,
  generateSetupCode,
  generateTempPassword,
  hashPassword,
  verifyPassword,
} from "../auth/password";

describe("password", () => {
  it("hashes with bcrypt $2b$ cost 12 and verifies", async () => {
    const hash = await hashPassword("Hall12kaAdmin!");
    expect(hash.startsWith("$2b$12$")).toBe(true);
    expect(await verifyPassword("Hall12kaAdmin!", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("verifies a hash produced by the Python bcrypt library", async () => {
    // Generated with the backend's venv: bcrypt.hashpw(b"password123", bcrypt.gensalt(12))
    const pyHash = "$2b$12$nC0y0mRYuiw.QA0tcPHWB.ZEOzsFx8nODydSZDdVgorXqnV39ck8W";
    expect(await verifyPassword("password123", pyHash)).toBe(true);
    expect(await verifyPassword("password124", pyHash)).toBe(false);
  });

  it("returns false instead of throwing on a malformed hash", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
  });

  it("generates well-formed secrets", () => {
    expect(generateOtp()).toMatch(/^\d{6}$/);
    expect(generateSetupCode()).toMatch(/^[A-Z0-9]{8}$/);
    expect(generateTempPassword()).toHaveLength(16);
    expect(generateQrToken()).toMatch(/^[0-9a-f]{32}$/);
  });
});
