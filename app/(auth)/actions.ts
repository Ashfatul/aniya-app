// Server actions for signup/invite-acceptance flows.
// Used by client forms — they bypass any API route indirection.

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

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

  // Check for pending invitation first
  const { data: invite } = await supabase
    .from("family_members")
    .select("id")
    .eq("invited_email", email.toLowerCase())
    .is("user_id", null)
    .maybeSingle();

  if (invite) {
    const { error: claimError } = await supabase
      .from("family_members")
      .update({
        user_id: userId,
        joined_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    if (claimError) {
      return {
        ok: false,
        error: `Could not accept invitation: ${claimError.message}`,
      };
    }

    redirect("/timeline");
  }

  const familyId = crypto.randomUUID();
  // Create family + owner membership. RLS requires auth.uid() = created_by.
  const { error: familyError } = await supabase
    .from("families")
    .insert({
      id: familyId,
      name: familyName,
      baby_name: babyName,
      created_by: userId,
    });

  if (familyError) {
    return {
      ok: false,
      error: `Could not create family: ${familyError.message}`,
    };
  }

  const { error: memberError } = await supabase.from("family_members").insert({
    family_id: familyId,
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

/**
 * Recovery action for users who already confirmed their email but never
 * got a family created (e.g. the email-link callback hit a transient error,
 * or they signed up with verification off and the family insert failed).
 *
 * Called from the /signup page when the user lands there but already has
 * a valid session. Creates the family + owner membership if missing, then
 * redirects to /timeline.
 */
export async function completeSetupAction(): Promise<SignupState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please sign in first." };
  }

  const { data: existingMembership } = await supabase
    .from("family_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMembership) {
    // Already set up — just send them in.
    redirect("/timeline");
  }

  // Check for pending invitation
  const { data: invite } = await supabase
    .from("family_members")
    .select("id")
    .eq("invited_email", user.email?.toLowerCase() ?? "")
    .is("user_id", null)
    .maybeSingle();

  if (invite) {
    const { error: claimError } = await supabase
      .from("family_members")
      .update({
        user_id: user.id,
        joined_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    if (claimError) {
      return {
        ok: false,
        error: `Could not accept invitation: ${claimError.message}`,
      };
    }

    redirect("/timeline");
  }

  const familyId = crypto.randomUUID();
  const { error: familyError } = await supabase
    .from("families")
    .insert({
      id: familyId,
      name: "Our Family",
      baby_name: "Aniya",
      created_by: user.id,
    });

  if (familyError) {
    return {
      ok: false,
      error: `Could not create family: ${familyError?.message ?? "unknown error"}`,
    };
  }

  const { error: memberError } = await supabase.from("family_members").insert({
    family_id: familyId,
    user_id: user.id,
    role: "owner",
    joined_at: new Date().toISOString(),
  });

  if (memberError) {
    return {
      ok: false,
      error: `Could not set up your membership: ${memberError.message}`,
    };
  }

  redirect("/timeline");
}
