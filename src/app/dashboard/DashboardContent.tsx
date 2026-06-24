"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CaseRow } from "@/components/cases/CaseRow";
import { ReviewDeck, type ReviewCase } from "@/components/cases/ReviewDeck";
import { useClosedCases, closeCase } from "@/lib/closedCases";
import { useManualCases, markManual } from "@/lib/caseOverrides";
import { useCaseStages, setCaseStage } from "@/lib/caseStages";
import type { CaseStatus } from "@prisma/client";

type FilterValue = "ALL" | "READY" | "MANUAL" | "CLOSED";
type SortValue = "date_desc" | "date_asc";

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "date_desc", label: "Senast tillagt" },
  { value: "date_asc",  label: "Äldst först" },
];

const TABS: { label: string; value: FilterValue }[] = [
  { label: "Alla",         value: "ALL" },
  { label: "Godkänn",     value: "READY" },
  { label: "Manuella fall", value: "MANUAL" },
  { label: "Avslutade",   value: "CLOSED" },
];

const FILTER_MAP: Record<string, FilterValue> = {
  alla:      "ALL",
  redo:      "READY",
  godkann:   "READY",
  manuella:  "MANUAL",
  avslutade: "CLOSED",
  ALL:    "ALL",
  READY:  "READY",
  MANUAL: "MANUAL",
  CLOSED: "CLOSED",
};

const FILTER_SLUG: Record<FilterValue, string> = {
  ALL:    "alla",
  READY:  "redo",
  MANUAL: "manuella",
  CLOSED: "avslutade",
};

interface RawCase {
  id: string;
  subject: string;
  residentEmail: string;
  residentName: string | null;
  status: CaseStatus;
  summary: string | null;
  updatedAt: string;
  category: { id: string; name: string } | null;
  property: { id: string; name: string } | null;
  fieldValues: { field: { key: string; label: string }; value: string }[];
  messages: { body: string }[];
}

export function DashboardContent() {
  const searchParams = useSearchParams();
  const rawFilter = searchParams.get("filter") ?? "alla";
  const activeFilter: FilterValue = FILTER_MAP[rawFilter] ?? "ALL";

  const [rawCases, setRawCases] = useState<RawCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortValue>("date_desc");

  const closedIds = useClosedCases();
  const manualIds = useManualCases();
  const stages = useCaseStages();

  useEffect(() => {
    fetch("/api/cases")
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setRawCases(data as RawCase[]);
      })
      .finally(() => setLoading(false));
  }, []);

  type Enriched = RawCase & {
    isClosed: boolean;
    isManual: boolean;
    isReady: boolean;
  };

  const cases: Enriched[] = useMemo(
    () =>
      rawCases.map((c) => {
        const isClosed =
          closedIds.has(c.id) || c.status === "CLOSED" || c.status === "ARCHIVED";
        const stage = stages[c.id];
        const isManual =
          !isClosed && (manualIds.has(c.id) || c.status === "ESCALATED");
        const isReady =
          !isClosed &&
          !isManual &&
          (stage === "ready_for_approval" || c.status === "READY_FOR_REVIEW");
        return { ...c, isClosed, isManual, isReady };
      }),
    [rawCases, closedIds, manualIds, stages],
  );

  function matches(c: Enriched, f: FilterValue) {
    switch (f) {
      case "ALL":    return !c.isClosed;
      case "READY":  return c.isReady;
      case "MANUAL": return !c.isClosed && c.isManual;
      case "CLOSED": return c.isClosed;
    }
  }

  const sortable = activeFilter === "ALL" || activeFilter === "MANUAL";

  let filteredCases = cases.filter((c) => matches(c, activeFilter));
  if (sortable) {
    filteredCases = [...filteredCases].sort((a, b) =>
      sort === "date_asc"
        ? new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  function countFor(f: FilterValue) {
    return cases.filter((c) => matches(c, f)).length;
  }

  function tagFor(c: Enriched): "waiting" | "ready" | "manual" | "in_progress" | "closed" | null {
    if (activeFilter === "CLOSED") return "closed";
    if (c.isManual) return "manual";
    if (c.isReady) return "ready";
    if (c.status === "IN_PROGRESS") return "in_progress";
    if (c.status === "WAITING_FOR_RESIDENT") return "waiting";
    return null;
  }

  const reviewCases: ReviewCase[] = useMemo(
    () =>
      cases
        .filter((c) => c.isReady)
        .map((c) => {
          const addressField = c.fieldValues.find((fv) =>
            /adress|address/i.test(fv.field.key),
          );
          return {
            id: c.id,
            subject: c.subject,
            residentEmail: c.residentEmail,
            residentName: c.residentName,
            urgency: "LOW" as const,
            category: c.category,
            property: c.property,
            address: addressField?.value,
            summary: c.summary ?? "AI-sammanfattning saknas för detta ärende.",
            assignee: c.category?.name ?? "—",
            reportedAt: c.updatedAt,
          };
        }),
    [cases],
  );

  const handleApprove = (id: string, contractorEmail?: string, contractorName?: string) => {
    setCaseStage(id, null);
    fetch(`/api/cases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    }).catch(() => null);

    if (contractorEmail) {
      const rc = reviewCases.find((c) => c.id === id);
      if (rc) {
        const lines = [
          `Hej${contractorName ? ` ${contractorName}` : ""},`,
          "",
          `Du har tilldelats ett nytt ärende: ${rc.subject}`,
          "",
          `Boende: ${rc.residentName ?? rc.residentEmail}`,
          ...(rc.property?.name ? [`Fastighet: ${rc.property.name}`] : []),
          "",
          rc.summary,
        ];
        fetch(`/api/cases/${id}/forward`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: contractorEmail,
            subject: `Nytt ärende: ${rc.subject}`,
            message: lines.join("\n"),
          }),
        }).catch(() => null);
      }
    }

    setRawCases((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "IN_PROGRESS" as CaseStatus } : c)),
    );
  };

  const handleManual = (id: string) => {
    setCaseStage(id, null);
    markManual(id);
  };

  const handleClose = (id: string) => {
    closeCase(id);
    fetch(`/api/cases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" }),
    }).catch(() => null);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-1 overflow-x-auto border-b border-gray-200">
        <div className="flex">
          {TABS.map((tab) => {
            const count = countFor(tab.value);
            const isActive = activeFilter === tab.value;
            return (
              <Link
                key={tab.value}
                href={`/dashboard?filter=${FILTER_SLUG[tab.value]}`}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? "border-[#1a6ba8] text-[#1a6ba8]"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-xs ${isActive ? "bg-[#1a6ba8]/10 text-[#1a6ba8]" : "bg-gray-100 text-gray-500"}`}>
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        {sortable && (
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortValue)}
            className="shrink-0 cursor-pointer rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-[#1a6ba8] focus:ring-1 focus:ring-[#1a6ba8]/20"
            aria-label="Sortera"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400">Laddar ärenden…</div>
      ) : activeFilter === "READY" ? (
        <ReviewDeck cases={reviewCases} onApprove={handleApprove} onManual={handleManual} />
      ) : filteredCases.length === 0 ? (
        <div className="py-20 text-center text-gray-500">Inga ärenden att visa</div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.07),0_6px_16px_rgba(0,0,0,0.05)]">
          {filteredCases.map((c) => (
            <CaseRow
              key={c.id}
              id={c.id}
              residentEmail={c.residentEmail}
              residentName={c.residentName}
              property={c.property}
              category={c.category}
              tag={tagFor(c)}
              fromFilter={FILTER_SLUG[activeFilter]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
