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

function parseOverpass(data: any): NearbyStore[] {
  return (data?.elements ?? [])
    .map((el: any) => {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      const name = el.tags?.name;
      if (!name || lat == null || lng == null) return null;
      const street = [el.tags?.["addr:housenumber"], el.tags?.["addr:street"]]
        .filter(Boolean)
        .join(" ");
      const city = el.tags?.["addr:city"];
      const address = [street, city].filter(Boolean).join(", ") || undefined;
      return { name, address, lat, lng };
    })
    .filter(Boolean) as NearbyStore[];
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

export async function findNearbyStores(coords: Coords, radiusMeters = 600): Promise<NearbyStore[]> {
  const query = `
    [out:json][timeout:10];
    (
      node["shop"~"supermarket|convenience|greengrocer|grocery"](around:${radiusMeters},${coords.lat},${coords.lng});
      way["shop"~"supermarket|convenience|greengrocer|grocery"](around:${radiusMeters},${coords.lat},${coords.lng});
    );
    out center 25;
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
      return parseOverpass(data);
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
        const address: string | undefined = el.display_name;
        return { name, address, lat, lng };
      })
      .filter(Boolean) as NearbyStore[];
  } catch (e) {
    if (e instanceof StoreSearchError) throw e;
    throw new StoreSearchError();
  }
}
