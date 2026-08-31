import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createProcurementApi } from "./routes/procurementApi";
import { ensurePrototypeSeed } from "./services/seedService";

describe("Cross-Device Farmer Registration & Verification Sync", () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    await ensurePrototypeSeed();
    app = express();
    app.use(express.json());
    app.use("/api", createProcurementApi());

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        const port = typeof addr === "object" && addr ? addr.port : 3000;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(resolve));
    }
  });

  it("synchronizes farmer registration on Mobile with Officer Portal on Laptop via shared backend database", async () => {
    // 1. Laptop Officer logs in
    const officerLoginRes = await fetch(`${baseUrl}/officers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerCode: "OFF-NZM-104", password: "Officer@2026" }),
    });

    expect(officerLoginRes.status).toBe(200);
    const officerData = await officerLoginRes.json();
    const officerToken = officerData.accessToken;
    expect(officerToken).toBeDefined();

    // 2. Mobile Phone Farmer registers on mobile
    const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const registerRes = await fetch(`${baseUrl}/registration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Srinivas Rao (Cross Device Test)",
        phone: testPhone,
        aadhaarMasked: "XXXX XXXX 7890",
        village: "Mangalagiri Rural",
        district: "Guntur",
        primaryCrop: "Paddy",
        password: "FarmerPass@2026",
        declarationAccepted: true,
      }),
    });

    expect(registerRes.status).toBe(201);
    const registerData = await registerRes.json();
    expect(registerData.farmer).toBeDefined();
    expect(registerData.farmer.status).toBe("PENDING");
    const farmerId = registerData.farmer.id;

    // 3. Laptop Officer queries Pending Registrations list on laptop
    const pendingListRes = await fetch(`${baseUrl}/officers/registrations/pending`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });

    expect(pendingListRes.status).toBe(200);
    const pendingData = await pendingListRes.json();
    expect(Array.isArray(pendingData.registrations)).toBe(true);

    const foundInPending = pendingData.registrations.find(
      (r: any) => r.farmer?.phone === testPhone || r.farmerId === farmerId
    );
    expect(foundInPending).toBeDefined();
    expect(foundInPending.farmer.name).toBe("Srinivas Rao (Cross Device Test)");

    // 4. Laptop Officer approves the registration from laptop
    const approveRes = await fetch(`${baseUrl}/officers/registrations/${foundInPending.id}/approve`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${officerToken}` },
    });

    expect(approveRes.status).toBe(200);
    const approveData = await approveRes.json();
    expect(approveData.success).toBe(true);

    // 5. Mobile Phone Farmer logs in from phone immediately
    const farmerLoginRes = await fetch(`${baseUrl}/farmers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: testPhone, password: "FarmerPass@2026" }),
    });

    expect(farmerLoginRes.status).toBe(200);
    const farmerLoginData = await farmerLoginRes.json();
    expect(farmerLoginData.accessToken).toBeDefined();
    expect(farmerLoginData.farmer.status).toBe("APPROVED");
  });
});
