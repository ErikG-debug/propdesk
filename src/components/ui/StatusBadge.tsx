import type { CaseStatus } from "@/lib/types";

const CONFIG: Record<CaseStatus, { label: string; classes: string }> = {
  COLLECTING_INFORMATION: {
    label: "Samlar info",
    classes: "bg-slate-50 text-slate-500 ring-1 ring-slate-200",
  },
  WAITING_FOR_RESIDENT: {
    label: "Väntar på svar",
    classes: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  },
  READY_FOR_REVIEW: {
    label: "Redo",
    classes: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  },
  ESCALATED: {
    label: "Brådskande",
    classes: "bg-red-50 text-red-700 ring-1 ring-red-200",
  },
  IN_PROGRESS: {
    label: "Pågående",
    classes: "bg-[#1a6ba8]/8 text-[#1a6ba8] ring-1 ring-[#1a6ba8]/25",
  },
  CLOSED: {
    label: "Avslutat",
    classes: "bg-gray-50 text-gray-400 ring-1 ring-gray-200",
  },
  ARCHIVED: {
    label: "Arkiverat",
    classes: "bg-gray-50 text-gray-300 ring-1 ring-gray-100",
  },
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  const { label, classes } = CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}
