"use client";

/**
 * Login page - shared by all roles, with the student account setup flow inline.
 *
 * Modes:
 *   login          email / staff id + password
 *   setup-code     roll number + setup code (first-time students)
 *   setup-password name, room, password -> account created and logged in
 *
 * After a failed login the page asks /auth/setup/lookup whether the identifier
 * is a student who has not set a password yet and, if so, switches to setup.
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import PasswordInput from "@/components/ui/PasswordInput";
import { apiFetch } from "@/lib/api";
import { useAuth, getRoleHome } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { isMustChangePassword, type LoginResponse } from "@/types";

type Mode = "login" | "setup-code" | "setup-password";

interface LookupResponse {
  needs_setup: boolean;
  roll_no: string | null;
  has_setup_code: boolean;
}

const inputClass =
  "w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent input-glow transition-colors";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");

  // login
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // setup
  const [rollNo, setRollNo] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [email, setEmail] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, setUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // /login?setup=1 (old /signup links) opens the setup flow directly.
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("setup")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("setup-code");
    }
  }, []);

  const startSetup = (prefilledRoll = "") => {
    setRollNo(prefilledRoll);
    setSetupCode("");
    setMode("setup-code");
  };

  const backToLogin = () => {
    setMode("login");
    setPassword("");
  };

  // --- Login -----------------------------------------------------------------

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;

    setIsSubmitting(true);
    try {
      const result = await login(identifier.trim(), password);

      if (isMustChangePassword(result)) {
        sessionStorage.setItem("change_token", result.change_token);
        router.push("/change-password");
        return;
      }

      toast("Logged in successfully!", "success");
      router.push(getRoleHome(result.user.role));
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      if (error.status === 429) {
        toast("Too many attempts. Please wait 15 minutes.", "error");
      } else if (error.status === 401 || error.status === 400) {
        if (await offerSetup(identifier.trim())) return;
        toast(error.message || "Invalid credentials.", "error");
      } else {
        toast(error.message || "Login failed.", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /** If the identifier is a student who has not set up yet, switch to setup. */
  const offerSetup = async (id: string): Promise<boolean> => {
    try {
      const lookup = await apiFetch<LookupResponse>("/auth/setup/lookup", {
        method: "POST",
        body: JSON.stringify({ identifier: id }),
        skipAuth: true,
      });
      if (!lookup.needs_setup) return false;
      if (!lookup.has_setup_code) {
        toast(
          "This account is not set up yet and no setup code has been issued. Contact the hall office.",
          "warning"
        );
        return true;
      }
      toast("This account is not set up yet. Enter your setup code to continue.", "info");
      startSetup(lookup.roll_no ?? "");
      return true;
    } catch {
      return false;
    }
  };

  // --- Setup step 1: verify code -----------------------------------------------

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNo.trim() || setupCode.length !== 8) return;

    setIsSubmitting(true);
    try {
      const data = await apiFetch<{ name?: string | null; room_no?: string | null; email?: string | null }>(
        "/auth/setup/verify",
        {
          method: "POST",
          body: JSON.stringify({ roll_no: rollNo.trim(), setup_code: setupCode.trim() }),
          skipAuth: true,
        }
      );
      setName(data.name ?? "");
      setRoomNo(data.room_no ?? "");
      setEmail(data.email ?? "");
      toast("Setup code verified!", "success");
      setMode("setup-password");
    } catch (err: unknown) {
      const error = err as Error;
      toast(error.message || "Invalid setup code.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Setup step 2: profile + password ------------------------------------------

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast("Password must be at least 8 characters.", "warning");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("Passwords do not match.", "warning");
      return;
    }
    if (!name.trim()) {
      toast("Name is required.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await apiFetch<LoginResponse>("/auth/setup/complete", {
        method: "POST",
        body: JSON.stringify({
          roll_no: rollNo.trim(),
          setup_code: setupCode.trim(),
          password: newPassword,
          name: name.trim(),
          room_no: roomNo.trim() || null,
        }),
        skipAuth: true,
      });
      setUser(data.user, data.access_token);
      toast("Account created! Welcome to Hall 12.", "success");
      router.push("/student/dashboard");
    } catch (err: unknown) {
      const error = err as Error;
      toast(error.message || "Failed to set password.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const title =
    mode === "login" ? "Hall 12 - Marathas" : mode === "setup-code" ? "Set up your account" : "Complete your profile";
  const subtitle =
    mode === "login"
      ? "Hall Management Portal"
      : mode === "setup-code"
        ? "Step 1 of 2: enter the setup code from the Hall Office"
        : "Step 2 of 2: choose a password";

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo + title */}
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.webp" alt="Hall 12 Marathas" width={80} height={80} className="rounded-2xl mb-4" priority />
          <h1 className="text-xl font-bold text-text-primary">{title}</h1>
          <p className="text-sm text-text-muted mt-1 text-center">{subtitle}</p>
        </div>

        {/* Login */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="glass-card p-6 space-y-5 animate-fade-in">
            <div>
              <label htmlFor="identifier" className="block text-xs font-medium text-text-secondary mb-1.5">
                Roll No / Email / Staff ID
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 230001, abcd24@iitk.ac.in or MS-001"
                className={inputClass}
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-text-secondary mb-1.5">
                Password
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={inputClass}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="flex justify-end mt-2">
              <Link href="/forgot-password" className="text-xs text-accent hover:text-accent-hover transition-colors font-medium">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              id="login-submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Logging in…" : "Login"}
            </button>
          </form>
        )}

        {/* Setup step 1 */}
        {mode === "setup-code" && (
          <form onSubmit={handleVerify} className="glass-card p-6 space-y-5 animate-fade-in">
            <div>
              <label htmlFor="roll-no" className="block text-xs font-medium text-text-secondary mb-1.5">
                Roll Number
              </label>
              <input
                id="roll-no"
                type="text"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                placeholder="e.g. 230001"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="setup-code" className="block text-xs font-medium text-text-secondary mb-1.5">
                Setup Code (8 characters)
              </label>
              <input
                id="setup-code"
                type="text"
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="ABC123XY"
                className={`${inputClass} tracking-widest font-mono uppercase`}
                required
              />
              <p className="text-xs text-text-muted mt-2">
                The Hall Office sends this code to your institute email.
              </p>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || setupCode.length !== 8 || !rollNo.trim()}
              className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Verifying…" : "Verify Code"}
            </button>
            <button type="button" onClick={backToLogin} className="w-full py-2 text-sm text-text-muted hover:text-text-secondary transition-colors">
              ← Back to login
            </button>
          </form>
        )}

        {/* Setup step 2 */}
        {mode === "setup-password" && (
          <form onSubmit={handleSetPassword} className="glass-card p-6 space-y-4 animate-fade-in">
            {email && (
              <div className="bg-bg-elevated/50 p-3 rounded-lg border border-border">
                <p className="text-xs text-text-muted">Your login email</p>
                <p className="text-sm font-medium text-text-primary">{email}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="name" className="block text-xs font-medium text-text-secondary mb-1.5">
                  Full Name *
                </label>
                <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" className={inputClass} required />
              </div>
              <div>
                <label htmlFor="room-no" className="block text-xs font-medium text-text-secondary mb-1.5">
                  Room Number
                </label>
                <input id="room-no" type="text" value={roomNo} onChange={(e) => setRoomNo(e.target.value)} placeholder="e.g. A-101" className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="new-password" className="block text-xs font-medium text-text-secondary mb-1.5">
                Password (min 8 characters)
              </label>
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter password"
                className={inputClass}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-medium text-text-secondary mb-1.5">
                Confirm Password
              </label>
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className={inputClass}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Creating Account…" : "Create Account"}
            </button>
            <button type="button" onClick={() => setMode("setup-code")} className="w-full py-2 text-sm text-text-muted hover:text-text-secondary transition-colors">
              ← Back
            </button>
          </form>
        )}

        {mode === "login" && (
          <p className="text-center text-sm text-text-muted mt-6">
            First time here?{" "}
            <button type="button" onClick={() => startSetup()} className="text-accent hover:text-accent-hover transition-colors font-medium">
              Set up your account
            </button>
          </p>
        )}

        <p className="text-center text-sm text-text-secondary mt-8">
          made with 💖 by your mess & canteen secretary
        </p>
      </div>
    </div>
  );
}
