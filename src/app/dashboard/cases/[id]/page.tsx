"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConversationThread } from "@/components/cases/ConversationThread";
import { FieldValuesList } from "@/components/cases/FieldValuesList";
import type { CaseStatus } from "@prisma/client";

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

const ALLOWED_TRANSITIONS: Partial<Record<CaseStatus, { label: string; next: CaseStatus }[]>> = {
  READY_FOR_REVIEW: [
    { label: "Ta över", next: "IN_PROGRESS" },
    { label: "Stäng ärende", next: "CLOSED" },
  ],
  ESCALATED: [
    { label: "Ta över", next: "IN_PROGRESS" },
    { label: "Stäng ärende", next: "CLOSED" },
  ],
  IN_PROGRESS: [{ label: "Stäng ärende", next: "CLOSED" }],
  WAITING_FOR_RESIDENT: [
    { label: "Ta över", next: "IN_PROGRESS" },
    { label: "Stäng ärende", next: "CLOSED" },
  ],
};

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchCase = useCallback(async () => {
    const res = await fetch(`/api/cases/${id}`);
    if (res.ok) setCaseData(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  async function updateStatus(next: CaseStatus) {
    setUpdating(true);
    await fetch(`/api/cases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    await fetchCase();
    setUpdating(false);
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400">Laddar ärende…</div>
    );
  }

  if (!caseData) {
    return (
      <div className="py-20 text-center text-gray-500">Ärendet hittades inte.</div>
    );
  }

  const transitions = ALLOWED_TRANSITIONS[caseData.status] ?? [];

  return (
    <div>
      {/* Tillbaka-länk */}
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        ← Alla ärenden
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Vänster: konversation */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {caseData.subject}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {caseData.residentName ?? caseData.residentEmail}
                  {caseData.residentName && (
                    <span className="ml-1 text-gray-400">
                      ({caseData.residentEmail})
                    </span>
                  )}
                </p>
              </div>
              <StatusBadge status={caseData.status} />
            </div>

            {caseData.escalationNote && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                <strong>Eskaleringsorsak:</strong> {caseData.escalationNote}
              </div>
            )}

            {caseData.summary && (
              <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                <strong>AI-sammanfattning:</strong> {caseData.summary}
              </div>
            )}

            <ConversationThread messages={caseData.messages} />
          </div>
        </div>

        {/* Höger: metadata + åtgärder */}
        <div className="space-y-4">
          {/* Åtgärder */}
          {transitions.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-medium text-gray-700">Åtgärder</h2>
              <div className="flex flex-col gap-2">
                {transitions.map((t) => (
                  <button
                    key={t.next}
                    onClick={() => updateStatus(t.next)}
                    disabled={updating}
                    className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ärendeinformation */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-medium text-gray-700">Information</h2>
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
          </div>

          {/* Insamlade fält */}
          {caseData.category && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-medium text-gray-700">
                Insamlade uppgifter
              </h2>
              <FieldValuesList
                fieldValues={caseData.fieldValues}
                requiredFields={caseData.category.fields}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
