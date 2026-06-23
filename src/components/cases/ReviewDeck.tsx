"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, User, MapPin, ChevronDown, Check } from "lucide-react";
import { useContractors } from "@/lib/contractors";
import { useCaseAssignees, setCaseAssignee } from "@/lib/caseAssignees";
import type { Urgency } from "@/lib/types";

export interface ReviewCase {
  id: string;
  subject: string;
  residentEmail: string;
  residentName: string | null;
  urgency: Urgency;
  category: { name: string } | null;
  property: { name: string } | null;
  summary: string;
  assignee: string;
  contactPhone?: string;
  reportedAt: string;
}

interface Props {
  cases: ReviewCase[];
  onApprove: (id: string) => void;
  onManual: (id: string) => void;
}

type Dir = 1 | -1 | 0;

export function ReviewDeck({ cases, onApprove, onManual }: Props) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<Dir>(0);
  const [animKey, setAnimKey] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  const contractors = useContractors();
  const assignees = useCaseAssignees();

  const total = cases.length;
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const current = cases[safeIndex];

  useEffect(() => {
    if (index >= total && total > 0) setIndex(total - 1);
  }, [total, index]);

  useEffect(() => {
    setPickerOpen(false);
  }, [safeIndex, total]);

  const next = () => {
    if (total <= 1) return;
    setDir(-1);
    setAnimKey((k) => k + 1);
    setIndex((i) => (i + 1) % total);
  };
  const prev = () => {
    if (total <= 1) return;
    setDir(1);
    setAnimKey((k) => k + 1);
    setIndex((i) => (i - 1 + total) % total);
  };

  const handleApprove = () => {
    if (!current) return;
    setDir(-1);
    setAnimKey((k) => k + 1);
    onApprove(current.id);
  };
  const handleManual = () => {
    if (!current) return;
    setDir(-1);
    setAnimKey((k) => k + 1);
    onManual(current.id);
  };

  const currentContractor = useMemo(() => {
    if (!current || contractors.length === 0) return null;
    const explicitId = assignees[current.id];
    if (explicitId) {
      const found = contractors.find((c) => c.id === explicitId);
      if (found) return found;
    }
    const lower = current.assignee?.toLowerCase() ?? "";
    const fuzzy = contractors.find(
      (c) => lower.includes(c.name.toLowerCase()) || lower.includes(c.role.toLowerCase()),
    );
    return fuzzy ?? contractors[0];
  }, [contractors, assignees, current]);

  if (total === 0) {
    return (
      <div className="rounded-xl bg-white p-12 text-center text-gray-400 shadow-[0_1px_3px_rgba(0,0,0,0.07),0_6px_16px_rgba(0,0,0,0.05)]">
        Inga ärenden att godkänna just nu.
      </div>
    );
  }

  const enterClass =
    dir === -1
      ? "animate-[deck-in-right_260ms_ease-out]"
      : dir === 1
        ? "animate-[deck-in-left_260ms_ease-out]"
        : "";

  return (
    <div className="mx-auto w-full max-w-lg">
      <style>{`
        @keyframes deck-in-right {
          0%   { transform: translateX(38%) rotate(2.5deg); opacity: 0; }
          100% { transform: translateX(0)   rotate(0deg);   opacity: 1; }
        }
        @keyframes deck-in-left {
          0%   { transform: translateX(-38%) rotate(-2.5deg); opacity: 0; }
          100% { transform: translateX(0)    rotate(0deg);    opacity: 1; }
        }
      `}</style>

      {/* Stack wrapper — ghost cards peeking behind */}
      <div className="relative pb-3">
        {total > 2 && (
          <div
            className="absolute inset-x-6 top-4 bottom-0 rounded-2xl border border-gray-200 bg-[#eef0f3]"
            style={{ zIndex: 10 }}
          />
        )}
        {total > 1 && (
          <div
            className="absolute inset-x-3 top-2 bottom-0 rounded-2xl border border-gray-200 bg-[#f5f6f8]"
            style={{ zIndex: 11 }}
          />
        )}

        {/* Main card */}
        <div
          key={animKey}
          className={`relative z-20 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${enterClass}`}
        >
          <div className="absolute inset-x-0 top-0 h-[3px] bg-[#1a6ba8]" />

          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="min-w-0 flex-1">
              {current.category && (
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {current.category.name}
                </p>
              )}
              <h2 className="text-base font-semibold text-gray-900 leading-snug">
                {current.subject}
              </h2>
            </div>
            {total > 1 && (
              <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Föregående"
                  className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[32px] text-center text-xs font-medium tabular-nums text-gray-400">
                  {safeIndex + 1}/{total}
                </span>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Nästa"
                  className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* ── Body ── */}
          <div className="space-y-4 px-6 pt-5 pb-5">
            {/* Problem description */}
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#1a6ba8]">
                Problembeskrivning till tekniker
              </p>
              <p className="text-sm leading-relaxed text-gray-700">{current.summary}</p>
            </div>

            {/* Suggested technician */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Bo föreslår
              </p>
              {contractors.length === 0 ? (
                <p className="text-sm italic text-gray-400">
                  Lägg till servicepersonal i Inställningar
                </p>
              ) : currentContractor ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{currentContractor.name}</p>
                    <p className="text-xs text-gray-500">
                      {currentContractor.role}
                      {currentContractor.email && (
                        <> · {currentContractor.email}</>
                      )}
                    </p>
                  </div>
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setPickerOpen((v) => !v)}
                      className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:border-[#1a6ba8] hover:text-[#1a6ba8]"
                    >
                      Ändra
                      <ChevronDown
                        className={`h-3 w-3 transition-transform ${pickerOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {pickerOpen && (
                      <>
                        <button
                          type="button"
                          aria-hidden
                          onClick={() => setPickerOpen(false)}
                          className="fixed inset-0 z-30 cursor-default"
                        />
                        <div className="absolute right-0 top-full z-40 mt-1.5 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                          {contractors.map((c) => {
                            const active = currentContractor?.id === c.id;
                            return (
                              <button
                                type="button"
                                key={c.id}
                                onClick={() => {
                                  if (current) setCaseAssignee(current.id, c.id);
                                  setPickerOpen(false);
                                }}
                                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-[#1a6ba8]/5 ${active ? "bg-[#1a6ba8]/5" : ""}`}
                              >
                                <span className="min-w-0 flex-1">
                                  <span className="block font-medium text-gray-900">{c.name}</span>
                                  <span className="block text-xs text-gray-500">{c.role}</span>
                                </span>
                                {active && <Check className="h-4 w-4 shrink-0 text-[#1a6ba8]" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Ingen tekniker matchad</p>
              )}
            </div>

            {/* Resident & property */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {current.residentName ?? current.residentEmail}
              </span>
              {current.property?.name && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {current.property.name}
                </span>
              )}
              <span className="ml-auto">
                {new Date(current.reportedAt).toLocaleDateString("sv-SE")}
              </span>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-2 border-t border-gray-100 bg-gray-50/70 px-6 py-4">
            <button
              type="button"
              onClick={handleManual}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-500 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
            >
              Manuellt fall
            </button>
            <button
              type="button"
              onClick={handleApprove}
              className="flex-[2] rounded-lg bg-[#1a6ba8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#155689] active:scale-[0.98]"
            >
              Godkänn tekniker
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
