import { describe, it, expect } from "vitest";
import { issueAccessToken, verifyAccessToken } from "./services/tokenService";
import { requireApiAuth, requireRole } from "./middleware/apiAuth";
import type { AuthenticatedRequest } from "./types/api";
import type { Response } from "express";

describe("Authentication Persistence & Session Verification", () => {
  it("issues and verifies a valid farmer JWT with claims", async () => {
    const token = await issueAccessToken({
      id: 101,
      role: "farmer",
      code: "FARM-NZM-101",
      name: "Ramesh Reddy",
      district: "Nizamabad",
    });

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const claims = await verifyAccessToken(token);
    expect(claims.id).toBe(101);
    expect(claims.role).toBe("farmer");
    expect(claims.code).toBe("FARM-NZM-101");
    expect(claims.name).toBe("Ramesh Reddy");
    expect(claims.district).toBe("Nizamabad");
  });

  it("issues and verifies a valid officer JWT with claims", async () => {
    const token = await issueAccessToken({
      id: 202,
      role: "officer",
      staffRole: "HEAD_OFFICER",
      code: "OFF-NZM-104",
      name: "S. K. Sharma",
      department: "Administration",
      branch: "Nizamabad",
    });

    expect(token).toBeDefined();
    const claims = await verifyAccessToken(token);
    expect(claims.id).toBe(202);
    expect(claims.role).toBe("officer");
    expect(claims.staffRole).toBe("HEAD_OFFICER");
    expect(claims.code).toBe("OFF-NZM-104");
  });

  it("requireApiAuth authenticates via Authorization: Bearer header", async () => {
    const token = await issueAccessToken({
      id: 303,
      role: "farmer",
      code: "FARM-303",
      name: "Kavitha Devi",
    });

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as unknown as AuthenticatedRequest;

    let statusCode = 0;
    let jsonBody: any = null;
    const res = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (b: any) => {
            jsonBody = b;
          },
        };
      },
    } as unknown as Response;

    let nextCalled = false;
    await requireApiAuth(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(req.principal).toBeDefined();
    expect(req.principal?.id).toBe(303);
    expect(req.principal?.role).toBe("farmer");
  });

  it("requireApiAuth authenticates via Cookie fallback (procureflow_token)", async () => {
    const token = await issueAccessToken({
      id: 404,
      role: "officer",
      code: "OFF-404",
      name: "Vikram Singh",
    });

    const req = {
      headers: {
        cookie: `unrelated=123; procureflow_token=${token}; other=456`,
      },
    } as unknown as AuthenticatedRequest;

    let nextCalled = false;
    const res = {
      status: () => ({ json: () => {} }),
    } as unknown as Response;

    await requireApiAuth(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(req.principal?.id).toBe(404);
    expect(req.principal?.name).toBe("Vikram Singh");
  });

  it("requireApiAuth rejects requests with missing or invalid credentials", async () => {
    const req = {
      headers: {},
    } as unknown as AuthenticatedRequest;

    let statusCode = 0;
    let jsonBody: any = null;
    const res = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (b: any) => {
            jsonBody = b;
          },
        };
      },
    } as unknown as Response;

    let nextCalled = false;
    await requireApiAuth(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(401);
    expect(jsonBody?.error).toBe("UNAUTHORIZED");
  });

  it("requireRole enforces farmer vs officer separation", async () => {
    const farmerReq = {
      principal: {
        id: 101,
        role: "farmer",
        code: "FARM-101",
        name: "Farmer",
      },
    } as unknown as AuthenticatedRequest;

    let statusCode = 0;
    let jsonBody: any = null;
    const res = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (b: any) => {
            jsonBody = b;
          },
        };
      },
    } as unknown as Response;

    let nextCalled = false;
    const officerOnlyMiddleware = requireRole("officer");
    officerOnlyMiddleware(farmerReq, res, () => {
      nextCalled = true;
    });

    // Farmer attempting to access officer endpoint must receive 403 FORBIDDEN
    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(403);
    expect(jsonBody?.error).toBe("FORBIDDEN");
  });

  it("requireRole allows officer with correct role", async () => {
    const officerReq = {
      principal: {
        id: 202,
        role: "officer",
        staffRole: "HEAD_OFFICER",
        code: "OFF-202",
        name: "Officer",
      },
    } as unknown as AuthenticatedRequest;

    const res = {
      status: () => ({ json: () => {} }),
    } as unknown as Response;

    let nextCalled = false;
    const officerOnlyMiddleware = requireRole("officer");
    officerOnlyMiddleware(officerReq, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
  });
});
