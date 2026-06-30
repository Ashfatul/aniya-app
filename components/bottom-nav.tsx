"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User2, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/timeline", label: "Timeline", icon: Home },
  { href: "/profile", label: "Profile", icon: User2 },
  { href: "/members", label: "Family", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur border-t border-[var(--border)] z-30">
      <div className="max-w-3xl mx-auto grid grid-cols-4">
        {items.map((it) => {
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex flex-col items-center justify-center py-2.5 text-xs gap-0.5 transition-colors",
                active
                  ? "text-[var(--primary-dark)]"
                  : "text-[var(--foreground)]/50 hover:text-[var(--foreground)]/80"
              )}
            >
              <Icon
                className={cn("w-5 h-5", active && "fill-[var(--primary)]/20")}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="font-medium">{it.label}</span>
            </Link>
          );
        })}
      </div>
      {/* iOS safe-area */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}