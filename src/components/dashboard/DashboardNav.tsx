"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

function NavLink({ href, label, exact = false }: { href: string; label: string; exact?: boolean }) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center border-b-2 px-3 py-4 text-sm font-medium transition ${
        isActive
          ? "border-[#1a6ba8] text-[#1a6ba8]"
          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800"
      }`}
    >
      {label}
    </Link>
  );
}

export function DashboardNav() {
  return (
    <nav className="flex flex-1 items-stretch gap-1">
      <NavLink href="/dashboard" label="Ärenden" exact />
      <NavLink href="/dashboard/settings" label="Inställningar" />
      <div className="ml-auto flex items-center">
        <SignOutButton />
      </div>
    </nav>
  );
}
