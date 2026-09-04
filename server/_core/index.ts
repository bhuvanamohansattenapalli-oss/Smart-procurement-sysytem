import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { createProcurementApi } from "../routes/procurementApi";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function initDatabaseAndSeeds(): Promise<void> {
  try {
    const { getDb, isPostgresActive, getPgPool } = await import("../db");
    await getDb();
    if (isPostgresActive()) {
      const pool = getPgPool();
      if (pool) {
        const { ensurePostgresSchema } = await import("../scripts/migratePostgres");
        await ensurePostgresSchema(pool);
      }
    }

    // Seed database with prototype data on startup
    const { ensurePrototypeSeed } = await import("../services/seedService");
    await ensurePrototypeSeed();
  } catch (err: any) {
    console.error("[Database Startup Warning] Background initialization:", err?.message || err);
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // Dedicated REST interface for the ProcureFlow prototype. It is mounted
  // before tRPC so the requested /api/* routes are unambiguous.
  app.use("/api", createProcurementApi());
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  const host = process.env.HOST || "0.0.0.0";
  const preferredPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  // In production (Render/Cloud), bind directly to the assigned PORT without temporary port probing
  const port = process.env.PORT ? preferredPort : await findAvailablePort(preferredPort);

  server.listen(port, host, () => {
    console.log(`Server listening on ${host}:${port}`);
    console.log(`Server running on http://localhost:${port}/ and accessible on network at http://${host}:${port}/`);
  });

  // Asynchronously initialize database, auto-migration, and seed data in background
  // without blocking the HTTP server from binding the port.
  initDatabaseAndSeeds().catch((err) => {
    console.error("[Database Startup Error]", err?.message || err);
  });
}

startServer().catch(console.error);
