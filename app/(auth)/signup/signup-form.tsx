"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Mail, Lock, Baby, Users, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { signupAction, type SignupState } from "../actions";

const initialState: SignupState = null;

type InviteInfo = {
  token: string;
  familyName: string;
  babyName: string;
  invitedEmail: string;
};

export function SignupForm({
  invite,
  inviteInvalid,
}: {
  invite: InviteInfo | null;
  inviteInvalid: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    signupAction,
    initialState
  );

  const error = state && !state.ok ? state.error : null;
  const needsConfirmation =
    state && !state.ok && "needsConfirmation" in state
      ? state.needsConfirmation
      : false;

  return (
    <Card className="w-full max-w-md p-8 fade-up">
      <h2 className="font-script text-3xl text-center text-[var(--foreground)] mb-1">
        {invite ? "Join your family" : "Start your story"}
      </h2>
      <p className="text-center text-sm text-[var(--foreground)]/60 mb-6">
        {invite
          ? `You've been invited to join ${invite.familyName} as ${
              invite.babyName || "their little one"
            }'s family.`
          : "A private memory book, just for your family"}
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

        <div>
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground)]/40" />
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={invite?.invitedEmail || ""}
              readOnly={!!invite}
              placeholder="you@example.com"
              className={`pl-11 ${invite ? "bg-[var(--muted)] opacity-80 pointer-events-none" : ""}`}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground)]/40" />
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              className="pl-11"
            />
          </div>
        </div>

        {!invite && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="family_name">Family name</Label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground)]/40" />
                <Input
                  id="family_name"
                  name="family_name"
                  defaultValue="Our Family"
                  className="pl-11"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="baby_name">Baby&apos;s name</Label>
              <div className="relative">
                <Baby className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground)]/40" />
                <Input
                  id="baby_name"
                  name="baby_name"
                  defaultValue="Aniya"
                  className="pl-11"
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
              needsConfirmation
                ? "bg-amber-50 text-amber-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" disabled={pending} className="w-full" size="lg">
          {pending
            ? invite
              ? "Accepting invitation..."
              : "Creating your memory book…"
            : invite
            ? "Accept invite & sign up"
            : "Create my memory book"}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-[var(--foreground)]/60">
        Already started?{" "}
        <Link
          href="/login"
          className="text-[var(--primary-dark)] font-medium hover:underline"
        >
          Sign in
        </Link>
      </div>
    </Card>
  );
}
