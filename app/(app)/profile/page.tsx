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
  Sparkle,
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
    <div className="space-y-8">
      {/* Desktop Responsive 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Identity & Live Stats (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Profile header */}
          <section className="relative overflow-hidden bg-gradient-to-br from-[#E25C80] via-[#E86B88] to-[#F59074] rounded-3xl p-6 sm:p-7 text-white text-center shadow-xl shadow-rose-900/10 border border-white/20">
            <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 w-40 h-40 bg-amber-300/20 rounded-full blur-2xl" />

            <div className="relative z-10">
              <div className="w-28 h-28 mx-auto rounded-full overflow-hidden border-4 border-white/95 shadow-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                {family.baby_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={family.baby_photo_url}
                    alt={family.baby_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-script font-bold text-white">
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
        </div>

        {/* Right Column: Tracked Summary & Editor (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Module breakdown */}
          <section className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base text-[var(--foreground)]">
                What you&apos;ve tracked
              </h2>
              <span className="text-xs text-[var(--foreground)]/60 font-medium">
                {Object.values(counts).reduce((a, b) => a + b, 0)} total records
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(counts) as Array<keyof typeof counts>).map((k) => (
                <div
                  key={k}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--muted)]/50 border border-[var(--border)]/50"
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${ModuleColor[k]} text-white flex items-center justify-center shadow-xs flex-shrink-0`}
                  >
                    <ModuleIcon module={k} className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[var(--foreground)]/60">
                      {ModuleLabel[k]}s
                    </div>
                    <div className="text-base text-[var(--foreground)] font-bold">
                      {counts[k]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Edit Details */}
          <section className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-sm">
            <h2 className="font-semibold text-base mb-5 text-[var(--foreground)]">
              Edit Details & Profile
            </h2>
            <ProfileEditor family={family} profile={profile} />
          </section>
        </div>
      </div>
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
    <div className="bg-white rounded-2xl p-4 border border-[var(--border)] shadow-xs">
      <div className={`w-9 h-9 rounded-xl ${color} text-white flex items-center justify-center mb-2 shadow-2xs`}>
        {icon}
      </div>
      <div className="text-xs text-[var(--foreground)]/60 font-medium">{label}</div>
      <div className="font-bold text-lg text-[var(--foreground)] mt-0.5">{value}</div>
    </div>
  );
}