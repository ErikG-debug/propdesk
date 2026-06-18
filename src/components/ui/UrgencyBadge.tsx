import type { Urgency } from "@/lib/types";

const CONFIG: Record<Urgency, { label: string; classes: string }> = {
  LOW: {
    label: "Låg",
    classes: "bg-slate-50 text-slate-600 ring-1 ring-slate-200",
  },
  MEDIUM: {
    label: "Medel",
    classes: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  },
  HIGH: {
    label: "Hög",
    classes: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  },
  URGENT: {
    label: "Brådskande",
    classes: "bg-red-50 text-red-700 ring-1 ring-red-200",
  },
};

export const URGENCY_OPTIONS: Urgency[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function urgencyLabel(urgency: Urgency) {
  return CONFIG[urgency].label;
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const { label, classes } = CONFIG[urgency];
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  );
}
