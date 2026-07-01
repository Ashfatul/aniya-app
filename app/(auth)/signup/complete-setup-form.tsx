"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { completeSetupAction, type SignupState } from "../actions";

const initialState: SignupState = null;

type InviteInfo = {
  token: string;
  familyName: string;
  babyName: string;
  invitedEmail: string;
};

export function CompleteSetupForm({
  invite,
  inviteInvalid,
}: {
  invite: InviteInfo | null;
  inviteInvalid: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    completeSetupAction,
    initialState
  );

  const error = state && !state.ok ? state.error : null;

  return (
    <Card className="w-full max-w-md p-8 fade-up">
      <h2 className="font-script text-3xl text-center text-[var(--foreground)] mb-1">
        {invite ? "Join your family" : "Finish setting up"}
      </h2>
      <p className="text-center text-sm text-[var(--foreground)]/60 mb-6">
        {invite
          ? `You've been invited to join ${invite.familyName}. Click below to accept and start viewing their memories.`
          : "Your email is confirmed. One more step and your memory book is ready."}
      </p>

      {inviteInvalid && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl text-sm bg-amber-50 text-amber-800">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            This invite link is invalid or has expired. You can still create
            your own family below.
          </span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        {invite && <input type="hidden" name="invite" value={invite.token} />}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" disabled={pending} className="w-full" size="lg">
          {pending
            ? invite
              ? "Joining..."
              : "Setting up..."
            : invite
            ? "Accept invitation & join family"
            : "Create my memory book"}
        </Button>
      </form>
    </Card>
  );
}
