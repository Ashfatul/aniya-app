import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { TimelineItem, FamilyMember } from "@/lib/types";
import { ModuleIcon, ModuleColor, ModuleLabel } from "@/components/module-icon";
import { EntryEditor } from "./entry-editor";
import { canEdit } from "@/lib/supabase/session";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function EntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: entry } = await supabase
    .from("timeline_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle<TimelineItem>();
  if (!entry) notFound();

  // My role in this family
  const { data: fm } = await supabase
    .from("family_members")
    .select("role")
    .eq("family_id", entry.family_id)
    .eq("user_id", user.id)
    .maybeSingle<{ role: FamilyMember["role"] }>();

  const myRole = fm?.role ?? null;
  const canModify =
    canEdit(myRole) ||
    (myRole !== null && entry.created_by === user.id);

  const { data: creator } = entry.created_by
    ? await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("id", entry.created_by)
        .maybeSingle()
    : { data: null };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href="/timeline"
          className="inline-flex items-center gap-1 text-sm text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Timeline
        </Link>
      </div>

      {/* Header */}
      <header className="flex items-start gap-3">
        <div
          className={`w-12 h-12 rounded-2xl ${ModuleColor[entry.module]} text-white flex items-center justify-center flex-shrink-0`}
        >
          <ModuleIcon module={entry.module} className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-[var(--foreground)]/50">
            {ModuleLabel[entry.module]}
          </div>
          <h1 className="font-script text-3xl">{entry.title}</h1>
          <div className="text-sm text-[var(--foreground)]/60 mt-1">
            {new Date(entry.occurred_at).toLocaleString()} · added by{" "}
            {creator?.display_name || creator?.email?.split("@")[0] || "family"}
          </div>
        </div>
      </header>

      {/* Media gallery */}
      {entry.media_urls?.length > 0 && (
        <div className="space-y-2">
          {entry.media_urls.map((url, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden bg-[var(--muted)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="w-full h-auto max-h-[80vh] object-contain bg-black"
              />
            </div>
          ))}
        </div>
      )}

      {/* Body */}
      {entry.caption && (
        <Card className="p-5 bg-white">
          <p className="text-[var(--foreground)] whitespace-pre-wrap">
            {entry.caption}
          </p>
        </Card>
      )}

      {/* Module-specific data */}
      {Object.keys(entry.data ?? {}).length > 0 && (
        <Card className="p-5 bg-white">
          <h3 className="font-medium mb-2">Details</h3>
          <Details data={entry.data as any} module={entry.module} />
        </Card>
      )}

      {/* Edit */}
      {canModify && <EntryEditor entry={entry} />}
    </div>
  );
}

function Details({ data, module }: { data: any; module: string }) {
  if (module === "growth") {
    return (
      <div className="grid grid-cols-3 gap-3 text-center">
        {data.height_cm != null && (
          <Stat label="Height" value={`${data.height_cm} cm`} />
        )}
        {data.weight_kg != null && (
          <Stat label="Weight" value={`${data.weight_kg} kg`} />
        )}
        {data.head_cm != null && (
          <Stat label="Head" value={`${data.head_cm} cm`} />
        )}
        {data.notes && (
          <p className="col-span-3 text-sm text-[var(--foreground)]/70 mt-2">
            {data.notes}
          </p>
        )}
      </div>
    );
  }
  if (module === "feeding") {
    return (
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Type" value={data.type} />
        {data.amount_ml != null && (
          <Stat label="Amount" value={`${data.amount_ml} ml`} />
        )}
        {data.duration_min != null && (
          <Stat label="Duration" value={`${data.duration_min} min`} />
        )}
        {data.notes && (
          <p className="col-span-3 text-sm text-[var(--foreground)]/70 mt-2">
            {data.notes}
          </p>
        )}
      </div>
    );
  }
  if (module === "sleep") {
    return (
      <div className="space-y-1">
        <p className="text-sm">
          Started: {data.start_at ? new Date(data.start_at).toLocaleString() : "—"}
        </p>
        <p className="text-sm">
          Ended:{" "}
          {data.end_at ? new Date(data.end_at).toLocaleString() : "still sleeping"}
        </p>
        {data.duration_min != null && (
          <p className="text-sm">
            Duration: <strong>{data.duration_min} min</strong> (
            {(data.duration_min / 60).toFixed(1)} h)
          </p>
        )}
        {data.notes && (
          <p className="text-sm text-[var(--foreground)]/70 mt-2">{data.notes}</p>
        )}
      </div>
    );
  }
  if (module === "milestone") {
    return (
      <div className="space-y-1 text-sm">
        {data.category && <p>Category: <strong>{data.category}</strong></p>}
        {data.age_label && <p>Age: <strong>{data.age_label}</strong></p>}
        {data.notes && <p className="text-[var(--foreground)]/70 mt-2">{data.notes}</p>}
      </div>
    );
  }
  return null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--muted)] rounded-xl p-3">
      <div className="text-xs text-[var(--foreground)]/60">{label}</div>
      <div className="font-medium capitalize">{value}</div>
    </div>
  );
}