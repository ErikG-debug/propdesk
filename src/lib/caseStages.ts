import { useEffect, useState } from "react";

export type CaseStage = "ready_for_approval" | "booked";

const KEY = "bodesk:caseStages";
const EVT = "bodesk:caseStages";

type StageMap = Record<string, CaseStage>;

function read(): StageMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

function write(map: StageMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(map));
  window.dispatchEvent(new Event(EVT));
}

export function setCaseStage(id: string, stage: CaseStage | null) {
  const map = read();
  if (stage === null) {
    delete map[id];
  } else {
    map[id] = stage;
  }
  write(map);
}

export function useCaseStages(): StageMap {
  const [map, setMap] = useState<StageMap>(() => read());
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
