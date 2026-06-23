"use client";

import Link from "next/link";

type TagKind = "waiting" | "ready" | "manual" | "in_progress" | "closed" | null;

function Tag({ kind }: { kind: TagKind }) {
  if (!kind) return null;
  const styles: Record<Exclude<TagKind, null>, { label: string; cls: string }> = {
    waiting:     { label: "Väntar på svar",       cls: "bg-violet-50 text-violet-700 ring-1 ring-violet-100" },
    ready:       { label: "Redo för godkännande", cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-100" },
    manual:      { label: "Manuellt fall",        cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
    in_progress: { label: "Pågår",               cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
    closed:      { label: "Avslutat",            cls: "bg-gray-100 text-gray-500 ring-1 ring-gray-200" },
  };
  const { label, cls } = styles[kind];
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

interface CaseRowProps {
  id: string;
  subject: string;
  residentEmail: string;
  residentName: string | null;
  tag?: TagKind;
  fromFilter?: string;
}

export function CaseRow({ id, subject, residentEmail, residentName, tag = null, fromFilter }: CaseRowProps) {
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
      <div className="group relative flex items-center gap-4 px-5 py-4 transition hover:bg-[#1a6ba8]/[0.03]">
        <span className="pointer-events-none absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full bg-[#1a6ba8] opacity-0 -translate-x-0.5 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-gray-900">{subject}</p>
          <p className="mt-0.5 truncate text-sm text-gray-500">
            {residentName ?? residentEmail}
            {residentName && (
              <span className="ml-1 text-gray-400">· {residentEmail}</span>
            )}
          </p>
        </div>
        {tag && (
          <div className="shrink-0">
            <Tag kind={tag} />
          </div>
        )}
      </div>
    </Link>
  );
}
