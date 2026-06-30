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

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

type OtpType = "signup" | "magiclink" | "recovery" | "email_change" | "invite";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type") as OtpType | null;
  const next = searchParams.get("next") ?? "/timeline";
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
        // Check for pending invitation
        const { data: invite } = await supabase
          .from("family_members")
          .select("id")
          .eq("invited_email", user.email?.toLowerCase() ?? "")
          .is("user_id", null)
          .maybeSingle();

        if (invite) {
          // Join the existing family
          await supabase
            .from("family_members")
            .update({
              user_id: user.id,
              joined_at: new Date().toISOString(),
            })
            .eq("id", invite.id);
        } else {
          // Create a new family
          const familyId = crypto.randomUUID();
          const { error: familyError } = await supabase
            .from("families")
            .insert({
              id: familyId,
              name: "Our Family",
              baby_name: "Aniya",
              created_by: user.id,
            });

          if (!familyError) {
            await supabase.from("family_members").insert({
              family_id: familyId,
              user_id: user.id,
              role: "owner",
              joined_at: new Date().toISOString(),
            });
          }
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
