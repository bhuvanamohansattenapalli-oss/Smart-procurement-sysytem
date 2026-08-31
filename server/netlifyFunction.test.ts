import { describe, expect, it } from "vitest";
import { handler } from "../netlify/functions/api";
import { apiUrl, API_BASE_URL } from "../client/src/lib/api";

describe("Netlify Serverless Function Handler & Production API Integration", () => {
  it("GET /api/centres returns 200, Content-Type: application/json, and valid JSON", async () => {
    const event = {
      httpMethod: "GET",
      path: "/api/centres",
      headers: { accept: "application/json" },
      queryStringParameters: {},
      body: null,
      isBase64Encoded: false,
    };

    const response = await handler(event, {} as any);
    expect(response.statusCode).toBe(200);
    expect(response.headers?.["content-type"] || response.headers?.["Content-Type"]).toContain("application/json");

    const data = JSON.parse(response.body);
    expect(data).toHaveProperty("centres");
    expect(Array.isArray(data.centres)).toBe(true);
    expect(data.centres.length).toBeGreaterThan(0);
    expect(data.centres[0]).toHaveProperty("name");
    expect(data.centres[0]).toHaveProperty("place");
  });

  it("GET /api/crop-prices returns 200, Content-Type: application/json, and valid JSON", async () => {
    const event = {
      httpMethod: "GET",
      path: "/api/crop-prices",
      headers: { accept: "application/json" },
      queryStringParameters: {},
      body: null,
      isBase64Encoded: false,
    };

    const response = await handler(event, {} as any);
    expect(response.statusCode).toBe(200);
    expect(response.headers?.["content-type"] || response.headers?.["Content-Type"]).toContain("application/json");

    const data = JSON.parse(response.body);
    expect(data).toHaveProperty("prices");
    expect(Array.isArray(data.prices)).toBe(true);
    expect(data.prices.length).toBeGreaterThan(0);
  });

  it("GET /api/weather returns 200, Content-Type: application/json, and valid JSON", async () => {
    const event = {
      httpMethod: "GET",
      path: "/api/weather",
      headers: { accept: "application/json" },
      queryStringParameters: { district: "Guntur" },
      body: null,
      isBase64Encoded: false,
    };

    const response = await handler(event, {} as any);
    expect(response.statusCode).toBe(200);
    expect(response.headers?.["content-type"] || response.headers?.["Content-Type"]).toContain("application/json");

    const data = JSON.parse(response.body);
    expect(data).toHaveProperty("weather");
    expect(data.weather.district).toBe("Guntur");
  });

  it("verifies Farmer Registration and Officer Pending Registrations use the SAME production backend and database", async () => {
    const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const farmerPayload = {
      name: "Ravi Kumar Netlify Integration Test",
      phone: testPhone,
      password: "Password@12345",
      village: "Tenali",
      district: "Guntur",
      primaryCrop: "Paddy",
      aadhaarMasked: "XXXX XXXX 9988",
      declarationAccepted: true,
    };

    // Step 1: Farmer registers via POST /api/registration
    const regEvent = {
      httpMethod: "POST",
      path: "/api/registration",
      headers: { "content-type": "application/json", accept: "application/json" },
      queryStringParameters: {},
      body: JSON.stringify(farmerPayload),
      isBase64Encoded: false,
    };

    const regResponse = await handler(regEvent, {} as any);
    expect(regResponse.statusCode).toBe(201);
    expect(regResponse.headers?.["content-type"] || regResponse.headers?.["Content-Type"]).toContain("application/json");

    const regData = JSON.parse(regResponse.body);
    expect(regData).toHaveProperty("farmer");
    expect(regData.farmer.phone).toBe(testPhone);
    expect(regData.status).toBe("PENDING");
    const farmerId = regData.farmer.id;

    // Step 2: Officer logs in with seeded credentials to obtain officer JWT token
    const officerLoginEvent = {
      httpMethod: "POST",
      path: "/api/officers/login",
      headers: { "content-type": "application/json", accept: "application/json" },
      queryStringParameters: {},
      body: JSON.stringify({ officerCode: "OFF-NZM-104", password: "Officer@2026" }),
      isBase64Encoded: false,
    };
    const officerLoginRes = await handler(officerLoginEvent, {} as any);
    expect(officerLoginRes.statusCode).toBe(200);
    const { accessToken: officerToken } = JSON.parse(officerLoginRes.body);


    // Step 3: Officer queries GET /api/officers/registrations/pending on the SAME backend
    const pendingEvent = {
      httpMethod: "GET",
      path: "/api/officers/registrations/pending",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${officerToken}`,
      },
      queryStringParameters: {},
      body: null,
      isBase64Encoded: false,
    };

    const pendingResponse = await handler(pendingEvent, {} as any);
    expect(pendingResponse.statusCode).toBe(200);
    expect(pendingResponse.headers?.["content-type"] || pendingResponse.headers?.["Content-Type"]).toContain("application/json");

    const pendingData = JSON.parse(pendingResponse.body);
    expect(pendingData).toHaveProperty("registrations");
    const found = pendingData.registrations.find((r: any) => r.farmer.phone === testPhone);
    expect(found).toBeDefined();
    expect(found.farmer.id).toBe(farmerId);
    expect(found.farmer.name).toBe("Ravi Kumar Netlify Integration Test");

    // Step 4: Officer approves the registration
    const approveEvent = {
      httpMethod: "POST",
      path: `/api/officers/registrations/${found.id}/approve`,
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${officerToken}`,
      },
      queryStringParameters: {},
      body: JSON.stringify({ assignedCentreId: 1 }),
      isBase64Encoded: false,
    };
    const approveResponse = await handler(approveEvent, {} as any);
    expect(approveResponse.statusCode).toBe(200);
    const approveData = JSON.parse(approveResponse.body);
    expect(approveData.status).toBe("APPROVED");

    // Step 5: Farmer can now log in successfully
    const farmerLoginEvent = {
      httpMethod: "POST",
      path: "/api/farmers/login",
      headers: { "content-type": "application/json", accept: "application/json" },
      queryStringParameters: {},
      body: JSON.stringify({ phone: testPhone, password: "Password@12345" }),
      isBase64Encoded: false,
    };
    const farmerLoginRes = await handler(farmerLoginEvent, {} as any);
    expect(farmerLoginRes.statusCode).toBe(200);
    const farmerLoginData = JSON.parse(farmerLoginRes.body);
    expect(farmerLoginData).toHaveProperty("accessToken");
    expect(farmerLoginData.farmer.phone).toBe(testPhone);
    expect(farmerLoginData.farmer.status).toBe("APPROVED");
  });

  it("GET /api/centres/1/slots returns 200, Content-Type: application/json, and valid JSON", async () => {
    const event = {
      httpMethod: "GET",
      path: "/api/centres/1/slots",
      headers: { accept: "application/json" },
      queryStringParameters: {},
      body: null,
      isBase64Encoded: false,
    };
    const response = await handler(event, {} as any);
    expect(response.statusCode).toBe(200);
    expect(response.headers?.["content-type"] || response.headers?.["Content-Type"]).toContain("application/json");
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty("slots");
    expect(Array.isArray(data.slots)).toBe(true);
  });

  it("GET /api/transport/options returns 200 and valid JSON", async () => {
    const event = {
      httpMethod: "GET",
      path: "/api/transport/options",
      headers: { accept: "application/json" },
      queryStringParameters: {},
      body: null,
      isBase64Encoded: false,
    };
    const response = await handler(event, {} as any);
    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty("options");
    expect(Array.isArray(data.options)).toBe(true);
  });

  it("non-existent API route returns 404 with Content-Type: application/json and NOT HTML", async () => {
    const event = {
      httpMethod: "GET",
      path: "/api/nonexistent-route-testing-404",
      headers: { accept: "application/json" },
      queryStringParameters: {},
      body: null,
      isBase64Encoded: false,
    };
    const response = await handler(event, {} as any);
    expect(response.statusCode).toBe(404);
    expect(response.headers?.["content-type"] || response.headers?.["Content-Type"]).toContain("application/json");
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty("error", "NOT_FOUND");
    expect(response.body).not.toContain("<!DOCTYPE");
  });

  it("apiUrl correctly formats API paths for all configurations", () => {
    // apiUrl always produces a valid route starting with /api
    expect(apiUrl("/centres")).toMatch(/\/api\/centres$/);
    expect(apiUrl("/crop-prices")).toMatch(/\/api\/crop-prices$/);
    expect(apiUrl("/weather?district=Guntur")).toMatch(/\/api\/weather\?district=Guntur$/);
    expect(apiUrl("/trpc")).toMatch(/\/api\/trpc$/);
  });
});
