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
