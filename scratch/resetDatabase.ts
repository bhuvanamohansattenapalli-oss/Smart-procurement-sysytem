import "dotenv/config";
import { eq, ne, sql } from "drizzle-orm";
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

export async function executeReset() {
  console.log("===============================================================");
  console.log("SMART PROCUREMENT SYSTEM - DATABASE USER & AUTH DATA RESET");
  console.log("MODE: OPTION B (Preserve Head Officer OFF-NZM-104)");
  console.log("===============================================================\n");

  const db = await getDb();
  if (!db) {
    throw new Error("Failed to initialize database connection.");
  }

  // --- PRE-DELETION AUDIT ---
  console.log("[1/4] PRE-DELETION ROW COUNTS:");
  const preCounts: Record<string, number> = {
    payments: (await db.select().from(payments)).length,
    procurements: (await db.select().from(procurements)).length,
    queueEntries: (await db.select().from(queueEntries)).length,
    transportBookings: (await db.select().from(transportBookings)).length,
    bookings: (await db.select().from(bookings)).length,
    notifications: (await db.select().from(notifications)).length,
    registrations: (await db.select().from(registrations)).length,
    farmers: (await db.select().from(farmers)).length,
    staffNotifications: (await db.select().from(staffNotifications)).length,
    staffAuditLogs: (await db.select().from(staffAuditLogs)).length,
    officers: (await db.select().from(officers)).length,
    otpChallenges: (await db.select().from(otpChallenges)).length,
    users: (await db.select().from(users)).length,
    procurementCentres: (await db.select().from(procurementCentres)).length,
    slots: (await db.select().from(slots)).length,
    cropPrices: (await db.select().from(cropPrices)).length,
  };

  for (const [tbl, count] of Object.entries(preCounts)) {
    console.log(`  - ${tbl.padEnd(20)}: ${count} rows`);
  }

  // --- EXECUTE DELETION IN STRICT SAFE ORDER ---
  console.log("\n[2/4] EXECUTING CASCADE-SAFE DELETION ORDER...");

  // 1. Payments
  console.log("  Step 1: Deleting payments...");
  await db.delete(payments).where(sql`1=1`);

  // 2. Procurements
  console.log("  Step 2: Deleting procurements...");
  await db.delete(procurements).where(sql`1=1`);

  // 3. Queue Entries
  console.log("  Step 3: Deleting queueEntries...");
  await db.delete(queueEntries).where(sql`1=1`);

  // 4. Transport Bookings
  console.log("  Step 4: Deleting transportBookings...");
  await db.delete(transportBookings).where(sql`1=1`);

  // 5. Bookings
  console.log("  Step 5: Deleting bookings...");
  await db.delete(bookings).where(sql`1=1`);

  // 6. Notifications (Farmer notifications)
  console.log("  Step 6: Deleting farmer notifications...");
  await db.delete(notifications).where(sql`1=1`);

  // 7. Registrations
  console.log("  Step 7: Deleting farmer registrations...");
  await db.delete(registrations).where(sql`1=1`);

  // 8. Farmers
  console.log("  Step 8: Deleting all farmer login/account records...");
  await db.delete(farmers).where(sql`1=1`);

  // 9. Staff Notifications
  console.log("  Step 9: Deleting staffNotifications...");
  await db.delete(staffNotifications).where(sql`1=1`);

  // 10. Staff Audit Logs
  console.log("  Step 10: Deleting staffAuditLogs...");
  await db.delete(staffAuditLogs).where(sql`1=1`);

  // 11. Officers: Option B - clear self references & delete non-head officers
  console.log("  Step 11: Preserving Head Officer 'OFF-NZM-104' and deleting demo/test officers...");
  await db.update(officers).set({ approvedByOfficerId: null }).where(sql`1=1`);
  await db.delete(officers).where(ne(officers.officerCode, "OFF-NZM-104"));

  // 12. OTP Challenges
  console.log("  Step 12: Deleting otpChallenges...");
  await db.delete(otpChallenges).where(sql`1=1`);

  // 13. Users (OAuth accounts)
  console.log("  Step 13: Deleting OAuth users...");
  await db.delete(users).where(sql`1=1`);

  console.log("✓ Deletion sequence completed without constraint errors.");

  // --- POST-DELETION VERIFICATION ---
  console.log("\n[3/4] POST-DELETION AUDIT & ASSERTION:");
  const postCounts: Record<string, number> = {
    registrations: (await db.select().from(registrations)).length,
    farmers: (await db.select().from(farmers)).length,
    otpChallenges: (await db.select().from(otpChallenges)).length,
    users: (await db.select().from(users)).length,
    officers: (await db.select().from(officers)).length,
    payments: (await db.select().from(payments)).length,
    procurements: (await db.select().from(procurements)).length,
    queueEntries: (await db.select().from(queueEntries)).length,
    transportBookings: (await db.select().from(transportBookings)).length,
    bookings: (await db.select().from(bookings)).length,
    notifications: (await db.select().from(notifications)).length,
    staffNotifications: (await db.select().from(staffNotifications)).length,
    staffAuditLogs: (await db.select().from(staffAuditLogs)).length,
    procurementCentres: (await db.select().from(procurementCentres)).length,
    slots: (await db.select().from(slots)).length,
    cropPrices: (await db.select().from(cropPrices)).length,
  };

  for (const [tbl, count] of Object.entries(postCounts)) {
    console.log(`  - ${tbl.padEnd(20)}: ${count} rows`);
  }

  // Exact checks
  if (postCounts.registrations !== 0) {
    throw new Error(`Assertion failed: Expected 0 registrations, got ${postCounts.registrations}`);
  }
  if (postCounts.farmers !== 0) {
    throw new Error(`Assertion failed: Expected 0 farmers, got ${postCounts.farmers}`);
  }
  if (postCounts.otpChallenges !== 0) {
    throw new Error(`Assertion failed: Expected 0 otpChallenges, got ${postCounts.otpChallenges}`);
  }
  if (postCounts.users !== 0) {
    throw new Error(`Assertion failed: Expected 0 users, got ${postCounts.users}`);
  }
  if (postCounts.officers !== 1) {
    throw new Error(`Assertion failed: Expected 1 preserved Head Officer, got ${postCounts.officers}`);
  }
  const preservedOfficer = (await db.select().from(officers).where(eq(officers.officerCode, "OFF-NZM-104")).limit(1))[0];
  if (!preservedOfficer) {
    throw new Error("Assertion failed: Preserved officer 'OFF-NZM-104' was not found!");
  }
  console.log(`\n✓ Verified preserved officer: ${preservedOfficer.name} (${preservedOfficer.officerCode}, ${preservedOfficer.role})`);

  // Verify master data preserved
  if (postCounts.procurementCentres === 0) {
    throw new Error("CRITICAL: procurementCentres master data was deleted!");
  }
  if (postCounts.slots === 0) {
    throw new Error("CRITICAL: slots master data was deleted!");
  }
  if (postCounts.cropPrices === 0) {
    throw new Error("CRITICAL: cropPrices master data was deleted!");
  }

  console.log("✓ Master data verified intact: procurementCentres, slots, cropPrices preserved.");
  console.log("✓ All farmer login, registration, and demo account records successfully reset to ZERO.");
  return { preCounts, postCounts, preservedOfficer };
}

if (process.argv[1]?.includes("resetDatabase")) {
  executeReset()
    .then(() => {
      console.log("\n>>> RESET SUCCESSFUL <<<");
      process.exit(0);
    })
    .catch((err) => {
      console.error("\n>>> RESET FAILED <<<", err);
      process.exit(1);
    });
}
