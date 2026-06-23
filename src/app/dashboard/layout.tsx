import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f9]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-stretch px-6">
          <Link
            href="/dashboard"
            className="mr-10 flex items-center text-[17px] font-bold tracking-tight text-[#0f1c2e]"
          >
            BoDesk
          </Link>
          <DashboardNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
