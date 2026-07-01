// Email-confirmation callback for Supabase auth.
//
// Supabase's PKCE email-verification link is:
//   https://<your-site>/auth/v1/verify?token=<token_hash>&type=signup&redirect_to=<origin>/auth/callback?...
// After Supabase's verify endpoint validates the token, it 302s the user
// to the `redirect_to` URL. With Supabase's PKCE flow, the URL contains
// `token_hash` + `type` query params (not `code`). We call verifyOtp to
// exchange it for a session.
//
// We also accept `?code=...` for the older OAuth-style flow, just in case
// the project is configured for it.
//
// If `?invite=<token>` is present (forwarded by the signup action when
// the user is joining via an invite link), we claim the invite after
// establishing the session.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type OtpType = "signup" | "magiclink" | "recovery" | "email_change" | "invite";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type") as OtpType | null;
  const next = searchParams.get("next") ?? "/timeline";
  const inviteToken = searchParams.get("invite") ?? undefined;
  const errorDescription = searchParams.get("error_description");

  // Supabase sometimes forwards errors here.
  if (errorDescription) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(errorDescription)}`,
        request.nextUrl.origin
      )
    );
  }

  const supabase = await createClient();
  let exchangeError: { message: string } | null = null;

  if (code) {
    // OAuth / older PKCE flow
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    exchangeError = error;
  } else if (tokenHash && typeParam) {
    // PKCE email-verification flow (the default since Supabase v2).
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: typeParam,
    });
    exchangeError = error;
  }

  if (!exchangeError) {
    // Session is set. Finish the pending family/membership setup if needed.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: membership } = await supabase
        .from("family_members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        // Prefer the explicit invite token from the URL — that handles the
        // case where the user clicked the link in the owner's email. Fall
        // back to creating a new family if no invite was forwarded.
        if (inviteToken) {
          const { error: claimError } = await supabase.rpc(
            "claim_invite_by_token",
            {
              p_token: inviteToken,
              p_user_id: user.id,
            }
          );

          // If the claim fails (expired/already-used/etc), still try to set
          // them up in their own family so they're not stuck. The signup
          // page would have shown a similar error if the user got that far.
          if (claimError) {
            await ensureFamilyForUser(supabase, user.id);
          }
        } else {
          await ensureFamilyForUser(supabase, user.id);
        }
      }
    }

    return NextResponse.redirect(new URL(next, origin));
  }

  // Bad / expired link — bounce to login with the real reason in the URL
  // so we can see it in the address bar.
  const reason = encodeURIComponent(exchangeError.message || "verify");
  return NextResponse.redirect(new URL(`/login?error=${reason}`, origin));
}

async function ensureFamilyForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  // Idempotent — only create if the user still has no membership.
  const { data: existing } = await supabase
    .from("family_members")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return;

  await supabase.from("families").insert({
    name: "Our Family",
    baby_name: "Aniya",
    created_by: userId,
  });
  const { data: family } = await supabase
    .from("families")
    .select("id")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!family) return;
  await supabase.from("family_members").insert({
    family_id: family.id,
    user_id: userId,
    role: "owner",
    joined_at: new Date().toISOString(),
  });
}
