"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UrgencyBadge, URGENCY_OPTIONS, urgencyLabel } from "@/components/ui/UrgencyBadge";
import { FieldValuesList } from "@/components/cases/FieldValuesList";
import { closeCase, reopenCase, useClosedCases } from "@/lib/closedCases";
import {
  markManual,
  unmarkManual,
  useManualCases,
  setUrgencyOverride,
  useUrgencyOverrides,
} from "@/lib/caseOverrides";
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
    body: "Hej! Vi har ett ärende som matchar er kompetens. Kan du ta ett besök inom kort?",
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "c2",
    sender: "contractor",
    senderName: "Servicepersonal",
    body: "Hej! Imorgon funkar. Jag kan mellan 14–16.",
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 2.5).toISOString(),
  },
  {
    id: "c3",
    sender: "handler",
    senderName: "Handläggare",
    body: "Perfekt, jag bokar onsdag 14–16. Återkommer när hyresgästen bekräftat tillträde.",
    sentAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
];

type StepState = "done" | "active" | "pending";
const BOOKING_STEPS: { label: string; state: StepState; sub?: string }[] = [
  { label: "Ärende komplett", state: "done", sub: "Alla uppgifter inhämtade" },
  { label: "Servicepersonal kontaktad", state: "done" },
  { label: "Tid bokad", state: "active", sub: "Väntar på bekräftelse" },
  { label: "Tillträde bekräftat", state: "pending" },
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

function senderMeta(sender: Sender) {
  switch (sender) {
    case "resident":
      return {
        label: "Hyresgäst",
        side: "left" as const,
        bubble: "bg-gray-100 text-gray-800",
        meta: "text-gray-500",
      };
    case "bo":
      return {
        label: "Bo",
        side: "right" as const,
        bubble: "bg-[#1a6ba8] text-white",
        meta: "text-blue-200",
      };
    case "handler":
      return {
        label: "Handläggare",
        side: "right" as const,
        bubble: "bg-[#1a6ba8] text-white",
        meta: "text-blue-200",
      };
    case "contractor":
      return {
        label: "Hantverkare",
        side: "left" as const,
        bubble: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200",
        meta: "text-emerald-500",
      };
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

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
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

  const isClosed =
    closedIds.has(caseId) ||
    caseData?.status === "CLOSED" ||
    caseData?.status === "ARCHIVED";

  const isManual =
    !isClosed && (manualIds.has(caseId) || caseData?.status === "ESCALATED");

  const isBokat = caseData?.status === "IN_PROGRESS" && !isClosed && !isManual;

  const currentUrgency: Urgency = urgencyOverrides[caseId] ?? "LOW";

  const residentMessages: ThreadMessage[] = useMemo(
    () =>
      (caseData?.messages ?? []).map((m, i) => ({
        id: m.id,
        sender: m.fromResident
          ? "resident"
          : isManual || i === (caseData?.messages.length ?? 0) - 1
          ? "handler"
          : "bo",
        senderName: m.fromResident
          ? (caseData?.residentName ?? "Hyresgäst")
          : isManual
          ? "Handläggare"
          : undefined,
        body: m.body,
        sentAt: m.sentAt,
      })),
    [caseData, isManual],
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
    setTimeout(() => setForwardOpen(false), 1400);
  }

  async function handleMarkManual() {
    if (
      !window.confirm(
        "Markera som manuellt fall? Bo slutar svara och ärendet flyttas till Manuella fall.",
      )
    )
      return;
    markManual(caseId);
    await fetch(`/api/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ESCALATED" }),
    }).catch(() => null);
    router.push("/dashboard?filter=manuella");
  }

  async function handleClose() {
    closeCase(caseId);
    await fetch(`/api/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" }),
    }).catch(() => null);
    router.push("/dashboard?filter=avslutade");
  }

  async function handleReopen() {
    reopenCase(caseId);
    unmarkManual(caseId);
    await fetch(`/api/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    }).catch(() => null);
    router.push("/dashboard");
  }

  async function handleTakeOver() {
    markManual(caseId);
    await fetch(`/api/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    }).catch(() => null);
    await fetchCase();
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !caseData) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, 200));
    setCaseData({
      ...caseData,
      messages: [
        ...caseData.messages,
        {
          id: `local-${Date.now()}`,
          fromResident: false,
          body: reply.trim(),
          sentAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    });
    setReply("");
    setSending(false);
  }

  return (
    <div>
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        ← Ärenden
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ===== KONVERSATION ===== */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{caseData.subject}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {caseData.residentName ?? caseData.residentEmail}
                  {caseData.residentName && (
                    <span className="ml-1 text-gray-400">({caseData.residentEmail})</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <UrgencyBadge urgency={currentUrgency} />
                <StatusBadge status={caseData.status} />
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
              {(["resident", "contractor"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    activeTab === tab
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "resident" ? "Meddelanden" : "Hantverkare"}
                </button>
              ))}
            </div>

            {/* Thread */}
            <ThreadView messages={activeMessages} />

            {/* Status-banner */}
            {!isClosed && !isManual && (
              <div className="mt-6 rounded-md border border-[#1a6ba8]/20 bg-[#1a6ba8]/5 px-4 py-3 text-sm text-[#1a6ba8]">
                Bo jobbar med detta ärende och svarar hyresgästen automatiskt.
              </div>
            )}

            {isManual && (
              <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Detta är ett manuellt fall — dina svar skickas direkt till hyresgästen.
              </div>
            )}

            {/* Svarsfält för manuella ärenden */}
            {isManual && !isClosed && (
              <form onSubmit={sendReply} className="mt-4 flex flex-col gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder="Skriv ett svar till hyresgästen…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#1a6ba8] focus:ring-2 focus:ring-[#1a6ba8]/20"
                />
                <div className="flex justify-end">
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
          </div>
        </div>

        {/* ===== SIDOPANEL ===== */}
        <div className="space-y-4">
          {/* Bokningsstatus (bara IN_PROGRESS) */}
          {isBokat && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">Bokningsstatus</h2>
              <ol className="space-y-3">
                {BOOKING_STEPS.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        step.state === "done"
                          ? "bg-[#1a6ba8] text-white"
                          : step.state === "active"
                          ? "ring-2 ring-[#1a6ba8] text-[#1a6ba8]"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {step.state === "done" ? "✓" : i + 1}
                    </span>
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          step.state === "pending" ? "text-gray-400" : "text-gray-800"
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.sub && (
                        <p
                          className={`text-xs ${
                            step.state === "pending" ? "text-gray-300" : "text-gray-500"
                          }`}
                        >
                          {step.sub}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Brådskandhet */}
          {!isClosed && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-700">Brådskandhet</h2>
              <div className="flex flex-wrap gap-1.5">
                {URGENCY_OPTIONS.map((u) => (
                  <button
                    key={u}
                    onClick={() => setUrgencyOverride(caseId, u)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      currentUrgency === u
                        ? "bg-[#1a6ba8] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {urgencyLabel(u)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Vidarebefordra */}
          {!isClosed && !isManual && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-700">Vidarebefordra</h2>
              {routingCats.length > 0 ? (
                <>
                  <select
                    value={selectedRoutingId}
                    onChange={(e) => setSelectedRoutingId(e.target.value)}
                    className="mb-2 w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#1a6ba8]"
                  >
                    {routingCats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.email}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={openForward}
                    className="w-full rounded-md bg-[#1a6ba8] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#155a8f]"
                  >
                    Skapa ärendesammanfattning
                  </button>
                </>
              ) : (
                <p className="text-xs text-gray-400">
                  Inga mottagare konfigurerade.{" "}
                  <Link href="/dashboard/settings" className="underline">
                    Inställningar
                  </Link>
                </p>
              )}
            </div>
          )}

          {/* Åtgärder */}
          {!isClosed && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Åtgärder</h2>
              <div className="flex flex-col gap-2">
                {(caseData.status === "READY_FOR_REVIEW" ||
                  caseData.status === "WAITING_FOR_RESIDENT" ||
                  caseData.status === "COLLECTING_INFORMATION") && (
                  <button
                    onClick={handleTakeOver}
                    className="w-full rounded-md bg-[#1a6ba8] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#155a8f]"
                  >
                    Ta över
                  </button>
                )}
                {!isManual && (
                  <button
                    onClick={handleMarkManual}
                    className="w-full rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
                  >
                    Manuellt fall
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Avsluta ärende
                </button>
              </div>
            </div>
          )}

          {isClosed && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-1 text-sm font-semibold text-gray-700">Avslutat ärende</h2>
              <p className="mb-3 text-xs text-gray-400">Du kan återöppna ärendet om det behövs.</p>
              <button
                onClick={handleReopen}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Öppna ärende igen
              </button>
            </div>
          )}

          {/* Information */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            {isClosed ? (
              <button
                type="button"
                onClick={() => setInfoOpen((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-sm font-semibold text-gray-700">Information</span>
                <span
                  className={`text-gray-400 transition-transform ${infoOpen ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
              </button>
            ) : (
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Information</h2>
            )}

            {(!isClosed || infoOpen) && (
              <div className={isClosed ? "mt-3" : ""}>
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
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Meddelanden</dt>
                    <dd className="font-medium text-gray-900">{caseData.messages.length}</dd>
                  </div>
                </dl>

                {caseData.escalationNote && (
                  <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {caseData.escalationNote}
                  </div>
                )}

                {caseData.category && caseData.category.fields.length > 0 && (
                  <>
                    <hr className="my-3 border-gray-100" />
                    <FieldValuesList
                      fieldValues={caseData.fieldValues}
                      requiredFields={caseData.category.fields}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== FORWARD MODAL ===== */}
      {forwardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Skicka ärende till {selectedRouting?.email ?? "…"}
              </h2>
              <button
                onClick={() => setForwardOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {forwardLoading && (
              <div className="py-8 text-center text-sm text-gray-400">
                Genererar sammanfattning…
              </div>
            )}
            {forwardError && !forwardLoading && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {forwardError}
              </div>
            )}
            {!forwardLoading && !forwardError && forwardSummary && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap">
                {forwardSummary}
              </div>
            )}
            {forwardSent && (
              <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                ✓ Ärendesammanfattning skickad!
              </div>
            )}

            {!forwardSent && !forwardLoading && (
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setForwardOpen(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Avbryt
                </button>
                <button
                  onClick={confirmForward}
                  disabled={!forwardSummary}
                  className="rounded-md bg-[#1a6ba8] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#155a8f] disabled:opacity-50"
                >
                  Skicka
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
        const m = senderMeta(msg.sender);
        return (
          <div
            key={msg.id}
            className={`flex ${m.side === "left" ? "justify-start" : "justify-end"}`}
          >
            <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${m.bubble}`}>
              {msg.senderName && (
                <p className={`mb-1 text-xs font-semibold ${m.meta}`}>{msg.senderName}</p>
              )}
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
