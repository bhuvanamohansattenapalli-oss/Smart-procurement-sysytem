import "dotenv/config";
import express from "express";
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

app.use("*", (req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: `API endpoint ${req.method} ${req.originalUrl || req.url} not found on Vercel serverless function.`,
  });
});

// Global Express error handler for serverless function errors
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Vercel API Unhandled Error]", err);
  if (!res.headersSent) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: err?.message || "An unexpected error occurred while executing the serverless function.",
    });
  }
});

// Primary Vercel serverless handler function
export default function handler(req: any, res: any) {
  return app(req, res);
}

// Preserve Express app methods on default export for testing frameworks (e.g. vitest supertest/app.listen)
Object.setPrototypeOf(handler, app);

export { app };
