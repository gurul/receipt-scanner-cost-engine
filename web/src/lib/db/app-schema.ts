import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const workspace = pgTable("workspace", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("setup_required"),
  rootFolderId: text("root_folder_id"),
  receiptsFolderId: text("receipts_folder_id"),
  spreadsheetId: text("spreadsheet_id"),
  configFileId: text("config_file_id"),
  anthropicVaultFileId: text("anthropic_vault_file_id"),
  anthropicKeyFingerprint: text("anthropic_key_fingerprint"),
  anthropicKeyStatus: text("anthropic_key_status").notNull().default("missing"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const shortcutToken = pgTable(
  "shortcut_token",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("iPhone Shortcut"),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("shortcut_token_hash_idx").on(table.tokenHash),
    index("shortcut_token_user_id_idx").on(table.userId),
  ],
);

export const scanJob = pgTable(
  "scan_job",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    shortcutTokenId: text("shortcut_token_id")
      .references(() => shortcutToken.id, { onDelete: "set null" }),
    source: text("source").notNull(),
    status: text("status").notNull().default("queued"),
    driveImageFileId: text("drive_image_file_id"),
    driveResultFileId: text("drive_result_file_id"),
    errorCode: text("error_code"),
    attemptCount: integer("attempt_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("scan_job_user_created_idx").on(table.userId, table.createdAt),
    index("scan_job_shortcut_created_idx").on(table.shortcutTokenId, table.createdAt),
    index("scan_job_status_idx").on(table.status),
  ],
);

export const workspaceRelations = relations(workspace, ({ one }) => ({
  user: one(user, { fields: [workspace.userId], references: [user.id] }),
}));

export const shortcutTokenRelations = relations(shortcutToken, ({ one }) => ({
  user: one(user, { fields: [shortcutToken.userId], references: [user.id] }),
}));

export const scanJobRelations = relations(scanJob, ({ one }) => ({
  user: one(user, { fields: [scanJob.userId], references: [user.id] }),
}));
