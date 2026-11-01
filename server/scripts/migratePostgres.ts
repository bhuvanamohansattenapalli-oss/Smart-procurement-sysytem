import "dotenv/config";
import fs from "fs";
import path from "path";
import pg from "pg";

const { Pool } = pg;

export const REQUIRED_TABLES = [
  "users",
  "farmers",
  "registrations",
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
  "chatMessages",
] as const;

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export const EMBEDDED_POSTGRES_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "openId" VARCHAR(64) NOT NULL UNIQUE,
  "name" TEXT,
  "email" VARCHAR(320),
  "loginMethod" VARCHAR(64),
  "role" VARCHAR(32) NOT NULL DEFAULT 'user',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastSignedIn" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "farmers" (
  "id" SERIAL PRIMARY KEY,
  "farmerCode" VARCHAR(32) NOT NULL UNIQUE,
  "name" VARCHAR(160) NOT NULL,
  "phone" VARCHAR(20) NOT NULL UNIQUE,
  "passwordHash" VARCHAR(255) NOT NULL,
  "village" VARCHAR(160) NOT NULL,
  "district" VARCHAR(160) NOT NULL,
  "primaryCrop" VARCHAR(80) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "registrations" (
  "id" SERIAL PRIMARY KEY,
  "farmerId" INTEGER NOT NULL UNIQUE,
  "aadhaarMasked" VARCHAR(32) NOT NULL,
  "declarationAccepted" INTEGER NOT NULL DEFAULT 1,
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "rejectionReason" TEXT,
  "reviewedByOfficerId" INTEGER,
  "submittedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "reviewedAt" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "officers" (
  "id" SERIAL PRIMARY KEY,
  "officerCode" VARCHAR(40) NOT NULL UNIQUE,
  "employeeId" VARCHAR(64),
  "name" VARCHAR(160) NOT NULL,
  "email" VARCHAR(320),
  "phone" VARCHAR(20),
  "passwordHash" VARCHAR(255) NOT NULL,
  "role" VARCHAR(64) NOT NULL DEFAULT 'HEAD_OFFICER',
  "department" VARCHAR(100) NOT NULL DEFAULT 'Administration',
  "designation" VARCHAR(120),
  "branch" VARCHAR(160) NOT NULL DEFAULT 'Guntur',
  "centreId" INTEGER,
  "centreName" VARCHAR(160),
  "district" VARCHAR(160) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  "mustChangePassword" INTEGER NOT NULL DEFAULT 0,
  "approvedByOfficerId" INTEGER,
  "approvedAt" TIMESTAMP,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "staffAuditLogs" (
  "id" SERIAL PRIMARY KEY,
  "performedByOfficerId" INTEGER NOT NULL,
  "performedByOfficerName" VARCHAR(160) NOT NULL,
  "targetOfficerId" INTEGER,
  "targetOfficerName" VARCHAR(160),
  "action" VARCHAR(64) NOT NULL,
  "details" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "staffNotifications" (
  "id" SERIAL PRIMARY KEY,
  "officerId" INTEGER NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "message" TEXT NOT NULL,
  "category" VARCHAR(48) NOT NULL DEFAULT 'ONBOARDING',
  "isRead" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "procurementCentres" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(180) NOT NULL,
  "place" VARCHAR(180) NOT NULL,
  "district" VARCHAR(160) NOT NULL,
  "state" VARCHAR(100) NOT NULL DEFAULT 'Andhra Pradesh',
  "latitude" NUMERIC(10, 7) NOT NULL,
  "longitude" NUMERIC(10, 7) NOT NULL,
  "distanceKm" NUMERIC(5, 2) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  "queueCapacity" INTEGER NOT NULL DEFAULT 50,
  "cropCategories" VARCHAR(255) DEFAULT 'Cereals, Pulses, Oilseeds',
  "currentToken" VARCHAR(32) DEFAULT 'P-001',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "slots" (
  "id" SERIAL PRIMARY KEY,
  "centreId" INTEGER NOT NULL,
  "slotDate" VARCHAR(16) NOT NULL,
  "startTime" VARCHAR(16) NOT NULL,
  "endTime" VARCHAR(16) NOT NULL,
  "capacity" INTEGER NOT NULL,
  "bookedCount" INTEGER NOT NULL DEFAULT 0,
  "isActive" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "bookings" (
  "id" SERIAL PRIMARY KEY,
  "bookingCode" VARCHAR(40) NOT NULL UNIQUE,
  "farmerId" INTEGER NOT NULL,
  "centreId" INTEGER NOT NULL,
  "slotId" INTEGER NOT NULL,
  "paddyVariety" VARCHAR(120) NOT NULL,
  "paddyGrade" VARCHAR(32) NOT NULL,
  "expectedQuantityQuintals" NUMERIC(8, 2) NOT NULL,
  "tokenNumber" VARCHAR(32) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "queueEntries" (
  "id" SERIAL PRIMARY KEY,
  "bookingId" INTEGER NOT NULL UNIQUE,
  "centreId" INTEGER NOT NULL,
  "position" INTEGER NOT NULL,
  "estimatedWaitMinutes" INTEGER NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'WAITING',
  "joinedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "procurements" (
  "id" SERIAL PRIMARY KEY,
  "bookingId" INTEGER NOT NULL UNIQUE,
  "status" VARCHAR(48) NOT NULL DEFAULT 'BOOKED',
  "weighedQuantityQuintals" NUMERIC(8, 2),
  "qualityGrade" VARCHAR(32),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" SERIAL PRIMARY KEY,
  "bookingId" INTEGER NOT NULL,
  "paymentCode" VARCHAR(40) NOT NULL UNIQUE,
  "transactionReference" VARCHAR(64) NOT NULL UNIQUE,
  "receiptNumber" VARCHAR(48),
  "amount" NUMERIC(12, 2) NOT NULL,
  "method" VARCHAR(32) NOT NULL,
  "gateway" VARCHAR(80) NOT NULL DEFAULT 'PROCUREFLOW_TEST_GATEWAY',
  "gatewayPaymentId" VARCHAR(96),
  "officerId" INTEGER,
  "status" VARCHAR(48) NOT NULL DEFAULT 'PENDING',
  "failureReason" VARCHAR(240),
  "isDemo" INTEGER NOT NULL DEFAULT 1,
  "initiatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "processedAt" TIMESTAMP,
  "completedAt" TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" SERIAL PRIMARY KEY,
  "farmerId" INTEGER NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "message" TEXT NOT NULL,
  "category" VARCHAR(48) NOT NULL,
  "isRead" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "cropPrices" (
  "id" SERIAL PRIMARY KEY,
  "cropName" VARCHAR(120) NOT NULL,
  "variety" VARCHAR(120) NOT NULL,
  "category" VARCHAR(80) NOT NULL,
  "mspPerQuintal" NUMERIC(10, 2) NOT NULL,
  "marketRatePerQuintal" NUMERIC(10, 2) NOT NULL,
  "govtBonusPerQuintal" NUMERIC(10, 2) NOT NULL DEFAULT '0.00',
  "maxMoisturePercent" NUMERIC(4, 1) NOT NULL DEFAULT '17.0',
  "effectiveSeason" VARCHAR(80) NOT NULL DEFAULT 'Kharif 2025-26',
  "notificationRef" VARCHAR(120) DEFAULT 'MoA&FW/CACP-2025/MSP-04',
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "transportBookings" (
  "id" SERIAL PRIMARY KEY,
  "transportCode" VARCHAR(40) NOT NULL UNIQUE,
  "farmerId" INTEGER NOT NULL,
  "bookingId" INTEGER,
  "vehicleType" VARCHAR(32) NOT NULL,
  "pickupVillage" VARCHAR(160) NOT NULL,
  "destinationCentreId" INTEGER NOT NULL,
  "scheduledDate" VARCHAR(24) NOT NULL,
  "timeSlot" VARCHAR(32) NOT NULL DEFAULT 'Morning (07:00 - 11:00 AM)',
  "estimatedLoadQuintals" NUMERIC(8, 2) NOT NULL,
  "driverName" VARCHAR(120),
  "driverPhone" VARCHAR(20),
  "vehicleNumber" VARCHAR(32),
  "distanceKm" NUMERIC(6, 2) NOT NULL DEFAULT '12.00',
  "baseFare" NUMERIC(10, 2) NOT NULL,
  "subsidyAmount" NUMERIC(10, 2) NOT NULL DEFAULT '0.00',
  "netPayable" NUMERIC(10, 2) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "chatMessages" (
  "id" SERIAL PRIMARY KEY,
  "sessionId" VARCHAR(64) NOT NULL,
  "userRole" VARCHAR(32) NOT NULL DEFAULT 'farmer',
  "userId" INTEGER,
  "sender" VARCHAR(16) NOT NULL,
  "message" TEXT NOT NULL,
  "language" VARCHAR(8) NOT NULL DEFAULT 'EN',
  "source" VARCHAR(32) NOT NULL DEFAULT 'gemini',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_chat_session" ON "chatMessages" ("sessionId");
CREATE INDEX IF NOT EXISTS "idx_farmers_phone" ON "farmers" ("phone");
CREATE INDEX IF NOT EXISTS "idx_farmers_code" ON "farmers" ("farmerCode");
CREATE INDEX IF NOT EXISTS "idx_bookings_code" ON "bookings" ("bookingCode");
CREATE INDEX IF NOT EXISTS "idx_bookings_farmer" ON "bookings" ("farmerId");
CREATE INDEX IF NOT EXISTS "idx_bookings_centre" ON "bookings" ("centreId");
CREATE INDEX IF NOT EXISTS "idx_slots_centre" ON "slots" ("centreId", "slotDate");
CREATE INDEX IF NOT EXISTS "idx_queue_centre" ON "queueEntries" ("centreId", "status");
CREATE INDEX IF NOT EXISTS "idx_payments_code" ON "payments" ("paymentCode");
CREATE INDEX IF NOT EXISTS "idx_notifications_farmer" ON "notifications" ("farmerId");
`;

export async function ensurePostgresSchema(pool: pg.Pool): Promise<void> {
  // Fast check: If key tables already exist, skip redundant DDL execution
  try {
    const checkRes = await withTimeout(
      pool.query("SELECT to_regclass('public.farmers') as f, to_regclass('public.users') as u"),
      3000,
      "Table existence probe timed out"
    );
    if (checkRes.rows[0]?.f && checkRes.rows[0]?.u) {
      console.log("[Database Migration] PostgreSQL tables verified. Skipping redundant DDL initialization.");
      return;
    }
  } catch (checkErr: any) {
    console.warn("[Database Migration] Fast table existence probe warning:", checkErr?.message || checkErr);
  }

  let sqlContent = EMBEDDED_POSTGRES_SCHEMA_SQL;
  try {
    const sqlPath = path.resolve(process.cwd(), "drizzle", "0000_init_postgres.sql");
    if (fs.existsSync(sqlPath)) {
      sqlContent = fs.readFileSync(sqlPath, "utf-8");
    }
  } catch {
    // Fall back to embedded schema SQL
  }

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
