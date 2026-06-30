// Server actions for signup/invite-acceptance flows.
// Used by client forms — they bypass any API route indirection.

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SignupState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

export async function signupAction(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const babyName = (formData.get("baby_name") as string)?.trim() || "Baby";
  const familyName =
    (formData.get("family_name") as string)?.trim() || "Our Family";

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };

  const userId = data.user?.id;
  if (!userId) {
    return { ok: false, error: "Account created but sign-in failed. Try logging in." };
  }

  // Create family + owner membership.
  const { data: family, error: familyError } = await supabase
    .from("families")
    .insert({
      name: familyName,
      baby_name: babyName,
      created_by: userId,
    })
    .select()
    .single();

  if (familyError || !family) {
    return {
      ok: false,
      error: "Failed to create family. Please try again.",
    };
  }

  const { error: memberError } = await supabase.from("family_members").insert({
    family_id: family.id,
    user_id: userId,
    role: "owner",
    joined_at: new Date().toISOString(),
  });

  if (memberError) {
    return { ok: false, error: "Failed to set up your membership." };
  }

  // Auto-login: Supabase sends a confirmation email if enabled. On local dev,
  // confirm-email is usually disabled and the session is set immediately.
  redirect("/timeline");
}