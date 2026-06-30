import { redirect } from "next/navigation";
import { LogOut, Mail, Baby } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <h1 className="font-script text-3xl">Settings</h1>

      <section className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden divide-y divide-[var(--border)]">
        <Row
          icon={<Mail className="w-5 h-5" />}
          label="Signed in as"
          value={user.email ?? ""}
        />
        <Row
          icon={<Baby className="w-5 h-5" />}
          label="Display name"
          value={profile?.display_name ?? "(not set)"}
        />
      </section>

      <section className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="p-4">
          <LogoutButton />
        </div>
      </section>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="w-9 h-9 rounded-xl bg-[var(--muted)] flex items-center justify-center text-[var(--foreground)]/70">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[var(--foreground)]/60">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  );
}
