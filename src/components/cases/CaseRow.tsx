"use client";

import Link from "next/link";
import { UrgencyBadge } from "@/components/ui/UrgencyBadge";
import { ThermalStripe } from "@/components/ui/ThermalStripe";
import type { Urgency } from "@/lib/types";

type TagKind = "collecting" | "waiting" | "ready" | "manual" | "in_progress" | "closed" | null;

function Tag({ kind }: { kind: TagKind }) {
  if (!kind) return <span className="invisible rounded-full px-2.5 py-1 text-xs font-semibold">Platshållare</span>;
  const styles: Record<Exclude<TagKind, null>, { label: string; cls: string }> = {
    collecting:  { label: "Bo samlar info",          cls: "bg-[#1a6ba8]/10 text-[#1a6ba8]" },
    waiting:     { label: "Väntar på svar",           cls: "bg-violet-50 text-violet-700" },
    ready:       { label: "Redo för godkännande",     cls: "bg-blue-50 text-blue-700" },
    manual:      { label: "Manuellt fall",            cls: "bg-amber-100 text-amber-800" },
    in_progress: { label: "Pågår",                   cls: "bg-emerald-50 text-emerald-700" },
    closed:      { label: "Avslutat",                cls: "bg-gray-100 text-gray-600" },
  };
  const { label, cls } = styles[kind];
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

interface CaseRowProps {
  id: string;
  subject: string;
  residentEmail: string;
  residentName: string | null;
  urgency: Urgency;
  tag?: TagKind;
  fromFilter?: string;
}

export function CaseRow({ id, subject, residentEmail, residentName, urgency, tag = null, fromFilter }: CaseRowProps) {
  return (
    <Link
      href={`/dashboard/cases/${id}`}
      className="block"
      onClick={() => {
        if (typeof window !== "undefined" && fromFilter) {
          sessionStorage.setItem("bodesk:lastFilter", fromFilter);
        }
      }}
    >
      <div className="group relative flex items-center gap-4 px-5 py-4 transition hover:bg-[#1a6ba8]/5">
        <ThermalStripe
          className="pointer-events-none absolute left-0 top-2 bottom-2 w-1 rounded-r-full opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-gray-900">{subject}</p>
          <p className="mt-0.5 truncate text-sm text-gray-500">
            {residentName ?? residentEmail}
            {residentName && (
              <span className="ml-1 text-gray-400">· {residentEmail}</span>
            )}
          </p>
        </div>

        <div className="flex w-[128px] shrink-0 justify-center">
          <Tag kind={tag} />
        </div>

        <div className="flex w-[104px] shrink-0 justify-center">
          <UrgencyBadge urgency={urgency} />
        </div>
      </div>
    </Link>
  );
}
