import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "../signup/signup-form";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const params = await searchParams;
  const inviteToken = params.invite;
  
  if (!inviteToken) {
    return (
      <Card className="w-full max-w-md p-8 fade-up">
        <h2 className="font-script text-3xl text-center text-[var(--foreground)] mb-1">
          Have an invite?
        </h2>
        <p className="text-center text-sm text-[var(--foreground)]/60 mb-6">
          Paste your invite link below to join a family.
        </p>
        <form className="space-y-4" action="/join" method="get">
          <div>
            <Label htmlFor="invite">Invite Link or Token</Label>
            <Input
              id="invite"
              name="invite"
              placeholder="e.g. 1234abcd..."
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      </Card>
    );
  }

  const supabase = await createClient();

  const { data } = await supabase.rpc("lookup_invite_by_token", {
    p_token: inviteToken,
  });
  const row = Array.isArray(data) ? data[0] : data;
  
  let invite = null;
  if (row) {
    invite = {
      token: inviteToken,
      familyName: row.family_name as string,
      babyName: (row.baby_name as string) ?? "Baby",
      invitedEmail: row.invited_email as string,
    };
  }

  return (
    <SignupForm
      invite={invite}
      inviteInvalid={!invite}
    />
  );
}
