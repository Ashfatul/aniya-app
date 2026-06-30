"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown } from "lucide-react";
import type { Family, Profile, UserRole } from "@/lib/types";
import { formatAge } from "@/lib/utils";

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

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const age =
    family.baby_birthday && !isNaN(new Date(family.baby_birthday).getTime())
      ? formatAge(family.baby_birthday)
      : null;

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-[var(--border)]">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/timeline" className="flex items-center gap-2">
          {family.baby_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={family.baby_photo_url}
              alt={family.baby_name}
              className="w-9 h-9 rounded-full object-cover border-2 border-[var(--primary)]"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[var(--accent-3)] flex items-center justify-center font-script text-lg text-[var(--foreground)]">
              {family.baby_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="leading-tight">
            <div className="font-script text-xl text-[var(--primary-dark)]">
              {family.baby_name}
            </div>
            {age && (
              <div className="text-[11px] text-[var(--foreground)]/50 -mt-0.5">
                {age} old
              </div>
            )}
          </div>
        </Link>

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 text-sm text-[var(--foreground)]/70 hover:text-[var(--foreground)] px-2 py-1 rounded-lg hover:bg-[var(--muted)]"
          >
            <span className="hidden sm:inline">
              {profile?.display_name || profile?.email?.split("@")[0]}
            </span>
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[var(--accent-2)] text-[var(--foreground)]/70">
              {role}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {open && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[var(--border)] z-50 overflow-hidden">
                <div className="p-3 border-b border-[var(--border)] text-xs text-[var(--foreground)]/60">
                  Signed in as
                  <div className="text-sm text-[var(--foreground)] font-medium truncate">
                    {profile?.email}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}