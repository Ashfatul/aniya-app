import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Camera,
  Plus,
  Heart,
  Calendar,
  Sparkles,
  Ruler,
  Star,
  Users,
  Moon,
  Utensils,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { TimelineItem, Family } from "@/lib/types";
import { groupByDate, formatTime } from "@/lib/utils";
import { ModuleIcon, ModuleColor, ModuleLabel } from "@/components/module-icon";
import { RealtimeAge } from "@/components/realtime-age";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
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

  // Fetch timeline entries (RLS will scope to family automatically)
  const { data: entries } = await supabase
    .from("timeline_entries")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(200)
    .returns<TimelineItem[]>();

  const grouped = groupByDate(entries ?? []);
  const totalCount = entries?.length ?? 0;

  // Module counts for desktop sidebar
  const photoCount = entries?.filter((e) => e.media_urls && e.media_urls.length > 0).length ?? 0;
  const milestoneCount = entries?.filter((e) => e.module === "milestone" || e.module === "first").length ?? 0;
  const growthCount = entries?.filter((e) => e.module === "growth").length ?? 0;

  return (
    <div className="space-y-8">
      {/* Hero / stats banner */}
      <RealtimeAge
        birthday={family.baby_birthday}
        babyName={family.baby_name}
        totalMemories={totalCount}
        variant="hero"
      />

      {/* Main Grid: Responsive 2-column layout on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left / Main Column: Timeline Stream (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-script text-3xl font-bold text-[var(--foreground)]">
              The Story So Far
            </h2>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)]/70">
              {totalCount} {totalCount === 1 ? "moment" : "moments"}
            </span>
          </div>

          {/* Empty state */}
          {totalCount === 0 && (
            <Link
              href="/add"
              className="block bg-white rounded-3xl border-2 border-dashed border-[var(--border)] p-12 text-center hover:border-[var(--primary)] transition-all group shadow-sm hover:shadow-md"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-[var(--muted)] flex items-center justify-center group-hover:bg-[var(--primary)]/20 transition-colors">
                <Sparkles className="w-8 h-8 text-[var(--primary-dark)]" />
              </div>
              <h3 className="mt-4 font-script text-2xl font-bold">Your story begins</h3>
              <p className="text-[var(--foreground)]/60 mt-1 text-sm max-w-sm mx-auto">
                Capture baby&apos;s first photo, milestone, or cute memory to begin your album.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E25C80] to-[#F59074] text-white font-medium text-sm shadow-sm">
                <Plus className="w-4 h-4" />
                <span>Add first moment</span>
              </div>
            </Link>
          )}

          {/* Timeline Feed */}
          {grouped.length > 0 && (
            <div className="relative">
              {/* Vertical rail */}
              <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-[#E25C80] via-[var(--accent)] to-[var(--accent-2)] rounded-full" />

              <div className="space-y-8">
                {grouped.map((group) => (
                  <div key={group.date} className="relative">
                    {/* Date pill */}
                    <div className="flex items-center gap-3 mb-4 relative">
                      <div className="w-10 h-10 rounded-full bg-white border-4 border-[#E25C80] flex items-center justify-center z-10 shadow-sm heart-pulse">
                        <Heart className="w-4 h-4 text-[#E25C80] fill-[#E25C80]" />
                      </div>
                      <div className="font-script text-2xl font-bold text-[var(--primary-dark)]">
                        {group.label}
                      </div>
                    </div>

                    {/* Responsive Grid for Cards on tablet/desktop */}
                    <div className="pl-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {group.items.map((it) => (
                        <TimelineCard key={it.id} item={it} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Desktop-only Quick Actions & Widgets (4 cols on lg) */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-6">
          {/* Quick Add Actions Box */}
          <div className="bg-white rounded-3xl p-5 border border-[var(--border)] shadow-sm space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E25C80]" />
                <span>Quick Log</span>
              </h3>
              <Link
                href="/add"
                className="text-xs text-[#E25C80] hover:underline font-medium"
              >
                View all
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <QuickActionButton
                href="/add?module=memory"
                icon={<Camera className="w-4 h-4 text-pink-600" />}
                label="Photo Memory"
                bg="bg-pink-50 hover:bg-pink-100/80 border-pink-100"
              />
              <QuickActionButton
                href="/add?module=milestone"
                icon={<Star className="w-4 h-4 text-purple-600" />}
                label="Milestone"
                bg="bg-purple-50 hover:bg-purple-100/80 border-purple-100"
              />
              <QuickActionButton
                href="/add?module=growth"
                icon={<Ruler className="w-4 h-4 text-blue-600" />}
                label="Growth Log"
                bg="bg-blue-50 hover:bg-blue-100/80 border-blue-100"
              />
              <QuickActionButton
                href="/add?module=sleep"
                icon={<Moon className="w-4 h-4 text-indigo-600" />}
                label="Sleep / Nap"
                bg="bg-indigo-50 hover:bg-indigo-100/80 border-indigo-100"
              />
            </div>
          </div>

          {/* Desktop Summary Stats Card */}
          <div className="bg-white rounded-3xl p-5 border border-[var(--border)] shadow-sm space-y-4">
            <h3 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span>Memories Overview</span>
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-[var(--muted)]/70 border border-[var(--border)]/60">
                <div className="text-xl font-bold text-[var(--foreground)]">{totalCount}</div>
                <div className="text-[10px] uppercase font-semibold tracking-wider text-[var(--foreground)]/60 mt-0.5">
                  Total
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--muted)]/70 border border-[var(--border)]/60">
                <div className="text-xl font-bold text-[var(--foreground)]">{photoCount}</div>
                <div className="text-[10px] uppercase font-semibold tracking-wider text-[var(--foreground)]/60 mt-0.5">
                  Photos
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--muted)]/70 border border-[var(--border)]/60">
                <div className="text-xl font-bold text-[var(--foreground)]">{milestoneCount}</div>
                <div className="text-[10px] uppercase font-semibold tracking-wider text-[var(--foreground)]/60 mt-0.5">
                  Events
                </div>
              </div>
            </div>

            <Link
              href="/profile"
              className="flex items-center justify-between p-3 rounded-2xl bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-xs font-medium text-[var(--foreground)]/80 transition-colors"
            >
              <span>View full baby profile & stats</span>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--primary-dark)]" />
            </Link>
          </div>

          {/* Family Circle Mini-Widget */}
          <div className="bg-gradient-to-br from-amber-50 to-pink-50 rounded-3xl p-5 border border-pink-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span>Family Book</span>
              </h3>
              <Link
                href="/members"
                className="text-xs text-amber-700 hover:underline font-semibold"
              >
                Manage
              </Link>
            </div>
            <p className="text-xs text-[var(--foreground)]/70 leading-relaxed">
              Invite grandparents, aunts, and uncles to view or contribute memories to {family.baby_name}&apos;s story.
            </p>
          </div>
        </aside>
      </div>

      {/* Floating Action Button (Visible on mobile screens) */}
      <Link
        href="/add"
        className="md:hidden fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-[#E25C80] to-[#F59074] text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform active:scale-95 border border-white/40 shadow-rose-500/30"
        aria-label="Add a moment"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </Link>
    </div>
  );
}

function TimelineCard({ item }: { item: TimelineItem }) {
  let time = "";
  try {
    const d = new Date(item.occurred_at);
    if (!isNaN(d.getTime())) {
      time = d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    }
  } catch {
    // leave time blank if invalid
  }

  return (
    <Link
      href={`/entry/${item.id}`}
      className="block bg-white rounded-2xl border border-[var(--border)] overflow-hidden hover:shadow-lg transition-all duration-300 fade-up group hover:-translate-y-0.5 flex flex-col h-full"
    >
      {item.media_urls?.[0] && (
        <div className="aspect-square w-full bg-[var(--muted)] overflow-hidden relative flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.media_urls[0]}
            alt={item.title}
            className="w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-300"
          />
          {item.media_urls.length > 1 && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm">
              <Camera className="w-3.5 h-3.5" />
              {item.media_urls.length}
            </div>
          )}
        </div>
      )}
      <div className="p-4 flex gap-3 flex-1">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs ${ModuleColor[item.module]}`}
        >
          <ModuleIcon module={item.module} className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm text-[var(--foreground)] truncate group-hover:text-[#E25C80] transition-colors">
              {item.title}
            </h3>
            <span className="text-[11px] text-[var(--foreground)]/50">
              {time}
            </span>
          </div>
          {item.caption && (
            <p className="text-xs text-[var(--foreground)]/70 mt-1 line-clamp-2 leading-relaxed">
              {item.caption}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function QuickActionButton({
  href,
  icon,
  label,
  bg,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  bg: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 p-2.5 rounded-2xl border transition-all ${bg}`}
    >
      <div className="p-1 rounded-lg bg-white shadow-2xs flex-shrink-0">{icon}</div>
      <span className="text-xs font-semibold text-[var(--foreground)] truncate">
        {label}
      </span>
    </Link>
  );
}