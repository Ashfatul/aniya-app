// Server actions for adding/editing timeline entries.

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ModuleType, GrowthData, FeedingData, SleepData, MilestoneData } from "@/lib/types";

export type EntryState = { ok: true; id: string } | { ok: false; error: string } | null;

export async function createEntryAction(
  _prev: EntryState,
  formData: FormData
): Promise<EntryState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: membership } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { ok: false, error: "Family not found." };

  const module = formData.get("module") as ModuleType;
  const title = (formData.get("title") as string)?.trim();
  const caption = (formData.get("caption") as string)?.trim() || null;
  const occurred_at =
    (formData.get("occurred_at") as string) || new Date().toISOString();
  const mediaRaw = (formData.get("media_urls") as string) || "";
  const media_urls = mediaRaw
    ? mediaRaw.split("\n").map((s) => s.trim()).filter(Boolean)
    : [];

  if (!title) return { ok: false, error: "Title is required." };
  if (!module) return { ok: false, error: "Module type is required." };

  const data = buildModuleData(module, formData);

  const { data: created, error } = await supabase
    .from("timeline_entries")
    .insert({
      family_id: membership.family_id,
      module,
      title,
      caption,
      occurred_at,
      media_urls,
      data,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { ok: false, error: error?.message ?? "Failed to save." };
  }

  revalidatePath("/timeline");
  revalidatePath("/profile");
  redirect(`/entry/${created.id}`);
}

export async function updateEntryAction(
  id: string,
  _prev: EntryState,
  formData: FormData
): Promise<EntryState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const module = formData.get("module") as ModuleType;
  const title = (formData.get("title") as string)?.trim();
  const caption = (formData.get("caption") as string)?.trim() || null;
  const occurred_at = (formData.get("occurred_at") as string) || undefined;
  const mediaRaw = (formData.get("media_urls") as string) || "";
  const media_urls = mediaRaw
    ? mediaRaw.split("\n").map((s) => s.trim()).filter(Boolean)
    : [];

  if (!title) return { ok: false, error: "Title is required." };

  const data = buildModuleData(module, formData);

  const { error } = await supabase
    .from("timeline_entries")
    .update({
      title,
      caption,
      occurred_at,
      media_urls,
      data,
      module,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/timeline");
  revalidatePath(`/entry/${id}`);
  return { ok: true, id };
}

function buildModuleData(
  module: ModuleType,
  fd: FormData
): GrowthData | FeedingData | SleepData | MilestoneData | Record<string, unknown> {
  switch (module) {
    case "growth": {
      const d: GrowthData = {};
      const h = fd.get("height_cm") as string;
      const w = fd.get("weight_kg") as string;
      const head = fd.get("head_cm") as string;
      const notes = fd.get("data_notes") as string;
      if (h) d.height_cm = Number(h);
      if (w) d.weight_kg = Number(w);
      if (head) d.head_cm = Number(head);
      if (notes) d.notes = notes;
      return d;
    }
    case "feeding": {
      const d: FeedingData = {
        type: (fd.get("feed_type") as FeedingData["type"]) || "formula",
      };
      const amount = fd.get("amount_ml") as string;
      const dur = fd.get("duration_min") as string;
      const notes = fd.get("data_notes") as string;
      if (amount) d.amount_ml = Number(amount);
      if (dur) d.duration_min = Number(dur);
      if (notes) d.notes = notes;
      return d;
    }
    case "sleep": {
      const start = fd.get("sleep_start") as string;
      const end = fd.get("sleep_end") as string;
      const notes = fd.get("data_notes") as string;
      const d: SleepData = {
        start_at: start || new Date().toISOString(),
        end_at: end || null,
      };
      if (start && end) {
        d.duration_min = Math.max(
          0,
          Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
        );
      }
      if (notes) d.notes = notes;
      return d;
    }
    case "milestone": {
      const d: MilestoneData = {};
      const cat = fd.get("milestone_category") as string;
      if (cat) d.category = cat as MilestoneData["category"];
      const age = fd.get("milestone_age_label") as string;
      if (age) d.age_label = age;
      const notes = fd.get("data_notes") as string;
      if (notes) d.notes = notes;
      return d;
    }
    default:
      return {};
  }
}