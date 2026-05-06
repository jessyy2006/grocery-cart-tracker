import { useEffect, useState } from "react";

const DUP_KEY = "prefs:duplicateAlerts";
const EVT = "prefs:duplicateAlerts:changed";

export function normalizeItemName(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.,\-_/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getDuplicateAlerts(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(DUP_KEY);
  return v === null ? true : v === "1";
}

export function setDuplicateAlerts(enabled: boolean) {
  localStorage.setItem(DUP_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useDuplicateAlerts(): boolean {
  const [v, setV] = useState<boolean>(() => getDuplicateAlerts());
  useEffect(() => {
    const sync = () => setV(getDuplicateAlerts());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return v;
}
