"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CaseRow } from "@/components/cases/CaseRow";
import { ReviewDeck, type ReviewCase } from "@/components/cases/ReviewDeck";
import { ThermalStripe } from "@/components/ui/ThermalStripe";
import { useClosedCases, closeCase } from "@/lib/closedCases";
import { useManualCases, useUrgencyOverrides, markManual } from "@/lib/caseOverrides";
import { useCaseStages, setCaseStage } from "@/lib/caseStages";
import type { Urgency } from "@/lib/types";
import type { CaseStatus } from "@prisma/client";

type FilterValue = "ALL" | "READY" | "MANUAL" | "CLOSED";
type SortValue = "date_desc" | "date_asc" | "prio_desc" | "prio_asc";

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "date_desc", label: "Senast tillagt" },
  { value: "date_asc", label: "Äldst först" },
  { value: "prio_desc", label: "Prioritet: hög → låg" },
  { value: "prio_asc", label: "Prioritet: låg → hög" },
];

const URGENCY_RANK: Record<Urgency, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 };

const TABS: { label: string; value: FilterValue }[] = [
  { label: "Alla",                  value: "ALL" },
  { label: "Redo för godkännande", value: "READY" },
  { label: "Manuella fall",        value: "MANUAL" },
  { label: "Avslutade",            value: "CLOSED" },
];

const FILTER_MAP: Record<string, FilterValue> = {
  alla:     "ALL",
  redo:     "READY",
  manuella: "MANUAL",
  avslutade: "CLOSED",
  ALL:      "ALL",
  READY:    "READY",
  MANUAL:   "MANUAL",
  CLOSED:   "CLOSED",
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
  const urgencyOverrides = useUrgencyOverrides();
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
    urgency: Urgency;
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
        const urgency: Urgency = urgencyOverrides[c.id] ?? "LOW";
        return { ...c, urgency, isClosed, isManual, isReady };
      }),
    [rawCases, closedIds, manualIds, urgencyOverrides, stages],
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
    filteredCases = [...filteredCases].sort((a, b) => {
      switch (sort) {
        case "date_desc": return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "date_asc":  return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case "prio_desc": return URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency];
        case "prio_asc":  return URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
      }
    });
  }

  function countFor(f: FilterValue) {
    return cases.filter((c) => matches(c, f)).length;
  }

  function tagFor(c: Enriched): "collecting" | "waiting" | "ready" | "manual" | "in_progress" | "closed" | null {
    if (c.isClosed) return "closed";
    if (c.isManual) return "manual";
    if (c.isReady) return "ready";
    if (c.status === "IN_PROGRESS") return "in_progress";
    if (c.status === "WAITING_FOR_RESIDENT") return "waiting";
    return "collecting";
  }

  const reviewCases: ReviewCase[] = useMemo(
    () =>
      cases
        .filter((c) => c.isReady)
        .map((c) => ({
          id: c.id,
          subject: c.subject,
          residentEmail: c.residentEmail,
          residentName: c.residentName,
          urgency: c.urgency,
          category: c.category,
          property: c.property,
          summary: c.summary ?? "AI-sammanfattning saknas för detta ärende.",
          assignee: c.category?.name ?? "—",
          reportedAt: c.updatedAt,
        })),
    [cases],
  );

  const handleApprove = (id: string) => {
    // Teknikern godkänd — sätt stage och uppdatera status till IN_PROGRESS
    setCaseStage(id, null);
    fetch(`/api/cases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    }).catch(() => null);
    setRawCases((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "IN_PROGRESS" as CaseStatus } : c))
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
      <div className="mb-3 flex items-center justify-between gap-1 overflow-x-auto border-b border-gray-200 pb-px">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const count = countFor(tab.value);
            const isActive = activeFilter === tab.value;
            return (
              <Link
                key={tab.value}
                href={`/dashboard?filter=${FILTER_SLUG[tab.value]}`}
                className={`flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm font-medium transition ${
                  isActive ? "text-[#1a6ba8]" : "text-gray-500 hover:text-[#1a6ba8]"
                }`}
              >
                <span className="relative">
                  {tab.label}
                  {isActive && (
                    <ThermalStripe
                      orientation="horizontal"
                      className="pointer-events-none absolute inset-x-0 -bottom-[5px] h-[2px] rounded-full"
                    />
                  )}
                </span>
                {count > 0 && (
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
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
        <div className="divide-y divide-blue-50 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm shadow-blue-100">
          {filteredCases.map((c) => (
            <CaseRow
              key={c.id}
              id={c.id}
              subject={c.subject}
              residentEmail={c.residentEmail}
              residentName={c.residentName}
              urgency={c.urgency}
              tag={tagFor(c)}
              fromFilter={FILTER_SLUG[activeFilter]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
