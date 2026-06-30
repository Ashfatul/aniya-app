// Mirror the Supabase schema. Keep in sync with supabase/schema.sql.

export type UserRole = "owner" | "editor" | "viewer";

export interface Profile {
  id: string;            // = auth.users.id
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: UserRole;
  invited_email: string | null;
  joined_at: string | null;
  created_at: string;
  profile?: Profile;
}

export interface Family {
  id: string;
  name: string;
  baby_name: string;
  baby_birthday: string | null;
  baby_photo_url: string | null;
  baby_bio: string | null;
  created_by: string;
  created_at: string;
}

export type ModuleType =
  | "memory"
  | "growth"
  | "feeding"
  | "sleep"
  | "milestone"
  | "first";

export interface TimelineEntry {
  id: string;
  family_id: string;
  module: ModuleType;
  title: string;
  caption: string | null;
  occurred_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  media_urls: string[];
  // Module-specific extras stored as JSONB
  data: GrowthData | FeedingData | SleepData | Record<string, unknown>;
}

export interface GrowthData {
  height_cm?: number;
  weight_kg?: number;
  head_cm?: number;
  notes?: string;
}

export interface FeedingData {
  type: "breast" | "formula" | "solid" | "water";
  amount_ml?: number;
  duration_min?: number;
  notes?: string;
}

export interface SleepData {
  start_at: string;
  end_at: string | null;
  duration_min?: number;
  notes?: string;
}

export interface MilestoneData {
  category?: "motor" | "language" | "social" | "cognitive" | "other";
  age_label?: string;     // e.g. "first steps", "first word"
  notes?: string;
}

// Aggregate view used by the timeline page.
export interface TimelineItem {
  id: string;
  family_id: string;
  module: ModuleType;
  title: string;
  caption: string | null;
  occurred_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  media_urls: string[];
  data: Record<string, unknown>;
  creator?: Profile;
}