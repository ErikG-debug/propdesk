"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  MapPin,
  User,
  AlertTriangle,
  Send,
  ChevronDown,
} from "lucide-react";
import { ThermalStripe } from "@/components/ui/ThermalStripe";
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
    if (total === 0) return;
    setDir(-1);
    setAnimKey((k) => k + 1);
    setIndex((i) => (i + 1) % total);
  };
  const prev = () => {
    if (total === 0) return;
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
      <div className="rounded-xl border border-blue-100 bg-white p-12 text-center text-gray-500 shadow-sm shadow-blue-100">
        Inga ärenden redo för godkännande just nu.
      </div>
    );
  }

  const enterClass =
    dir === -1
      ? "animate-[deck-in-right_280ms_ease-out]"
      : dir === 1
        ? "animate-[deck-in-left_280ms_ease-out]"
        : "";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <style>{`
        @keyframes deck-in-right {
          0% { transform: translateX(40%) rotate(2deg); opacity: 0; }
          100% { transform: translateX(0) rotate(0); opacity: 1; }
        }
        @keyframes deck-in-left {
          0% { transform: translateX(-40%) rotate(-2deg); opacity: 0; }
          100% { transform: translateX(0) rotate(0); opacity: 1; }
        }
      `}</style>

      <div className="relative mt-2 h-[560px]">
        <div
          key={animKey}
          className={`absolute inset-x-0 top-0 z-20 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-md shadow-blue-100/60 ${enterClass}`}
          style={{ height: "100%" }}
        >
          <ThermalStripe
            orientation="horizontal"
            className="pointer-events-none absolute inset-x-0 top-0 h-1"
          />

          <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 pb-4 pt-5">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold text-gray-900">{current.subject}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="mr-1 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium tabular-nums text-gray-600">
                {safeIndex + 1}/{total}
              </span>
              <button
                type="button"
                onClick={prev}
                aria-label="Föregående"
                className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-[#1a6ba8]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Nästa"
                className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-[#1a6ba8]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow icon={<User className="h-4 w-4" />} label="Boende">
                {current.residentName ?? "—"}
              </InfoRow>
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Kontakt">
                <span className="truncate">{current.residentEmail}</span>
                {current.contactPhone && (
                  <span className="block text-xs text-gray-500">{current.contactPhone}</span>
                )}
              </InfoRow>
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Adress">
                {current.property?.name ?? "—"}
              </InfoRow>

              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 text-gray-400">
                  <Send className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Skickas till
                  </div>
                  {contractors.length === 0 ? (
                    <div className="text-sm italic text-gray-500">
                      Lägg till servicepersonal i inställningar
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setPickerOpen((v) => !v)}
                        className="-ml-2 flex w-[calc(100%+0.5rem)] items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm text-gray-800 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1a6ba8]/20"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {currentContractor ? (
                            <>
                              <span className="font-medium">{currentContractor.name}</span>
                              <span className="ml-1.5 text-xs text-gray-500">
                                · {currentContractor.role}
                              </span>
                            </>
                          ) : (
                            "Välj mottagare"
                          )}
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${pickerOpen ? "rotate-180" : ""}`}
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
                          <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg shadow-blue-100/40">
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
                                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-[#1a6ba8]/5 ${active ? "bg-[#1a6ba8]/5" : ""}`}
                                >
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate font-medium text-gray-900">
                                      {c.name}
                                    </span>
                                    <span className="block truncate text-xs text-gray-500">
                                      {c.role} · {c.email}
                                    </span>
                                  </span>
                                  {active && (
                                    <span className="shrink-0 text-xs font-medium text-[#1a6ba8]">
                                      Vald
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-blue-100 bg-[#1a6ba8]/[0.03] p-4">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#1a6ba8]">
                AI-sammanfattning
              </div>
              <p className="text-sm leading-relaxed text-gray-700">{current.summary}</p>
            </div>

            <div className="text-xs text-gray-400">
              Inrapporterat {new Date(current.reportedAt).toLocaleString("sv-SE")}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex gap-3 border-t border-gray-100 bg-white px-6 py-4">
            <button
              type="button"
              onClick={handleManual}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              <AlertTriangle className="h-4 w-4" />
              MANUELLT
            </button>
            <button
              type="button"
              onClick={handleApprove}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1a6ba8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#155689]"
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
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 text-gray-400">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</div>
        <div className="truncate text-sm text-gray-800">{children}</div>
      </div>
    </div>
  );
}
