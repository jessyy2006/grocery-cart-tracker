import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  findNearbyStores,
  searchStoresByName,
  getCurrentPosition,
  GeoPermissionError,
  GeoTimeoutError,
  StoreSearchError,
} from "./geolocation";

describe("getCurrentPosition", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("resolves coords from navigator.geolocation", async () => {
    const getCurrent = vi.fn((ok: any) =>
      ok({ coords: { latitude: 40.7, longitude: -74 } })
    );
    Object.defineProperty(global.navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: getCurrent },
    });
    await expect(getCurrentPosition()).resolves.toEqual({ lat: 40.7, lng: -74 });
  });

  it("rejects with GeoPermissionError on code 1", async () => {
    Object.defineProperty(global.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_ok: any, err: any) => err({ code: 1, message: "denied" }),
      },
    });
    await expect(getCurrentPosition()).rejects.toBeInstanceOf(GeoPermissionError);
  });

  it("rejects with GeoTimeoutError when callback never fires", async () => {
    vi.useFakeTimers();
    Object.defineProperty(global.navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: () => {} },
    });
    const promise = getCurrentPosition();
    vi.advanceTimersByTime(13000);
    await expect(promise).rejects.toBeInstanceOf(GeoTimeoutError);
    vi.useRealTimers();
  });
});

describe("findNearbyStores", () => {
  afterEach(() => vi.restoreAllMocks());

  it("parses Overpass elements", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [
          {
            lat: 1,
            lon: 2,
            tags: { name: "Test Mart", shop: "supermarket", "addr:street": "Main St", "addr:city": "NYC" },
          },
          { lat: 3, lon: 4, tags: { shop: "supermarket" } }, // no name -> filtered
          { lat: 5, lon: 6, tags: { name: "Gifty", shop: "gift", "addr:street": "X", "addr:city": "Y" } }, // wrong shop
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await findNearbyStores({ lat: 0, lng: 0 });
    expect(result).toEqual([{ name: "Test Mart", address: "Main St, NYC", lat: 1, lng: 2 }]);
  });

  it("falls back to mirror when primary endpoint 5xxs", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 504, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          elements: [
            {
              lat: 1,
              lon: 2,
              tags: { name: "Mirror Mart", shop: "supermarket", "addr:street": "Side St", "addr:city": "LA" },
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const result = await findNearbyStores({ lat: 0, lng: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result[0].name).toBe("Mirror Mart");
  });

  it("throws StoreSearchError when both endpoints fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    await expect(findNearbyStores({ lat: 0, lng: 0 })).rejects.toBeInstanceOf(StoreSearchError);
  });
});

describe("searchStoresByName", () => {
  afterEach(() => vi.restoreAllMocks());

  it("parses Nominatim results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { lat: "40.5", lon: "-74.1", display_name: "Foo Mart, Brooklyn, NY", namedetails: { name: "Foo Mart" } },
        ],
      })
    );
    const result = await searchStoresByName("foo");
    expect(result[0]).toMatchObject({ name: "Foo Mart", lat: 40.5, lng: -74.1 });
  });

  it("returns [] for empty query", async () => {
    expect(await searchStoresByName("  ")).toEqual([]);
  });
});
