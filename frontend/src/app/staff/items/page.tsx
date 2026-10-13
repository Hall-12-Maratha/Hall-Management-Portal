"use client";

/**
 * Mess staff - extras items.
 *
 * Two kinds of item:
 *   Weekly   pick a weekday; the item repeats every week on that day. Upcoming
 *            weeks are generated automatically and appear under their own day.
 *   One time pick a specific date.
 *
 * Items are listed by service day (today and upcoming first), and inside a
 * day by meal. The status badge uses the same rule the student list uses, so
 * "Open" means students can book it right now:
 *   Open            opens_at <= now < closes_at and service date not past
 *   Opens <when>    now < opens_at (window opens 72 h before close)
 *   Closed          past close or past service date, with the bookings count
 *   Inactive        deactivated
 */

import PasswordInput from "@/components/ui/PasswordInput";
import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, formatTime, formatPrice, getDayName, getTodayInIndia, parseApiDate } from "@/lib/utils";
import type { ExtrasItem } from "@/types";

type ItemStatus = "open" | "upcoming" | "closed" | "inactive";
type Repeat = "weekly" | "once";

const MEAL_ORDER = ["breakfast", "lunch", "dinner"];
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]; // 0 = Monday

function itemStatus(item: ExtrasItem, now: Date, todayIst: string): ItemStatus {
  if (!item.is_active) return "inactive";
  const opensAt = parseApiDate(item.opens_at);
  const closesAt = parseApiDate(item.closes_at);
  if (item.date < todayIst || now >= closesAt) return "closed";
  if (now < opensAt) return "upcoming";
  return "open";
}

/** Weekday (0 = Monday) of a YYYY-MM-DD string. */
function weekdayOf(ymd: string): number {
  return (new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7;
}

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * First service date for a weekly item: the next occurrence of `weekday` on or
 * after today; if that is today but the close time has already passed, next week.
 */
function nextDateForWeekday(weekday: number, closesHHMM: string, todayIst: string): string {
  const delta = (weekday - weekdayOf(todayIst) + 7) % 7;
  let date = addDaysYmd(todayIst, delta);
  if (delta === 0 && new Date(`${date}T${closesHHMM}:00`) <= new Date()) {
    date = addDaysYmd(date, 7);
  }
  return date;
}

export default function StaffItemsPage() {
  const [items, setItems] = useState<ExtrasItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const todayIst = getTodayInIndia();
  const tomorrowIst = addDaysYmd(todayIst, 1);

  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formRepeat, setFormRepeat] = useState<Repeat>("weekly");
  const [formWeekday, setFormWeekday] = useState<number>(weekdayOf(todayIst));
  const [formDate, setFormDate] = useState(todayIst);
  const [formMealType, setFormMealType] = useState("lunch");
  const [formCloses, setFormCloses] = useState("14:30");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  /** "week" = today through 7 days ahead; "all" = everything including past days. */
  const [rangeFilter, setRangeFilter] = useState<"week" | "all">("week");

  const [bulkDeleteId, setBulkDeleteId] = useState<number | null>(null);
  const [bulkDeletePassword, setBulkDeletePassword] = useState("");
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const { toast } = useToast();

  const fetchItems = async () => {
    try {
      const data = await apiFetch<ExtrasItem[]>("/staff/items");
      setItems(data);
    } catch (err: unknown) {
      const error = err as Error;
      toast(error.message || "Failed to load items.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormPrice("");
    setFormRepeat("weekly");
    setFormWeekday(weekdayOf(todayIst));
    setFormDate(todayIst);
    setFormMealType("lunch");
    setFormCloses("14:30");
    setEditingId(null);
    setShowForm(false);
  };

  const openEditForm = (item: ExtrasItem) => {
    setFormName(item.name);
    setFormPrice(String(item.price));
    setFormRepeat(item.is_recurring ? "weekly" : "once");
    setFormWeekday(item.recurring_weekday ?? weekdayOf(item.date));
    setFormDate(item.date);
    setFormMealType(item.meal_type);
    const d = parseApiDate(item.closes_at);
    setFormCloses(`${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`);
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Weekly: the service date follows the weekday. When editing, keep the current
    // date unless the weekday was changed (then jump to the next such day).
    const editing = editingId ? items.find((i) => i.id === editingId) : undefined;
    const weekdayChanged = editing
      ? (editing.recurring_weekday ?? weekdayOf(editing.date)) !== formWeekday
      : true;
    const date =
      formRepeat === "weekly"
        ? weekdayChanged
          ? nextDateForWeekday(formWeekday, formCloses, todayIst)
          : formDate
        : formDate;
    const closesDt = new Date(`${date}T${formCloses}:00`); // local time

    const body = {
      name: formName.trim(),
      price: parseFloat(formPrice),
      date,
      meal_type: formMealType,
      closes_at: closesDt.toISOString(),
      is_recurring: formRepeat === "weekly",
      recurring_weekday: formRepeat === "weekly" ? formWeekday : null,
    };

    setIsSubmitting(true);
    try {
      if (editingId) {
        await apiFetch(`/staff/items/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
        toast("Item updated.", "success");
      } else {
        await apiFetch("/staff/items", { method: "POST", body: JSON.stringify(body) });
        toast(
          formRepeat === "weekly"
            ? `Added. It repeats every ${getDayName(formWeekday)}; first on ${date}.`
            : "Item created.",
          "success"
        );
      }
      resetForm();
      fetchItems();
    } catch (err: unknown) {
      const error = err as Error;
      toast(error.message || "Failed to save.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStop = async (item: ExtrasItem) => {
    const msg = item.is_recurring
      ? "Stop this weekly item? It and its upcoming weeks (with no bookings) will no longer appear for students. You can restart it later."
      : "Deactivate this item? It will no longer appear for students. You can reactivate it later.";
    if (!confirm(msg)) return;
    try {
      await apiFetch(`/staff/items/${item.id}`, { method: "DELETE" });
      toast(item.is_recurring ? "Weekly item stopped." : "Item deactivated.", "success");
      fetchItems();
    } catch (err: unknown) {
      const error = err as Error;
      toast(error.message || "Failed to stop.", "error");
    }
  };

  const handleRestart = async (item: ExtrasItem) => {
    try {
      await apiFetch(`/staff/items/${item.id}`, { method: "PUT", body: JSON.stringify({ is_active: true }) });
      toast(item.is_recurring ? "Weekly item restarted." : "Item reactivated.", "success");
      fetchItems();
    } catch (err: unknown) {
      const error = err as Error;
      toast(error.message || "Failed to restart.", "error");
    }
  };

  const handlePermanentDelete = async (item: ExtrasItem) => {
    if (!confirm(`Permanently delete "${item.name}" (${item.date})? This cannot be undone.`)) return;
    try {
      await apiFetch(`/staff/items/${item.id}?permanent=true`, { method: "DELETE" });
      toast("Item deleted permanently.", "success");
      fetchItems();
    } catch (err: unknown) {
      const error = err as Error;
      toast(error.message || "Failed to delete.", "error");
    }
  };

  const handleBulkDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkDeleteId) return;

    setIsDeletingBulk(true);
    try {
      await apiFetch(`/staff/items/${bulkDeleteId}/bookings/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ password: bulkDeletePassword }),
      });
      toast("Bookings deleted successfully.", "success");
      setBulkDeleteId(null);
      setBulkDeletePassword("");
      fetchItems();
    } catch (err: unknown) {
      const error = err as Error;
      toast(error.message || "Failed to bulk delete bookings.", "error");
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const now = new Date();

  const weekEnd = addDaysYmd(todayIst, 7);
  const filteredItems = items.filter((item) => {
    if (rangeFilter === "week" && (item.date < todayIst || item.date > weekEnd)) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    const status = itemStatus(item, now, todayIst);
    if (statusFilter !== "all" && status !== statusFilter) return false;
    return true;
  });

  /** Group by service day (today and upcoming first, then past newest first), then by meal. */
  const sections = (() => {
    const byDate = new Map<string, Map<string, ExtrasItem[]>>();
    for (const item of filteredItems) {
      if (!byDate.has(item.date)) byDate.set(item.date, new Map());
      const byMeal = byDate.get(item.date)!;
      if (!byMeal.has(item.meal_type)) byMeal.set(item.meal_type, []);
      byMeal.get(item.meal_type)!.push(item);
    }
    const dates = [...byDate.keys()];
    const upcoming = dates.filter((d) => d >= todayIst).sort();
    const past = dates.filter((d) => d < todayIst).sort().reverse();
    return [...upcoming, ...past].map((date) => ({
      date,
      meals: [...byDate.get(date)!.entries()].sort(
        ([a], [b]) => MEAL_ORDER.indexOf(a) - MEAL_ORDER.indexOf(b)
      ),
      count: [...byDate.get(date)!.values()].reduce((n, list) => n + list.length, 0),
    }));
  })();

  const inputClass =
    "w-full px-3 py-2 rounded-xl bg-bg-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent input-glow";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-text-primary">Extras Items</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors"
        >
          + Add Item
        </button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-5 rounded-xl mb-6 space-y-4 animate-fade-in max-w-3xl">
          <h2 className="text-sm font-bold text-text-primary">{editingId ? "Edit Item" : "New Item"}</h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-text-secondary mb-1">Name</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Extra Roti" className={inputClass} required />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Price (₹)</label>
              <input type="number" step="0.5" min="0.5" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="15.00" className={inputClass} required />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Meal</label>
              <select value={formMealType} onChange={(e) => setFormMealType(e.target.value)} className={inputClass}>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-text-secondary mb-1">Repeats</label>
              <div className="flex bg-bg-elevated p-1 rounded-xl border border-border">
                {(["weekly", "once"] as Repeat[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFormRepeat(r)}
                    disabled={!!editingId}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
                      formRepeat === r ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {r === "weekly" ? "Every week" : "One time"}
                  </button>
                ))}
              </div>
            </div>
            {formRepeat === "weekly" ? (
              <div>
                <label className="block text-xs text-text-secondary mb-1">Day of week</label>
                <select
                  value={formWeekday}
                  onChange={(e) => setFormWeekday(Number(e.target.value))}
                  className={inputClass}
                >
                  {WEEKDAYS.map((d) => (
                    <option key={d} value={d}>
                      {getDayName(d)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-text-secondary mb-1">Service date</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className={inputClass} required />
              </div>
            )}
            <div>
              <label className="block text-xs text-text-secondary mb-1">Booking closes at</label>
              <input type="time" value={formCloses} onChange={(e) => setFormCloses(e.target.value)} className={inputClass} required />
            </div>
          </div>

          <p className="text-xs text-text-muted">
            {formRepeat === "weekly"
              ? `Appears every ${getDayName(formWeekday)}. Students can book from 72 hours before the close time until it closes; next weeks are added automatically.`
              : "Students can book from 72 hours before the close time until it closes."}
            {editingId && formRepeat === "weekly"
              ? " Changes apply to upcoming weeks that have no bookings yet; changing the day moves them."
              : ""}
          </p>

          <div className="flex gap-3">
            <button type="button" onClick={resetForm} className="flex-1 py-2 rounded-xl border border-border text-text-secondary text-sm hover:bg-bg-surface-hover transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-50">
              {isSubmitting ? "Saving…" : editingId ? "Update" : "Create"}
            </button>
          </div>
        </form>
      )}

      {/* Items list */}
      {isLoading ? (
        <div className="space-y-2 animate-subtle-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card h-20 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card p-8 rounded-xl text-center">
          <p className="text-text-muted text-sm">No items yet. Create one above!</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1 min-w-[200px] relative">
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2 rounded-xl bg-bg-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent shadow-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                  x
                </button>
              )}
            </div>
            <select
              value={rangeFilter}
              onChange={(e) => setRangeFilter(e.target.value as "week" | "all")}
              className="px-3 py-2 rounded-xl bg-bg-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent shadow-sm"
            >
              <option value="week">Next 7 days</option>
              <option value="all">All (incl. past)</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-bg-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent shadow-sm"
            >
              <option value="all">All Items</option>
              <option value="open">Open for booking</option>
              <option value="upcoming">Opens later</option>
              <option value="closed">Closed / Past</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="space-y-6">
            {sections.length === 0 ? (
              <div className="glass-card p-8 rounded-xl text-center">
                <p className="text-text-muted text-sm">
                  {rangeFilter === "week" ? "No items in the next 7 days." : "No items match your filters."}
                </p>
              </div>
            ) : (
              sections.map(({ date, meals, count }) => (
                <section key={date}>
                  <div className="flex items-baseline gap-2 mb-2">
                    <h2 className={`text-sm font-bold ${date < todayIst ? "text-text-muted" : "text-text-primary"}`}>
                      {getDayName(weekdayOf(date))} · {date}
                    </h2>
                    {date === todayIst && (
                      <span className="text-[10px] font-bold bg-accent text-white px-1.5 py-0.5 rounded-full">TODAY</span>
                    )}
                    {date === tomorrowIst && (
                      <span className="text-[10px] font-bold bg-bg-elevated border border-border text-text-secondary px-1.5 py-0.5 rounded-full">TOMORROW</span>
                    )}
                    <span className="text-xs text-text-muted">
                      {count} item{count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {meals.map(([meal, dayItems]) => (
                      <div key={meal} className="space-y-2">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-accent px-1">
                          {meal} · {dayItems.length}
                        </h3>
                        {dayItems.map((item) => {
                          const status = itemStatus(item, now, todayIst);
                          const bookings = item.bookings_count ?? 0;
                          return (
                            <div
                              key={item.id}
                              className={`glass-card p-3.5 rounded-xl flex flex-col gap-2 ${status === "inactive" ? "opacity-50" : ""}`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                  <h3 className="text-sm font-semibold text-text-primary truncate">{item.name}</h3>
                                  <span className="text-xs font-bold text-accent">{formatPrice(item.price)}</span>
                                  {status === "open" && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-success-bg text-success">
                                      OPEN · {bookings} booked
                                    </span>
                                  )}
                                  {status === "upcoming" && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-bg-elevated border border-border text-text-secondary">
                                      OPENS {formatDateTime(item.opens_at).toUpperCase()}
                                    </span>
                                  )}
                                  {status === "closed" && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-warning-bg text-warning">
                                      CLOSED · {bookings} booked
                                    </span>
                                  )}
                                  {status === "inactive" && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-error-bg text-error">INACTIVE</span>
                                  )}
                                </div>
                                <p className="text-xs text-text-muted">
                                  Book by {formatTime(item.closes_at)}
                                  {item.is_recurring ? ` · Every ${getDayName(item.recurring_weekday ?? weekdayOf(item.date))}` : ""}
                                </p>
                              </div>
                              <div className="flex gap-1.5 flex-wrap">
                                <button onClick={() => openEditForm(item)} className="px-2.5 py-1.5 rounded-lg border border-border text-text-secondary text-xs hover:bg-bg-surface-hover transition-colors">
                                  Edit
                                </button>
                                {item.is_active ? (
                                  <button onClick={() => handleStop(item)} className="px-2.5 py-1.5 rounded-lg border border-warning/30 text-warning text-xs hover:bg-warning-bg transition-colors">
                                    {item.is_recurring ? "Stop" : "Deactivate"}
                                  </button>
                                ) : (
                                  <button onClick={() => handleRestart(item)} className="px-2.5 py-1.5 rounded-lg border border-success/30 text-success text-xs hover:bg-success-bg transition-colors">
                                    {item.is_recurring ? "Restart" : "Reactivate"}
                                  </button>
                                )}
                                {bookings > 0 && (
                                  <button onClick={() => setBulkDeleteId(item.id)} className="px-2.5 py-1.5 rounded-lg border border-border text-text-secondary text-xs hover:bg-bg-surface-hover transition-colors">
                                    Clear Bookings
                                  </button>
                                )}
                                <button
                                  onClick={() => handlePermanentDelete(item)}
                                  disabled={bookings > 0}
                                  title={bookings > 0 ? "Clear its bookings first" : "Delete permanently"}
                                  className="px-2.5 py-1.5 rounded-lg border border-error/30 text-error text-xs hover:bg-error-bg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </>
      )}

      {/* Bulk Delete Modal */}
      {bulkDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBulkDeleteId(null)} />
          <form onSubmit={handleBulkDelete} className="relative glass-card p-6 rounded-2xl w-full max-w-sm">
            <h2 className="text-lg font-bold text-text-primary mb-2">Bulk Delete Bookings</h2>
            <p className="text-sm text-text-muted mb-4">Enter your password to confirm clearing all bookings for this item. This action cannot be undone.</p>
            <PasswordInput
              placeholder="Your Password"
              value={bulkDeletePassword}
              onChange={(e) => setBulkDeletePassword(e.target.value)}
              required
              className="w-full px-3 py-2 mb-4 rounded-xl bg-bg-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-warning input-glow"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setBulkDeleteId(null)} className="flex-1 py-2 rounded-xl border border-border text-text-secondary text-sm">
                Cancel
              </button>
              <button type="submit" disabled={isDeletingBulk} className="flex-1 py-2 rounded-xl bg-warning hover:bg-warning/80 text-white text-sm font-bold disabled:opacity-50">
                {isDeletingBulk ? "Deleting..." : "Confirm"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
