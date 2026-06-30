import {
  Camera,
  TrendingUp,
  Milk,
  Moon,
  Star,
  Sparkles,
  LucideIcon,
} from "lucide-react";
import type { ModuleType } from "@/lib/types";

const ICONS: Record<ModuleType, LucideIcon> = {
  memory: Camera,
  growth: TrendingUp,
  feeding: Milk,
  sleep: Moon,
  milestone: Star,
  first: Sparkles,
};

const COLORS: Record<ModuleType, string> = {
  memory: "bg-[var(--primary)]",
  growth: "bg-[var(--accent)]",
  feeding: "bg-[#f6c177]",
  sleep: "bg-[#b8b5e1]",
  milestone: "bg-[#e8a4d8]",
  first: "bg-[var(--accent-2)]",
};

const LABELS: Record<ModuleType, string> = {
  memory: "Memory",
  growth: "Growth",
  feeding: "Feeding",
  sleep: "Sleep",
  milestone: "Milestone",
  first: "First",
};

export function ModuleIcon({
  module,
  className,
}: {
  module: ModuleType;
  className?: string;
}) {
  const Icon = ICONS[module];
  return <Icon className={className} />;
}

export const ModuleColor = COLORS;
export const ModuleLabel = LABELS;
