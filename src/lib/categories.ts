export type CategorySlug =
  | "produce"
  | "dairy"
  | "bakery"
  | "meat"
  | "pantry"
  | "frozen"
  | "beverages"
  | "snacks"
  | "household"
  | "other";

export const CATEGORIES: { slug: CategorySlug; label: string; emoji: string }[] = [
  { slug: "produce", label: "Fruits & Veggies", emoji: "🥬" },
  { slug: "dairy", label: "Dairy", emoji: "🥛" },
  { slug: "bakery", label: "Bakery", emoji: "🍞" },
  { slug: "meat", label: "Meat & Seafood", emoji: "🥩" },
  { slug: "pantry", label: "Pantry", emoji: "🥫" },
  { slug: "frozen", label: "Frozen", emoji: "🧊" },
  { slug: "beverages", label: "Beverages", emoji: "🥤" },
  { slug: "snacks", label: "Snacks", emoji: "🍪" },
  { slug: "household", label: "Household", emoji: "🧻" },
  { slug: "other", label: "Other", emoji: "🛒" },
];

export const CATEGORY_ORDER: CategorySlug[] = CATEGORIES.map((c) => c.slug);

export const getCategory = (slug: string) =>
  CATEGORIES.find((c) => c.slug === slug) ?? CATEGORIES[CATEGORIES.length - 1];

const KEYWORDS: Record<CategorySlug, string[]> = {
  produce: [
    "apple","banana","orange","lemon","lime","grape","berry","strawberr","blueberr","raspberr",
    "lettuce","spinach","kale","tomato","potato","onion","garlic","pepper","carrot","celery",
    "cucumber","broccoli","cauliflower","avocado","mushroom","zucchini","squash","fruit","veggie","vegetable","herb","cilantro","parsley","basil",
  ],
  dairy: ["milk","yogurt","yoghurt","cheese","butter","cream","sour cream","cottage","mozzarella","cheddar","parmesan","feta","ghee","kefir"],
  bakery: ["bread","bagel","muffin","croissant","tortilla","bun","roll","pita","loaf","baguette","donut","doughnut","pastry","cake","pie crust"],
  meat: ["chicken","beef","pork","turkey","bacon","sausage","ham","steak","ground","fish","salmon","tuna","shrimp","lamb","seafood","cod","tilapia"],
  pantry: ["pasta","rice","flour","sugar","salt","oil","olive oil","vinegar","sauce","ketchup","mustard","mayo","bean","lentil","cereal","oat","granola","peanut butter","jelly","jam","honey","spice","stock","broth","soup","canned","noodle","tomato sauce"],
  frozen: ["frozen","ice cream","popsicle","pizza","fries","nugget"],
  beverages: ["water","juice","soda","coke","pepsi","sprite","tea","coffee","beer","wine","drink","milk alternative","almond milk","oat milk","soy milk","kombucha","sparkling"],
  snacks: ["chip","crisp","pretzel","cracker","cookie","candy","chocolate","bar","popcorn","nut","almond","cashew","trail mix","gum","snack"],
  household: ["paper towel","toilet paper","tissue","detergent","soap","shampoo","toothpaste","cleaner","sponge","trash bag","foil","wrap","bag","dish"],
  other: [],
};

export function guessCategory(name: string): CategorySlug {
  const n = name.toLowerCase();
  for (const slug of CATEGORY_ORDER) {
    if (slug === "other") continue;
    for (const k of KEYWORDS[slug]) {
      if (n.includes(k)) return slug;
    }
  }
  return "other";
}

const STOPWORDS = new Set([
  "the","a","an","and","or","of","with","without","for","to","in","on",
  "organic","fresh","natural","whole","large","small","mini","mega","pack","ct","oz","lb","lbs",
]);

export function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export type ListItemMatchable = {
  id: string;
  name: string;
  barcode?: string | null;
  checked_at?: string | null;
};

export function findListMatch(
  items: ListItemMatchable[],
  scanned: { barcode: string; name?: string }
): ListItemMatchable | null {
  const open = items.filter((i) => !i.checked_at);
  const byBarcode = open.find((i) => i.barcode && i.barcode === scanned.barcode);
  if (byBarcode) return byBarcode;
  if (!scanned.name) return null;
  const t = new Set(tokens(scanned.name));
  if (t.size === 0) return null;
  let best: { item: ListItemMatchable; hits: number } | null = null;
  for (const item of open) {
    const it = tokens(item.name);
    const hits = it.filter((w) => t.has(w)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { item, hits };
  }
  return best?.item ?? null;
}
