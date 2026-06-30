"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className="flex items-center gap-2 text-sm text-[var(--foreground)]/70 hover:text-[var(--foreground)]"
    >
      <LogOut className="w-4 h-4" />
      Sign out
    </button>
  );
}