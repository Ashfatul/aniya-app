// Server actions for the (app) routes — called from forms / client components.

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok: true } | { ok: false; error: string } | null;

// ----- Family / profile updates -----------------------------------------

export async function updateFamilyAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const name = (formData.get("baby_name") as string)?.trim();
  const bio = (formData.get("baby_bio") as string)?.trim();
  const birthday = (formData.get("baby_birthday") as string) || null;
  const photoUrl = (formData.get("baby_photo_url") as string) || null;

  if (!name) return { ok: false, error: "Name is required." };

  // Get active owner membership
  const { data: membership } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .maybeSingle();

  if (!membership) return { ok: false, error: "Not authorized to update family." };

  const { error } = await supabase
    .from("families")
    .update({
      baby_name: name,
      baby_bio: bio || null,
      baby_birthday: birthday,
      baby_photo_url: photoUrl,
    })
    .eq("id", membership.family_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const displayName = (formData.get("display_name") as string)?.trim();

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName || null })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

// ----- Timeline entries --------------------------------------------------

export async function deleteEntryAction(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS will reject if not creator / owner
  await supabase.from("timeline_entries").delete().eq("id", id);
  revalidatePath("/timeline");
}

// ----- Membership invitations -------------------------------------------

export async function inviteMemberAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const role = formData.get("role") as string;

  if (!email) return { ok: false, error: "Email is required." };
  if (!["editor", "viewer"].includes(role))
    return { ok: false, error: "Invalid role." };

  // Find active family membership (must be owner to invite)
  const { data: membership } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .maybeSingle();
  if (!membership) return { ok: false, error: "Not authorized to invite members." };

  const { error } = await supabase.from("family_members").insert({
    family_id: membership.family_id,
    user_id: null,
    role,
    invited_email: email,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That email has already been invited." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/members");
  return { ok: true };
}

export async function updateMemberRoleAction(
  memberId: string,
  role: "editor" | "viewer" | "owner"
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("family_members").update({ role }).eq("id", memberId);
  revalidatePath("/members");
}

export async function removeMemberAction(memberId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("family_members").delete().eq("id", memberId);
  revalidatePath("/members");
}