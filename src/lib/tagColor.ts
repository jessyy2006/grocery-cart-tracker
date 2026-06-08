// Produce-sticker palette — soft pastel chips with deeper ink for legibility.
// Static class strings so Tailwind JIT keeps them.
const PALETTE = [
  "bg-[hsl(8_80%_92%)] text-[hsl(8_60%_32%)] border border-[hsl(8_70%_82%)]",       // tomato
  "bg-[hsl(40_90%_88%)] text-[hsl(30_60%_28%)] border border-[hsl(40_80%_78%)]",     // honey
  "bg-[hsl(48_95%_88%)] text-[hsl(40_60%_28%)] border border-[hsl(48_85%_78%)]",     // butter
  "bg-[hsl(200_70%_90%)] text-[hsl(205_55%_28%)] border border-[hsl(200_60%_80%)]",  // sky
  "bg-[hsl(300_45%_92%)] text-[hsl(300_40%_32%)] border border-[hsl(300_35%_82%)]",  // plum
  "bg-[hsl(18_55%_90%)] text-[hsl(18_50%_30%)] border border-[hsl(18_50%_80%)]",     // clay
  "bg-[hsl(155_45%_90%)] text-[hsl(155_50%_22%)] border border-[hsl(155_40%_78%)]",  // mint
  "bg-[hsl(350_70%_93%)] text-[hsl(350_55%_38%)] border border-[hsl(350_60%_84%)]",  // blush
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
