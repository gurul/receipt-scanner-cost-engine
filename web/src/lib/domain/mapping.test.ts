import { describe, expect, it } from "vitest";
import { mapItem, mapReceiptItems, UNMAPPED_PREFIX } from "./mapping";
import { extractedReceiptSchema, type BusinessConfig } from "./schemas";

const aliases: BusinessConfig["items"]["aliases"] = {
  Pork: {
    patterns: ["GRD PORK", "GROUND PORK", "PORK"],
    category: "Protein",
    default_unit: "lb",
  },
  Salt: {
    patterns: ["SALT", "IODIZED SALT"],
    category: "Seasoning",
    default_unit: "lb",
  },
};

describe("mapItem", () => {
  it("matches case-insensitively", () => {
    expect(mapItem("ground pork bulk", aliases).canonical_name).toBe("Pork");
  });

  it("prefers the longest matching pattern", () => {
    expect(mapItem("GRD PORK 80/20", aliases).matched_pattern).toBe("GRD PORK");
  });

  it("does not match within another word", () => {
    expect(mapItem("BASALT ROCK", aliases).canonical_name).toBe(
      `${UNMAPPED_PREFIX}BASALT ROCK`,
    );
  });
});

describe("mapReceiptItems", () => {
  it("tracks mapped and unmapped counts", () => {
    const receipt = extractedReceiptSchema.parse({
      merchant: "Supplier",
      total: 25,
      items: [
        { name: "Pork", raw_description: "GRD PORK", quantity: 10, unit: "lb", unit_price: 2, total_price: 20 },
        { name: "Mystery", raw_description: "UNKNOWN THING", quantity: 1, unit: "ea", unit_price: 5, total_price: 5 },
      ],
    });

    expect(mapReceiptItems(receipt, aliases).mapping_stats).toEqual({
      total_items: 2,
      mapped: 1,
      unmapped: 1,
    });
  });
});
