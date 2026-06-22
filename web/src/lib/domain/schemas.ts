import { z } from "zod";

export const aliasSchema = z.object({
  patterns: z.array(z.string().min(1)),
  category: z.string().min(1),
  default_unit: z.string().min(1).default("ea"),
});

export const recipeIngredientSchema = z.object({
  qty: z.number().nonnegative(),
  unit: z.string().min(1),
});

export const recipeSchema = z.object({
  size: z.string().default(""),
  batch_size: z.number().positive(),
  ingredients: z.record(z.string(), recipeIngredientSchema),
});

export const tierPriceSchema = z.object({
  per_unit: z.number().positive().optional(),
  low: z.number().positive().optional(),
  high: z.number().positive().optional(),
});

export const businessConfigSchema = z.object({
  version: z.number().int().positive().default(1),
  business: z.object({
    name: z.string().min(1, "Business name is required"),
    industry: z.string().min(1).default("general"),
    currency: z.string().length(3).default("USD"),
    description: z.string().default(""),
    typical_suppliers: z.array(z.string()).default([]),
  }),
  items: z.object({
    categories: z.array(z.string()).default([]),
    aliases: z.record(z.string(), aliasSchema),
  }),
  products: z.object({
    unit_name: z.string().min(1, "Product unit name is required"),
    recipes: z.record(z.string(), recipeSchema).default({}),
  }),
  overhead: z.object({
    monthly_production: z.number().nonnegative().default(0),
    cost_categories: z.array(
      z.object({
        name: z.string().min(1),
        monthly_amount: z.number().nonnegative(),
      }),
    ).default([]),
  }),
  pricing: z.object({
    tiers: z.record(
      z.string(),
      z.object({
        label: z.string().min(1),
        prices: z.record(z.string(), tierPriceSchema).default({}),
      }),
    ).default({}),
  }).default({ tiers: {} }),
  sheets: z.object({
    tab_names: z.object({
      purchases: z.string().default("Purchases"),
      latest_prices: z.string().default("Latest Prices"),
      recipes: z.string().default("Recipes"),
      margins: z.string().default("Margins"),
      unmapped: z.string().default("Unmapped Items"),
    }),
  }).default({
    tab_names: {
      purchases: "Purchases",
      latest_prices: "Latest Prices",
      recipes: "Recipes",
      margins: "Margins",
      unmapped: "Unmapped Items",
    },
  }),
  extraction: z.object({
    prompt_context: z.string().default(""),
    item_term: z.string().min(1).default("item"),
    receipt_rules: z.array(z.string()).default([]),
  }).default({ prompt_context: "", item_term: "item", receipt_rules: [] }),
});

export const receiptItemSchema = z.object({
  raw_description: z.string().default(""),
  name: z.string().min(1),
  quantity: z.number().nonnegative(),
  unit: z.string().min(1).default("ea"),
  unit_price: z.number().nonnegative().nullable().default(null),
  total_price: z.number().nonnegative(),
});

export const extractedReceiptSchema = z.object({
  merchant: z.string().min(1),
  merchant_address: z.string().nullable().default(null),
  date: z.string().nullable().default(null),
  time: z.string().nullable().default(null),
  receipt_id: z.string().nullable().default(null),
  payment_method: z.string().nullable().default(null),
  items: z.array(receiptItemSchema).min(1),
  subtotal: z.number().nonnegative().nullable().default(null),
  tax: z.number().nonnegative().nullable().default(null),
  total: z.number().nonnegative(),
});

export const mappedReceiptSchema = extractedReceiptSchema.omit({ items: true }).extend({
  items: z.array(receiptItemSchema.extend({
    canonical_name: z.string().min(1),
    category: z.string().min(1),
    default_unit: z.string().min(1),
    matched_pattern: z.string().nullable(),
  })).min(1),
  mapping_stats: z.object({
    total_items: z.number().int().nonnegative(),
    mapped: z.number().int().nonnegative(),
    unmapped: z.number().int().nonnegative(),
  }),
});

export type Alias = z.infer<typeof aliasSchema>;
export type BusinessConfig = z.infer<typeof businessConfigSchema>;
export type ExtractedReceipt = z.infer<typeof extractedReceiptSchema>;
export type ValidatedMappedReceipt = z.infer<typeof mappedReceiptSchema>;
export type ReceiptItem = z.infer<typeof receiptItemSchema>;
