import Link from "next/link";
import type { ReactNode } from "react";
import { HeaderDots } from "@/components/ui/HeaderDots";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f9]">
      <header className="relative z-10 overflow-hidden bg-[#0b2a55]">
        <HeaderDots />
        <div className="relative mx-auto grid max-w-7xl grid-cols-3 items-center px-6 py-4">
          <Link
            href="/dashboard"
            className="justify-self-start text-[17px] font-bold tracking-tight text-white"
          >
            BoDesk
          </Link>
          <DashboardNav />
          <div className="justify-self-end" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
