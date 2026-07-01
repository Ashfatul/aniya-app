import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera, Plus, Heart, Calendar, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { TimelineItem, Family } from "@/lib/types";
import { formatAge, groupByDate, formatTime } from "@/lib/utils";
import { ModuleIcon, ModuleColor } from "@/components/module-icon";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="space-y-6">
      {/* Hero / stats strip */}
      <section className="bg-gradient-to-br from-[var(--accent-3)] to-[var(--primary)] rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-20 text-9xl">🌸</div>
        <div className="relative">
          <div className="text-xs uppercase tracking-wide opacity-90">
            Today
          </div>
          <h1 className="font-script text-5xl mt-1">
            Hello, {family.baby_name}
          </h1>
          {family.baby_birthday && (
            <p className="opacity-90 mt-1 flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4" />
              {formatAge(family.baby_birthday)} of beautiful memories
            </p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 fill-white" />
              <span className="font-medium">{totalCount}</span>
              <span className="opacity-80">memories</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick add */}
      <div className="flex items-center justify-between">
        <h2 className="font-script text-2xl">The story so far</h2>
      </div>

      {/* Floating action button */}
      <Link
        href="/add"
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-[var(--primary)] text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
        aria-label="Add a moment"
      >
        <Plus className="w-7 h-7" strokeWidth={2.5} />
      </Link>

      {/* Empty state */}
      {totalCount === 0 && (
        <Link
          href="/add"
          className="block bg-white rounded-3xl border-2 border-dashed border-[var(--border)] p-12 text-center hover:border-[var(--primary)] transition-colors group"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-[var(--muted)] flex items-center justify-center group-hover:bg-[var(--primary)]/20 transition-colors">
            <Sparkles className="w-8 h-8 text-[var(--primary-dark)]" />
          </div>
          <h3 className="mt-4 font-script text-2xl">Your story begins</h3>
          <p className="text-[var(--foreground)]/60 mt-1 text-sm">
            Add your first photo or memory to get started
          </p>
        </Link>
      )}

      {/* Timeline */}
      {grouped.length > 0 && (
        <div className="relative">
          {/* Vertical rail */}
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-[var(--primary)] via-[var(--accent)] to-[var(--accent-2)] rounded-full" />

          <div className="space-y-8">
            {grouped.map((group) => (
              <div key={group.date} className="relative">
                {/* Date pill */}
                <div className="flex items-center gap-3 mb-4 relative">
                  <div className="w-10 h-10 rounded-full bg-white border-4 border-[var(--primary)] flex items-center justify-center z-10 shadow-sm heart-pulse">
                    <Heart className="w-4 h-4 text-[var(--primary)] fill-[var(--primary)]" />
                  </div>
                  <div className="font-script text-xl text-[var(--primary-dark)]">
                    {group.label}
                  </div>
                </div>

                <div className="space-y-3 pl-12">
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
  } catch (e) {
    // leave time blank if invalid
  }

  return (
    <Link
      href={`/entry/${item.id}`}
      className="block bg-white rounded-2xl border border-[var(--border)] overflow-hidden hover:shadow-md transition-shadow fade-up"
    >
      {item.media_urls?.[0] && (
        <div className="aspect-video bg-[var(--muted)] overflow-hidden relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.media_urls[0]}
            alt={item.title}
            className="w-full h-full object-cover"
          />
          {item.media_urls.length > 1 && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 text-white text-xs flex items-center gap-1">
              <Camera className="w-3 h-3" />
              {item.media_urls.length}
            </div>
          )}
        </div>
      )}
      <div className="p-4 flex gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ModuleColor[item.module]}`}
        >
          <ModuleIcon module={item.module} className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-[var(--foreground)] truncate">
              {item.title}
            </h3>
            <span className="text-xs text-[var(--foreground)]/50">
              {time}
            </span>
          </div>
          {item.caption && (
            <p className="text-sm text-[var(--foreground)]/70 mt-0.5 line-clamp-2">
              {item.caption}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}