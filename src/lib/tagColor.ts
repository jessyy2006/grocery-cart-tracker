// Soft, muted tag palettes — Notion-like. Static class strings so Tailwind JIT keeps them.
const PALETTE = [
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
  "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
] as const;

// FNV-1a — better low-bit distribution than (h*31+c) for small palette modulos.
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function tagColorClass(tag: string): string {
  if (!tag) return PALETTE[0];
  return PALETTE[hash(tag.toLowerCase()) % PALETTE.length];
}

export function normalizeTag(s: string): string {
  return s.trim().replace(/\s+/g, " ").slice(0, 24);
}
