/**
 * Row -> API response shapes. Field names match the FastAPI Pydantic schemas
 * (and src/types/index.ts) exactly. Money is returned as JSON numbers and
 * timestamps as ISO-8601 strings with a `Z` suffix.
 */

import { toIso } from "./dates";
import type {
  AllowedRollRow,
  ExtrasBookingRow,
  ExtrasItemRow,
  NoticeRow,
  UserRow,
  WastageLogRow,
  WeeklyMenuRow,
} from "./db/schema";

/** numeric(10,2) comes back from Postgres as a string. */
export function money(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export interface UserBrief {
  id: number;
  identifier: string;
  name: string;
  role: string;
  email: string | null;
  roll_no: string | null;
  room_no: string | null;
}

export function toUserBrief(u: UserRow): UserBrief {
  return {
    id: u.id,
    identifier: u.identifier,
    name: u.name,
    role: u.role,
    email: u.email,
    roll_no: u.rollNo,
    room_no: u.roomNo,
  };
}

/** @param bookingsCount live (non-cancelled) bookings; included only when provided (staff views). */
export function toItemResponse(i: ExtrasItemRow, bookingsCount?: number) {
  return {
    id: i.id,
    name: i.name,
    price: money(i.price),
    date: i.date,
    meal_type: i.mealType,
    opens_at: i.opensAt.toISOString(),
    closes_at: i.closesAt.toISOString(),
    prep_time_mins: i.prepTimeMins,
    is_recurring: i.isRecurring,
    recurring_weekday: i.recurringWeekday,
    is_active: i.isActive,
    created_at: i.createdAt.toISOString(),
    ...(bookingsCount !== undefined ? { bookings_count: bookingsCount } : {}),
  };
}

export function toBookingResponse(b: ExtrasBookingRow, item: ExtrasItemRow) {
  return {
    id: b.id,
    item_id: b.itemId,
    item_name: item.name,
    item_date: item.date,
    meal_type: item.mealType,
    qty: b.qty,
    total_price: money(b.totalPrice),
    status: b.status,
    qr_token: b.qrToken,
    booked_at: b.bookedAt.toISOString(),
    qr_used_at: toIso(b.qrUsedAt),
    closes_at: item.closesAt.toISOString(),
  };
}

export function toStaffBookingResponse(
  b: ExtrasBookingRow,
  item: ExtrasItemRow | null,
  student: Pick<UserRow, "identifier" | "name" | "rollNo"> | null
) {
  return {
    id: b.id,
    student_identifier: student?.identifier ?? "Unknown",
    student_name: student?.name ?? "Unknown",
    student_roll_no: student?.rollNo ?? null,
    item_name: item?.name ?? "Unknown",
    item_date: item?.date ?? null,
    meal_type: item?.mealType ?? "Unknown",
    qty: b.qty,
    total_price: money(b.totalPrice),
    status: b.status,
    booked_at: b.bookedAt.toISOString(),
    qr_used_at: toIso(b.qrUsedAt),
    closes_at: (item?.closesAt ?? new Date()).toISOString(),
  };
}

export function toMenuSlot(s: WeeklyMenuRow) {
  return {
    id: s.id,
    day_of_week: s.dayOfWeek,
    meal_type: s.mealType,
    description: s.description,
    updated_by: s.updatedBy,
    updated_at: s.updatedAt.toISOString(),
  };
}

export function toWastage(w: WastageLogRow) {
  return {
    id: w.id,
    date: w.date,
    bdmr: w.bdmr,
    plain_wastage: w.plainWastage,
    plate_wastage: w.plateWastage,
    entered_by: w.enteredBy,
    entered_at: w.enteredAt.toISOString(),
  };
}

export function toNotice(n: NoticeRow) {
  return {
    id: n.id,
    title: n.title,
    description: n.description,
    link: n.link,
    created_at: n.createdAt.toISOString(),
    created_by: n.createdBy,
  };
}

export type AccountStatus = "not_registered" | "active" | "restricted";

/**
 * @param isActive the linked student account's `is_active`, or null/undefined
 *                 when no account exists yet.
 */
export function toAllowedRoll(r: AllowedRollRow, isActive?: boolean | null) {
  const accountStatus: AccountStatus =
    isActive === null || isActive === undefined ? "not_registered" : isActive ? "active" : "restricted";
  return {
    roll_no: r.rollNo,
    name: r.name,
    email: r.email,
    room_number: r.roomNumber,
    setup_code: r.setupCode,
    uploaded_at: r.uploadedAt.toISOString(),
    uploaded_by: r.uploadedBy,
    account_status: accountStatus,
  };
}

export function toStaffListItem(u: UserRow) {
  return {
    id: u.id,
    identifier: u.identifier,
    name: u.name,
    role: u.role,
    is_active: u.isActive,
    created_at: u.createdAt.toISOString(),
  };
}
