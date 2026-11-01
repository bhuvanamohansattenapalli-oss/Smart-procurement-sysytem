import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { createProcurementApi } from "./routes/procurementApi";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

// Safe diagnostic logging for serverless initialization (booleans only - NEVER expose secrets)
console.info(
  `[Vercel Serverless Init] Node=${process.version} Platform=${process.platform} Env=${process.env.NODE_ENV || "production"} hasDB=${Boolean(
    process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0
  )} hasJWT=${Boolean(
    process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 0
  )} hasGemini=${Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0
  )}`
);

// Prevent unhandled promise rejections from crashing the serverless runtime
process.on("unhandledRejection", (reason) => {
  console.warn("[Vercel API Serverless Unhandled Rejection]", reason instanceof Error ? (reason.stack || reason.message) : reason);
});

const app = express();

// Enable trust proxy for Vercel edge reverse proxy
app.set("trust proxy", 1);

// CORS & Preflight handling
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// Request parsing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Request diagnostic audit log
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.info(`[Vercel Request] ${req.method} ${req.originalUrl || req.url}`);
  next();
});

// 1. Zero-dependency environment & runtime status check
app.get(["/api/status", "/api/diag", "/status", "/diag"], (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "ProcureFlow Vercel Serverless Function",
    environment: {
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0),
      hasJwtSecret: Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 0),
      hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
      geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      nodeEnv: process.env.NODE_ENV || "production",
      isVercel: Boolean(process.env.VERCEL),
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    },
  });
});

// 2. Real-time PostgreSQL database connectivity status probe
app.get(["/api/status/db", "/status/db"], async (_req: Request, res: Response) => {
  const startTime = Date.now();
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim().length === 0) {
    return res.status(503).json({
      status: "unhealthy",
      error: "DATABASE_URL_NOT_CONFIGURED",
      message: "The DATABASE_URL environment variable is not defined in the Vercel production environment.",
      hasDatabaseUrl: false,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const { getDb, isPostgresActive, getPgPool } = await import("./db");
    const db = await getDb();
    const pool = getPgPool();
    if (!db || !pool) {
      return res.status(503).json({
        status: "unhealthy",
        error: "DATABASE_CONNECTION_FAILED",
        message: "Failed to establish a connection to PostgreSQL via DATABASE_URL.",
        isPostgres: isPostgresActive(),
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    await pool.query("SELECT 1 AS ping");
    const checkTables = await pool.query("SELECT to_regclass('public.farmers') as f, to_regclass('public.users') as u");

    return res.status(200).json({
      status: "healthy",
      database: "postgresql",
      isPostgres: isPostgresActive(),
      tablesReady: Boolean(checkTables.rows[0]?.f && checkTables.rows[0]?.u),
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(503).json({
      status: "unhealthy",
      error: "DATABASE_PROBE_FAILED",
      message: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  }
});

const procurementApi = createProcurementApi();

// Mount procurement API on standard Vercel and relative paths
app.use("/api", procurementApi);
app.use("/", procurementApi);

// Mount tRPC API
app.use(
  ["/api/trpc", "/trpc"],
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: `API endpoint ${req.method} ${req.originalUrl || req.url} not found on Vercel serverless function.`,
  });
});

// Global Express error handler for serverless function errors
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Vercel API Unhandled Error]", err instanceof Error ? (err.stack || err.message) : err);
  if (!res.headersSent) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred while executing the serverless function.";
    res.status(500).json({
      error: "SERVER_ERROR",
      message,
    });
  }
});

// Primary Vercel serverless handler function & Express app instance
const handler = (req: Request, res: Response) => {
  return app(req, res);
};
Object.assign(handler, app);

export default handler;
export { app, handler };
