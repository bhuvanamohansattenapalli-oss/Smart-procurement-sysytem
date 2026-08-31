import express, { type Express } from "express";
import type { Server } from "http";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    if (url.startsWith("/api") || url.startsWith("/trpc") || url.startsWith("/.netlify")) {
      return res.status(404).json({ error: "NOT_FOUND", message: `API endpoint ${req.method} ${url} not found.` });
    }
    try {
      const clientTemplate = path.resolve(__dirname, "../../client/index.html");
      let template = fs.readFileSync(clientTemplate, "utf-8");
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const candidates = [
    path.resolve(__dirname, "public"),
    path.resolve(process.cwd(), "dist/public"),
    path.resolve(__dirname, "../dist/public"),
    path.resolve(__dirname, "../../dist/public"),
    path.resolve(__dirname, "../public"),
  ];

  const distPath = candidates.find(p => fs.existsSync(path.join(p, "index.html"))) || candidates[0];

  app.use(express.static(distPath));
  app.use("*", (req, res) => {
    if (req.originalUrl.startsWith("/api") || req.originalUrl.startsWith("/trpc") || req.originalUrl.startsWith("/.netlify")) {
      return res.status(404).json({ error: "NOT_FOUND", message: `API endpoint ${req.method} ${req.originalUrl} not found.` });
    }
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Application index.html not found. Please ensure `npm run build` has run.");
    }
  });
}

