import { randomUUID } from "node:crypto";
import type { sheets_v4 } from "googleapis";
import {
  computeProductCosts,
  selectLatestPrices,
  type BusinessConfig,
  type MappedReceipt,
  type ProductCost,
  type Purchase,
} from "@/lib/domain";

export const PURCHASE_COLUMNS = [
  "Date",
  "Supplier",
  "Raw Description",
  "Canonical Name",
  "Category",
  "Quantity",
  "Unit",
  "Unit Price",
  "Total Price",
  "Source",
  "Receipt ID",
] as const;

function range(tab: string, cells: string): string {
  return `'${tab.replaceAll("'", "''")}'!${cells}`;
}

function tabNames(config: BusinessConfig) {
  return config.sheets.tab_names;
}

export async function initializeWorkbook(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetIds: Record<string, number>,
  config: BusinessConfig,
): Promise<void> {
  const tabs = tabNames(config);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [
        { range: range(tabs.purchases, "A1:K1"), values: [[...PURCHASE_COLUMNS]] },
        { range: range(tabs.unmapped, "A1:K1"), values: [[...PURCHASE_COLUMNS]] },
      ],
    },
  });

  const managedSheetIds = Object.values(sheetIds);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: managedSheetIds.flatMap((sheetId) => [
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: "gridProperties.frozenRowCount",
          },
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.09, green: 0.22, blue: 0.18 },
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat)",
          },
        },
      ]),
    },
  });
}

export async function readPurchases(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  config: BusinessConfig,
): Promise<Purchase[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: range(tabNames(config).purchases, "A:K"),
  });
  const rows = response.data.values ?? [];

  return rows.slice(1).flatMap((row) => {
    if (row.length < 9) return [];
    const quantity = Number(row[5]);
    const unitPrice = Number(row[7]);
    const totalPrice = Number(row[8]);
    if (![quantity, unitPrice, totalPrice].every(Number.isFinite)) return [];
    return [{
      date: String(row[0] ?? ""),
      supplier: String(row[1] ?? ""),
      canonical_name: String(row[3] ?? ""),
      category: String(row[4] ?? ""),
      quantity,
      unit: String(row[6] ?? "ea"),
      unit_price: unitPrice,
      total_price: totalPrice,
    }];
  });
}

export async function appendReceipt(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  receipt: MappedReceipt,
  config: BusinessConfig,
  source: string,
): Promise<{ receiptId: string; rowsAppended: number; costs: ProductCost[] }> {
  const tabs = tabNames(config);
  const receiptId = receipt.receipt_id ??
    `${receipt.merchant}_${receipt.date ?? "unknown-date"}_${randomUUID()}`;
  const ids = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: range(tabs.purchases, "K:K"),
  });
  if ((ids.data.values ?? []).slice(1).some((row) => row[0] === receiptId)) {
    throw new Error(`Duplicate receipt detected: ${receiptId}`);
  }

  const date = receipt.date ?? new Date().toISOString().slice(0, 10);
  const rows = receipt.items.map((item) => [
    date,
    receipt.merchant,
    item.raw_description || item.name,
    item.canonical_name.replace(/^UNMAPPED: /, ""),
    item.category,
    item.quantity,
    item.unit,
    item.unit_price ?? (item.quantity > 0 ? item.total_price / item.quantity : 0),
    item.total_price,
    source,
    receiptId,
  ]);
  const unmappedRows = receipt.items.flatMap((item, index) =>
    item.matched_pattern ? [] : [rows[index]],
  );

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: range(tabs.purchases, "A:K"),
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
  if (unmappedRows.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: range(tabs.unmapped, "A:K"),
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: unmappedRows },
    });
  }

  const purchases = await readPurchases(sheets, spreadsheetId, config);
  const latest = selectLatestPrices(purchases);
  const costs = computeProductCosts(config, latest);
  await writeComputedTabs(sheets, spreadsheetId, config, latest, costs);
  return { receiptId, rowsAppended: rows.length, costs };
}

async function writeComputedTabs(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  config: BusinessConfig,
  latest: ReturnType<typeof selectLatestPrices>,
  costs: ProductCost[],
): Promise<void> {
  const tabs = tabNames(config);
  const latestRows = [
    ["Item", "Unit Price", "Unit", "Qty Purchased", "Total Price", "Date", "Supplier"],
    ...Object.entries(latest).sort(([a], [b]) => a.localeCompare(b)).map(([name, item]) => [
      name, item.unit_price, item.unit, item.quantity_purchased, item.total_price, item.date, item.supplier,
    ]),
  ];
  const overheadNames = config.overhead.cost_categories.map((item) => item.name);
  const recipeRows: Array<Array<string | number>> = [[
    "Product", "Size", "Batch", `Ingredient $/${config.products.unit_name}`,
    ...overheadNames.map((name) => `${name} $/${config.products.unit_name}`),
    `Total $/${config.products.unit_name}`,
  ]];
  for (const cost of costs) {
    recipeRows.push([
      cost.product,
      cost.size,
      cost.batch_size,
      cost.ingredient_cost_per_unit,
      ...overheadNames.map((name) => cost.overhead_breakdown[name] ?? 0),
      cost.total_cost_per_unit,
    ]);
  }

  const tiers = Object.entries(config.pricing.tiers);
  const marginRows: Array<Array<string | number>> = [[
    "Product",
    `Total Cost/${config.products.unit_name}`,
    ...tiers.flatMap(([, tier]) => [`${tier.label} Price`, `${tier.label} Margin %`, `${tier.label} Profit`]),
  ]];
  for (const cost of costs) {
    marginRows.push([
      cost.product,
      cost.total_cost_per_unit,
      ...tiers.flatMap(([key]) => {
        const tier = cost.tiers[key] ?? {};
        return [
          Number(tier.price_per_unit ?? tier.price_low ?? 0),
          `${tier.margin_pct ?? tier.margin_low_pct ?? 0}%`,
          Number(tier.profit_per_unit ?? tier.profit_low ?? 0),
        ];
      }),
    ]);
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [
        { range: range(tabs.latest_prices, "A1"), values: latestRows },
        { range: range(tabs.recipes, "A1"), values: recipeRows },
        { range: range(tabs.margins, "A1"), values: marginRows },
      ],
    },
  });
}
