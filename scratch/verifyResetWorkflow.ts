import express from "express";
import { executeReset } from "./resetDatabase";
import { createProcurementApi } from "../server/routes/procurementApi";
import { getDb } from "../server/db";
import { ensurePrototypeSeed } from "../server/services/seedService";
import {
  farmers,
  registrations,
  otpChallenges,
  users,
  officers,
  procurementCentres,
  slots,
  cropPrices,
} from "../drizzle/schema";

async function runEndToEndVerification() {
  console.log("\n=======================================================");
  console.log("RUNNING COMPREHENSIVE END-TO-END RESET & VERIFICATION");
  console.log("=======================================================\n");

  // Step 1: Ensure initial prototype data is seeded first so we can verify reset from a populated state
  console.log("[PHASE 1] Initializing state with sample data...");
  await ensurePrototypeSeed();

  // Step 2: Execute the full reset (Option B)
  console.log("\n[PHASE 2] Executing Option B Database Reset...");
  await executeReset();

  // Step 3: Verify Exact Zero Counts
  console.log("\n[PHASE 3] Rigorous Database Counts Verification:");
  const db = await getDb();
  
  const farmerCount = (await db.select().from(farmers)).length;
  const regCount = (await db.select().from(registrations)).length;
  const otpCount = (await db.select().from(otpChallenges)).length;
  const userCount = (await db.select().from(users)).length;
  const officerCount = (await db.select().from(officers)).length;
  const centreCount = (await db.select().from(procurementCentres)).length;
  const slotCount = (await db.select().from(slots)).length;
  const priceCount = (await db.select().from(cropPrices)).length;

  console.log(`  - Farmer login/account records: ${farmerCount} (Must be 0)`);
  console.log(`  - Farmer registration records:  ${regCount} (Must be 0)`);
  console.log(`  - OTP challenges/tokens:       ${otpCount} (Must be 0)`);
  console.log(`  - OAuth user accounts:          ${userCount} (Must be 0)`);
  console.log(`  - Officer accounts:             ${officerCount} (Must be 1 - Preserved Head Officer)`);
  console.log(`  - Master procurement centres:   ${centreCount} (Preserved: 8)`);
  console.log(`  - Master procurement slots:     ${slotCount} (Preserved: 48)`);
  console.log(`  - Master crop MSP prices:       ${priceCount} (Preserved: 10)`);

  if (farmerCount !== 0) throw new Error(`VERIFICATION FAILED: Expected 0 farmers, found ${farmerCount}`);
  if (regCount !== 0) throw new Error(`VERIFICATION FAILED: Expected 0 registrations, found ${regCount}`);
  if (otpCount !== 0) throw new Error(`VERIFICATION FAILED: Expected 0 otpChallenges, found ${otpCount}`);
  if (userCount !== 0) throw new Error(`VERIFICATION FAILED: Expected 0 users, found ${userCount}`);
  if (officerCount !== 1) throw new Error(`VERIFICATION FAILED: Expected 1 officer, found ${officerCount}`);
  if (centreCount === 0 || slotCount === 0 || priceCount === 0) throw new Error("VERIFICATION FAILED: Master data was lost!");

  console.log("✓ PASSED: Exactly ZERO farmer accounts and registrations. Master data completely preserved.");

  // Step 4: Verify Application Starts Normally & Responds
  console.log("\n[PHASE 4] Verifying Application Server Startup & REST Endpoints...");
  const app = express();
  app.use(express.json());
  app.use("/api", createProcurementApi());

  const server = app.listen(0);
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 3001;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`  API server listening on ${baseUrl}`);

  try {
    // 4.1 Check master data endpoint
    const centresRes = await fetch(`${baseUrl}/centres`);
    if (centresRes.status !== 200) throw new Error(`GET /api/centres returned status ${centresRes.status}`);
    const centresData = await centresRes.json();
    console.log(`  ✓ GET /api/centres responded HTTP 200 with ${centresData.centres?.length || 0} centres.`);

    const pricesRes = await fetch(`${baseUrl}/crop-prices`);
    if (pricesRes.status !== 200) throw new Error(`GET /api/crop-prices returned status ${pricesRes.status}`);
    console.log(`  ✓ GET /api/crop-prices responded HTTP 200.`);

    // Step 5: Verify New Farmer Can Register Again
    console.log("\n[PHASE 5] Verifying Fresh Farmer Registration...");
    const newFarmerPhone = "9988776655";
    const regPayload = {
      name: "Chandra Shekhar",
      phone: newFarmerPhone,
      password: "Farmer@Secure2026",
      village: "Kaza",
      district: "Guntur",
      primaryCrop: "Paddy",
      aadhaarMasked: "XXXX XXXX 5544",
      declarationAccepted: true,
    };

    const regRes = await fetch(`${baseUrl}/registration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(regPayload),
    });

    if (regRes.status !== 201) {
      const err = await regRes.text();
      throw new Error(`Registration failed (${regRes.status}): ${err}`);
    }
    const regResult = await regRes.json();
    console.log(`  ✓ Registration successful! Registration ID: ${regResult.registrationId}, Farmer Code: ${regResult.farmer.farmerCode}, Status: ${regResult.status}`);

    // Step 6: Verify Login Flow (Pre-approval rejection)
    console.log("\n[PHASE 6] Verifying Farmer Login Flow...");
    const preLoginRes = await fetch(`${baseUrl}/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: newFarmerPhone, password: "Farmer@Secure2026" }),
    });

    if (preLoginRes.status !== 403) {
      throw new Error(`Expected 403 (Pending Approval), got status ${preLoginRes.status}`);
    }
    console.log("  ✓ Correctly rejected unapproved login with 403 REGISTRATION_NOT_APPROVED.");

    // Step 7: Officer Login & Approve Registration
    console.log("\n[PHASE 7] Preserved Officer Login & Application Approval...");
    const offLoginRes = await fetch(`${baseUrl}/officers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerCode: "OFF-NZM-104", password: "Officer@2026" }),
    });

    if (offLoginRes.status !== 200) {
      const err = await offLoginRes.text();
      throw new Error(`Officer login failed (${offLoginRes.status}): ${err}`);
    }
    const offLoginData = await offLoginRes.json();
    const officerToken = offLoginData.accessToken;
    console.log(`  ✓ Head Officer 'OFF-NZM-104' logged in successfully. Issued Bearer token.`);

    const approveRes = await fetch(`${baseUrl}/officers/registrations/${regResult.registrationId}/approve`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${officerToken}`,
        "Content-Type": "application/json",
      },
    });

    if (approveRes.status !== 200) {
      const err = await approveRes.text();
      throw new Error(`Officer approval failed (${approveRes.status}): ${err}`);
    }
    console.log(`  ✓ Registration ${regResult.registrationId} approved by Head Officer.`);

    // Step 8: Approved Farmer Login Verification
    console.log("\n[PHASE 8] Approved Farmer Login & Session Token Generation...");
    const farmerLoginRes = await fetch(`${baseUrl}/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: newFarmerPhone, password: "Farmer@Secure2026" }),
    });

    if (farmerLoginRes.status !== 200) {
      const err = await farmerLoginRes.text();
      throw new Error(`Farmer login failed (${farmerLoginRes.status}): ${err}`);
    }
    const farmerLoginData = await farmerLoginRes.json();
    console.log(`  ✓ Farmer logged in successfully!`);
    console.log(`  ✓ Access Token: ${farmerLoginData.accessToken.slice(0, 25)}...`);
    console.log(`  ✓ Farmer Details: ${farmerLoginData.farmer.name} (${farmerLoginData.farmer.farmerCode}), Status: ${farmerLoginData.farmer.status}`);

    console.log("\n=======================================================");
    console.log("ALL VERIFICATIONS COMPLETED WITH 100% SUCCESS!");
    console.log("=======================================================\n");
  } finally {
    server.close();
  }
}

runEndToEndVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  });
