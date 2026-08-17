import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Family, Profile, TimelineItem } from "@/lib/types";
import { ProfileEditor } from "./profile-editor";
import { RealtimeAge } from "@/components/realtime-age";
import {
  Camera,
  Ruler,
  Scale,
  Star,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { ModuleIcon, ModuleColor, ModuleLabel } from "@/components/module-icon";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get family via membership
  const { data: membership } = await supabase
    .from("family_members")
    .select("family:families(*)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !membership.family) redirect("/signup");
  const family = membership.family as unknown as Family;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  // Module counts
  const { data: all } = await supabase
    .from("timeline_entries")
    .select("module")
    .returns<{ module: TimelineItem["module"] }[]>();

  const counts = {
    memory: 0,
    growth: 0,
    feeding: 0,
    sleep: 0,
    milestone: 0,
    first: 0,
  };
  for (const r of all ?? []) {
    counts[r.module] = (counts[r.module] ?? 0) + 1;
  }

  // Latest growth record
  const { data: lastGrowth } = await supabase
    .from("timeline_entries")
    .select("data, occurred_at")
    .eq("module", "growth")
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#E25C80] via-[#E86B88] to-[#F59074] rounded-3xl p-6 sm:p-7 text-white text-center shadow-xl shadow-rose-900/10 border border-white/20">
        <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 w-40 h-40 bg-amber-300/20 rounded-full blur-2xl" />

        <div className="relative z-10">
          <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-white/90 shadow-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            {family.baby_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={family.baby_photo_url}
                alt={family.baby_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-script font-bold text-white">
                {family.baby_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h1 className="font-script text-4xl sm:text-5xl font-bold mt-3 text-white drop-shadow-sm">
            {family.baby_name}
          </h1>
          {family.baby_birthday && (
            <div className="mt-2">
              <RealtimeAge
                birthday={family.baby_birthday}
                variant="profile-hero"
              />
            </div>
          )}
          {family.baby_bio && (
            <p className="text-white/90 mt-3 text-sm max-w-md mx-auto leading-relaxed">
              {family.baby_bio}
            </p>
          )}
        </div>
      </section>

      {/* Realtime live age & milestones card */}
      {family.baby_birthday && (
        <RealtimeAge birthday={family.baby_birthday} variant="card" />
      )}

      {/* Quick stats */}
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          icon={<Ruler className="w-5 h-5" />}
          label="Height"
          value={
            lastGrowth && (lastGrowth.data as any)?.height_cm != null
              ? `${(lastGrowth.data as any).height_cm} cm`
              : "—"
          }
          color="bg-[var(--accent)]"
        />
        <StatCard
          icon={<Scale className="w-5 h-5" />}
          label="Weight"
          value={
            lastGrowth && (lastGrowth.data as any)?.weight_kg != null
              ? `${(lastGrowth.data as any).weight_kg} kg`
              : "—"
          }
          color="bg-[#f6c177]"
        />
        <StatCard
          icon={<Camera className="w-5 h-5" />}
          label="Photos"
          value={`${counts.memory}`}
          color="bg-[var(--primary)]"
        />
        <StatCard
          icon={<Star className="w-5 h-5" />}
          label="Milestones"
          value={`${counts.milestone + counts.first}`}
          color="bg-[var(--accent-2)]"
        />
        <StatCard
          icon={<ImageIcon className="w-5 h-5" />}
          label="Total"
          value={`${Object.values(counts).reduce((a, b) => a + b, 0)}`}
          color="bg-[var(--accent-3)]"
        />
      </section>

      {/* Module breakdown */}
      <section className="bg-white rounded-2xl p-4 border border-[var(--border)]">
        <h2 className="font-medium mb-3">What you&apos;ve tracked</h2>
        <div className="space-y-2">
          {(Object.keys(counts) as Array<keyof typeof counts>).map((k) => (
            <div key={k} className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg ${ModuleColor[k]} text-white flex items-center justify-center`}
              >
                <ModuleIcon module={k} className="w-4 h-4" />
              </div>
              <div className="flex-1 text-sm">{ModuleLabel[k]}s</div>
              <div className="text-sm text-[var(--foreground)]/60 font-medium">
                {counts[k]}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Edit */}
      <section className="bg-white rounded-2xl p-5 border border-[var(--border)]">
        <h2 className="font-medium mb-4">Edit details</h2>
        <ProfileEditor family={family} profile={profile} />
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-[var(--border)]">
      <div className={`w-10 h-10 rounded-xl ${color} text-white flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <div className="text-xs text-[var(--foreground)]/60">{label}</div>
      <div className="font-medium text-lg">{value}</div>
    </div>
  );
}