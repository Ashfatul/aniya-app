import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format age from a birthday. Returns e.g. "1 yr 3 mo" or "2 wk" or "5 days". */
export function formatAge(birthday: string | Date): string {
  const birth = new Date(birthday);
  const now = new Date();
  const ms = now.getTime() - birth.getTime();

  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days < 1) {
    if (hours < 1) return `${minutes} min`;
    return `${hours} hr`;
  }
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;

  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} wk`;

  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth()) +
    (now.getDate() >= birth.getDate() ? 0 : -1);

  if (months < 24) return `${months} mo`;

  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return remMonths === 0 ? `${years} yr` : `${years} yr ${remMonths} mo`;
}

/** Compute exact age in months (decimal) — useful for growth charts. */
export function ageInMonths(birthday: string | Date): number {
  const birth = new Date(birthday);
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
  const date = new Date(d);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Time only e.g. "2:30 PM" */
export function formatTime(d: string | Date): string {
  const date = new Date(d);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Relative date e.g. "Today", "Yesterday", "3 days ago" */
export function relativeDate(d: string | Date): string {
  const date = new Date(d);
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
      const d = new Date(it.occurred_at);
      if (!isNaN(d.getTime())) {
        key = d.toISOString().slice(0, 10);
      }
    } catch (e) {
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