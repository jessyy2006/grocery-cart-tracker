import cities from "./cities.json";

/** Bundled list of world cities as "City, Region" labels (offline autocomplete). */
export const CITIES = cities as string[];

/** Ranked prefix-first search over the bundled city list. */
export function searchCities(query: string, limit = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const c of CITIES) {
    const lower = c.toLowerCase();
    if (lower.startsWith(q)) starts.push(c);
    else if (lower.includes(q)) contains.push(c);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}
