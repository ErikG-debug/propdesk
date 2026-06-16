import { useEffect, useState } from "react";

const KEY = "bodesk:caseAssignees";
const EVT = "bodesk:caseAssignees";

type AssigneeMap = Record<string, string>;

function read(): AssigneeMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

function write(map: AssigneeMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(map));
  window.dispatchEvent(new Event(EVT));
}

export function setCaseAssignee(caseId: string, contractorId: string) {
  const map = read();
  map[caseId] = contractorId;
  write(map);
}

export function useCaseAssignees(): AssigneeMap {
  const [map, setMap] = useState<AssigneeMap>(() => read());
  useEffect(() => {
    const update = () => setMap(read());
    window.addEventListener(EVT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return map;
}
