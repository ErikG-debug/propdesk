"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export function GmailConnect() {
  const searchParams = useSearchParams();
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const gmailConnected = searchParams.get("gmailConnected");
  const microsoftConnected = searchParams.get("microsoftConnected");
  const error = searchParams.get("error");

  useEffect(() => {
    fetch("/api/email-account")
      .then((r) => r.json())
      .then((data) => {
        setConnectedEmail(data?.email ?? null);
        setProvider(data?.provider ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [gmailConnected, microsoftConnected]);

  if (loading) {
    return <div className="h-12 animate-pulse rounded-md bg-gray-100" />;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-1 font-semibold text-gray-900">E-postkoppling</h2>
      <p className="mb-4 text-sm text-gray-500">
        AI:n svarar hyresgäster från det anslutna kontot. Välj er e-postleverantör.
      </p>

      {(error === "gmail_auth_failed" || error === "microsoft_auth_failed") && (
        <p className="mb-3 text-sm text-red-600">
          Anslutningen misslyckades — försök igen.
        </p>
      )}

      {connectedEmail ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md bg-green-50 border border-green-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-green-800">
                Ansluten via {provider === "microsoft" ? "Microsoft 365" : "Gmail"}
              </p>
              <p className="text-sm text-green-700">{connectedEmail}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href="/api/auth/gmail"
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Byt till Gmail
            </a>
            <a
              href="/api/auth/microsoft"
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Byt till Microsoft 365
            </a>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/auth/gmail"
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.910 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
            </svg>
            Anslut Gmail
          </a>
          <a
            href="/api/auth/microsoft"
            className="inline-flex items-center gap-2 rounded-md bg-[#0078d4] px-4 py-2 text-sm font-medium text-white hover:bg-[#006cbe]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
            </svg>
            Anslut Microsoft 365
          </a>
        </div>
      )}
    </div>
  );
}
