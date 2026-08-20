import { useEffect, useState } from "react";
import { differenceInCalendarDays, format, isToday } from "date-fns";

export const SUPPORTED_CURRENCIES = ["CAD", "USD", "EUR", "GBP", "AUD", "JPY"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

const STORAGE_KEY = "app:currency";
const EVENT = "app:currency-change";

export const getCurrency = (): Currency => {
  if (typeof window === "undefined") return "CAD";
  const v = localStorage.getItem(STORAGE_KEY) as Currency | null;
  return v && SUPPORTED_CURRENCIES.includes(v) ? v : "CAD";
};

export const setCurrency = (c: Currency) => {
  localStorage.setItem(STORAGE_KEY, c);
  window.dispatchEvent(new CustomEvent(EVENT));
};

export const useCurrency = (): Currency => {
  const [c, setC] = useState<Currency>(getCurrency());
  useEffect(() => {
    const h = () => setC(getCurrency());
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, []);
  return c;
};

const LOCALES: Record<Currency, string> = {
  CAD: "en-CA",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
  AUD: "en-AU",
  JPY: "ja-JP",
};

export const formatMoney = (cents: number, currency: Currency = getCurrency(), fractionDigits = 2) =>
  (cents / 100).toLocaleString(LOCALES[currency], { style: "currency", currency, minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });

export const parsePriceToCents = (input: string): number | null => {
  const cleaned = input.replace(/[^\d.,-]/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
};

/**
 * Relative-ish timestamp used on list rows:
 * today -> "11:36 pm", within 7 days -> "tuesday", older -> "2026-08-13".
 */
export const formatListTimestamp = (iso: string): string => {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "h:mm a").toLowerCase();
  if (differenceInCalendarDays(new Date(), d) < 7) return format(d, "EEEE").toLowerCase();
  return format(d, "yyyy-MM-dd");
};
