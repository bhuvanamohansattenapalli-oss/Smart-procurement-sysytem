import { SignJWT, jwtVerify } from "jose";
import type { ApiPrincipal } from "../types/api";

function signingKey() {
  const secret = process.env.JWT_SECRET || "procureflow-hackathon-secure-jwt-secret-key-2026";
  return new TextEncoder().encode(secret);
}

export async function issueAccessToken(principal: ApiPrincipal): Promise<string> {
  return new SignJWT({ role: principal.role, code: principal.code, name: principal.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(principal.id))
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(signingKey());
}

export async function verifyAccessToken(token: string): Promise<ApiPrincipal> {
  const { payload } = await jwtVerify(token, signingKey());
  const role = payload.role;
  const id = Number(payload.sub);
  if ((role !== "farmer" && role !== "officer") || !Number.isInteger(id)) {
    throw new Error("Invalid API session.");
  }
  return {
    id,
    role,
    code: String(payload.code ?? ""),
    name: String(payload.name ?? ""),
  };
}
