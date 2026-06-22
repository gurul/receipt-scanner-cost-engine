/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  DBAdapter,
  DBAdapterInstance,
  DBTransactionAdapter,
} from "@better-auth/core/db/adapter";
import type { SecretCipher } from "./kms";

const OAUTH_SECRET_FIELDS = ["accessToken", "refreshToken", "idToken"] as const;

function contextFor(
  data: Record<string, any>,
  field: string,
  ownerUserId?: string,
): string {
  const userId = ownerUserId ?? data.userId;
  if (typeof userId !== "string" || !userId) {
    throw new Error(`Cannot protect ${field} without an OAuth account userId`);
  }
  return `shapersai:oauth:${userId}:${field}:v1`;
}

export async function encryptAccountFields(
  data: Record<string, any>,
  cipher: SecretCipher,
  ownerUserId?: string,
): Promise<Record<string, any>> {
  const protectedData = { ...data };
  for (const field of OAUTH_SECRET_FIELDS) {
    const value = protectedData[field];
    if (typeof value === "string" && value) {
      protectedData[field] = await cipher.encrypt(
        value,
        contextFor(protectedData, field, ownerUserId),
      );
    }
  }
  return protectedData;
}

export async function decryptAccountFields(
  data: Record<string, any>,
  cipher: SecretCipher,
  ownerUserId?: string,
): Promise<Record<string, any>> {
  const clearData = { ...data };
  for (const field of OAUTH_SECRET_FIELDS) {
    const value = clearData[field];
    if (typeof value === "string" && value) {
      clearData[field] = await cipher.decrypt(
        value,
        contextFor(clearData, field, ownerUserId),
      );
    }
  }
  return clearData;
}

async function decryptResult<T>(
  model: string,
  result: T,
  cipher: SecretCipher,
  ownerUserId?: string,
): Promise<T> {
  if (model !== "account" || result === null || result === undefined) return result;
  if (Array.isArray(result)) {
    return Promise.all(
      result.map((row) =>
        decryptAccountFields(row as Record<string, any>, cipher, ownerUserId),
      ),
    ) as Promise<T>;
  }
  return decryptAccountFields(
    result as Record<string, any>,
    cipher,
    ownerUserId,
  ) as Promise<T>;
}

function wrapAdapter(base: DBAdapter, cipher: SecretCipher): DBAdapter {
  const wrapped: DBAdapter = {
    ...base,
    create: (async (input: any) => {
      const data = input.model === "account"
        ? await encryptAccountFields(input.data, cipher)
        : input.data;
      const result = await base.create({ ...input, data });
      return decryptResult(input.model, result, cipher, input.data.userId);
    }) as DBAdapter["create"],
    findOne: (async (input: any) => {
      return decryptResult(input.model, await base.findOne(input), cipher);
    }) as DBAdapter["findOne"],
    findMany: (async (input: any) => {
      return decryptResult(input.model, await base.findMany(input), cipher);
    }) as DBAdapter["findMany"],
    update: (async (input: any) => {
      let update = input.update;
      let ownerUserId: string | undefined;
      if (input.model === "account") {
        const existing = await base.findOne<Record<string, any>>({
          model: input.model,
          where: input.where,
        });
        ownerUserId = existing?.userId;
        update = await encryptAccountFields(input.update, cipher, ownerUserId);
      }
      return decryptResult(
        input.model,
        await base.update({ ...input, update }),
        cipher,
        ownerUserId,
      );
    }) as DBAdapter["update"],
    updateMany: (async (input: any) => {
      if (
        input.model === "account" &&
        OAUTH_SECRET_FIELDS.some((field) => input.update[field] !== undefined)
      ) {
        throw new Error("Bulk OAuth token updates are not permitted");
      }
      return base.updateMany(input);
    }) as DBAdapter["updateMany"],
    consumeOne: (async (input: any) => {
      return decryptResult(input.model, await base.consumeOne(input), cipher);
    }) as DBAdapter["consumeOne"],
    incrementOne: (async (input: any) => {
      return decryptResult(input.model, await base.incrementOne(input), cipher);
    }) as DBAdapter["incrementOne"],
    transaction: (async (callback: any) => {
      return base.transaction((transaction) =>
        callback(wrapAdapter(transaction as DBAdapter, cipher) as DBTransactionAdapter),
      );
    }) as DBAdapter["transaction"],
  };

  return wrapped;
}

export function withKmsEncryptedOAuthTokens(
  baseFactory: DBAdapterInstance,
  cipher: SecretCipher,
): DBAdapterInstance {
  return (options) => wrapAdapter(baseFactory(options), cipher);
}
