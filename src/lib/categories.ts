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

// Keywords matched as whole words (with simple plural/derivational prefix match).
// Multi-word phrases (containing a space) are matched as substrings and take priority.
const KEYWORDS: Record<CategorySlug, string[]> = {
  produce: [
    "apple","banana","orange","oranges","lemon","lime","grape","grapes","berry","berries","strawberry","strawberries","blueberry","blueberries","raspberry","raspberries",
    "lettuce","spinach","kale","tomato","tomatoes","potato","potatoes","sweet potato","onion","onions","garlic","pepper","peppers","bell pepper","carrot","carrots","celery",
    "cucumber","broccoli","cauliflower","avocado","avocados","mushroom","mushrooms","zucchini","squash","fruit","fruits","veggie","veggies","vegetable","vegetables","herb","herbs","cilantro","parsley","basil","ginger","cabbage","corn","peach","pear","pears","plum","mango","pineapple","watermelon","melon","cherry","cherries","kiwi","apricot","fig","date","radish","beet","beets","asparagus","artichoke","eggplant","leek","scallion","arugula","romaine","peas","green bean",
  ],
  dairy: [
    "milk","yogurt","yoghurt","cheese","butter","cream","sour cream","heavy cream","cottage cheese","mozzarella","cheddar","parmesan","feta","ghee","kefir","brie","gouda","ricotta","provolone","swiss","cream cheese","half and half","whipped cream",
  ],
  bakery: [
    "bread","bagel","bagels","muffin","muffins","croissant","tortilla","tortillas","bun","buns","roll","rolls","pita","loaf","baguette","donut","donuts","doughnut","doughnuts","pastry","pastries","cake","cakes","pie crust","scone","brioche","focaccia","ciabatta","sourdough","challah","naan",
  ],
  meat: [
    "chicken","beef","pork","turkey","bacon","sausage","sausages","ham","steak","steaks","ribeye","sirloin","tenderloin","filet","brisket","ground beef","ground turkey","ground chicken","ground pork","fish","salmon","tuna","shrimp","prawn","prawns","lamb","veal","duck","seafood","cod","tilapia","halibut","trout","crab","lobster","scallop","scallops","mussels","oysters","clams","anchovy","sardine","mackerel","chorizo","pepperoni","salami","prosciutto","deli meat","hot dog","hotdog","wings","drumstick","drumsticks","meatball","meatballs",
  ],
  pantry: [
    "pasta","spaghetti","penne","rigatoni","macaroni","lasagna","rice","quinoa","couscous","barley","flour","sugar","brown sugar","powdered sugar","salt","pepper corn","oil","olive oil","canola oil","vegetable oil","sesame oil","coconut oil","vinegar","balsamic","sauce","ketchup","mustard","mayo","mayonnaise","bean","beans","lentil","lentils","chickpea","chickpeas","cereal","oat","oats","oatmeal","granola","peanut butter","almond butter","jelly","jam","preserves","honey","syrup","maple syrup","spice","spices","cumin","paprika","cinnamon","oregano","thyme","rosemary","stock","broth","soup","canned","noodle","noodles","ramen","tomato sauce","pasta sauce","marinara","alfredo","soy sauce","hot sauce","sriracha","tahini","hummus","baking soda","baking powder","yeast","cocoa","vanilla","raisin","raisins","cornmeal","breadcrumb","breadcrumbs","gravy",
  ],
  frozen: [
    "frozen","ice cream","gelato","sorbet","popsicle","popsicles","frozen pizza","fries","french fries","nugget","nuggets","frozen vegetables","frozen fruit","frozen meal","tv dinner","frozen waffle","frozen yogurt",
  ],
  beverages: [
    "water","sparkling water","juice","soda","pop","coke","cola","pepsi","sprite","fanta","tea","coffee","espresso","latte","beer","wine","liquor","vodka","whiskey","whisky","rum","gin","tequila","champagne","cider","drink","drinks","beverage","beverages","almond milk","oat milk","soy milk","coconut milk","rice milk","kombucha","lemonade","gatorade","energy drink","red bull","matcha","chai",
  ],
  snacks: [
    "chip","chips","crisp","crisps","pretzel","pretzels","cracker","crackers","cookie","cookies","candy","chocolate","granola bar","protein bar","candy bar","popcorn","nut","nuts","almond","almonds","cashew","cashews","peanut","peanuts","pistachio","pistachios","walnut","walnuts","pecan","pecans","trail mix","gummy","gummies","gum","snack","snacks","jerky","beef jerky","fruit snack","goldfish","oreo","oreos","doritos","cheetos","pringles","skittles","mms","snickers","kitkat","twix",
  ],
  household: [
    "paper towel","paper towels","toilet paper","tissue","tissues","kleenex","detergent","laundry detergent","dish soap","soap","shampoo","conditioner","toothpaste","toothbrush","cleaner","cleaning","disinfectant","bleach","sponge","sponges","trash bag","garbage bag","aluminum foil","foil","plastic wrap","saran wrap","ziploc","sandwich bag","dish soap","dishwasher","laundry","floss","deodorant","razor","tampon","pad","diaper","diapers","wipes","battery","batteries","light bulb","candle",
  ],
  other: [],
};

// Multi-word phrases get higher priority — checked before single words.
function buildPhraseEntries() {
  const phrases: { phrase: string; slug: CategorySlug }[] = [];
  const words: { word: string; slug: CategorySlug }[] = [];
  for (const slug of CATEGORY_ORDER) {
    for (const k of KEYWORDS[slug]) {
      if (k.includes(" ")) phrases.push({ phrase: k.toLowerCase(), slug });
      else words.push({ word: k.toLowerCase(), slug });
    }
  }
  return { phrases, words };
}
const { phrases: PHRASE_KEYWORDS, words: WORD_KEYWORDS } = buildPhraseEntries();

// Order single-word keyword categories: more specific first to break ties.
const GUESS_ORDER: CategorySlug[] = [
  "frozen", "meat", "dairy", "produce", "bakery", "snacks", "beverages", "household", "pantry",
];

// Whole-word match: keyword must equal a token, OR a token must start with the
// keyword (e.g. "apples" starts with "apple"), OR keyword starts with the token
// for short keywords (handles "berries" matching "berry" via stemming-lite).
function wordMatches(toks: string[], keyword: string): boolean {
  const k = keyword.toLowerCase();
  for (const t of toks) {
    if (t === k) return true;
    if (t.length >= k.length && t.startsWith(k) && t.length - k.length <= 3) return true;
    if (k.length >= t.length && k.startsWith(t) && k.length - t.length <= 3 && t.length >= 4) return true;
  }
  return false;
}

export function guessCategory(name: string): CategorySlug {
  const n = name.toLowerCase();
  // 1. Multi-word phrase substring match (highest priority, most specific).
  for (const { phrase, slug } of PHRASE_KEYWORDS) {
    if (n.includes(phrase)) return slug;
  }
  // 2. Whole-word token match, in category priority order.
  const toks = n.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  for (const slug of GUESS_ORDER) {
    for (const { word, slug: ws } of WORD_KEYWORDS) {
      if (ws !== slug) continue;
      if (wordMatches(toks, word)) return slug;
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
