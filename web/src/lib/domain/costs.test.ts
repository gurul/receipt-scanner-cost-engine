import { describe, expect, it } from "vitest";
import { computeProductCosts, selectLatestPrices, type Purchase } from "./costs";
import { businessConfigSchema } from "./schemas";

const config = businessConfigSchema.parse({
  business: { name: "Test Kitchen", industry: "restaurant" },
  items: { aliases: {} },
  products: {
    unit_name: "serving",
    recipes: {
      Dumpling: {
        batch_size: 10,
        ingredients: {
          Pork: { qty: 2, unit: "lb" },
          Salt: { qty: 0.1, unit: "lb" },
        },
      },
    },
  },
  overhead: {
    monthly_production: 1000,
    cost_categories: [
      { name: "Labor", monthly_amount: 1000 },
      { name: "Rent", monthly_amount: 500 },
    ],
  },
  pricing: {
    tiers: {
      retail: {
        label: "Retail",
        prices: { Dumpling: { per_unit: 4 } },
      },
    },
  },
});

const purchases: Purchase[] = [
  { date: "2026-01-01", supplier: "A", canonical_name: "Pork", category: "Protein", quantity: 10, unit: "lb", unit_price: 2, total_price: 20 },
  { date: "2026-02-01", supplier: "B", canonical_name: "Pork", category: "Protein", quantity: 10, unit: "lb", unit_price: 3, total_price: 30 },
  { date: "2026-02-01", supplier: "B", canonical_name: "Unknown", category: "Uncategorized", quantity: 1, unit: "ea", unit_price: 10, total_price: 10 },
];

describe("selectLatestPrices", () => {
  it("uses the newest categorized purchase", () => {
    const prices = selectLatestPrices(purchases);
    expect(prices.Pork.unit_price).toBe(3);
    expect(prices.Unknown).toBeUndefined();
  });
});

describe("computeProductCosts", () => {
  it("matches the legacy overhead and margin formulas", () => {
    const [result] = computeProductCosts(config, selectLatestPrices(purchases));
    expect(result.ingredient_cost_per_unit).toBe(0.6);
    expect(result.total_overhead_per_unit).toBe(1.5);
    expect(result.total_cost_per_unit).toBe(2.1);
    expect(result.missing_prices).toEqual(["Salt"]);
    expect(result.tiers.retail).toMatchObject({
      price_per_unit: 4,
      profit_per_unit: 1.9,
      margin_pct: 47.5,
    });
  });
});
