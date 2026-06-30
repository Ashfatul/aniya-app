import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canEdit } from "@/lib/supabase/session";
import { AddMomentForm } from "./add-form";

export const dynamic = "force-dynamic";

export default async function AddMomentPage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get my family membership and role
  const { data: membership } = await supabase
    .from("family_members")
    .select("role, family:families(id)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !membership.family) {
    redirect("/signup");
  }

  if (!canEdit(membership.role as any)) {
    redirect("/timeline");
  }

  const familyId = (membership.family as any).id;

  const params = await searchParams;
  const initialModule = (params.module as any) || "memory";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-script text-3xl">Add a moment</h1>
        <p className="text-sm text-[var(--foreground)]/60">
          Choose what to capture — you can update anything later.
        </p>
      </div>
      <AddMomentForm initialModule={initialModule} familyId={familyId} />
    </div>
  );
}