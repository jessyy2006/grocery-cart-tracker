// Thin wrapper so we can swap in @capacitor/geolocation later without touching feature code.
export type Coords = { lat: number; lng: number };

export async function getCurrentPosition(): Promise<Coords> {
  if (!("geolocation" in navigator)) throw new Error("Geolocation not available");
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

export type NearbyStore = {
  name: string;
  address?: string;
  lat: number;
  lng: number;
};

// Free Overpass API for nearby supermarkets/grocery stores. No key required.
export async function findNearbyStores(coords: Coords, radiusMeters = 600): Promise<NearbyStore[]> {
  const query = `
    [out:json][timeout:15];
    (
      node["shop"~"supermarket|convenience|greengrocer|grocery"](around:${radiusMeters},${coords.lat},${coords.lng});
      way["shop"~"supermarket|convenience|greengrocer|grocery"](around:${radiusMeters},${coords.lat},${coords.lng});
    );
    out center 25;
  `;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
  });
  if (!res.ok) throw new Error("Nearby search failed");
  const data = await res.json();
  return (data.elements ?? [])
    .map((el: any) => {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      const name = el.tags?.name;
      if (!name || lat == null || lng == null) return null;
      const street = [el.tags?.["addr:housenumber"], el.tags?.["addr:street"]].filter(Boolean).join(" ");
      const city = el.tags?.["addr:city"];
      const address = [street, city].filter(Boolean).join(", ") || undefined;
      return { name, address, lat, lng };
    })
    .filter(Boolean) as NearbyStore[];
}
