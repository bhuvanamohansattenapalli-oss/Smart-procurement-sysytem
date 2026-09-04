import "dotenv/config";
import fs from "fs";
import path from "path";
import pg from "pg";

const { Pool } = pg;

export const REQUIRED_TABLES = [
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

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function ensurePostgresSchema(pool: pg.Pool): Promise<void> {
  const sqlPath = path.resolve(process.cwd(), "drizzle", "0000_init_postgres.sql");
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Migration SQL file not found at ${sqlPath}`);
  }

  const sqlContent = fs.readFileSync(sqlPath, "utf-8");
  console.log("[Database Migration] Ensuring PostgreSQL schema tables exist...");
  await withTimeout(
    pool.query(sqlContent),
    15000,
    "PostgreSQL schema initialization timed out after 15000ms"
  );
  console.log("[Database Migration] PostgreSQL schema initialized successfully.");
}

export async function verifyTablesExist(pool: pg.Pool): Promise<{ existing: string[]; missing: string[] }> {
  const query = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `;
  const res = await pool.query(query);
  const existing = res.rows.map((r: any) => r.table_name);
  const missing = REQUIRED_TABLES.filter((t) => !existing.includes(t));
  return { existing, missing };
}

async function runStandaloneMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[Database Migration Error] DATABASE_URL environment variable is required to run migration.");
    process.exit(1);
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
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log("[Database Migration] Connecting to PostgreSQL database...");
    await pool.query("SELECT 1 AS connected");
    console.log("[Database Migration] Connected successfully.");

    await ensurePostgresSchema(pool);

    const { existing, missing } = await verifyTablesExist(pool);
    console.log(`[Database Migration] Verified ${existing.length} public tables in database.`);

    if (missing.length > 0) {
      console.error(`[Database Migration Error] Missing expected tables: ${missing.join(", ")}`);
      process.exit(1);
    }

    console.log(`[Database Migration] All ${REQUIRED_TABLES.length} required tables are present and ready!`);
  } catch (err: any) {
    console.error("[Database Migration Error] Migration failed:", err?.message || err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Only execute standalone if invoked directly
if (process.argv[1] && process.argv[1].includes("migratePostgres")) {
  runStandaloneMigration().catch(console.error);
}
