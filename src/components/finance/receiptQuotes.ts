/** Shared motivational lines printed at the bottom of the grocery receipts. */
export const RECEIPT_QUOTES = [
  "Cheap habits compound. You're building a good one.",
  "You bought what you needed. Keep it up!",
  "Plan your cart, keep your cash.",
  "Show up, stick to the list, repeat.",
  "Shopping smartly feels real good.",
] as const;

/** Deterministic pick — the same receipt always prints the same line. */
export function pickQuote(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return RECEIPT_QUOTES[Math.abs(h) % RECEIPT_QUOTES.length];
}

const MONTHS_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/** Footer archive code, e.g. "2026—AUG—FINAL". */
export const monthArchiveCode = (d: Date) =>
  `${d.getFullYear()}—${MONTHS_SHORT[d.getMonth()]}—FINAL`;

export const yearArchiveCode = (year: number) => `${year}—YEAR—FINAL`;
