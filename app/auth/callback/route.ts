// Email-confirmation callback for Supabase auth.
//
// When email verification is ON, Supabase sends the user a link of the form:
//   https://<your-site>/auth/v1/verify?token=...&type=signup&redirect_to=<origin>/auth/callback?...
// That link first hits Supabase's verify endpoint, which then 302s the user
// to the `redirect_to` URL with a one-time `code` query param. We exchange
// that code for a session, finish any pending signup (create the user's
// family + owner membership if they don't have one yet), and redirect to
// `/timeline`.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/timeline";
  const errorParam = searchParams.get("error_description");

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorParam)}`, origin)
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // If this is a freshly confirmed signup, finish the setup: create
        // the family and the owner membership. If they're already a member
        // (e.g. an invited user accepting an invite), skip it.
        const { data: membership } = await supabase
          .from("family_members")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!membership) {
          const { data: family } = await supabase
            .from("families")
            .insert({
              name: "Our Family",
              baby_name: "Aniya",
              created_by: user.id,
            })
            .select()
            .single();

          if (family) {
            await supabase.from("family_members").insert({
              family_id: family.id,
              user_id: user.id,
              role: "owner",
              joined_at: new Date().toISOString(),
            });
          }
        }
      }

      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // Missing or invalid code — send to login with a generic error.
  return NextResponse.redirect(new URL("/login?error=verify", origin));
}
