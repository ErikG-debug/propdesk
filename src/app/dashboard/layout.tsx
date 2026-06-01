import Link from "next/link";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      {/* Halftone dot gradient — blå prickar som bildar gradient via densitet */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: "radial-gradient(circle, #3b82f6 2px, transparent 2px)",
          backgroundSize: "18px 18px",
          WebkitMaskImage:
            "radial-gradient(ellipse at 75% 0%, black 0%, black 15%, rgba(0,0,0,0.5) 35%, transparent 62%)",
          maskImage:
            "radial-gradient(ellipse at 75% 0%, black 0%, black 15%, rgba(0,0,0,0.5) 35%, transparent 62%)",
        }}
      />
      {/* Andra, ljusare blob nere till vänster */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: "radial-gradient(circle, #6366f1 2px, transparent 2px)",
          backgroundSize: "18px 18px",
          WebkitMaskImage:
            "radial-gradient(ellipse at 5% 95%, black 0%, rgba(0,0,0,0.3) 20%, transparent 45%)",
          maskImage:
            "radial-gradient(ellipse at 5% 95%, black 0%, rgba(0,0,0,0.3) 20%, transparent 45%)",
        }}
      />

      <header className="relative z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
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

      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
