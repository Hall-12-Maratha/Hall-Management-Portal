"use client";

import React, { useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getRoleHome, useAuth } from "@/lib/auth";

const NAV_ITEMS = [
  { label: "Roll Numbers", href: "/hall-office/roll-numbers" },
  { label: "Staff Accounts", href: "/hall-office/staff-accounts" },
  { label: "Notices", href: "/hall-office/notices" },
];

export default function HallOfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    } else if (!isLoading && user && user.role !== "hall_office") {
      router.replace(getRoleHome(user.role));
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-4 max-w-xs text-center">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "hall_office") return null;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      {/* Tab navigation */}
      <div className="border-b border-border bg-bg-surface/50">
        <div className="w-full px-4 sm:px-6 lg:px-10 flex gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-accent text-accent"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-10 pt-4 pb-8">
        {children}
      </main>
    </div>
  );
}
