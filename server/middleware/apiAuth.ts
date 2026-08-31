import type { NextFunction, Response } from "express";
import { verifyAccessToken } from "../services/tokenService";
import type { ApiRole, StaffRole, AuthenticatedRequest } from "../types/api";

export async function requireApiAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "An active authentication session is required.",
    });
    return;
  }

  const token = authHeader.slice(7).trim();
  try {
    const principal = await verifyAccessToken(token);
    req.principal = principal;
    next();
  } catch (error) {
    res.status(401).json({
      error: "INVALID_TOKEN",
      message: "The authentication session is invalid or expired.",
    });
  }
}

export function requireRole(...allowedRoles: (ApiRole | StaffRole)[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.principal) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required.",
      });
      return;
    }

    const principalRole = req.principal.role;
    const staffRole = req.principal.staffRole || (principalRole === "officer" ? "HEAD_OFFICER" : undefined);

    const isMatch = allowedRoles.some((r) => {
      if (r === principalRole) return true;
      if (principalRole === "officer") {
        if (r === "officer") return true;
        if (staffRole === "HEAD_OFFICER") return true;
        if (staffRole === r) return true;
      }
      return false;
    });

    if (!isMatch) {
      res.status(403).json({
        error: "FORBIDDEN",
        message: `Access denied. Requires one of: ${allowedRoles.join(", ")}.`,
      });
      return;
    }

    next();
  };
}
