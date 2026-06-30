import { createClient } from "./client";
import type { Family, FamilyMember, Profile, UserRole } from "@/lib/types";

/**
 * Returns the authenticated user, family, and their role — or null if anonymous.
 * Single source of truth used by every authenticated page.
 */
export async function getSessionContext() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null, family: null, role: null };

  // Profile (may not exist yet on first signup)
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  // Family membership (1 user belongs to 1 family in this MVP)
  const { data: membership } = await supabase
    .from("family_members")
    .select("*, family:families(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<FamilyMember & { family: Family }>();

  if (!membership) return { user, profile, family: null, role: null };

  return {
    user,
    profile,
    family: membership.family,
    role: membership.role as UserRole,
  };
}

/** Convenience: does this role have write permission? */
export function canEdit(role: UserRole | null) {
  return role === "owner" || role === "editor";
}

/** Convenience: is this the owner? */
export function isOwner(role: UserRole | null) {
  return role === "owner";
}