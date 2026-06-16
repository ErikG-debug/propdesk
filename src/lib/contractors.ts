import { useEffect, useState } from "react";

export type Contractor = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
};

const KEY = "bodesk:contractors";
const EVT = "bodesk:contractors";

const DEFAULT: Contractor[] = [
  { id: "mock-1", name: "Anders Rörsson", email: "anders@ror.se", phone: "070-123 45 67", role: "Rörmokare" },
  { id: "mock-2", name: "Lisa Läckan", email: "lisa@ror.se", phone: null, role: "Rörmokare" },
  { id: "mock-3", name: "Erik Elektrisk", email: "erik@el.se", phone: "073-987 65 43", role: "Elektriker" },
];

function read(): Contractor[] {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Contractor[]) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function write(list: Contractor[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
}

export function addContractor(c: Omit<Contractor, "id">) {
  const list = read();
  write([...list, { ...c, id: `local-${Date.now()}` }]);
}

export function removeContractor(id: string) {
  write(read().filter((c) => c.id !== id));
}

export function useContractors(): Contractor[] {
  const [list, setList] = useState<Contractor[]>(() => read());
  useEffect(() => {
    const update = () => setList(read());
    window.addEventListener(EVT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return list;
}
