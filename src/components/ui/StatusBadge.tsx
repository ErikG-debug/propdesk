import type { CaseStatus } from "@prisma/client";

const CONFIG: Record<CaseStatus, { label: string; classes: string }> = {
  COLLECTING_INFORMATION: {
    label: "Samlar information",
    classes: "bg-blue-100 text-blue-800",
  },
  WAITING_FOR_RESIDENT: {
    label: "Väntar på svar",
    classes: "bg-yellow-100 text-yellow-800",
  },
  READY_FOR_REVIEW: {
    label: "Redo för granskning",
    classes: "bg-green-100 text-green-800",
  },
  ESCALATED: {
    label: "Eskalerat",
    classes: "bg-red-100 text-red-800",
  },
  IN_PROGRESS: {
    label: "Pågående",
    classes: "bg-purple-100 text-purple-800",
  },
  CLOSED: {
    label: "Avslutat",
    classes: "bg-gray-100 text-gray-600",
  },
  ARCHIVED: {
    label: "Arkiverat",
    classes: "bg-gray-100 text-gray-400",
  },
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  const { label, classes } = CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}
