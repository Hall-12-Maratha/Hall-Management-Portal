"use client";

/**
 * Student Dashboard - notice board (with the student's personal notices), the
 * weekly menu starting from today, then the wastage summary.
 *
 * One request per visit (GET /api/dashboard). Notices are never cached so the
 * board is always current. The menu changes rarely, so it is kept in the
 * browser for up to 30 days together with its `menu_version`; the version is
 * sent with the request and the server returns the menu only when the mess
 * has edited it since. A menu change therefore shows on the next visit with
 * no extra request.
 */

import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { readCache, writeCache } from "@/lib/clientCache";
import { useToast } from "@/components/ui/Toast";
import NotificationsToggle from "@/components/pwa/NotificationsToggle";
import { formatDate, formatDateTime, getDayName, getTodayWeekday } from "@/lib/utils";
import type { DashboardPayload, MenuSlot } from "@/types";
import NoticeBoard from "@/components/NoticeBoard";

interface CachedMenu {
  version: string;
  slots: MenuSlot[];
}

const MENU_CACHE_KEY = "student-menu";
const MENU_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export default function StudentDashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [menuSlots, setMenuSlots] = useState<MenuSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setIsLoading(true);
    const cachedMenu = readCache<CachedMenu>(MENU_CACHE_KEY, MENU_CACHE_MAX_AGE_MS)?.value ?? null;
    try {
      const query = cachedMenu ? `?menu_version=${encodeURIComponent(cachedMenu.version)}` : "";
      const fresh = await apiFetch<DashboardPayload>(`/dashboard${query}`);
      setData(fresh);
      if (fresh.menu) {
        setMenuSlots(fresh.menu.slots);
        writeCache<CachedMenu>(MENU_CACHE_KEY, { version: fresh.menu_version, slots: fresh.menu.slots });
      } else {
        setMenuSlots(cachedMenu?.slots ?? []);
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast(error.message || "Failed to load dashboard.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const todayWeekday = getTodayWeekday();
  // Days in display order: today first, then the following six days.
  const orderedDays = Array.from({ length: 7 }, (_, i) => (todayWeekday + i) % 7);

  if (isLoading || !data) {
    return (
      <div className="space-y-4 animate-subtle-pulse">
        <div className="glass-card h-24 rounded-xl" />
        <div className="glass-card h-64 rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const { summary, notices, personal_notices: personalNotices } = data;

  // Build menu grid: organize slots by day
  const menuByDay: Record<number, Record<string, string>> = {};
  for (let d = 0; d < 7; d++) {
    menuByDay[d] = { breakfast: "", lunch: "", dinner: "" };
  }
  menuSlots.forEach((slot) => {
    menuByDay[slot.day_of_week][slot.meal_type] = slot.description;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-end -mb-4">
        <button
          type="button"
          onClick={load}
          className="text-[11px] text-text-muted hover:text-accent transition-colors"
          title="Reload notices, menu and wastage figures"
        >
          Refresh
        </button>
      </div>

      <NotificationsToggle variant="card" />

      {/* 1. Notice Board */}
      <section>
        <NoticeBoard notices={notices} personalNotices={personalNotices} onChanged={load} />
      </section>

      {/* 2. Menu for the coming days, starting today */}
      <section>
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Mess Menu
        </h2>
        <div className="space-y-2">
          {orderedDays.map((day, index) => {
            const isToday = index === 0;
            const isTomorrow = index === 1;
            return (
              <div
                key={day}
                className={`glass-card rounded-xl overflow-hidden transition-colors ${
                  isToday ? "border-accent/40 bg-accent-bg" : ""
                }`}
              >
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-semibold ${isToday ? "text-accent" : "text-text-primary"}`}>
                      {getDayName(day)}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-bold bg-accent text-white px-1.5 py-0.5 rounded-full">
                        TODAY
                      </span>
                    )}
                    {isTomorrow && (
                      <span className="text-[10px] font-bold bg-bg-elevated text-text-secondary border border-border px-1.5 py-0.5 rounded-full">
                        TOMORROW
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-text-muted block mb-0.5">Breakfast</span>
                      <span className="text-text-secondary">{menuByDay[day].breakfast || "-"}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block mb-0.5">Lunch</span>
                      <span className="text-text-secondary">{menuByDay[day].lunch || "-"}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block mb-0.5">Dinner</span>
                      <span className="text-text-secondary">{menuByDay[day].dinner || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Wastage Summary */}
      <section>
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Mess Wastage
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="glass-card p-4 rounded-xl">
            <p className="text-xs text-text-muted mb-1">Avg. BDMR (last 7 days)</p>
            <p className="text-2xl font-bold text-accent">
              {summary.avg_bdmr != null ? `INR ${summary.avg_bdmr.toFixed(2)}` : "-"}
            </p>
            <p className="text-[10px] text-text-muted mt-1">Basic Daily Menu Rate</p>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <p className="text-xs text-text-muted mb-1">Plain Wastage (kg)</p>
            <p className="text-2xl font-bold text-text-primary">
              {summary.plain_wastage != null ? `${summary.plain_wastage.toFixed(2)} kg` : "-"}
            </p>
            {summary.wastage_date && (
              <p className="text-[10px] text-text-muted mt-1">Data from {formatDate(summary.wastage_date)}</p>
            )}
          </div>

          <div className="glass-card p-4 rounded-xl">
            <p className="text-xs text-text-muted mb-1">Plate Wastage (kg)</p>
            <p className="text-2xl font-bold text-text-primary">
              {summary.plate_wastage != null ? `${summary.plate_wastage.toFixed(2)} kg` : "-"}
            </p>
            {summary.wastage_date && (
              <p className="text-[10px] text-text-muted mt-1">Data from {formatDate(summary.wastage_date)}</p>
            )}
          </div>
        </div>

        {summary.last_updated && (
          <p className="text-[11px] text-text-muted mt-2">
            Last updated: {formatDateTime(summary.last_updated)}
          </p>
        )}
      </section>
    </div>
  );
}
