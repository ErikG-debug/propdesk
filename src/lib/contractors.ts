import { useCallback, useEffect, useState } from "react";

export type Contractor = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
};

const EVT = "bodesk:contractors:refresh";

function triggerRefresh() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT));
}

export async function addContractor(c: Omit<Contractor, "id">): Promise<void> {
  await fetch("/api/contractors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(c),
  });
  triggerRefresh();
}

export async function removeContractor(id: string): Promise<void> {
  await fetch(`/api/contractors/${id}`, { method: "DELETE" });
  triggerRefresh();
}

export function useContractors(): Contractor[] {
  const [list, setList] = useState<Contractor[]>([]);

  const load = useCallback(() => {
    fetch("/api/contractors")
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setList(data as Contractor[]);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(EVT, load);
    return () => window.removeEventListener(EVT, load);
  }, [load]);

  return list;
}
