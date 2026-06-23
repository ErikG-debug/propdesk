"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { URGENCY_OPTIONS, urgencyLabel } from "@/components/ui/UrgencyBadge";
import { FieldValuesList } from "@/components/cases/FieldValuesList";
import { closeCase, reopenCase, useClosedCases } from "@/lib/closedCases";
import {
  markManual,
  unmarkManual,
  useManualCases,
  setUrgencyOverride,
  useUrgencyOverrides,
} from "@/lib/caseOverrides";
import { useCaseStages, setCaseStage } from "@/lib/caseStages";
import { useRoutingCategories } from "@/lib/categories";
import type { Urgency } from "@/lib/types";
import type { CaseStatus } from "@prisma/client";

type Sender = "resident" | "bo" | "handler" | "contractor";

type ThreadMessage = {
  id: string;
  sender: Sender;
  senderName?: string;
  body: string;
  sentAt: string;
};

const CONTRACTOR_THREAD: ThreadMessage[] = [
  {
    id: "c1",
    sender: "bo",
    body: "Hej Anders! Vi har en akut vattenläcka under diskbänken. Kan du ta det idag eller imorgon?",
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "c2",
    sender: "contractor",
    senderName: "Anders (Rörmokare)",
    body: "Hej! Imorgon onsdag funkar. Jag kan mellan 14–16.",
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 2.5).toISOString(),
  },
  {
    id: "c3",
    sender: "handler",
    senderName: "Karin",
    body: "Perfekt, jag bokar onsdag 14–16. Återkommer när hyresgästen bekräftat tillträde.",
    sentAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
];

type StepState = "done" | "active" | "pending";
const BOOKING_STEPS: { label: string; state: StepState; sub?: string }[] = [
  { label: "Ärende komplett", state: "done", sub: "Alla uppgifter inhämtade" },
  { label: "Servicepersonal kontaktad", state: "done", sub: "Anders · Rörmokare" },
  { label: "Tid bokad", state: "done", sub: "Anders · onsdag 14–16" },
  { label: "Tillträde bekräftat", state: "active", sub: "Väntar på hyresgäst" },
  { label: "Åtgärdat & avslutat", state: "pending" },
];

interface CaseDetail {
  id: string;
  status: CaseStatus;
  subject: string;
  residentEmail: string;
  residentName: string | null;
  summary: string | null;
  escalationNote: string | null;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    fields: { key: string; label: string; required: boolean }[];
  } | null;
  property: { name: string } | null;
  fieldValues: { field: { key: string; label: string }; value: string }[];
  messages: { id: string; fromResident: boolean; body: string; sentAt: string }[];
}

function senderMeta(sender: Sender, senderName?: string) {
  switch (sender) {
    case "resident":
      return { label: senderName ?? "Hyresgäst", side: "left" as const, bubble: "bg-gray-100 text-gray-800", meta: "text-gray-400" };
    case "bo":
      return { label: "Bo (AI)", side: "right" as const, bubble: "bg-[#1a6ba8] text-white", meta: "text-blue-200" };
    case "handler":
      return { label: senderName ?? "Handläggare", side: "right" as const, bubble: "bg-[#1a6ba8] text-white", meta: "text-blue-200" };
    case "contractor":
      return { label: senderName ?? "Servicepersonal", side: "left" as const, bubble: "bg-amber-50 text-gray-800 border border-amber-200", meta: "text-amber-700" };
  }
}

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const caseId = params.id;
  const router = useRouter();

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const closedIds = useClosedCases();
  const manualIds = useManualCases();
  const urgencyOverrides = useUrgencyOverrides();
  const stages = useCaseStages();

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"resident" | "contractor">("resident");

  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardSummary, setForwardSummary] = useState("");
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwardError, setForwardError] = useState<string | null>(null);
  const [forwardSent, setForwardSent] = useState(false);

  const routingCats = useRoutingCategories();
  const [selectedRoutingId, setSelectedRoutingId] = useState("");

  useEffect(() => {
    if (routingCats.length > 0 && !selectedRoutingId) {
      const match = routingCats.find(
        (c) => c.name.toLowerCase() === (caseData?.category?.name ?? "").toLowerCase(),
      );
      setSelectedRoutingId(match?.id ?? routingCats[0]?.id ?? "");
    }
  }, [routingCats, caseData, selectedRoutingId]);

  const selectedRouting = useMemo(
    () => routingCats.find((c) => c.id === selectedRoutingId) ?? routingCats[0] ?? null,
    [routingCats, selectedRoutingId],
  );

  const fetchCase = useCallback(async () => {
    const res = await fetch(`/api/cases/${caseId}`);
    if (res.ok) setCaseData(await res.json());
    setLoading(false);
  }, [caseId]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSignature(d.signature ?? ""))
      .catch(() => setSignature(""));
  }, []);

  const isBooked = stages[caseId] === "booked";
  const isReallyClosed =
    closedIds.has(caseId) ||
    caseData?.status === "CLOSED" ||
    caseData?.status === "ARCHIVED";
  const isClosed = isReallyClosed || isBooked;
  const isManual =
    !isClosed && (manualIds.has(caseId) || caseData?.status === "ESCALATED");

  const currentUrgency: Urgency = urgencyOverrides[caseId] ?? "LOW";

  const residentMessages: ThreadMessage[] = useMemo(
    () =>
      (caseData?.messages ?? []).map((m, i) => ({
        id: m.id,
        sender: m.fromResident
          ? "resident"
          : i === (caseData?.messages.length ?? 0) - 1
          ? "handler"
          : "bo",
        senderName: m.fromResident
          ? (caseData?.residentName ?? "Hyresgäst")
          : i === (caseData?.messages.length ?? 0) - 1
          ? "Karin"
          : undefined,
        body: m.body,
        sentAt: m.sentAt,
      })),
    [caseData],
  );

  if (loading) {
    return <div className="py-20 text-center text-gray-400">Laddar ärende…</div>;
  }
  if (!caseData) {
    return <div className="py-20 text-center text-gray-500">Ärendet hittades inte.</div>;
  }

  const activeMessages = activeTab === "resident" ? residentMessages : CONTRACTOR_THREAD;

  async function openForward() {
    if (!caseData || !selectedRouting) return;
    setForwardOpen(true);
    setForwardSent(false);
    setForwardSummary("");
    setForwardError(null);
    setForwardLoading(true);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: caseData.subject,
          residentName: caseData.residentName,
          residentEmail: caseData.residentEmail,
          category: selectedRouting.name,
          messages: caseData.messages,
        }),
      });
      const data = await res.json();
      if (data.error) setForwardError(data.error);
      setForwardSummary(data.summary ?? "");
    } catch (e) {
      setForwardError(e instanceof Error ? e.message : "Okänt fel");
    } finally {
      setForwardLoading(false);
    }
  }

  function confirmForward() {
    setForwardSent(true);
    setTimeout(() => setForwardOpen(false), 1200);
  }

  function confirmMarkManual() {
    if (
      window.confirm(
        "Markera detta ärende som manuellt fall? Det flyttas till fliken Manuella fall och Bo slutar svara.",
      )
    ) {
      markManual(caseId);
      fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ESCALATED" }),
      }).catch(() => null);
      router.push("/dashboard?filter=manuella");
    }
  }

  async function handleClose() {
    closeCase(caseId);
    setCaseStage(caseId, null);
    await fetch(`/api/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" }),
    }).catch(() => null);
    router.push("/dashboard?filter=avslutade");
  }

  async function handleReopen() {
    reopenCase(caseId);
    setCaseStage(caseId, null);
    markManual(caseId);
    await fetch(`/api/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    }).catch(() => null);
    router.push("/dashboard?filter=manuella");
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !caseData) return;
    setSending(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Kunde inte skicka svaret.");
        return;
      }
      const { message } = await res.json();
      setCaseData({
        ...caseData,
        messages: [...caseData.messages, message],
        updatedAt: new Date().toISOString(),
      });
      setReply("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <Link
        href="/dashboard"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-900"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Ärenden
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ===== KONVERSATION ===== */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.07),0_6px_16px_rgba(0,0,0,0.05)]">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{caseData.subject}</h1>
                <p className="mt-0.5 text-sm text-gray-500">
                  {caseData.residentName ?? caseData.residentEmail}
                  {caseData.residentName && (
                    <span className="ml-1 text-gray-400">· {caseData.residentEmail}</span>
                  )}
                </p>
              </div>
              <StatusBadge status={caseData.status} />
            </div>

            {/* Tabs – underline style */}
            <div className="mb-4 flex gap-1 border-b border-gray-200">
              {([
                { key: "resident", label: "Hyresgäst" },
                { key: "contractor", label: "Servicepersonal" },
              ] as const).map((t) => {
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key)}
                    className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "border-[#1a6ba8] text-[#1a6ba8]"
                        : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <ThreadView messages={activeMessages} />

            {activeTab === "resident" && isManual && !isClosed && (
              <form onSubmit={sendReply} className="mt-6 border-t border-gray-100 pt-4">
                <label htmlFor="reply" className="mb-2 block text-sm font-medium text-gray-700">
                  Svara på ärendet
                </label>
                <div className="overflow-hidden rounded-lg border border-gray-300 focus-within:border-[#1a6ba8] focus-within:ring-2 focus-within:ring-[#1a6ba8]/20">
                  <textarea
                    id="reply"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={4}
                    placeholder="Skriv ditt svar till hyresgästen…"
                    className="w-full resize-y px-3 py-2 text-sm outline-none"
                  />
                  {signature && (
                    <div className="border-t border-dashed border-gray-200 px-3 py-2">
                      <p className="whitespace-pre-wrap text-xs text-gray-400">{signature}</p>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Signaturen läggs till automatiskt vid utskick.
                  </p>
                  <button
                    type="submit"
                    disabled={sending || !reply.trim()}
                    className="rounded-md bg-[#1a6ba8] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#155a8f] disabled:opacity-50"
                  >
                    {sending ? "Skickar…" : "Skicka svar"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === "resident" && !isManual && !isClosed && (
              <div className="mt-6 rounded-md border border-[#1a6ba8]/20 bg-[#1a6ba8]/5 px-4 py-3 text-sm text-[#1a6ba8]">
                Bo jobbar med detta ärende. Markera det som manuellt fall om du vill ta över.
              </div>
            )}

            {activeTab === "contractor" && (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <p className="mb-3 text-xs text-gray-500">
                  Åtgärder mot servicepersonal
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-[#1a6ba8] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#155a8f]"
                  >
                    Kontakta servicepersonal
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Bekräfta tid
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== SIDOPANEL ===== */}
        <div className="space-y-4">
          {/* Bokningsstatus – only when isBooked */}
          {isBooked && (
            <div className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.07),0_6px_16px_rgba(0,0,0,0.05)]">
              <h2 className="mb-3 text-sm font-medium text-gray-700">Bokningsstatus</h2>
              <ol className="relative space-y-3">
                {BOOKING_STEPS.map((step, i) => {
                  const isLast = i === BOOKING_STEPS.length - 1;
                  const circle =
                    step.state === "done"
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : step.state === "active"
                      ? "bg-[#1a6ba8] text-white border-[#1a6ba8] ring-4 ring-[#1a6ba8]/20"
                      : "bg-white text-gray-400 border-gray-300";
                  const labelClass =
                    step.state === "pending"
                      ? "text-gray-400"
                      : step.state === "active"
                      ? "text-[#1a6ba8] font-medium"
                      : "text-gray-800 font-medium";
                  return (
                    <li key={step.label} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${circle}`}>
                          {step.state === "done" ? "✓" : i + 1}
                        </div>
                        {!isLast && (
                          <div className={`mt-1 w-px flex-1 ${step.state === "done" ? "bg-emerald-300" : "bg-gray-200"}`} />
                        )}
                      </div>
                      <div className="pb-2">
                        <p className={`text-sm ${labelClass}`}>{step.label}</p>
                        {step.sub && step.state !== "pending" && (
                          <p className="mt-0.5 text-xs text-gray-500">{step.sub}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Prioritet – only when manual */}
          {isManual && !isClosed && (
            <div className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.07),0_6px_16px_rgba(0,0,0,0.05)]">
              <h2 className="mb-3 text-sm font-medium text-gray-700">Prioritet</h2>
              <label htmlFor="urgency" className="sr-only">Prioritet</label>
              <select
                id="urgency"
                value={currentUrgency}
                onChange={(e) => setUrgencyOverride(caseId, e.target.value as Urgency)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1a6ba8] focus:ring-2 focus:ring-[#1a6ba8]/20"
              >
                {URGENCY_OPTIONS.map((u) => (
                  <option key={u} value={u}>{urgencyLabel(u)}</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-400">Ändringar syns även i översikten.</p>
            </div>
          )}

          {/* Manuellt fall – when not already manual */}
          {!isClosed && !isManual && (
            <div className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.07),0_6px_16px_rgba(0,0,0,0.05)]">
              <h2 className="mb-1 text-sm font-medium text-gray-700">Manuellt fall</h2>
              <p className="mb-3 text-xs text-gray-400">
                Ta över ärendet manuellt. Det flyttas till fliken Manuella fall.
              </p>
              <button
                type="button"
                onClick={confirmMarkManual}
                className="w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
              >
                Manuellt fall
              </button>
            </div>
          )}

          {/* Information */}
          <div className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.07),0_6px_16px_rgba(0,0,0,0.05)]">
            {(isManual || isClosed) ? (
              <button
                type="button"
                onClick={() => setInfoOpen((v) => !v)}
                className="flex w-full items-center justify-between text-left"
                aria-expanded={infoOpen}
              >
                <span className="text-sm font-medium text-gray-700">Information</span>
                <span className={`text-gray-400 transition-transform ${infoOpen ? "rotate-180" : ""}`} aria-hidden>▾</span>
              </button>
            ) : (
              <h2 className="mb-3 text-sm font-medium text-gray-700">Information</h2>
            )}

            {(!(isManual || isClosed) || infoOpen) && (
              <div className={(isManual || isClosed) ? "mt-3" : ""}>
                <dl className="space-y-2 text-sm">
                  {caseData.category && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Kategori</dt>
                      <dd className="font-medium text-gray-900">{caseData.category.name}</dd>
                    </div>
                  )}
                  {caseData.property && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Fastighet</dt>
                      <dd className="font-medium text-gray-900">{caseData.property.name}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Skapat</dt>
                    <dd className="font-medium text-gray-900">
                      {new Date(caseData.createdAt).toLocaleDateString("sv-SE")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-500">Tillträde</dt>
                    <dd>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Ej bekräftat
                      </span>
                    </dd>
                  </div>
                </dl>

                {caseData.escalationNote && (
                  <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {caseData.escalationNote}
                  </div>
                )}

                {caseData.category && (
                  <>
                    <hr className="my-4 border-gray-100" />
                    <FieldValuesList
                      fieldValues={caseData.fieldValues.filter((fv) => fv.field.key !== "severity")}
                      requiredFields={caseData.category.fields.filter((f) => f.key !== "severity")}
                    />
                  </>
                )}
              </div>
            )}
          </div>

          {/* Skicka vidare – only when manual */}
          {!isClosed && isManual && (
            <div className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.07),0_6px_16px_rgba(0,0,0,0.05)]">
              <h2 className="mb-1 text-sm font-medium text-gray-700">Skicka vidare</h2>
              <p className="mb-3 text-xs text-gray-400">
                Välj kategori — mottagaradressen hämtas automatiskt från inställningarna.
              </p>
              <label htmlFor="routing-cat" className="sr-only">Kategori</label>
              <select
                id="routing-cat"
                value={selectedRoutingId}
                onChange={(e) => setSelectedRoutingId(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1a6ba8] focus:ring-2 focus:ring-[#1a6ba8]/20"
              >
                {routingCats.length === 0 && (
                  <option value="">Inga kategorier — lägg till i Inställningar</option>
                )}
                {routingCats.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {selectedRouting && (
                <p className="mt-2 text-xs text-gray-500">
                  Skickas till <span className="font-medium text-gray-800">{selectedRouting.email}</span>
                </p>
              )}
              <button
                type="button"
                disabled={!selectedRouting}
                onClick={openForward}
                className="mt-3 w-full rounded-md bg-[#1a6ba8] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#155a8f] disabled:opacity-40"
              >
                Skicka vidare ärende
              </button>
            </div>
          )}

          {/* Öppna/Avsluta */}
          {isReallyClosed ? (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleReopen}
                className="text-sm font-medium text-gray-600 underline-offset-4 transition hover:text-gray-900 hover:underline"
              >
                Öppna ärende igen
              </button>
            </div>
          ) : (isManual || isBooked) ? (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="text-sm font-medium text-[#1a6ba8] underline-offset-4 transition hover:text-[#155a8f] hover:underline"
              >
                Avsluta ärende
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* ===== FORWARD MODAL ===== */}
      {forwardOpen && selectedRouting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !forwardLoading && setForwardOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">Skicka vidare ärende</h3>
            <p className="mt-1 text-sm text-gray-500">Granska sammanfattningen innan ärendet skickas.</p>

            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Kategori</dt>
                <dd className="font-medium text-gray-900">{selectedRouting.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Skickas till</dt>
                <dd className="font-medium text-gray-900">{selectedRouting.email}</dd>
              </div>
            </dl>

            <div className="mt-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">AI-sammanfattning</p>
              <div className="min-h-32 whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
                {forwardLoading && <span className="text-gray-400">Genererar sammanfattning…</span>}
                {!forwardLoading && forwardError && <span className="text-red-500">{forwardError}</span>}
                {!forwardLoading && !forwardError && forwardSummary}
              </div>
            </div>

            {forwardSent ? (
              <div className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                ✓ Skickat till {selectedRouting.email}
              </div>
            ) : (
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setForwardOpen(false)}
                  disabled={forwardLoading}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={confirmForward}
                  disabled={forwardLoading || !forwardSummary}
                  className="rounded-md bg-[#1a6ba8] px-4 py-2 text-sm font-medium text-white hover:bg-[#155a8f] disabled:opacity-40"
                >
                  Godkänn & skicka
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ThreadView({ messages }: { messages: ThreadMessage[] }) {
  if (messages.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">Inga meddelanden ännu.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg) => {
        const m = senderMeta(msg.sender, msg.senderName);
        return (
          <div key={msg.id} className={`flex ${m.side === "left" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${m.bubble}`}>
              <p className="whitespace-pre-wrap">{msg.body}</p>
              <p className={`mt-1.5 text-right text-xs ${m.meta}`}>
                {m.label} ·{" "}
                {new Date(msg.sentAt).toLocaleString("sv-SE", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
