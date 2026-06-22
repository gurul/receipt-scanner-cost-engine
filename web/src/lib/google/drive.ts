import { Readable } from "node:stream";
import type { drive_v3 } from "googleapis";

export const GOOGLE_FOLDER_MIME = "application/vnd.google-apps.folder";

export async function createFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string,
): Promise<string> {
  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: GOOGLE_FOLDER_MIME,
      parents: parentId ? [parentId] : undefined,
      appProperties: { shapersaiManaged: "true" },
    },
    fields: "id",
  });
  if (!response.data.id) throw new Error(`Google Drive did not create folder ${name}`);
  return response.data.id;
}

export async function createJsonFile(
  drive: drive_v3.Drive,
  name: string,
  parentId: string,
  value: unknown,
): Promise<string> {
  const response = await drive.files.create({
    requestBody: {
      name,
      parents: [parentId],
      mimeType: "application/json",
      appProperties: { shapersaiManaged: "true" },
    },
    media: {
      mimeType: "application/json",
      body: Readable.from([JSON.stringify(value, null, 2)]),
    },
    fields: "id",
  });
  if (!response.data.id) throw new Error(`Google Drive did not create file ${name}`);
  return response.data.id;
}

export async function updateJsonFile(
  drive: drive_v3.Drive,
  fileId: string,
  value: unknown,
): Promise<void> {
  await drive.files.update({
    fileId,
    media: {
      mimeType: "application/json",
      body: Readable.from([JSON.stringify(value, null, 2)]),
    },
  });
}

export async function readJsonFile<T>(
  drive: drive_v3.Drive,
  fileId: string,
): Promise<T> {
  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "text" },
  );
  const content = typeof response.data === "string"
    ? response.data
    : JSON.stringify(response.data);
  return JSON.parse(content) as T;
}

export async function uploadReceiptImage(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
  data: Uint8Array,
  mediaType: string,
): Promise<string> {
  const response = await drive.files.create({
    requestBody: {
      name,
      parents: [parentId],
      appProperties: { shapersaiManaged: "true", kind: "receipt" },
    },
    media: {
      mimeType: mediaType,
      body: Readable.from([Buffer.from(data)]),
    },
    fields: "id",
  });
  if (!response.data.id) throw new Error("Google Drive did not store the receipt image");
  return response.data.id;
}

export async function moveFileToFolder(
  drive: drive_v3.Drive,
  fileId: string,
  folderId: string,
): Promise<void> {
  const current = await drive.files.get({ fileId, fields: "parents" });
  await drive.files.update({
    fileId,
    addParents: folderId,
    removeParents: current.data.parents?.join(","),
    fields: "id,parents",
  });
}

export async function permanentlyDeleteFile(
  drive: drive_v3.Drive,
  fileId: string,
): Promise<void> {
  await drive.files.delete({ fileId });
}
