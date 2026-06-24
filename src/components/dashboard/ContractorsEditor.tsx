"use client";

import { useEffect, useState } from "react";
import { useContractors, addContractor, removeContractor, type Contractor } from "@/lib/contractors";

interface Category {
  id: string;
  name: string;
}

export function ContractorsEditor() {
  const contractors = useContractors();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setCategories(data as Category[]);
      })
      .catch(() => null);
  }, []);

  const grouped = (() => {
    const map = new Map<string, Contractor[]>();
    for (const c of contractors) {
      if (!map.has(c.role)) map.set(c.role, []);
      map.get(c.role)!.push(c);
    }
    return new Map([...map.entries()].sort());
  })();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !role) return;
    setSubmitting(true);
    try {
      await addContractor({ name: name.trim(), email: email.trim(), phone: phone.trim() || null, role });
      setName(""); setEmail(""); setPhone(""); setRole("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-1 font-semibold text-gray-900">Servicepersonal</h2>
      <p className="mb-5 text-sm text-gray-500">
        Hantera servicepersonal per ärendekategori.
      </p>

      <div className="mb-5 space-y-4">
        {contractors.length === 0 ? (
          <p className="text-sm italic text-gray-400">Ingen servicepersonal tillagd än.</p>
        ) : (
          [...grouped.entries()].map(([roleName, list]) => (
            <div key={roleName}>
              <p className="mb-2 text-sm font-medium text-gray-700">{roleName}</p>
              <div className="space-y-2">
                {list.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 px-3 py-2">
                    <span className="min-w-32 flex-1 text-sm font-medium text-gray-900">{c.name}</span>
                    <span className="min-w-48 flex-1 text-sm text-gray-700">{c.email}</span>
                    {c.phone && <span className="text-sm text-gray-500">{c.phone}</span>}
                    <button onClick={() => removeContractor(c.id)} className="text-sm text-red-400 hover:text-red-600">
                      Ta bort
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={submit} className="border-t border-gray-100 pt-4">
        <p className="mb-2 text-sm font-medium text-gray-700">Ny servicepersonal</p>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-32 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6ba8]/30"
            placeholder="Namn"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
          <input
            className="min-w-48 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6ba8]/30"
            placeholder="E-postadress"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={255}
          />
          <input
            className="min-w-32 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6ba8]/30"
            placeholder="Telefon (valfritt)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={50}
          />
          <select
            className="min-w-40 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1a6ba8]/30"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">Välj kategori</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={submitting || !name.trim() || !email.trim() || !role}
            className="rounded-md bg-[#1a6ba8] px-4 py-2 text-sm font-medium text-white hover:bg-[#155a8f] disabled:opacity-40"
          >
            {submitting ? "Sparar…" : "Lägg till"}
          </button>
        </div>
      </form>
    </div>
  );
}
