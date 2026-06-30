"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2, Save, Trash2, Edit3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
  updateEntryAction,
  type EntryState,
} from "../../add/actions";
import { deleteEntryAction } from "../../actions";
import type { TimelineItem, ModuleType } from "@/lib/types";
import { useRouter } from "next/navigation";

const MODULES: ModuleType[] = [
  "memory",
  "first",
  "milestone",
  "growth",
  "feeding",
  "sleep",
];

export function EntryEditor({ entry }: { entry: TimelineItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [module, setModule] = useState<ModuleType>(entry.module);
  const [mediaUrls, setMediaUrls] = useState<string[]>(entry.media_urls ?? []);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [state, formAction, pending] = useActionState(
    (prev: EntryState, fd: FormData) =>
      updateEntryAction(entry.id, prev, fd),
    null
  );

  // After success close editor
  if (state && state.ok && editing) {
    setTimeout(() => setEditing(false), 0);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    const supabase = createClient();
    const newUrls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${entry.family_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("media")
        .upload(path, file, { upsert: false });
      if (!error) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("media").getPublicUrl(path);
        newUrls.push(publicUrl);
      }
    }
    setMediaUrls((prev) => [...prev, ...newUrls]);
    setUploading(false);
    e.target.value = "";
  }

  function removeMedia(i: number) {
    setMediaUrls((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onDelete() {
    if (!confirm("Delete this moment? This cannot be undone.")) return;
    await deleteEntryAction(entry.id);
    router.push("/timeline");
  }

  const data = entry.data as any;

  if (!editing) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setEditing(true)}>
          <Edit3 className="w-4 h-4" />
          Edit
        </Button>
        <Button variant="outline" onClick={onDelete} className="text-red-600 border-red-200 hover:bg-red-50">
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      </div>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Edit moment</h3>
        <button
          onClick={() => setEditing(false)}
          className="text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="module" value={module} />
        <input
          type="hidden"
          name="media_urls"
          value={mediaUrls.join("\n")}
        />

        <div>
          <Label>Module type</Label>
          <Select value={module} onChange={(e) => setModule(e.target.value as ModuleType)} name="module">
            {MODULES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {mediaUrls.map((url, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl overflow-hidden bg-[var(--muted)] relative group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeMedia(i)}
                className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <label className="aspect-square rounded-xl border-2 border-dashed border-[var(--border)] flex items-center justify-center cursor-pointer hover:bg-[var(--muted)]">
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span className="text-xs">+ photo</span>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>

        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required defaultValue={entry.title} />
        </div>

        <div>
          <Label htmlFor="occurred_at">When</Label>
          <Input
            id="occurred_at"
            name="occurred_at"
            type="datetime-local"
            defaultValue={toLocal(new Date(entry.occurred_at))}
          />
        </div>

        <div>
          <Label htmlFor="caption">Notes</Label>
          <Textarea id="caption" name="caption" defaultValue={entry.caption ?? ""} />
        </div>

        {/* Show fields per current module to allow updating the JSONB data */}
        {module === "growth" && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Height (cm)</Label>
              <Input
                name="height_cm"
                type="number"
                step="0.1"
                defaultValue={data?.height_cm ?? ""}
              />
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input
                name="weight_kg"
                type="number"
                step="0.01"
                defaultValue={data?.weight_kg ?? ""}
              />
            </div>
            <div>
              <Label>Head (cm)</Label>
              <Input
                name="head_cm"
                type="number"
                step="0.1"
                defaultValue={data?.head_cm ?? ""}
              />
            </div>
            <div className="col-span-3">
              <Label>Notes</Label>
              <Textarea
                name="data_notes"
                defaultValue={data?.notes ?? ""}
              />
            </div>
          </div>
        )}
        {module === "feeding" && (
          <div className="space-y-3">
            <div>
              <Label>Type</Label>
              <Select name="feed_type" defaultValue={data?.type ?? "breast"}>
                <option value="breast">Breast</option>
                <option value="formula">Formula</option>
                <option value="solid">Solid food</option>
                <option value="water">Water</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (ml)</Label>
                <Input
                  name="amount_ml"
                  type="number"
                  defaultValue={data?.amount_ml ?? ""}
                />
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input
                  name="duration_min"
                  type="number"
                  defaultValue={data?.duration_min ?? ""}
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea name="data_notes" defaultValue={data?.notes ?? ""} />
            </div>
          </div>
        )}
        {module === "sleep" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input
                  name="sleep_start"
                  type="datetime-local"
                  defaultValue={
                    data?.start_at ? toLocal(new Date(data.start_at)) : ""
                  }
                />
              </div>
              <div>
                <Label>End</Label>
                <Input
                  name="sleep_end"
                  type="datetime-local"
                  defaultValue={
                    data?.end_at ? toLocal(new Date(data.end_at)) : ""
                  }
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea name="data_notes" defaultValue={data?.notes ?? ""} />
            </div>
          </div>
        )}
        {module === "milestone" && (
          <div className="space-y-3">
            <div>
              <Label>Category</Label>
              <Select name="milestone_category" defaultValue={data?.category ?? "motor"}>
                <option value="motor">Motor</option>
                <option value="language">Language</option>
                <option value="social">Social</option>
                <option value="cognitive">Cognitive</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div>
              <Label>Age label</Label>
              <Input
                name="milestone_age_label"
                defaultValue={data?.age_label ?? ""}
                placeholder="e.g. 8 months"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea name="data_notes" defaultValue={data?.notes ?? ""} />
            </div>
          </div>
        )}

        {state && !state.ok && (
          <p className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending}>
          <Save className="w-4 h-4" />
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Card>
  );
}

function toLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}