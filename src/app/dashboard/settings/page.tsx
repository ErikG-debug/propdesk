import { Suspense } from "react";
import { GmailConnect } from "@/components/dashboard/GmailConnect";
import { SignatureEditor } from "@/components/dashboard/SignatureEditor";
import { CategoryEditor } from "@/components/dashboard/CategoryEditor";
import { ContractorsEditor } from "@/components/dashboard/ContractorsEditor";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Inställningar</h1>

      <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-gray-100" />}>
        <GmailConnect />
      </Suspense>

      <SignatureEditor
        field="signature"
        label="Signatur — manuella svar"
        description="Läggs till automatiskt när du svarar manuellt på ett ärende."
        placeholder={"Med vänlig hälsning,\nFastighetsbolaget AB\nTel: 08-xxx xx xx"}
      />

      <SignatureEditor
        field="aiSignature"
        label="Signatur — AI-svar"
        description="Läggs till i slutet av alla automatiska svar från Bo."
        placeholder={"Med vänlig hälsning,\nBo · Fastighetsbolaget AB"}
      />

      <CategoryEditor />

      <ContractorsEditor />
    </div>
  );
}
