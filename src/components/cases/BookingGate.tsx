"use client";

import { useState, useEffect } from "react";
import { Calendar, User, Phone, Mail, CheckCircle, X } from "lucide-react";
import { useContractors } from "@/lib/contractors";
import { useCaseAssignees } from "@/lib/caseAssignees";
import { setCaseStage } from "@/lib/caseStages";
import type { Urgency } from "@/lib/types";

export interface BookingCase {
  id: string;
  subject: string;
  residentEmail: string;
  residentName: string | null;
  urgency: Urgency;
  category: { name: string } | null;
  property: { name: string } | null;
  reportedAt: string;
}

interface Props {
  pendingCases: BookingCase[];   // stage === "booked" — väntar på tidslåsning
  lockedCases: BookingCase[];    // stage === "time_locked" — tid låst, väntar på utförande
  onMarkDone: (id: string) => void;
}

export function BookingGate({ pendingCases, lockedCases, onMarkDone }: Props) {
  const [index, setIndex] = useState(0);
  const [confirmedTime, setConfirmedTime] = useState("");
  const [locking, setLocking] = useState(false);

  const contractors = useContractors();
  const assignees = useCaseAssignees();

  const total = pendingCases.length;
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const current = pendingCases[safeIndex];

  useEffect(() => {
    if (index >= total && total > 0) setIndex(total - 1);
  }, [total, index]);

  useEffect(() => {
    setConfirmedTime("");
  }, [safeIndex, total]);

  const assignedContractor = current
    ? contractors.find((c) => c.id === assignees[current.id]) ?? contractors[0] ?? null
    : null;

  function lockTime() {
    if (!current || !confirmedTime.trim()) return;
    setLocking(true);
    setTimeout(() => {
      setCaseStage(current.id, "time_locked");
      setConfirmedTime("");
      setLocking(false);
      if (index >= total - 1) setIndex(Math.max(0, total - 2));
    }, 200);
  }

  function cancelBooking() {
    if (!current) return;
    setCaseStage(current.id, null);
    if (index >= total - 1) setIndex(Math.max(0, total - 2));
  }

  const hasPending = total > 0;
  const hasLocked = lockedCases.length > 0;

  if (!hasPending && !hasLocked) {
    return (
      <div className="rounded-xl border border-blue-100 bg-white p-12 text-center text-gray-500 shadow-sm shadow-blue-100">
        Inga bokningar att hantera just nu.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ===== GRIND 2: LÅS TID ===== */}
      {hasPending && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a6ba8]/10 px-3 py-1 text-xs font-semibold text-[#1a6ba8]">
              <Calendar className="h-3.5 w-3.5" />
              Grind 2 — Lås tid
            </span>
            <span className="text-xs text-gray-400">
              {total} {total === 1 ? "bokning" : "bokningar"} väntar på tidbekräftelse
            </span>
          </div>

          <div className="mx-auto w-full max-w-2xl">
            <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-md shadow-blue-100/60">
              <div className="h-[3px] w-full bg-[#1a6ba8]" />

              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 pb-4 pt-5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    {current.category?.name ?? "Okänd kategori"} · {current.property?.name ?? "Okänd fastighet"}
                  </p>
                  <h2 className="mt-0.5 truncate text-lg font-semibold text-gray-900">
                    {current.subject}
                  </h2>
                </div>
                {total > 1 && (
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="rounded-md bg-gray-50 px-2 py-1 text-xs font-medium tabular-nums text-gray-600">
                      {safeIndex + 1}/{total}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIndex((i) => (i - 1 + total) % total)}
                      className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-[#1a6ba8]"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => setIndex((i) => (i + 1) % total)}
                      className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-[#1a6ba8]"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="space-y-5 px-6 py-5">
                {/* Boende + Servicepersonal */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Boende</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-800">
                        <User className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        {current.residentName ?? "—"}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        {current.residentEmail}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Godkänd servicepersonal</p>
                    {assignedContractor ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                          <User className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                          {assignedContractor.name}
                          <span className="font-normal text-gray-500">· {assignedContractor.role}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                          {assignedContractor.email}
                        </div>
                        {assignedContractor.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                            {assignedContractor.phone}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm italic text-gray-400">Ingen servicepersonal vald</p>
                    )}
                  </div>
                </div>

                {/* Tidbekräftelse */}
                <div>
                  <label htmlFor={`time-${current.id}`} className="mb-1.5 block text-sm font-medium text-gray-700">
                    Bekräftad tid
                  </label>
                  <p className="mb-2 text-xs text-gray-400">
                    Ange den slutliga, överenskomna tidpunkten. När du låser blir bokningen bindande mot servicepersonalen.
                  </p>
                  <input
                    id={`time-${current.id}`}
                    type="text"
                    value={confirmedTime}
                    onChange={(e) => setConfirmedTime(e.target.value)}
                    placeholder="T.ex. onsdag 25 juni kl. 14–16"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#1a6ba8] focus:ring-2 focus:ring-[#1a6ba8]/20"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 border-t border-gray-100 bg-white px-6 py-4">
                <button
                  type="button"
                  onClick={cancelBooking}
                  className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  <X className="h-4 w-4" />
                  Avbryt bokning
                </button>
                <button
                  type="button"
                  onClick={lockTime}
                  disabled={locking || !confirmedTime.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1a6ba8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#155689] disabled:opacity-40"
                >
                  <Calendar className="h-4 w-4" />
                  {locking ? "Låser…" : "Lås tid & bekräfta bokning"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== BEKRÄFTADE BOKNINGAR (time_locked) ===== */}
      {hasLocked && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Tid låst — väntar på utförande
          </p>
          <div className="divide-y divide-blue-50 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm shadow-blue-100">
            {lockedCases.map((c) => {
              const contractor = contractors.find((ct) => ct.id === assignees[c.id]) ?? null;
              return (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                  <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{c.subject}</p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {c.residentName ?? c.residentEmail}
                      {contractor && (
                        <span className="ml-2 text-gray-400">· {contractor.name} ({contractor.role})</span>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    Tid låst
                  </span>
                  <button
                    type="button"
                    onClick={() => onMarkDone(c.id)}
                    className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Markera utfört
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
