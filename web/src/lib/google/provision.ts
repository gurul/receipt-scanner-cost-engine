import type { BusinessConfig } from "@/lib/domain";
import { createGoogleClients } from "./client";
import {
  createFolder,
  createJsonFile,
  moveFileToFolder,
  permanentlyDeleteFile,
} from "./drive";
import { initializeWorkbook } from "./sheets";

export type ProvisionedWorkspace = {
  rootFolderId: string;
  receiptsFolderId: string;
  configFileId: string;
  spreadsheetId: string;
};

export async function provisionGoogleWorkspace(
  accessToken: string,
  config: BusinessConfig,
): Promise<ProvisionedWorkspace> {
  const { drive, sheets } = createGoogleClients(accessToken);
  const created: string[] = [];

  try {
    const rootFolderId = await createFolder(drive, "ShapersAI");
    created.push(rootFolderId);
    const receiptsFolderId = await createFolder(drive, "Receipts", rootFolderId);
    const configFileId = await createJsonFile(
      drive,
      "business-config.json",
      rootFolderId,
      config,
    );

    const titles = Object.values(config.sheets.tab_names);
    if (new Set(titles).size !== titles.length) {
      throw new Error("Every managed Google Sheet tab needs a unique name");
    }
    const workbook = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: `${config.business.name} Cost Engine` },
        sheets: titles.map((title) => ({ properties: { title } })),
      },
      fields: "spreadsheetId,sheets.properties(sheetId,title)",
    });
    const spreadsheetId = workbook.data.spreadsheetId;
    if (!spreadsheetId) throw new Error("Google Sheets did not create a workbook");
    created.push(spreadsheetId);
    await moveFileToFolder(drive, spreadsheetId, rootFolderId);

    const sheetIds = Object.fromEntries(
      (workbook.data.sheets ?? []).flatMap((sheet) => {
        const title = sheet.properties?.title;
        const id = sheet.properties?.sheetId;
        return title && typeof id === "number" ? [[title, id] as [string, number]] : [];
      }),
    );
    await initializeWorkbook(sheets, spreadsheetId, sheetIds, config);
    return { rootFolderId, receiptsFolderId, configFileId, spreadsheetId };
  } catch (error) {
    await Promise.allSettled(created.reverse().map((fileId) => permanentlyDeleteFile(drive, fileId)));
    throw error;
  }
}
