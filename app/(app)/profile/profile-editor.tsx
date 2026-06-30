"use client";

import { useActionState, useState } from "react";
import { Save, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  updateFamilyAction,
  updateProfileAction,
  type ActionState,
} from "../actions";
import type { Family, Profile } from "@/lib/types";

const initialState: ActionState = null;

export function ProfileEditor({
  family,
  profile,
}: {
  family: Family;
  profile: Profile | null;
}) {
  const [tab, setTab] = useState<"baby" | "you">("baby");

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Tab active={tab === "baby"} onClick={() => setTab("baby")}>
          Baby
        </Tab>
        <Tab active={tab === "you"} onClick={() => setTab("you")}>
          You
        </Tab>
      </div>

      {tab === "baby" ? <BabyForm family={family} /> : <UserForm profile={profile} />}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? "bg-[var(--primary)] text-white"
          : "bg-[var(--muted)] text-[var(--foreground)]/70 hover:bg-[var(--primary)]/20"
      }`}
    >
      {children}
    </button>
  );
}

function BabyForm({ family }: { family: Family }) {
  const [state, formAction, pending] = useActionState(
    updateFamilyAction,
    initialState
  );
  const [photoUrl, setPhotoUrl] = useState(family.baby_photo_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split(".").pop();
    const path = `${family.id}/profile/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("media")
      .upload(path, file, { upsert: true });

    if (error) {
      setUploadError(error.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("media").getPublicUrl(path);
    setPhotoUrl(publicUrl);
    setUploading(false);
  }

  const ok = state && "ok" in state && state.ok;

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label>Photo</Label>
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-[var(--muted)] overflow-hidden border border-[var(--border)] flex items-center justify-center">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Baby" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[var(--foreground)]/40 text-2xl font-script">
                {family.baby_name.charAt(0)}
              </span>
            )}
          </div>
          <label className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
            <span className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-[var(--border)] bg-white text-sm cursor-pointer hover:bg-[var(--muted)]">
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Upload
            </span>
          </label>
        </div>
        <input type="hidden" name="baby_photo_url" value={photoUrl} />
        {uploadError && (
          <p className="text-xs text-red-600 mt-1">{uploadError}</p>
        )}
      </div>

      <div>
        <Label htmlFor="baby_name">Name</Label>
        <Input
          id="baby_name"
          name="baby_name"
          required
          defaultValue={family.baby_name}
        />
      </div>

      <div>
        <Label htmlFor="baby_birthday">Birthday</Label>
        <Input
          id="baby_birthday"
          name="baby_birthday"
          type="date"
          defaultValue={family.baby_birthday ?? ""}
        />
      </div>

      <div>
        <Label htmlFor="baby_bio">About her</Label>
        <Textarea
          id="baby_bio"
          name="baby_bio"
          defaultValue={family.baby_bio ?? ""}
          placeholder="The little things that make her, her…"
        />
      </div>

      {ok && (
        <p className="text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2">
          Saved! 🎉
        </p>
      )}
      {state && !state.ok && (
        <p className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        <Save className="w-4 h-4" />
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

function UserForm({ profile }: { profile: Profile | null }) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialState
  );
  const ok = state && "ok" in state && state.ok;

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="display_name">Your display name</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={profile?.display_name ?? ""}
          placeholder="Mom, Dad, Grandma…"
        />
      </div>
      <p className="text-sm text-[var(--foreground)]/60">
        This is how family will see you in the timeline.
      </p>

      {ok && (
        <p className="text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2">
          Saved!
        </p>
      )}
      {state && !state.ok && (
        <p className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        <Save className="w-4 h-4" />
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}