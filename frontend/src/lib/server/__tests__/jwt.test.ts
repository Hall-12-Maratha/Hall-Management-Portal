import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import {
  createAccessToken,
  createChangePasswordToken,
  createRefreshToken,
  createSignupToken,
  decodeToken,
  passwordFingerprint,
  subjectToUserId,
} from "../auth/jwt";

describe("jwt", () => {
  it("round-trips an access token with FastAPI-compatible claims", async () => {
    const token = await createAccessToken(42, "student");
    const payload = await decodeToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("42");
    expect(payload?.role).toBe("student");
    expect(payload?.type).toBe("access");
    expect(typeof payload?.exp).toBe("number");
    expect(subjectToUserId(payload!)).toBe(42);
  });

  it("distinguishes token types", async () => {
    expect((await decodeToken(await createRefreshToken(1, "mess_staff")))?.type).toBe("refresh");
    expect((await decodeToken(await createChangePasswordToken(1)))?.type).toBe("change_password");
    const reset = await decodeToken(await createSignupToken("a@b.c", "$2b$12$abcdefghijklmnop"));
    expect(reset?.type).toBe("signup");
    expect(reset?.email).toBe("a@b.c");
    expect(reset?.pwf).toBe(passwordFingerprint("$2b$12$abcdefghijklmnop"));
  });

  it("verifies tokens minted by python-jose with the same secret", async () => {
    // python-jose: jwt.encode({"sub": "7", "role": "hall_office", "exp": <int>, "type": "access"}, secret, "HS256")
    const secret = new TextEncoder().encode("test-secret-for-vitest-only");
    const exp = Math.floor(Date.now() / 1000) + 60;
    const token = await new SignJWT({ sub: "7", role: "hall_office", exp, type: "access" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .sign(secret);
    const payload = await decodeToken(token);
    expect(payload?.sub).toBe("7");
    expect(payload?.type).toBe("access");
  });

  it("rejects expired, tampered and foreign tokens", async () => {
    const secret = new TextEncoder().encode("test-secret-for-vitest-only");
    const expired = await new SignJWT({ sub: "1", type: "access" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(secret);
    expect(await decodeToken(expired)).toBeNull();

    const good = await createAccessToken(1, "student");
    expect(await decodeToken(good.slice(0, -2) + "xx")).toBeNull();

    const foreign = await new SignJWT({ sub: "1", type: "access" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("5m")
      .sign(new TextEncoder().encode("another-secret"));
    expect(await decodeToken(foreign)).toBeNull();
  });
});
