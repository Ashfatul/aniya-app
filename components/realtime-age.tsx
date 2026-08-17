"use client";

import { useEffect, useState, useMemo } from "react";
import { calculateAgeBreakdown, formatDate, type AgeBreakdown } from "@/lib/utils";
import { Clock, Calendar, Sparkles, Heart, Activity } from "lucide-react";

interface RealtimeAgeProps {
  birthday: string | null | undefined;
  babyName?: string;
  totalMemories?: number;
  variant?: "hero" | "profile-hero" | "badge" | "card" | "inline";
  className?: string;
}

export function RealtimeAge({
  birthday,
  babyName,
  totalMemories,
  variant = "hero",
  className = "",
}: RealtimeAgeProps) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const age = useMemo(() => {
    return calculateAgeBreakdown(birthday, now);
  }, [birthday, now]);

  if (!birthday) return null;

  if (age.isFuture) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium opacity-90 ${className}`}>
        <Calendar className="w-3.5 h-3.5" />
        Due soon
      </span>
    );
  }

  // 1. Badge variant (for TopBar)
  if (variant === "badge") {
    return (
      <span className={`inline-flex items-center gap-1 font-medium truncate ${className}`}>
        {formatAgeSummary(age)} old
      </span>
    );
  }

  // 2. Inline variant
  if (variant === "inline") {
    return (
      <span className={`inline-flex items-center gap-1 font-medium truncate ${className}`}>
        {formatAgeSummary(age)}
      </span>
    );
  }

  // 3. Profile-Hero variant (in Profile header)
  if (variant === "profile-hero") {
    return (
      <div className={`space-y-3 ${className}`}>
        <p className="text-white/95 text-xs sm:text-sm flex items-center justify-center gap-1.5 flex-wrap font-medium">
          <span>Born {formatDate(birthday)}</span>
          <span className="opacity-60">·</span>
          <span className="font-bold text-white underline decoration-white/40 underline-offset-4">
            {formatAgeSummary(age)}
          </span>
        </p>

        {/* Live ticking micro-strip */}
        <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] sm:text-xs font-semibold text-white border border-white/30 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
          <span className="tracking-wide">
            {padZero(age.hours)}h {padZero(age.minutes)}m {padZero(age.seconds)}s live
          </span>
        </div>
      </div>
    );
  }

  // 4. Hero variant (Modern, high-contrast, elegant glassmorphism banner for Timeline)
  if (variant === "hero") {
    const hasYears = age.years > 0;

    return (
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E25C80] via-[#E86B88] to-[#F59074] p-4 sm:p-7 text-white shadow-xl shadow-rose-900/10 border border-white/25 w-full ${className}`}>
        {/* Soft atmospheric ambient light orbs */}
        <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 bg-white/20 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 w-48 h-48 bg-amber-300/20 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-3.5 sm:space-y-5">
          {/* Top Bar: Pill Badges */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase shadow-xs">
              <span>🌸</span>
              <span>Today&apos;s Story</span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-semibold shadow-xs">
                <Heart className="w-3.5 h-3.5 fill-white text-white" />
                <span>{totalMemories ?? 0}</span>
                <span className="opacity-80 font-normal">memories</span>
              </div>
              <div className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-semibold shadow-xs">
                <span>🗓️</span>
                <span>Day {age.totalDays.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Greeting & Headline */}
          <div>
            <h1 className="font-script text-3xl sm:text-5xl font-bold tracking-wide text-white drop-shadow-sm leading-tight truncate">
              Hello, {babyName || "Little One"}
            </h1>
            <p className="text-white/90 text-xs sm:text-base font-medium mt-1 flex items-center gap-2 flex-wrap">
              <span>✨ {formatAgeSummary(age)} of wonder</span>
              <span className="opacity-60 hidden sm:inline">·</span>
              <span className="text-xs opacity-85 hidden sm:inline">Day {age.totalDays.toLocaleString()} on Earth</span>
            </p>
          </div>

          {/* Realtime Live Counter Card */}
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-2.5 sm:p-4 border border-white/35 shadow-lg shadow-black/5 space-y-2.5 sm:space-y-3 w-full overflow-hidden">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span className="font-bold tracking-wider uppercase text-[10px] sm:text-[11px] text-white">
                  Realtime Age
                </span>
              </div>

              {age.nextMilestoneDays != null && (
                <div className="text-[10px] sm:text-[11px] text-white/90 font-medium bg-white/15 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full border border-white/20 truncate max-w-[170px] sm:max-w-none">
                  {age.nextMilestoneDays === 0
                    ? "Milestone today! 🎉"
                    : `${age.nextMilestoneLabel} in ${age.nextMilestoneDays}d`}
                </div>
              )}
            </div>

            {/* Dynamic Grid: perfectly balances columns with min-w-0 on each tile to prevent overflow */}
            <div
              className={`grid gap-1 sm:gap-2.5 w-full ${
                hasYears ? "grid-cols-6" : "grid-cols-5"
              }`}
            >
              {hasYears && (
                <HeroTile
                  value={age.years}
                  label={age.years === 1 ? "Yr" : "Yrs"}
                />
              )}
              <HeroTile
                value={age.months}
                label={age.months === 1 ? "Mo" : "Mos"}
                isPrimary
              />
              <HeroTile
                value={age.days}
                label={age.days === 1 ? "Day" : "Days"}
                isPrimary
              />
              <HeroTile value={padZero(age.hours)} label="Hrs" />
              <HeroTile value={padZero(age.minutes)} label="Min" />
              <HeroTile
                value={padZero(age.seconds)}
                label="Sec"
                isSeconds
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 5. Dedicated Card variant (for Profile page)
  return (
    <section className={`bg-white rounded-3xl p-4 sm:p-6 border border-[var(--border)] shadow-sm space-y-4 w-full overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#E25C80] to-[#F59074] text-white flex items-center justify-center shadow-sm flex-shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-[var(--foreground)] text-sm sm:text-base leading-tight truncate">
              Live Age & Milestones
            </h2>
            <p className="text-[11px] sm:text-xs text-[var(--foreground)]/60 mt-0.5 truncate">
              Ticking live since birth
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-medium flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Ticking</span>
        </div>
      </div>

      {/* Main live unit grid with min-w-0 */}
      <div
        className={`grid gap-1.5 sm:gap-2 text-center w-full ${
          age.years > 0 ? "grid-cols-6" : "grid-cols-5"
        }`}
      >
        {age.years > 0 && (
          <ProfileTile
            value={age.years}
            label={age.years === 1 ? "Yr" : "Yrs"}
            color="bg-rose-50 border-rose-100 text-rose-900"
          />
        )}
        <ProfileTile
          value={age.months}
          label={age.months === 1 ? "Mo" : "Mos"}
          color="bg-pink-50 border-pink-200 text-pink-900"
          highlight
        />
        <ProfileTile
          value={age.days}
          label={age.days === 1 ? "Day" : "Days"}
          color="bg-amber-50 border-amber-200 text-amber-900"
          highlight
        />
        <ProfileTile
          value={padZero(age.hours)}
          label="Hrs"
          color="bg-[var(--muted)] border-[var(--border)] text-[var(--foreground)]"
        />
        <ProfileTile
          value={padZero(age.minutes)}
          label="Min"
          color="bg-[var(--muted)] border-[var(--border)] text-[var(--foreground)]"
        />
        <ProfileTile
          value={padZero(age.seconds)}
          label="Sec"
          color="bg-emerald-50 border-emerald-200 text-emerald-900 font-mono"
          isLive
        />
      </div>

      {/* Breakdown stat pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 pt-1">
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--muted)]/70 border border-[var(--border)] text-left min-w-0">
          <div className="text-[10px] sm:text-[11px] font-medium text-[var(--foreground)]/60 flex items-center gap-1.5 truncate">
            <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#E25C80] fill-[#E25C80] flex-shrink-0" />
            Total Days
          </div>
          <div className="font-bold text-base sm:text-lg mt-0.5 text-[var(--foreground)] truncate">
            {age.totalDays.toLocaleString()} d
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--muted)]/70 border border-[var(--border)] text-left min-w-0">
          <div className="text-[10px] sm:text-[11px] font-medium text-[var(--foreground)]/60 flex items-center gap-1.5 truncate">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 flex-shrink-0" />
            Total Weeks
          </div>
          <div className="font-bold text-base sm:text-lg mt-0.5 text-[var(--foreground)] truncate">
            {age.totalWeeks.toLocaleString()} w
          </div>
        </div>

        {age.nextMilestoneDays != null && (
          <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--muted)]/70 border border-[var(--border)] text-left col-span-2 sm:col-span-1 min-w-0">
            <div className="text-[10px] sm:text-[11px] font-medium text-[var(--foreground)]/60 flex items-center gap-1.5 truncate">
              <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500 flex-shrink-0" />
              Next Milestone
            </div>
            <div className="font-bold text-xs sm:text-sm mt-0.5 text-[var(--foreground)] truncate">
              {age.nextMilestoneDays === 0
                ? "Today! 🎉"
                : `${age.nextMilestoneDays}d (${age.nextMilestoneLabel})`}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function HeroTile({
  value,
  label,
  isPrimary,
  isSeconds,
}: {
  value: number | string;
  label: string;
  isPrimary?: boolean;
  isSeconds?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl py-1.5 px-0.5 sm:py-2.5 sm:px-2 flex flex-col items-center justify-center transition-all ${
        isPrimary
          ? "bg-white/35 backdrop-blur-md border border-white/60 text-white shadow-sm font-black"
          : isSeconds
          ? "bg-emerald-400/25 backdrop-blur-md border border-emerald-200/40 text-white font-mono"
          : "bg-white/20 backdrop-blur-sm border border-white/30 text-white"
      }`}
    >
      <div className="text-base sm:text-2xl font-black leading-none tracking-tight">
        {value}
      </div>
      <div className="text-[9px] sm:text-[11px] uppercase tracking-wider font-bold opacity-90 mt-0.5 sm:mt-1 truncate max-w-full">
        {label}
      </div>
    </div>
  );
}

function ProfileTile({
  value,
  label,
  color,
  highlight,
  isLive,
}: {
  value: number | string;
  label: string;
  color: string;
  highlight?: boolean;
  isLive?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl sm:rounded-2xl p-1.5 sm:p-3 flex flex-col items-center justify-center border transition-colors ${color}`}
    >
      <div className="text-base sm:text-xl font-bold leading-none tracking-tight">
        {value}
      </div>
      <div className="text-[9px] sm:text-[10px] uppercase tracking-wider opacity-75 mt-0.5 sm:mt-1 font-semibold truncate max-w-full">
        {label}
      </div>
    </div>
  );
}

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

/** Formats age with explicit separation between months and days */
function formatAgeSummary(age: AgeBreakdown): string {
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
  if (days > 0 || (years === 0 && months === 0)) {
    parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  }

  return parts.join(" ");
}
