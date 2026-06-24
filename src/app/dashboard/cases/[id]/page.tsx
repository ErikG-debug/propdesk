"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FieldValuesList } from "@/components/cases/FieldValuesList";
import { closeCase, reopenCase, useClosedCases } from "@/lib/closedCases";
import { markManual, unmarkManual, useManualCases } from "@/lib/caseOverrides";
import { useCaseStages, setCaseStage } from "@/lib/caseStages";
import { useRoutingCategories } from "@/lib/categories";
import type { CaseStatus } from "@prisma/client";

type Sender = "resident" | "bo" | "handler";

type ThreadMessage = {
  id: string;
  sender: Sender;
  senderName?: string;
  body: string;
  sentAt: string;
};

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
  const stages = useCaseStages();

  const [activeTab, setActiveTab] = useState<"resident" | "contractor">("resident");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);


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

  useEffect(() => { fetchCase(); }, [fetchCase]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSignature(d.signature ?? ""))
      .catch(() => setSignature(""));
  }, []);

  // Reset confirm step when tab or reply changes
  useEffect(() => { setConfirmStep(false); }, [activeTab, reply]);

  const isReallyClosed =
    closedIds.has(caseId) ||
    caseData?.status === "CLOSED" ||
    caseData?.status === "ARCHIVED";
  const isClosed = isReallyClosed;
  const isManual = !isClosed && (manualIds.has(caseId) || caseData?.status === "ESCALATED");

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

  // Scrolla till senaste meddelandet när konversationen uppdateras
  useEffect(() => {
    const el = document.getElementById("thread-bottom");
    el?.scrollIntoView({ behavior: "smooth" });
  }, [residentMessages.length, activeTab]);

  if (loading) return <div className="py-20 text-center text-gray-400">Laddar ärende…</div>;
  if (!caseData) return <div className="py-20 text-center text-gray-500">Ärendet hittades inte.</div>;

  // Promote to manual if needed, then send reply to resident
  async function sendResidentReply() {
    if (!reply.trim() || !caseData) return;
    setSending(true);
    try {
      if (!isManual) {
        markManual(caseId);
        await fetch(`/api/cases/${caseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ESCALATED" }),
        });
      }
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
      setCaseData({ ...caseData, messages: [...caseData.messages, message], updatedAt: new Date().toISOString() });
      setReply("");
      setConfirmStep(false);
    } finally {
      setSending(false);
    }
  }

  function handleResidentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    if (!isManual && !confirmStep) {
      setConfirmStep(true);
      return;
    }
    sendResidentReply();
  }

  async function handleContractorSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !selectedRouting) return;
    if (!isManual && !confirmStep) {
      setConfirmStep(true);
      return;
    }
    setSending(true);
    try {
      if (!isManual) {
        markManual(caseId);
        await fetch(`/api/cases/${caseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ESCALATED" }),
        });
      }
      const res = await fetch(`/api/cases/${caseId}/forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: selectedRouting.email, message: reply.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Kunde inte skicka till servicepersonal.");
        return;
      }
      setReply("");
      setConfirmStep(false);
    } finally {
      setSending(false);
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

  const onSubmit = activeTab === "resident" ? handleResidentSubmit : handleContractorSubmit;
  const placeholder =
    activeTab === "resident"
      ? "Skriv ditt svar till hyresgästen…"
      : "Skriv ditt meddelande till servicepersonalen…";

  const TAG_STYLES = {
    waiting:     { label: "Väntar på svar",       cls: "bg-violet-50 text-violet-700 ring-1 ring-violet-100" },
    ready:       { label: "Redo för godkännande", cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-100" },
    manual:      { label: "Manuellt fall",        cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
    in_progress: { label: "Pågår",               cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
    closed:      { label: "Avslutat",            cls: "bg-gray-100 text-gray-500 ring-1 ring-gray-200" },
  } as const;

  type TagKind = keyof typeof TAG_STYLES;

  const caseTag: TagKind | null = (() => {
    if (isClosed) return "closed";
    if (isManual) return "manual";
    if (caseData.status === "READY_FOR_REVIEW") return "ready";
    if (caseData.status === "IN_PROGRESS") return "in_progress";
    if (caseData.status === "WAITING_FOR_RESIDENT") return "waiting";
    return null;
  })();

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
          <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.07),0_6px_16px_rgba(0,0,0,0.05)]">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{caseData.subject}</h1>
                <p className="mt-0.5 text-sm text-gray-500">
                  {caseData.residentName ?? caseData.residentEmail}
                  {caseData.residentName && (
                    <span className="ml-1 text-gray-400">· {caseData.residentEmail}</span>
                  )}
                </p>
              </div>
              {caseTag && (
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${TAG_STYLES[caseTag].cls}`}>
                  {TAG_STYLES[caseTag].label}
                </span>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-0 border-b border-gray-100 px-6">
              {([
                { key: "resident",   label: "Boende" },
                { key: "contractor", label: "Servicepersonal" },
              ] as const).map((t) => {
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key)}
                    className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition ${
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

            {/* Thread */}
            <div className="px-6 pt-5 pb-2 max-h-[480px] overflow-y-auto scroll-smooth" id="thread-scroll">
              {activeTab === "resident" ? (
                <ThreadView messages={residentMessages} />
              ) : (
                <p className="py-8 text-center text-sm text-gray-400">
                  Ingen konversation med servicepersonal ännu.
                </p>
              )}
              <div id="thread-bottom" />
            </div>

            {/* Reply form (always shown when not closed) */}
            {!isClosed && (
              <form onSubmit={onSubmit} className="border-t border-gray-100 px-6 pt-4 pb-5 mt-4">
                {/* Routing selector for contractor tab */}
                {activeTab === "contractor" && (
                  <div className="mb-3 flex items-center gap-2">
                    <label htmlFor="contractor-routing" className="shrink-0 text-xs font-medium text-gray-500">
                      Skickas till:
                    </label>
                    {routingCats.length === 0 ? (
                      <span className="text-xs italic text-gray-400">Lägg till servicepersonal i Inställningar</span>
                    ) : (
                      <select
                        id="contractor-routing"
                        value={selectedRoutingId}
                        onChange={(e) => setSelectedRoutingId(e.target.value)}
                        className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-[#1a6ba8] focus:ring-1 focus:ring-[#1a6ba8]/20"
                      >
                        {routingCats.map((c) => (
                          <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
                <div className="overflow-hidden rounded-lg border border-gray-300 focus-within:border-[#1a6ba8] focus-within:ring-2 focus-within:ring-[#1a6ba8]/20">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={3}
                    placeholder={placeholder}
                    className="w-full resize-none px-3 py-2 text-sm outline-none"
                  />
                  {activeTab === "resident" && signature && (
                    <div className="border-t border-dashed border-gray-200 px-3 py-2">
                      <p className="whitespace-pre-wrap text-xs text-gray-400">{signature}</p>
                    </div>
                  )}
                </div>

                {/* Confirmation step */}
                {confirmStep && !isManual ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-medium text-amber-800">Är du säker?</p>
                    <p className="mt-0.5 text-xs text-amber-700">
                      Bo hanterar detta ärende. Om du skickar tar du över och ärendet markeras som
                      manuellt fall.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmStep(false)}
                        className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
                      >
                        Avbryt
                      </button>
                      <button
                        type="submit"
                        disabled={sending}
                        className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        {sending ? "Skickar…" : "Bekräfta & ta över"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-end gap-3">
                    {activeTab === "resident" && !isManual && (
                      <p className="text-xs text-gray-400">
                        Att svara markerar ärendet som manuellt fall
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={sending || !reply.trim()}
                      className="rounded-md bg-[#1a6ba8] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#155a8f] disabled:opacity-50"
                    >
                      {sending ? "Skickar…" : activeTab === "resident" ? "Skicka svar" : "Kontakta"}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>

        {/* ===== SIDOPANEL ===== */}
        <div className="space-y-4">
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
          ) : (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="text-sm font-medium text-red-500 underline-offset-4 transition hover:text-red-700 hover:underline"
              >
                Avsluta ärende
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function stripQuotes(body: string): string {
  return body
    .split("\n")
    .reduce<{ lines: string[]; quoting: boolean }>((acc, line) => {
      if (acc.quoting) return acc;
      const trimmed = line.trimStart();
      // Standardiserade citat-markörer i e-post
      if (
        trimmed.startsWith(">") ||
        /^(-{3,}|_{3,})\s*(Original Message|Forwarded|Ursprungligt)/i.test(trimmed) ||
        /^On .+wrote:/.test(trimmed) ||
        /^Den .+skrev:/i.test(trimmed)
      ) {
        return { lines: acc.lines, quoting: true };
      }
      return { lines: [...acc.lines, line], quoting: false };
    }, { lines: [], quoting: false })
    .lines
    .join("\n")
    .trimEnd();
}

function ThreadView({ messages }: { messages: ThreadMessage[] }) {
  if (messages.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">Inga meddelanden ännu.</p>;
  }
  return (
    <div className="flex flex-col gap-3 pb-2">
      {messages.map((msg) => {
        const m = senderMeta(msg.sender, msg.senderName);
        const body = stripQuotes(msg.body);
        return (
          <div key={msg.id} className={`flex ${m.side === "left" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${m.bubble}`}>
              <p className="whitespace-pre-wrap">{body}</p>
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
