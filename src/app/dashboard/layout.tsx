import Link from "next/link";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-lg font-semibold text-gray-900">
            PropDesk
          </Link>
          <nav className="flex gap-6 text-sm text-gray-600">
            <Link href="/dashboard" className="hover:text-gray-900">
              Ärenden
            </Link>
            <Link href="/dashboard/settings" className="hover:text-gray-900">
              Inställningar
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
