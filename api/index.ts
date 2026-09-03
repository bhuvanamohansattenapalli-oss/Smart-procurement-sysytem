import "dotenv/config";
import express from "express";
import { createProcurementApi } from "../server/routes/procurementApi";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { ensurePrototypeSeed } from "../server/services/seedService";

const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Ensure seed data is initialized on cold start
void ensurePrototypeSeed().catch(err => {
  console.warn("[Vercel API] Seed warning:", err);
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

export default app;
