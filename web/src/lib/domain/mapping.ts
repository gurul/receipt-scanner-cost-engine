import type { BusinessConfig, ExtractedReceipt, ReceiptItem } from "./schemas";

export const UNMAPPED_PREFIX = "UNMAPPED: ";

export type ItemMapping = {
  canonical_name: string;
  category: string;
  default_unit: string;
  matched_pattern: string | null;
};

export type MappedReceiptItem = ReceiptItem & ItemMapping;

export type MappedReceipt = Omit<ExtractedReceipt, "items"> & {
  items: MappedReceiptItem[];
  mapping_stats: {
    total_items: number;
    mapped: number;
    unmapped: number;
  };
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function mapItem(
  rawDescription: string,
  aliases: BusinessConfig["items"]["aliases"],
): ItemMapping {
  const normalized = rawDescription.toUpperCase().trim();
  let best: ItemMapping | null = null;
  let bestLength = 0;

  for (const [canonicalName, alias] of Object.entries(aliases)) {
    for (const pattern of alias.patterns) {
      const normalizedPattern = pattern.toUpperCase();
      const expression = new RegExp(`\\b${escapeRegExp(normalizedPattern)}\\b`);

      if (expression.test(normalized) && normalizedPattern.length > bestLength) {
        best = {
          canonical_name: canonicalName,
          category: alias.category,
          default_unit: alias.default_unit,
          matched_pattern: pattern,
        };
        bestLength = normalizedPattern.length;
      }
    }
  }

  return best ?? {
    canonical_name: `${UNMAPPED_PREFIX}${rawDescription}`,
    category: "Uncategorized",
    default_unit: "ea",
    matched_pattern: null,
  };
}

export function mapReceiptItems(
  receipt: ExtractedReceipt,
  aliases: BusinessConfig["items"]["aliases"],
): MappedReceipt {
  let unmapped = 0;
  const items = receipt.items.map((item) => {
    const mapping = mapItem(item.raw_description || item.name, aliases);
    if (!mapping.matched_pattern) unmapped += 1;
    return { ...item, ...mapping };
  });

  return {
    ...receipt,
    items,
    mapping_stats: {
      total_items: items.length,
      mapped: items.length - unmapped,
      unmapped,
    },
  };
}
