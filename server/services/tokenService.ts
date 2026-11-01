import { SignJWT, jwtVerify } from "jose";
import type { ApiPrincipal } from "../types/api";

function signingKey() {
  const secret = process.env.JWT_SECRET || "procureflow-hackathon-secure-jwt-secret-key-2026";
  return new TextEncoder().encode(secret);
}

export async function issueAccessToken(principal: ApiPrincipal): Promise<string> {
  const token = await new SignJWT({
    role: principal.role,
    staffRole: principal.staffRole,
    department: principal.department,
    designation: principal.designation,
    branch: principal.branch,
    centreId: principal.centreId,
    centreName: principal.centreName,
    code: principal.code,
    name: principal.name,
    district: principal.district,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(principal.id))
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(signingKey());

  console.log(`[Auth Audit] Issued JWT for principalId=${principal.id} role=${principal.role} code=${principal.code}`);
  return token;
}

export async function verifyAccessToken(token: string): Promise<ApiPrincipal> {
  try {
    const { payload } = await jwtVerify(token, signingKey());
    const role = payload.role;
    const id = Number(payload.sub);
    if ((role !== "farmer" && role !== "officer") || !Number.isInteger(id)) {
      throw new Error("Invalid API session claims.");
    }
    return {
      id,
      role,
      staffRole: payload.staffRole as any,
      department: payload.department ? String(payload.department) : undefined,
      designation: payload.designation ? String(payload.designation) : undefined,
      branch: payload.branch ? String(payload.branch) : undefined,
      code: String(payload.code ?? ""),
      name: String(payload.name ?? ""),
      district: payload.district ? String(payload.district) : undefined,
    };
  } catch (err: any) {
    console.warn(`[Auth Audit] JWT verification failed: ${err?.message || err}`);
    throw err;
  }
}
