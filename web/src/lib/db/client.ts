import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// The placeholder keeps schema generation and production builds side-effect free.
// Runtime routes validate the real value before making a database call.
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://schema:only@localhost/shapersai";

const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });
