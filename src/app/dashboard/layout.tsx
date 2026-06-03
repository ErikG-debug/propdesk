import Link from "next/link";
import type { ReactNode } from "react";
import { HeaderDots } from "@/components/ui/HeaderDots";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="relative z-10 overflow-hidden border-b border-gray-200 bg-white">
        <HeaderDots />
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/dashboard" className="text-[17px] font-bold tracking-tight text-white drop-shadow">
            PropDesk
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-white drop-shadow">
            <Link href="/dashboard" className="transition hover:text-white/70">
              Ärenden
            </Link>
            <Link href="/dashboard/settings" className="transition hover:text-white/70">
              Inställningar
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
