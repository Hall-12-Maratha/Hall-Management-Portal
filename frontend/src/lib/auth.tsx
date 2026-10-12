"use client";

/**
 * Auth context - manages user session, login/logout, signup flow.
 *
 * Session restore is a single POST /api/auth/refresh (the response carries the
 * user profile), so a hard reload costs one function invocation.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { apiFetch, refreshSession, setAccessToken } from "@/lib/api";
import type {
  LoginResult,
  UserBrief,
} from "@/types";

/** Retry once on a network/server error (not on 401) before giving up. */
const RESTORE_MAX_ATTEMPTS = 2;
const RESTORE_RETRY_DELAY = 2000;

interface AuthState {
  user: UserBrief | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (
    identifier: string,
    password: string
  ) => Promise<LoginResult>;
  logout: () => Promise<void>;
  setUser: (user: UserBrief, token: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<UserBrief | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Try to restore the session from the refresh cookie on mount
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      for (let attempt = 0; attempt < RESTORE_MAX_ATTEMPTS; attempt++) {
        try {
          const session = await refreshSession();
          if (cancelled) return;

          if (!session) {
            // No valid refresh cookie: the user needs to log in.
            setAccessToken(null);
            setUserState(null);
          } else {
            setUserState(session.user);
          }
          setIsLoading(false);
          return;
        } catch (err) {
          if (attempt < RESTORE_MAX_ATTEMPTS - 1) {
            await new Promise((resolve) => setTimeout(resolve, RESTORE_RETRY_DELAY));
          } else {
            console.warn("Session restore failed:", err);
          }
        }
      }

      if (cancelled) return;
      setAccessToken(null);
      setUserState(null);
      setIsLoading(false);
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (identifier: string, password: string): Promise<LoginResult> => {
      const data = await apiFetch<LoginResult>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
        skipAuth: true,
      });

      // Staff with a temporary password must change it before getting a session
      if ("must_change_password" in data && data.must_change_password) {
        return data;
      }

      const loginData = data as {
        access_token: string;
        user: UserBrief;
      };
      setAccessToken(loginData.access_token);
      setUserState(loginData.user);
      return data;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors during logout
    }
    setAccessToken(null);
    setUserState(null);
    router.push("/login");
  }, [router]);

  const setUser = useCallback((user: UserBrief, token: string) => {
    setAccessToken(token);
    setUserState(user);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Helper to get the role-based home route.
 */
export function getRoleHome(role: string): string {
  switch (role) {
    case "student":
      return "/student/dashboard";
    case "mess_staff":
      return "/staff/items";
    case "mess_worker":
      return "/worker/scan";
    case "hall_office":
      return "/hall-office/roll-numbers";
    default:
      return "/login";
  }
}
