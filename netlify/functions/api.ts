import express from "express";
import serverless from "serverless-http";
import { createProcurementApi } from "../../server/routes/procurementApi";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../../server/routers";
import { createContext } from "../../server/_core/context";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const procurementApi = createProcurementApi();

// Mount procurement API across all standard Netlify paths
app.use("/api", procurementApi);
app.use("/.netlify/functions/api", procurementApi);
app.use("/", procurementApi);

// Mount tRPC API
app.use(
  ["/api/trpc", "/.netlify/functions/api/trpc", "/trpc"],
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.use("*", (req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: `API endpoint ${req.method} ${req.originalUrl || req.url} not found on Netlify serverless function.`,
  });
});

export const handler = serverless(app);
