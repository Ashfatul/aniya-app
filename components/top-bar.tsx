"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  ChevronDown,
  Plus,
  Home,
  User2,
  Users,
  Settings,
} from "lucide-react";
import type { Family, Profile, UserRole } from "@/lib/types";
import { RealtimeAge } from "@/components/realtime-age";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/timeline", label: "Timeline", icon: Home },
  { href: "/profile", label: "Profile", icon: User2 },
  { href: "/members", label: "Family", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TopBar({
  family,
  role,
  profile,
}: {
  family: Family;
  role: UserRole;
  profile: Profile | null;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-[var(--border)] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Baby Profile & Live Age */}
        <Link
          href="/timeline"
          className="flex items-center gap-2.5 sm:gap-3 hover:opacity-95 transition-opacity min-w-0 flex-1 sm:flex-initial"
        >
          {family.baby_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={family.baby_photo_url}
              alt={family.baby_name}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-[var(--primary)] shadow-sm flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--accent-3)] flex items-center justify-center font-script text-lg sm:text-xl font-bold text-[var(--foreground)] shadow-sm flex-shrink-0">
              {family.baby_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="leading-tight min-w-0 truncate">
            <div className="font-script text-xl sm:text-2xl font-bold text-[var(--primary-dark)] truncate">
              {family.baby_name}
            </div>
            {family.baby_birthday && (
              <div className="text-[11px] text-[var(--foreground)]/65 -mt-0.5 font-medium truncate">
                <RealtimeAge
                  birthday={family.baby_birthday}
                  variant="badge"
                />
              </div>
            )}
          </div>
        </Link>

        {/* Center: Desktop Navigation Bar */}
        <nav className="hidden md:flex items-center gap-1.5 bg-[var(--muted)]/70 p-1.5 rounded-2xl border border-[var(--border)]/60">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-white text-[var(--primary-dark)] font-semibold shadow-xs"
                    : "text-[var(--foreground)]/65 hover:text-[var(--foreground)] hover:bg-white/50"
                )}
              >
                <Icon className={cn("w-4 h-4", active && "text-[var(--primary-dark)]")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Add Moment & User Dropdown */}
        <div className="flex items-center gap-3">
          {/* Quick Add CTA on Desktop */}
          <Link
            href="/add"
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E25C80] to-[#F59074] text-white text-sm font-semibold shadow-sm shadow-rose-500/20 hover:shadow-rose-500/35 hover:scale-102 active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Moment</span>
          </Link>

          {/* User Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 text-sm text-[var(--foreground)]/80 hover:text-[var(--foreground)] px-2.5 py-1.5 rounded-xl hover:bg-[var(--muted)] transition-colors border border-transparent hover:border-[var(--border)]"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--accent)]/40 flex items-center justify-center text-xs font-bold text-[var(--foreground)]">
                {(profile?.display_name || profile?.email || "U").charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline font-medium text-xs">
                {profile?.display_name || profile?.email?.split("@")[0]}
              </span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-2)] text-[var(--foreground)]/80 font-semibold">
                {role}
              </span>
              <ChevronDown className="w-4 h-4 opacity-60" />
            </button>

            {open && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-[var(--border)] z-50 overflow-hidden fade-up">
                  <div className="p-3.5 border-b border-[var(--border)] text-xs text-[var(--foreground)]/60 bg-[var(--muted)]/40">
                    Signed in as
                    <div className="text-sm text-[var(--foreground)] font-semibold truncate mt-0.5">
                      {profile?.email}
                    </div>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}