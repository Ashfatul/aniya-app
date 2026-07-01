import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";
import { CompleteSetupForm } from "./complete-setup-form";

type InviteInfo = {
  token: string;
  familyName: string;
  babyName: string;
  invitedEmail: string;
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const params = await searchParams;
  const inviteToken = params.invite;
  const supabase = await createClient();

  // Resolve the invite token (if any). lookup_invite_by_token is a
  // SECURITY DEFINER RPC so anonymous users can resolve a valid token
  // without RLS getting in the way. A bad/expired token returns no rows.
  let invite: InviteInfo | null = null;
  if (inviteToken) {
    const { data } = await supabase.rpc("lookup_invite_by_token", {
      p_token: inviteToken,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      invite = {
        token: inviteToken,
        familyName: row.family_name as string,
        babyName: (row.baby_name as string) ?? "Baby",
        invitedEmail: row.invited_email as string,
      };
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // User is signed in. Do they already have a family?
    const { data: membership } = await supabase
      .from("family_members")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership) {
      // Already set up — send them straight to the timeline.
      redirect("/timeline");
    }

    // Signed in but no family — offer to complete setup.
    return (
      <CompleteSetupForm
        invite={invite}
        inviteInvalid={!!inviteToken && !invite}
      />
    );
  }

  return (
    <SignupForm
      invite={invite}
      inviteInvalid={!!inviteToken && !invite}
    />
  );
}

