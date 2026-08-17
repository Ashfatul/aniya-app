import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface AgeBreakdown {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number;
  totalWeeks: number;
  totalHours: number;
  totalMinutes: number;
  totalSeconds: number;
  isFuture: boolean;
  nextMilestoneDays?: number;
  nextMilestoneLabel?: string;
}

/**
 * Safely parse a date string or Date object.
 * Handles 'YYYY-MM-DD' as local date to prevent UTC timezone shifts.
 */
export function parseDateSafe(d: string | Date | null | undefined): Date {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  if (typeof d === "string") {
    const trimmed = d.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split("-").map(Number);
      return new Date(year, month - 1, day, 0, 0, 0);
    }
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return new Date();
}

/**
 * Computes calendar-accurate age breakdown (years, months, days, hours, minutes, seconds).
 * Uses calendar advancement to handle different month lengths and leap years.
 */
export function calculateAgeBreakdown(
  birthday: string | Date | null | undefined,
  targetDate: Date = new Date()
): AgeBreakdown {
  if (!birthday) {
    return {
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalDays: 0,
      totalWeeks: 0,
      totalHours: 0,
      totalMinutes: 0,
      totalSeconds: 0,
      isFuture: false,
    };
  }

  const birth = parseDateSafe(birthday);
  const now = targetDate;

  if (isNaN(birth.getTime()) || isNaN(now.getTime())) {
    return {
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalDays: 0,
      totalWeeks: 0,
      totalHours: 0,
      totalMinutes: 0,
      totalSeconds: 0,
      isFuture: false,
    };
  }

  if (now < birth) {
    return {
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalDays: 0,
      totalWeeks: 0,
      totalHours: 0,
      totalMinutes: 0,
      totalSeconds: 0,
      isFuture: true,
    };
  }

  let cur = new Date(birth);

  // Advance by years
  let years = 0;
  while (true) {
    const next = new Date(cur);
    next.setFullYear(cur.getFullYear() + 1);
    if (next <= now) {
      years++;
      cur = next;
    } else {
      break;
    }
  }

  // Advance by months
  let months = 0;
  while (true) {
    const next = new Date(cur);
    next.setMonth(cur.getMonth() + 1);
    if (next <= now) {
      months++;
      cur = next;
    } else {
      break;
    }
  }

  // Remaining days, hours, minutes, seconds
  const remainingMs = now.getTime() - cur.getTime();
  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const remAfterDays = remainingMs % (1000 * 60 * 60 * 24);
  const hours = Math.floor(remAfterDays / (1000 * 60 * 60));
  const remAfterHours = remAfterDays % (1000 * 60 * 60);
  const minutes = Math.floor(remAfterHours / (1000 * 60));
  const remAfterMins = remAfterHours % (1000 * 60);
  const seconds = Math.floor(remAfterMins / 1000);

  const totalMs = now.getTime() - birth.getTime();
  const totalSeconds = Math.floor(totalMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);
  const totalWeeks = Math.floor(totalDays / 7);

  // Next monthly milestone calculation
  const nextMonthMilestone = new Date(cur);
  nextMonthMilestone.setMonth(cur.getMonth() + 1);
  const msUntilNextMilestone = nextMonthMilestone.getTime() - now.getTime();
  const nextMilestoneDays = Math.max(
    0,
    Math.ceil(msUntilNextMilestone / (1000 * 60 * 60 * 24))
  );
  const nextTotalMonths = years * 12 + months + 1;
  const nextMilestoneLabel =
    nextTotalMonths % 12 === 0
      ? `${nextTotalMonths / 12} ${nextTotalMonths / 12 === 1 ? "year" : "years"}`
      : `${nextTotalMonths} months`;

  return {
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
    totalDays,
    totalWeeks,
    totalHours,
    totalMinutes,
    totalSeconds,
    isFuture: false,
    nextMilestoneDays,
    nextMilestoneLabel,
  };
}

/**
 * Format age from a birthday with clear separation of months and days.
 * Returns e.g. "2 yrs 3 mos 7 days", "6 mos 28 days", or "16 days".
 */
export function formatAge(
  birthday: string | Date | null | undefined,
  now: Date = new Date()
): string {
  if (!birthday) return "";
  const age = calculateAgeBreakdown(birthday, now);
  if (age.isFuture) return "Due soon";

  const { years, months, days, hours, minutes } = age;

  if (years === 0 && months === 0 && days === 0) {
    if (hours === 0) return `${minutes} min`;
    return `${hours} hr`;
  }

  if (years === 0 && months === 0) {
    return `${days} ${days === 1 ? "day" : "days"}`;
  }

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? "yr" : "yrs"}`);
  }
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? "mo" : "mos"}`);
  }
  if (days > 0) {
    parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  }

  return parts.join(" ");
}

/**
 * Format age with full spelled-out labels.
 * Returns e.g. "2 years, 3 months, 7 days", "6 months, 28 days", or "16 days".
 */
export function formatAgeDetailed(
  birthday: string | Date | null | undefined,
  now: Date = new Date()
): string {
  if (!birthday) return "";
  const age = calculateAgeBreakdown(birthday, now);
  if (age.isFuture) return "Due soon";

  const { years, months, days, hours, minutes } = age;

  if (years === 0 && months === 0 && days === 0) {
    if (hours === 0) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  if (years === 0 && months === 0) {
    return `${days} ${days === 1 ? "day" : "days"}`;
  }

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  }
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? "month" : "months"}`);
  }
  if (days > 0) {
    parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  }

  return parts.join(", ");
}

/**
 * Compact age for badges or small navigation bars.
 * Returns e.g. "2y 3m 7d", "6m 28d", or "16d".
 */
export function formatAgeShort(
  birthday: string | Date | null | undefined,
  now: Date = new Date()
): string {
  if (!birthday) return "";
  const age = calculateAgeBreakdown(birthday, now);
  if (age.isFuture) return "Due soon";

  const { years, months, days } = age;
  if (years === 0 && months === 0) return `${days}d`;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}m`);
  if (days > 0) parts.push(`${days}d`);

  return parts.join(" ");
}

/** Compute exact age in months (decimal) — useful for growth charts. */
export function ageInMonths(birthday: string | Date): number {
  const birth = parseDateSafe(birthday);
  const now = new Date();
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth()) +
    (now.getDate() >= birth.getDate() ? 0 : -1);
  const dayFraction = (now.getDate() - birth.getDate()) / 30;
  return Math.max(0, months + dayFraction);
}

/** Pretty short date e.g. "Mar 14, 2026" */
export function formatDate(d: string | Date): string {
  const date = parseDateSafe(d);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Time only e.g. "2:30 PM" */
export function formatTime(d: string | Date): string {
  const date = parseDateSafe(d);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Relative date e.g. "Today", "Yesterday", "3 days ago" */
export function relativeDate(d: string | Date): string {
  const date = parseDateSafe(d);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} wk ago`;
  return formatDate(date);
}

/** Group an array of items by date (YYYY-MM-DD) preserving order. */
export function groupByDate<T extends { occurred_at: string }>(
  items: T[]
): { date: string; label: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const it of items) {
    let key = "1970-01-01";
    try {
      const d = parseDateSafe(it.occurred_at);
      if (!isNaN(d.getTime())) {
        key = d.toISOString().slice(0, 10);
      }
    } catch {
      // fallback to epoch if invalid
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }
  return Array.from(map.entries()).map(([date, items]) => ({
    date,
    label: relativeDate(date),
    items,
  }));
}