export type OFFProduct = {
  barcode: string;
  name: string;
  brand?: string;
  image_url?: string;
};

export async function lookupBarcode(barcode: string): Promise<OFFProduct | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,brands,image_front_small_url,image_url`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1) return null;
    const p = data.product ?? {};
    const name = p.product_name?.trim();
    if (!name) return null;
    return {
      barcode,
      name,
      brand: p.brands?.split(",")[0]?.trim() || undefined,
      image_url: p.image_front_small_url || p.image_url || undefined,
    };
  } catch {
    return null;
  }
}
