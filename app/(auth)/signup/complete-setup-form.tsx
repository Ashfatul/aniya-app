"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { completeSetupAction, type SignupState } from "../actions";

const initialState: SignupState = null;

export function CompleteSetupForm() {
  const [state, formAction, pending] = useActionState(
    completeSetupAction,
    initialState
  );

  const error = state && !state.ok ? state.error : null;

  return (
    <Card className="w-full max-w-md p-8 fade-up">
      <h2 className="font-script text-3xl text-center text-[var(--foreground)] mb-1">
        Finish setting up
      </h2>
      <p className="text-center text-sm text-[var(--foreground)]/60 mb-6">
        Your email is confirmed. One more step and your memory book is ready.
      </p>

      <form action={formAction} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" disabled={pending} className="w-full" size="lg">
          {pending ? "Setting up..." : "Create my memory book"}
        </Button>
      </form>
    </Card>
  );
}
