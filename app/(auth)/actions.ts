// Server actions for signup/invite-acceptance flows.
// Used by client forms — they bypass any API route indirection.

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SignupState =
  | { ok: true }
  | { ok: false; error: string; needsConfirmation?: boolean; email?: string }
  | null;

/**
 * Resolves the request's origin so the Supabase email-confirmation link
 * points to wherever the user actually signed up from. Without this,
 * the link always points to the Site URL configured in the Supabase
 * dashboard (often localhost), and the user can't complete verification
 * on the live site.
 */
async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const xfHost = h.get("x-forwarded-host");
  const xfProto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host");
  if (xfHost) return `${xfProto}://${xfHost}`;
  if (host) {
    // Local dev is http; everything else (vercel/preview) goes via the
    // x-forwarded-* headers above, but be defensive.
    const proto = host.startsWith("localhost") ? "http" : "https";
    return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}

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
  const origin = await getRequestOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/timeline`,
    },
  });
  if (error) {
    // "already registered" — point them at the login page.
    if (/already registered|already been registered/i.test(error.message)) {
      return {
        ok: false,
        error: "That email is already registered. Try signing in instead.",
      };
    }
    return { ok: false, error: error.message };
  }

  const userId = data.user?.id;
  if (!userId) {
    return {
      ok: false,
      error: "Account created but sign-in failed. Try logging in.",
    };
  }

  // If Supabase email confirmation is ON, no session is issued yet.
  // We can't create family/membership here because RLS would block them
  // (auth.uid() isn't set until the user clicks the confirmation email).
  // The /auth/callback route will finish the setup on click-through.
  if (!data.session) {
    return {
      ok: false,
      needsConfirmation: true,
      email,
      error:
        "Check your inbox to confirm your email. We'll set up your memory book as soon as you click the link.",
    };
  }

  // Create family + owner membership. RLS requires auth.uid() = created_by.
  const { data: family, error: familyError } = await supabase
    .from("families")
    .insert({
      name: familyName,
      baby_name: babyName,
      created_by: userId,
    })
    .select()
    .single();

  if (familyError) {
    return {
      ok: false,
      error: `Could not create family: ${familyError.message}`,
    };
  }
  if (!family) {
    return { ok: false, error: "Failed to create family. Please try again." };
  }

  const { error: memberError } = await supabase.from("family_members").insert({
    family_id: family.id,
    user_id: userId,
    role: "owner",
    joined_at: new Date().toISOString(),
  });

  if (memberError) {
    return {
      ok: false,
      error: `Failed to set up your membership: ${memberError.message}`,
    };
  }

  redirect("/timeline");
}
