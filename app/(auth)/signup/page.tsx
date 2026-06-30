import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";
import { CompleteSetupForm } from "./complete-setup-form";

export default async function SignupPage() {
  const supabase = await createClient();
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
      const { redirect } = await import("next/navigation");
      redirect("/timeline");
    }

    // Signed in but no family — offer to complete setup.
    return <CompleteSetupForm />;
  }

  return <SignupForm />;
}

