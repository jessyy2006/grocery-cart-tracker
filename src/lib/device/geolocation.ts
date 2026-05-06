// Thin wrapper so we can swap in @capacitor/geolocation later without touching feature code.
export type Coords = { lat: number; lng: number };

export class GeoPermissionError extends Error {
  constructor() {
    super("Location permission denied");
    this.name = "GeoPermissionError";
  }
}
export class GeoTimeoutError extends Error {
  constructor() {
    super("Location request timed out");
    this.name = "GeoTimeoutError";
  }
}
export class StoreSearchError extends Error {
  constructor(message = "Store search failed") {
    super(message);
    this.name = "StoreSearchError";
  }
}

const GPS_TIMEOUT_MS = 12000;
const FETCH_TIMEOUT_MS = 12000;
const COORDS_CACHE_KEY = "geo:lastCoords";
const COORDS_CACHE_TTL_MS = 5 * 60 * 1000;

export function getCachedCoords(): Coords | null {
  try {
    const raw = sessionStorage.getItem(COORDS_CACHE_KEY);
    if (!raw) return null;
    const { coords, ts } = JSON.parse(raw) as { coords: Coords; ts: number };
    if (Date.now() - ts > COORDS_CACHE_TTL_MS) return null;
    return coords;
  } catch {
    return null;
  }
}

function cacheCoords(coords: Coords) {
  try {
    sessionStorage.setItem(COORDS_CACHE_KEY, JSON.stringify({ coords, ts: Date.now() }));
  } catch {
    // ignore
  }
}

export async function getCurrentPosition(): Promise<Coords> {
  if (!("geolocation" in navigator)) throw new GeoTimeoutError();

  const browserPromise = new Promise<Coords>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err && err.code === 1) reject(new GeoPermissionError());
        else if (err && err.code === 3) reject(new GeoTimeoutError());
        else reject(err);
      },
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 60000 }
    );
  });

  const hardTimeout = new Promise<Coords>((_, reject) =>
    setTimeout(() => reject(new GeoTimeoutError()), GPS_TIMEOUT_MS + 500)
  );

  const coords = await Promise.race([browserPromise, hardTimeout]);
  cacheCoords(coords);
  return coords;
}

export type NearbyStore = {
  name: string;
  address?: string;
  lat: number;
  lng: number;
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const GROCERY_SHOPS = new Set([
  "supermarket",
  "greengrocer",
  "grocery",
  "health_food",
  "farm",
]);

type ParsedStore = NearbyStore & { _street?: string; _city?: string };

function parseOverpass(data: any): ParsedStore[] {
  return (data?.elements ?? [])
    .map((el: any) => {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      const name = el.tags?.name;
      const shop = el.tags?.shop;
      if (!name || lat == null || lng == null) return null;
      if (!shop || !GROCERY_SHOPS.has(shop)) return null;
      const street = [el.tags?.["addr:housenumber"], el.tags?.["addr:street"]]
        .filter(Boolean)
        .join(" ");
      const city =
        el.tags?.["addr:city"] ||
        el.tags?.["addr:town"] ||
        el.tags?.["addr:village"] ||
        el.tags?.["addr:suburb"];
      const address = street && city ? `${street}, ${city}` : undefined;
      return { name, address, lat, lng, _street: street || undefined, _city: city || undefined };
    })
    .filter(Boolean) as ParsedStore[];
}

function haversineMeters(a: Coords, b: Coords) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const REVERSE_CACHE_KEY = "geo:reverseCache";
function getReverseCache(): Record<string, { street?: string; city?: string }> {
  try {
    return JSON.parse(sessionStorage.getItem(REVERSE_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}
function setReverseCache(cache: Record<string, { street?: string; city?: string }>) {
  try {
    sessionStorage.setItem(REVERSE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<{ street?: string; city?: string } | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cache = getReverseCache();
  if (cache[key]) return cache[key];
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`;
  try {
    const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } }, FETCH_TIMEOUT_MS);
    if (!res.ok) return null;
    const data = await res.json();
    const a = data?.address ?? {};
    const street = [a.house_number, a.road].filter(Boolean).join(" ") || undefined;
    const city = a.city || a.town || a.village || a.hamlet || a.suburb || a.county || undefined;
    const result = { street, city };
    cache[key] = result;
    setReverseCache(cache);
    return result;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function findNearbyStores(coords: Coords, radiusMeters = 5000): Promise<NearbyStore[]> {
  const filter = `["shop"~"^(supermarket|greengrocer|grocery|health_food|farm)$"]`;
  const query = `
    [out:json][timeout:15];
    (
      node${filter}(around:${radiusMeters},${coords.lat},${coords.lng});
      way${filter}(around:${radiusMeters},${coords.lat},${coords.lng});
      relation${filter}(around:${radiusMeters},${coords.lat},${coords.lng});
    );
    out center tags 50;
  `;

  let lastErr: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetchWithTimeout(
        endpoint,
        { method: "POST", body: query },
        FETCH_TIMEOUT_MS
      );
      if (!res.ok) {
        lastErr = new StoreSearchError(`Overpass ${res.status}`);
        continue;
      }
      const data = await res.json();
      const parsed = parseOverpass(data);
      // Sort by distance and take closest 8 to limit reverse-geocode calls.
      const sorted = parsed
        .map((s) => ({ s, d: haversineMeters(coords, { lat: s.lat, lng: s.lng }) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 8)
        .map((x) => x.s);

      // Enrich missing addresses via Nominatim reverse geocode (free, rate-limited).
      const enriched: NearbyStore[] = [];
      for (const s of sorted) {
        let street = s._street;
        let city = s._city;
        if (!street || !city) {
          const rev = await reverseGeocode(s.lat, s.lng);
          if (rev) {
            street = street || rev.street;
            city = city || rev.city;
          }
          // 1.1s spacing to respect Nominatim usage policy.
          await new Promise((r) => setTimeout(r, 1100));
        }
        if (!city) continue; // skip if we still can't produce a meaningful address
        const address = street ? `${street}, ${city}` : city;
        enriched.push({ name: s.name, lat: s.lat, lng: s.lng, address });
      }
      return enriched;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof StoreSearchError ? lastErr : new StoreSearchError();
}

export async function searchStoresByName(query: string): Promise<NearbyStore[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    q
  )}&format=json&limit=10&addressdetails=1`;
  try {
    const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } }, FETCH_TIMEOUT_MS);
    if (!res.ok) throw new StoreSearchError(`Nominatim ${res.status}`);
    const data = (await res.json()) as any[];
    return data
      .map((el) => {
        const lat = parseFloat(el.lat);
        const lng = parseFloat(el.lon);
        if (!isFinite(lat) || !isFinite(lng)) return null;
        const name: string = el.namedetails?.name || el.display_name?.split(",")[0] || "Unknown";
        const a = el.address ?? {};
        const street = [a.house_number, a.road].filter(Boolean).join(" ");
        const city = a.city || a.town || a.village || a.hamlet || a.suburb || a.county;
        const country = a.country;
        const formatted = [street, [city, country].filter(Boolean).join(", ")]
          .filter(Boolean)
          .join(", ");
        const address: string | undefined = formatted || el.display_name;
        return { name, address, lat, lng };
      })
      .filter(Boolean) as NearbyStore[];
  } catch (e) {
    if (e instanceof StoreSearchError) throw e;
    throw new StoreSearchError();
  }
}
