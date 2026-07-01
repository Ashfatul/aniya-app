// Server actions for the (app) routes — called from forms / client components.

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionState =
  | { ok: true; token?: string }
  | { ok: false; error: string }
  | null;

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

  // Block inviting the owner themselves, and block inviting an email that
  // is already a member of this family.
  const { data: existingMember } = await supabase
    .from("family_members")
    .select("id")
    .eq("family_id", membership.family_id)
    .or(`user_id.eq.${user.id},invited_email.eq.${email}`)
    .limit(1)
    .maybeSingle();
  if (existingMember) {
    return { ok: false, error: "That email is already part of this family." };
  }

  // create_invite_token handles the auth check (owner only) and returns the
  // signed token string to put in the share link.
  const { data: token, error } = await supabase.rpc("create_invite_token", {
    p_family_id: membership.family_id,
    p_invited_email: email,
    p_role: role,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That email has already been invited." };
    }
    return { ok: false, error: error.message };
  }
  if (!token) {
    return { ok: false, error: "Could not create invite link." };
  }

  revalidatePath("/members");
  return { ok: true, token: token as string };
}

export async function updateMemberRoleAction(
  memberId: string,
  role: "editor" | "viewer" | "owner"
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("family_members").update({ role }).eq("id", memberId);
  revalidatePath("/members");
}

export async function removeMemberAction(
  memberId: string,
  opts: { pendingEmail?: string } = {}
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Look up the family so we can scope the token cleanup correctly.
  const { data: membership } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .maybeSingle();
  if (!membership) return;

  await supabase.from("family_members").delete().eq("id", memberId);

  // If this was a pending invite, also clear any matching open tokens.
  if (opts.pendingEmail) {
    await supabase
      .from("invite_tokens")
      .delete()
      .eq("family_id", membership.family_id)
      .eq("invited_email", opts.pendingEmail)
      .is("consumed_at", null);
  }
  revalidatePath("/members");
}