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

  const { data: membersRaw } = await supabase
    .from("family_members")
    .select("*")
    .eq("family_id", family.id)
    .order("created_at", { ascending: true })
    .returns<FamilyMember[]>();

  const userIds = membersRaw?.map((m) => m.user_id).filter(Boolean) as string[];
  let profiles: any[] = [];
  if (userIds && userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .in("id", userIds);
    profiles = profilesData || [];
  }

  const members = membersRaw?.map((m) => ({
    ...m,
    profile: profiles.find((p) => p.id === m.user_id) || null,
  })) as (FamilyMember & { profile: any })[];

  // Open invite tokens, keyed by the email they were sent to. Each pending
  // (not-yet-joined) family_members row has at most one matching token.
  const { data: tokens } = await supabase
    .from("invite_tokens")
    .select("token, invited_email")
    .eq("family_id", family.id)
    .is("consumed_at", null)
    .returns<{ token: string; invited_email: string }[]>();

  const tokenByEmail = new Map<string, string>();
  for (const t of tokens ?? []) {
    tokenByEmail.set(t.invited_email, t.token);
  }

  // Find my role in this family
  const me = (members ?? []).find((m) => m.user_id === user.id);
  const myRole = me?.role as UserRole | undefined;

  return (
    <MembersView
      family={family}
      members={members ?? []}
      tokenByEmail={Object.fromEntries(tokenByEmail)}
      currentUserId={user.id}
      myRole={myRole ?? "viewer"}
    />
  );
}
