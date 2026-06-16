import { Suspense } from "react";
import { GmailConnect } from "@/components/dashboard/GmailConnect";
import { CategoryEditor } from "@/components/dashboard/CategoryEditor";
import { ContractorsEditor } from "@/components/dashboard/ContractorsEditor";
import { RoutingCategoryEditor } from "@/components/dashboard/RoutingCategoryEditor";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Inställningar</h1>

      <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-gray-100" />}>
        <GmailConnect />
      </Suspense>

      <CategoryEditor />

      <ContractorsEditor />

      <RoutingCategoryEditor />
    </div>
  );
}
