import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { createProcurementApi } from "../server/routes/procurementApi";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { ensurePrototypeSeed } from "../server/services/seedService";

// Prevent unhandled promise rejections from crashing the serverless runtime
process.on("unhandledRejection", (reason) => {
  console.warn("[Vercel API Serverless Unhandled Rejection]", reason);
});

const app = express();

// Middleware
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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Safe non-blocking cold-start seed initialization
ensurePrototypeSeed().catch((err) => {
  console.warn("[Vercel API] Cold start seed note:", err?.message || err);
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

// Primary Vercel serverless handler function & Express app
export default app;

export { app };
