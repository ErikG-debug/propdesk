"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  AlertTriangle,
  User,
  Mail,
  MapPin,
  Send,
} from "lucide-react";
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
  address?: string;
  summary: string;
  assignee: string;
  contactPhone?: string;
  reportedAt: string;
}

interface Props {
  cases: ReviewCase[];
  onApprove: (id: string, contractorEmail?: string, contractorName?: string) => void;
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

  useEffect(() => { setPickerOpen(false); }, [safeIndex, total]);

  const navigate = (d: 1 | -1) => {
    if (total <= 1) return;
    setDir(d);
    setAnimKey((k) => k + 1);
    setIndex((i) => (i + d + total) % total);
  };

  const handleApprove = () => {
    if (!current) return;
    setDir(-1);
    setAnimKey((k) => k + 1);
    onApprove(current.id, currentContractor?.email, currentContractor?.name);
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
          0%   { transform: translateX(36%) rotate(2deg); opacity: 0; }
          100% { transform: translateX(0)  rotate(0deg);  opacity: 1; }
        }
        @keyframes deck-in-left {
          0%   { transform: translateX(-36%) rotate(-2deg); opacity: 0; }
          100% { transform: translateX(0)    rotate(0deg);  opacity: 1; }
        }
      `}</style>

      <div className="relative pb-3">
        {/* Ghost cards */}
        {total > 2 && (
          <div className="absolute inset-x-6 top-4 bottom-0 rounded-2xl border border-gray-200 bg-[#eef0f3]" style={{ zIndex: 10 }} />
        )}
        {total > 1 && (
          <div className="absolute inset-x-3 top-2 bottom-0 rounded-2xl border border-gray-200 bg-[#f5f6f8]" style={{ zIndex: 11 }} />
        )}

        {/* Main card */}
        <div
          key={animKey}
          className={`relative z-20 overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08),0_12px_28px_rgba(0,0,0,0.07)] ${enterClass}`}
        >
          {/* Top accent */}
          <div className="absolute inset-x-0 top-0 h-[3px] bg-[#1a6ba8]" />

          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
            <div className="min-w-0 flex-1">
              {current.category && (
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#1a6ba8]/70">
                  {current.category.name}
                </p>
              )}
              <h2 className="text-[17px] font-semibold leading-snug text-gray-900">
                {current.subject}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={total <= 1}
                aria-label="Föregående"
                className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[36px] text-center text-xs font-semibold tabular-nums text-gray-500">
                {safeIndex + 1}/{total}
              </span>
              <button
                type="button"
                onClick={() => navigate(1)}
                disabled={total <= 1}
                aria-label="Nästa"
                className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Info rows ── */}
          <div className="border-t border-gray-100 px-6 py-4 space-y-0 divide-y divide-gray-50">
            <InfoRow icon={<User className="h-4 w-4" />} label="Boende">
              <span className="font-medium text-gray-900">
                {current.residentName ?? <span className="italic text-gray-400">Ej angivet</span>}
              </span>
            </InfoRow>

            <InfoRow icon={<Mail className="h-4 w-4" />} label="Kontakt">
              <span className="text-gray-700">{current.residentEmail}</span>
              {current.contactPhone && (
                <span className="ml-2 text-gray-500">· {current.contactPhone}</span>
              )}
            </InfoRow>

            <InfoRow icon={<MapPin className="h-4 w-4" />} label="Adress">
              {current.address ?? current.property?.name ? (
                <span className="text-gray-700">{current.address ?? current.property?.name}</span>
              ) : (
                <span className="italic text-gray-400">Ej angivet</span>
              )}
            </InfoRow>

            <InfoRow icon={<Send className="h-4 w-4" />} label="Skickas till">
              {contractors.length === 0 ? (
                <span className="italic text-gray-400">Lägg till servicepersonal i Inställningar</span>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPickerOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white py-1 pl-2.5 pr-2 text-sm text-gray-800 transition hover:border-[#1a6ba8] hover:text-[#1a6ba8] focus:outline-none focus:ring-2 focus:ring-[#1a6ba8]/20"
                  >
                    {currentContractor ? (
                      <>
                        <span className="font-medium">{currentContractor.name}</span>
                        <span className="text-xs text-gray-400">{currentContractor.role}</span>
                      </>
                    ) : (
                      <span className="italic text-gray-400">Välj mottagare</span>
                    )}
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
                  </button>

                  {pickerOpen && (
                    <>
                      <button
                        type="button"
                        aria-hidden
                        onClick={() => setPickerOpen(false)}
                        className="fixed inset-0 z-30 cursor-default"
                      />
                      <div className="absolute left-0 top-full z-40 mt-1.5 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
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
              )}
            </InfoRow>
          </div>

          {/* ── AI Summary ── */}
          <div className="px-6 pb-4">
            <div className="rounded-xl border border-[#1a6ba8]/20 bg-[#1a6ba8]/[0.04] p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#1a6ba8]">
                AI-SAMMANFATTNING
              </p>
              <p className="text-sm leading-relaxed text-gray-700">{current.summary}</p>
            </div>

            <p className="mt-3 text-xs text-gray-400">
              Inrapporterat{" "}
              {new Date(current.reportedAt).toLocaleString("sv-SE", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4">
            <button
              type="button"
              onClick={handleManual}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm font-bold text-orange-400 transition hover:bg-orange-50 active:scale-[0.98]"
            >
              <AlertTriangle className="h-4 w-4" />
              MANUELLT
            </button>
            <button
              type="button"
              onClick={handleApprove}
              className="flex flex-[2] items-center justify-center rounded-xl bg-[#1a6ba8] px-4 py-3 text-sm font-bold tracking-wide text-white shadow-sm transition hover:bg-[#155689] active:scale-[0.98]"
            >
              GODKÄNN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex w-[120px] shrink-0 items-center gap-2 text-gray-400">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </div>
  );
}
