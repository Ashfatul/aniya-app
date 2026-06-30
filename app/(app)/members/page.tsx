import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Family, FamilyMember, UserRole } from "@/lib/types";
import { MembersView } from "./members-view";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get family via membership
  const { data: membership } = await supabase
    .from("family_members")
    .select("family:families(*)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !membership.family) redirect("/signup");
  const family = membership.family as unknown as Family;

  const { data: members } = await supabase
    .from("family_members")
    .select("*, profile:profiles(*)")
    .eq("family_id", family.id)
    .order("created_at", { ascending: true })
    .returns<(FamilyMember & { profile: any })[]>();

  // Find my role in this family
  const me = (members ?? []).find((m) => m.user_id === user.id);
  const myRole = me?.role as UserRole | undefined;

  return (
    <MembersView
      family={family}
      members={members ?? []}
      currentUserId={user.id}
      myRole={myRole ?? "viewer"}
    />
  );
}
