import { businessConfigSchema, type BusinessConfig } from "./schemas";

export type BusinessTemplate = "restaurant" | "retail" | "service" | "blank";

const presets: Record<BusinessTemplate, {
  industry: string;
  description: string;
  unitName: string;
  categories: string[];
  overhead: string[];
  tiers: Array<[string, string]>;
  itemTerm: string;
  promptContext: string;
}> = {
  restaurant: {
    industry: "restaurant",
    description: "Restaurant or food service business",
    unitName: "serving",
    categories: ["Protein", "Produce", "Dairy", "Seasoning", "Grain", "Beverage", "Supply", "Packaging"],
    overhead: ["Labor", "Rent", "Utilities", "Insurance", "Supplies"],
    tiers: [["dine_in", "Dine-In"], ["takeout", "Takeout/Delivery"]],
    itemTerm: "ingredient",
    promptContext: "They purchase food ingredients and supplies from restaurant suppliers and wholesale distributors.",
  },
  retail: {
    industry: "retail",
    description: "Retail store or shop",
    unitName: "unit",
    categories: ["Inventory", "Supplies", "Packaging", "Equipment", "Cleaning"],
    overhead: ["Labor", "Rent", "Utilities", "Insurance", "Marketing"],
    tiers: [["retail", "Retail Price"], ["wholesale", "Wholesale Price"]],
    itemTerm: "product",
    promptContext: "They purchase inventory and supplies from wholesale distributors and manufacturers.",
  },
  service: {
    industry: "service",
    description: "Service-based business",
    unitName: "job",
    categories: ["Materials", "Supplies", "Equipment", "Consumables"],
    overhead: ["Labor", "Rent/Office", "Insurance", "Vehicle/Transport", "Tools/Equipment"],
    tiers: [["standard", "Standard Rate"]],
    itemTerm: "item",
    promptContext: "They purchase materials, supplies, and equipment from various vendors.",
  },
  blank: {
    industry: "general",
    description: "",
    unitName: "unit",
    categories: [],
    overhead: ["Labor", "Rent", "Utilities", "Insurance"],
    tiers: [["standard", "Standard Price"]],
    itemTerm: "item",
    promptContext: "",
  },
};

export function createBusinessConfig(
  template: BusinessTemplate,
  businessName: string,
): BusinessConfig {
  const preset = presets[template];
  return businessConfigSchema.parse({
    business: {
      name: businessName,
      industry: preset.industry,
      description: preset.description,
      currency: "USD",
      typical_suppliers: [],
    },
    items: { categories: preset.categories, aliases: {} },
    products: { unit_name: preset.unitName, recipes: {} },
    overhead: {
      monthly_production: 0,
      cost_categories: preset.overhead.map((name) => ({ name, monthly_amount: 0 })),
    },
    pricing: {
      tiers: Object.fromEntries(
        preset.tiers.map(([key, label]) => [key, { label, prices: {} }]),
      ),
    },
    extraction: {
      prompt_context: preset.promptContext,
      item_term: preset.itemTerm,
      receipt_rules: [],
    },
  });
}
