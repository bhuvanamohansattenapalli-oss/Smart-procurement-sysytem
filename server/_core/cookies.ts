import type { Request } from "express";

export function getSessionCookieOptions(req: Request) {
  const isHttps = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https";
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? ("none" as const) : ("lax" as const),
    path: "/",
  };
}
