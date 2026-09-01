import "dotenv/config";
import { getDb } from "../server/db";
import {
  users,
  farmers,
  registrations,
  otpChallenges,
  officers,
  staffAuditLogs,
  staffNotifications,
  bookings,
  queueEntries,
  procurements,
  payments,
  notifications,
  transportBookings,
  procurementCentres,
  slots,
  cropPrices,
} from "../drizzle/schema";

async function inspect() {
  console.log("--- DATABASE INSPECTION ---");
  console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not Set (Using LocalDatabaseStore)");
  const db = await getDb();
  
  const tables = [
    { name: "registrations", schema: registrations },
    { name: "otpChallenges", schema: otpChallenges },
    { name: "farmers", schema: farmers },
    { name: "users", schema: users },
    { name: "officers", schema: officers },
    { name: "staffAuditLogs", schema: staffAuditLogs },
    { name: "staffNotifications", schema: staffNotifications },
    { name: "notifications", schema: notifications },
    { name: "payments", schema: payments },
    { name: "procurements", schema: procurements },
    { name: "queueEntries", schema: queueEntries },
    { name: "transportBookings", schema: transportBookings },
    { name: "bookings", schema: bookings },
    { name: "procurementCentres", schema: procurementCentres, isMaster: true },
    { name: "slots", schema: slots, isMaster: true },
    { name: "cropPrices", schema: cropPrices, isMaster: true },
  ];

  for (const t of tables) {
    try {
      const rows = await db.select().from(t.schema);
      console.log(`Table: ${t.name.padEnd(20)} | Rows: ${String(rows.length).padStart(4)} ${t.isMaster ? "[MASTER DATA]" : ""}`);
    } catch (err: any) {
      console.log(`Table: ${t.name.padEnd(20)} | Error: ${err.message}`);
    }
  }
}

inspect().catch(console.error);
