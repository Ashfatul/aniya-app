import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canEdit } from "@/lib/supabase/session";
import type { Family, Profile, UserRole } from "@/lib/types";
import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/top-bar";

/**
 * Auth & family-context gate for all pages inside (app).
 * - Redirects unauthenticated users to /login.
 * - Redirects authenticated users without a family to /signup.
 * - Exposes { user, profile, family, role } via React `useContext` if needed; here
 *   we just render the shell.
 */
export async function AppShell({
  children,
  requireEdit = false,
}: {
  children: React.ReactNode;
  requireEdit?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const { data: membership } = await supabase
    .from("family_members")
    .select("role, family:families(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ role: UserRole; family: Family }>();

  if (!membership) redirect("/signup");
  if (requireEdit && !canEdit(membership.role)) {
    redirect("/timeline");
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        family={membership.family}
        role={membership.role}
        profile={profile}
      />
      <main className="flex-1 pb-24">
        <div className="max-w-3xl mx-auto px-4 py-6">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}