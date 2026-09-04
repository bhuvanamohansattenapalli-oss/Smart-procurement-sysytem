import "dotenv/config";
import fs from "fs";
import path from "path";
import pg from "pg";
import { ensurePostgresSchema } from "./migratePostgres";

const { Pool } = pg;

const TABLE_IMPORT_ORDER = [
  "users",
  "farmers",
  "registrations",
  "otpChallenges",
  "officers",
  "staffAuditLogs",
  "staffNotifications",
  "procurementCentres",
  "slots",
  "bookings",
  "queueEntries",
  "procurements",
  "payments",
  "notifications",
  "cropPrices",
  "transportBookings",
] as const;

export async function importJsonToPostgres(jsonFilePath?: string): Promise<Record<string, number>> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to import JSON data to PostgreSQL.");
  }

  const filePath = jsonFilePath || path.resolve(process.cwd(), ".data", "procureflow_db.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`JSON database file not found at ${filePath}`);
  }

  console.log(`[JSON Import] Reading local database from ${filePath}...`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== "object" || !parsed.tables) {
    throw new Error("Invalid procureflow_db.json format: missing tables object.");
  }

  const isSsl =
    connectionString.includes("supabase.co") ||
    connectionString.includes("pooler.supabase.com") ||
    connectionString.includes("render.com") ||
    connectionString.includes("sslmode=require") ||
    process.env.NODE_ENV === "production";

  const pool = new Pool({
    connectionString,
    ssl: isSsl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 15000,
  });

  const importCounts: Record<string, number> = {};

  try {
    console.log("[JSON Import] Connecting to PostgreSQL database...");
    await pool.query("SELECT 1 AS connected");
    console.log("[JSON Import] Connected. Ensuring schema exists...");
    await ensurePostgresSchema(pool);

    for (const tableName of TABLE_IMPORT_ORDER) {
      const rows: any[] = parsed.tables[tableName] || [];
      if (!Array.isArray(rows) || rows.length === 0) {
        importCounts[tableName] = 0;
        continue;
      }

      console.log(`[JSON Import] Importing ${rows.length} rows into "${tableName}"...`);
      let importedForTable = 0;

      for (const row of rows) {
        const columns = Object.keys(row).filter((col) => row[col] !== undefined);
        if (columns.length === 0) continue;

        const quotedCols = columns.map((col) => `"${col}"`).join(", ");
        const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
        const values = columns.map((col) => {
          const val = row[col];
          if (val === null) return null;
          // Handle Date strings or boolean ints
          return val;
        });

        const updateAssignments = columns
          .filter((col) => col !== "id")
          .map((col) => `"${col}" = EXCLUDED."${col}"`)
          .join(", ");

        let query = "";
        if (columns.includes("id")) {
          query = `
            INSERT INTO "${tableName}" (${quotedCols})
            VALUES (${placeholders})
            ON CONFLICT ("id") DO UPDATE SET ${updateAssignments.length > 0 ? updateAssignments : '"id" = EXCLUDED."id"'}
          `;
        } else {
          query = `
            INSERT INTO "${tableName}" (${quotedCols})
            VALUES (${placeholders})
          `;
        }

        try {
          await pool.query(query, values);
          importedForTable++;
        } catch (err: any) {
          console.warn(`[JSON Import Warning] Failed to insert row in "${tableName}":`, err?.message || err);
        }
      }

      // Reset auto-increment sequence so new inserts don't collide
      try {
        await pool.query(`
          SELECT setval(
            pg_get_serial_sequence('"${tableName}"', 'id'),
            COALESCE((SELECT MAX("id") FROM "${tableName}"), 1)
          );
        `);
      } catch {
        // Table might not have id sequence
      }

      importCounts[tableName] = importedForTable;
      console.log(`[JSON Import] Completed "${tableName}": ${importedForTable}/${rows.length} rows saved.`);
    }

    console.log("\n================================================================================");
    console.log("[JSON Import Complete] Summary of imported data:");
    for (const [t, count] of Object.entries(importCounts)) {
      console.log(`  - ${t}: ${count} records`);
    }
    console.log("================================================================================\n");
  } finally {
    await pool.end();
  }

  return importCounts;
}

if (process.argv[1] && process.argv[1].includes("importJsonToPostgres")) {
  importJsonToPostgres().catch((err) => {
    console.error("[JSON Import Fatal Error]:", err);
    process.exit(1);
  });
}
