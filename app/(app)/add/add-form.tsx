"use client";

import { useActionState, useState } from "react";
import {
  Camera,
  TrendingUp,
  Milk,
  Moon,
  Star,
  Sparkles,
  Loader2,
  Save,
  X,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
  createEntryAction,
  initialEntryState,
  type EntryState,
} from "./actions";
import type { ModuleType } from "@/lib/types";
import { cn } from "@/lib/utils";

const MODULES: {
  type: ModuleType;
  label: string;
  icon: React.ReactNode;
  color: string;
  hint: string;
}[] = [
  {
    type: "memory",
    label: "Memory",
    icon: <Camera className="w-5 h-5" />,
    color: "bg-[var(--primary)]",
    hint: "Photos & stories",
  },
  {
    type: "first",
    label: "First",
    icon: <Sparkles className="w-5 h-5" />,
    color: "bg-[var(--accent-2)]",
    hint: "First word, food, smile",
  },
  {
    type: "milestone",
    label: "Milestone",
    icon: <Star className="w-5 h-5" />,
    color: "bg-[#e8a4d8]",
    hint: "Big achievements",
  },
  {
    type: "growth",
    label: "Growth",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "bg-[var(--accent)]",
    hint: "Height & weight",
  },
  {
    type: "feeding",
    label: "Feeding",
    icon: <Milk className="w-5 h-5" />,
    color: "bg-[#f6c177]",
    hint: "Meals & feeds",
  },
  {
    type: "sleep",
    label: "Sleep",
    icon: <Moon className="w-5 h-5" />,
    color: "bg-[#b8b5e1]",
    hint: "Naps & nights",
  },
];

export function AddMomentForm({
  initialModule,
  familyId,
}: {
  initialModule: ModuleType;
  familyId: string;
}) {
  const [state, formAction, pending] = useActionState(
    createEntryAction,
    initialEntryState
  );

  const [module, setModule] = useState<ModuleType>(initialModule);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setUploadError(null);

    const supabase = createClient();
    const newUrls: string[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${familyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("media")
        .upload(path, file, { upsert: false });
      if (error) {
        setUploadError(error.message);
        break;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("media").getPublicUrl(path);
      newUrls.push(publicUrl);
    }

    setMediaUrls((prev) => [...prev, ...newUrls]);
    setUploading(false);
    // Clear the input so the same file can be re-uploaded if needed
    e.target.value = "";
  }

  function removeMedia(i: number) {
    setMediaUrls((prev) => prev.filter((_, idx) => idx !== i));
  }

  const error = state && !state.ok ? state.error : null;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="module" value={module} />
      <input
        type="hidden"
        name="media_urls"
        value={mediaUrls.join("\n")}
      />

      {/* Module picker */}
      <div>
        <Label>What kind of moment?</Label>
        <div className="grid grid-cols-3 gap-2">
          {MODULES.map((m) => (
            <button
              type="button"
              key={m.type}
              onClick={() => setModule(m.type)}
              className={cn(
                "p-3 rounded-2xl border text-left transition-all",
                module === m.type
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 ring-2 ring-[var(--primary)]/20"
                  : "border-[var(--border)] bg-white hover:bg-[var(--muted)]"
              )}
            >
              <div
                className={`w-9 h-9 rounded-xl ${m.color} text-white flex items-center justify-center mb-2`}
              >
                {m.icon}
              </div>
              <div className="text-sm font-medium">{m.label}</div>
              <div className="text-[11px] text-[var(--foreground)]/60">
                {m.hint}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Photos / media */}
      {(module === "memory" || module === "first" || module === "milestone") && (
        <div>
          <Label>Photos</Label>
          <div className="grid grid-cols-3 gap-2">
            {mediaUrls.map((url, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl overflow-hidden bg-[var(--muted)] relative group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeMedia(i)}
                  className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <label className="aspect-square rounded-xl border-2 border-dashed border-[var(--border)] bg-white flex flex-col items-center justify-center text-[var(--foreground)]/60 cursor-pointer hover:bg-[var(--muted)]">
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-xs">Add</span>
                </>
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
          {uploadError && (
            <p className="text-xs text-red-600 mt-1">{uploadError}</p>
          )}
        </div>
      )}

      {/* Title & when */}
      <Card className="p-4 space-y-3">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            required
            placeholder={
              module === "memory"
                ? "First time at the beach"
                : module === "first"
                ? "First word: mama"
                : module === "milestone"
                ? "Sits up unassisted"
                : module === "growth"
                ? "9-month checkup"
                : module === "feeding"
                ? "First solid food"
                : "Afternoon nap"
            }
          />
        </div>
        <div>
          <Label htmlFor="occurred_at">When</Label>
          <Input
            id="occurred_at"
            name="occurred_at"
            type="datetime-local"
            defaultValue={nowLocal()}
          />
        </div>
        <div>
          <Label htmlFor="caption">Notes</Label>
          <Textarea
            id="caption"
            name="caption"
            placeholder="A few words to remember this by…"
          />
        </div>
      </Card>

      {/* Module-specific extras */}
      {module === "growth" && <GrowthFields />}
      {module === "feeding" && <FeedingFields />}
      {module === "sleep" && <SleepFields />}
      {module === "milestone" && <MilestoneFields />}

      {error && (
        <div className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          <Save className="w-4 h-4" />
          {pending ? "Saving…" : "Save moment"}
        </Button>
      </div>
    </form>
  );
}

function GrowthFields() {
  return (
    <Card className="p-4 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="height_cm">Height (cm)</Label>
          <Input id="height_cm" name="height_cm" type="number" step="0.1" />
        </div>
        <div>
          <Label htmlFor="weight_kg">Weight (kg)</Label>
          <Input id="weight_kg" name="weight_kg" type="number" step="0.01" />
        </div>
        <div>
          <Label htmlFor="head_cm">Head (cm)</Label>
          <Input id="head_cm" name="head_cm" type="number" step="0.1" />
        </div>
      </div>
      <div>
        <Label htmlFor="data_notes">Doctor / notes</Label>
        <Textarea id="data_notes" name="data_notes" />
      </div>
    </Card>
  );
}

function FeedingFields() {
  return (
    <Card className="p-4 space-y-3">
      <div>
        <Label htmlFor="feed_type">Type</Label>
        <Select id="feed_type" name="feed_type" defaultValue="breast">
          <option value="breast">Breast</option>
          <option value="formula">Formula</option>
          <option value="solid">Solid food</option>
          <option value="water">Water</option>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="amount_ml">Amount (ml)</Label>
          <Input id="amount_ml" name="amount_ml" type="number" />
        </div>
        <div>
          <Label htmlFor="duration_min">Duration (min)</Label>
          <Input id="duration_min" name="duration_min" type="number" />
        </div>
      </div>
      <div>
        <Label htmlFor="data_notes">Notes</Label>
        <Textarea id="data_notes" name="data_notes" />
      </div>
    </Card>
  );
}

function SleepFields() {
  return (
    <Card className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="sleep_start">Start</Label>
          <Input
            id="sleep_start"
            name="sleep_start"
            type="datetime-local"
          />
        </div>
        <div>
          <Label htmlFor="sleep_end">End (leave blank if ongoing)</Label>
          <Input id="sleep_end" name="sleep_end" type="datetime-local" />
        </div>
      </div>
      <div>
        <Label htmlFor="data_notes">Notes</Label>
        <Textarea id="data_notes" name="data_notes" />
      </div>
    </Card>
  );
}

function MilestoneFields() {
  return (
    <Card className="p-4 space-y-3">
      <div>
        <Label htmlFor="milestone_category">Category</Label>
        <Select id="milestone_category" name="milestone_category">
          <option value="motor">Motor (crawling, walking)</option>
          <option value="language">Language (first word)</option>
          <option value="social">Social (first smile)</option>
          <option value="cognitive">Cognitive</option>
          <option value="other">Other</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="milestone_age_label">Age label</Label>
        <Input
          id="milestone_age_label"
          name="milestone_age_label"
          placeholder="e.g. 8 months"
        />
      </div>
      <div>
        <Label htmlFor="data_notes">Notes</Label>
        <Textarea id="data_notes" name="data_notes" />
      </div>
    </Card>
  );
}

function nowLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}