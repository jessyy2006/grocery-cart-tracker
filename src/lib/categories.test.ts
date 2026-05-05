import { describe, it, expect } from "vitest";
import { guessCategory, findListMatch } from "./categories";

describe("guessCategory", () => {
  it("classifies common items", () => {
    expect(guessCategory("Whole milk")).toBe("dairy");
    expect(guessCategory("Granny smith apple")).toBe("produce");
    expect(guessCategory("Sourdough bread")).toBe("bakery");
    expect(guessCategory("Chicken breast")).toBe("meat");
    expect(guessCategory("Frozen pizza")).toBe("frozen");
    expect(guessCategory("Tortilla chips")).toBe("snacks");
    expect(guessCategory("Sparkling water")).toBe("beverages");
    expect(guessCategory("Toilet paper")).toBe("household");
    expect(guessCategory("Brown rice")).toBe("pantry");
  });

  it("falls back to other", () => {
    expect(guessCategory("zzzz mystery thing")).toBe("other");
  });

  // Regression: substring matching used to mis-classify these.
  describe("regressions (substring false-positives)", () => {
    it("steak is meat, not beverages (contains 'tea')", () => {
      expect(guessCategory("steak")).toBe("meat");
      expect(guessCategory("ribeye steak")).toBe("meat");
    });
    it("peanut butter is pantry, not snacks", () => {
      expect(guessCategory("peanut butter")).toBe("pantry");
    });
    it("ground beef is meat", () => {
      expect(guessCategory("ground beef")).toBe("meat");
      expect(guessCategory("ground turkey")).toBe("meat");
    });
    it("oatmeal is pantry, not other", () => {
      expect(guessCategory("oatmeal")).toBe("pantry");
    });
    it("ice cream is frozen", () => {
      expect(guessCategory("ice cream")).toBe("frozen");
      expect(guessCategory("vanilla ice cream")).toBe("frozen");
    });
    it("granola bar is snacks", () => {
      expect(guessCategory("granola bar")).toBe("snacks");
      expect(guessCategory("protein bar")).toBe("snacks");
    });
    it("hamburger buns are bakery (not 'ham')", () => {
      expect(guessCategory("hamburger buns")).toBe("bakery");
    });
  });

  describe("meat & seafood niche cases", () => {
    it("salmon, cod, halibut, shrimp", () => {
      expect(guessCategory("Atlantic salmon")).toBe("meat");
      expect(guessCategory("cod fillet")).toBe("meat");
      expect(guessCategory("halibut")).toBe("meat");
      expect(guessCategory("jumbo shrimp")).toBe("meat");
    });
    it("deli meats", () => {
      expect(guessCategory("prosciutto")).toBe("meat");
      expect(guessCategory("salami")).toBe("meat");
      expect(guessCategory("pepperoni")).toBe("meat");
    });
    it("hot dog and meatballs", () => {
      expect(guessCategory("hot dog")).toBe("meat");
      expect(guessCategory("meatballs")).toBe("meat");
    });
  });

  describe("produce niche cases", () => {
    it("plurals and varieties", () => {
      expect(guessCategory("bananas")).toBe("produce");
      expect(guessCategory("strawberries")).toBe("produce");
      expect(guessCategory("blueberries")).toBe("produce");
      expect(guessCategory("organic spinach")).toBe("produce");
    });
    it("herbs and aromatics", () => {
      expect(guessCategory("fresh basil")).toBe("produce");
      expect(guessCategory("ginger root")).toBe("produce");
      expect(guessCategory("garlic cloves")).toBe("produce");
    });
    it("less common vegetables", () => {
      expect(guessCategory("eggplant")).toBe("produce");
      expect(guessCategory("zucchini")).toBe("produce");
      expect(guessCategory("asparagus")).toBe("produce");
    });
  });

  describe("dairy niche cases", () => {
    it("cheeses", () => {
      expect(guessCategory("cheddar cheese")).toBe("dairy");
      expect(guessCategory("brie")).toBe("dairy");
      expect(guessCategory("ricotta")).toBe("dairy");
      expect(guessCategory("cream cheese")).toBe("dairy");
    });
    it("greek yogurt", () => {
      expect(guessCategory("Greek yogurt")).toBe("dairy");
    });
  });

  describe("beverages niche cases", () => {
    it("coffee, tea, kombucha", () => {
      expect(guessCategory("ground coffee")).toBe("beverages");
      expect(guessCategory("green tea")).toBe("beverages");
      expect(guessCategory("kombucha")).toBe("beverages");
    });
    it("plant milks", () => {
      expect(guessCategory("oat milk")).toBe("beverages");
      expect(guessCategory("almond milk")).toBe("beverages");
    });
    it("alcohol", () => {
      expect(guessCategory("red wine")).toBe("beverages");
      expect(guessCategory("ipa beer")).toBe("beverages");
    });
  });

  describe("snacks niche cases", () => {
    it("nuts", () => {
      expect(guessCategory("almonds")).toBe("snacks");
      expect(guessCategory("cashews")).toBe("snacks");
      expect(guessCategory("trail mix")).toBe("snacks");
    });
    it("cookies and chocolate", () => {
      expect(guessCategory("oreos")).toBe("snacks");
      expect(guessCategory("dark chocolate")).toBe("snacks");
    });
  });

  describe("frozen niche cases", () => {
    it("frozen items", () => {
      expect(guessCategory("frozen peas")).toBe("frozen");
      expect(guessCategory("french fries")).toBe("frozen");
      expect(guessCategory("chicken nuggets")).toBe("frozen");
    });
  });

  describe("household niche cases", () => {
    it("cleaning and personal care", () => {
      expect(guessCategory("dish soap")).toBe("household");
      expect(guessCategory("laundry detergent")).toBe("household");
      expect(guessCategory("toothpaste")).toBe("household");
      expect(guessCategory("aluminum foil")).toBe("household");
    });
  });

  describe("pantry niche cases", () => {
    it("grains and pasta", () => {
      expect(guessCategory("quinoa")).toBe("pantry");
      expect(guessCategory("spaghetti")).toBe("pantry");
      expect(guessCategory("ramen noodles")).toBe("pantry");
    });
    it("condiments and sauces", () => {
      expect(guessCategory("ketchup")).toBe("pantry");
      expect(guessCategory("soy sauce")).toBe("pantry");
      expect(guessCategory("marinara sauce")).toBe("pantry");
    });
  });

  describe("bakery niche cases", () => {
    it("breads and pastries", () => {
      expect(guessCategory("baguette")).toBe("bakery");
      expect(guessCategory("croissant")).toBe("bakery");
      expect(guessCategory("everything bagel")).toBe("bakery");
    });
  });
});

describe("findListMatch", () => {
  const items = [
    { id: "1", name: "Whole milk", barcode: null, checked_at: null },
    { id: "2", name: "Sourdough bread", barcode: "123", checked_at: null },
    { id: "3", name: "Bananas", barcode: null, checked_at: "2024-01-01" },
  ];
  it("matches by barcode first", () => {
    expect(findListMatch(items, { barcode: "123", name: "Other" })?.id).toBe("2");
  });
  it("matches by name token", () => {
    expect(findListMatch(items, { barcode: "999", name: "Organic Whole Milk 1gal" })?.id).toBe("1");
  });
  it("skips checked items", () => {
    expect(findListMatch(items, { barcode: "999", name: "Bananas" })).toBeNull();
  });
  it("returns null with no match", () => {
    expect(findListMatch(items, { barcode: "999", name: "Quinoa salad" })).toBeNull();
  });
});
