"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const DEMO_COMPANY_ID = process.env.NEXT_PUBLIC_DEMO_COMPANY_ID ?? "";

export function GmailConnect() {
  const searchParams = useSearchParams();
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const gmailConnected = searchParams.get("gmailConnected");
  const error = searchParams.get("error");

  useEffect(() => {
    fetch("/api/email-account")
      .then((r) => r.json())
      .then((data) => {
        setConnectedEmail(data?.email ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [gmailConnected]);

  if (loading) {
    return <div className="h-12 animate-pulse rounded-md bg-gray-100" />;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-1 font-semibold text-gray-900">Gmail-koppling</h2>
      <p className="mb-4 text-sm text-gray-500">
        AI:n svarar hyresgäster från det anslutna kontot.
      </p>

      {error === "gmail_auth_failed" && (
        <p className="mb-3 text-sm text-red-600">
          Anslutningen misslyckades — försök igen.
        </p>
      )}

      {connectedEmail ? (
        <div className="flex items-center justify-between rounded-md bg-green-50 border border-green-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-green-800">Ansluten</p>
            <p className="text-sm text-green-700">{connectedEmail}</p>
          </div>
          <a
            href={`/api/auth/gmail?companyId=${DEMO_COMPANY_ID}`}
            className="text-xs text-green-600 hover:underline"
          >
            Byt konto
          </a>
        </div>
      ) : (
        <a
          href={`/api/auth/gmail?companyId=${DEMO_COMPANY_ID}`}
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.910 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
          </svg>
          Anslut Gmail
        </a>
      )}
    </div>
  );
}
