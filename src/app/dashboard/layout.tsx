import Link from "next/link";
import type { ReactNode } from "react";
import { HeaderDots } from "@/components/ui/HeaderDots";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="relative z-10 overflow-hidden border-b border-gray-200 bg-white">
        <HeaderDots />
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/dashboard">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-lg font-bold text-transparent">
              PropDesk
            </span>
          </Link>
          <nav className="flex gap-6 text-sm text-gray-500">
            <Link href="/dashboard" className="transition hover:text-blue-600">
              Ärenden
            </Link>
            <Link href="/dashboard/settings" className="transition hover:text-blue-600">
              Inställningar
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
