"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm font-medium text-gray-500 transition hover:text-gray-800"
    >
      Logga ut
    </button>
  );
}
