import type { BusinessConfig } from "./schemas";

export type Purchase = {
  date: string;
  supplier: string;
  canonical_name: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
};

export type LatestPrice = {
  unit_price: number;
  unit: string;
  quantity_purchased: number;
  total_price: number;
  date: string;
  supplier: string;
};

export type ProductCost = {
  product: string;
  size: string;
  batch_size: number;
  unit_name: string;
  ingredient_cost_per_unit: number;
  overhead_breakdown: Record<string, number>;
  total_overhead_per_unit: number;
  total_cost_per_unit: number;
  ingredients: Array<{
    ingredient: string;
    qty_needed: number;
    unit: string;
    unit_price: number;
    line_cost: number;
    price_date: string;
    supplier: string;
  }>;
  missing_prices: string[];
  tiers: Record<string, Record<string, string | number>>;
};

const round = (value: number, places: number): number =>
  Number(value.toFixed(places));

export function selectLatestPrices(
  purchases: Purchase[],
): Record<string, LatestPrice> {
  const latest: Record<string, LatestPrice> = {};

  for (const purchase of purchases) {
    if (
      purchase.unit_price < 0 ||
      purchase.quantity < 0 ||
      purchase.category === "Uncategorized"
    ) {
      continue;
    }

    const current = latest[purchase.canonical_name];
    if (!current || purchase.date > current.date) {
      latest[purchase.canonical_name] = {
        unit_price: purchase.unit_price,
        unit: purchase.unit,
        quantity_purchased: purchase.quantity,
        total_price: purchase.total_price,
        date: purchase.date,
        supplier: purchase.supplier,
      };
    }
  }

  return latest;
}

export function computeProductCosts(
  config: BusinessConfig,
  latestPrices: Record<string, LatestPrice>,
): ProductCost[] {
  const production = config.overhead.monthly_production;
  const overheadBreakdown: Record<string, number> = {};
  let totalOverheadPerUnit = 0;

  for (const category of config.overhead.cost_categories) {
    const perUnit = production > 0 ? category.monthly_amount / production : 0;
    overheadBreakdown[category.name] = round(perUnit, 4);
    totalOverheadPerUnit += perUnit;
  }

  return Object.entries(config.products.recipes).map(([product, recipe]) => {
    let batchIngredientCost = 0;
    const ingredients: ProductCost["ingredients"] = [];
    const missingPrices: string[] = [];

    for (const [ingredient, usage] of Object.entries(recipe.ingredients)) {
      const price = latestPrices[ingredient];
      if (!price) {
        missingPrices.push(ingredient);
        continue;
      }

      const lineCost = price.unit_price * usage.qty;
      batchIngredientCost += lineCost;
      ingredients.push({
        ingredient,
        qty_needed: usage.qty,
        unit: usage.unit,
        unit_price: price.unit_price,
        line_cost: round(lineCost, 2),
        price_date: price.date,
        supplier: price.supplier,
      });
    }

    const ingredientCostPerUnit = batchIngredientCost / recipe.batch_size;
    const totalCostPerUnit = ingredientCostPerUnit + totalOverheadPerUnit;
    const tiers: ProductCost["tiers"] = {};

    for (const [tierKey, tier] of Object.entries(config.pricing.tiers)) {
      const configuredPrice = tier.prices[product];
      const result: Record<string, string | number> = { label: tier.label };

      if (configuredPrice?.per_unit !== undefined) {
        const price = configuredPrice.per_unit;
        result.price_per_unit = price;
        result.profit_per_unit = round(price - totalCostPerUnit, 4);
        result.margin_pct = round(((price - totalCostPerUnit) / price) * 100, 1);
      }
      if (configuredPrice?.low !== undefined) {
        const price = configuredPrice.low;
        result.price_low = price;
        result.profit_low = round(price - totalCostPerUnit, 4);
        result.margin_low_pct = round(((price - totalCostPerUnit) / price) * 100, 1);
      }
      if (configuredPrice?.high !== undefined) {
        const price = configuredPrice.high;
        result.price_high = price;
        result.profit_high = round(price - totalCostPerUnit, 4);
        result.margin_high_pct = round(((price - totalCostPerUnit) / price) * 100, 1);
      }

      tiers[tierKey] = result;
    }

    return {
      product,
      size: recipe.size,
      batch_size: recipe.batch_size,
      unit_name: config.products.unit_name,
      ingredient_cost_per_unit: round(ingredientCostPerUnit, 4),
      overhead_breakdown: { ...overheadBreakdown },
      total_overhead_per_unit: round(totalOverheadPerUnit, 4),
      total_cost_per_unit: round(totalCostPerUnit, 4),
      ingredients,
      missing_prices: missingPrices,
      tiers,
    };
  });
}
