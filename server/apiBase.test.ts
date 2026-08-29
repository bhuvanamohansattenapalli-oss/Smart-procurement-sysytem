import { describe, expect, it } from "vitest";
import express from "express";
import { createProcurementApi } from "./routes/procurementApi";

describe("configured frontend API base", () => {
  it("points the frontend at the integrated same-origin centres endpoint", async () => {
    const apiBase = process.env.VITE_API_BASE_URL ?? "/api";
    expect(apiBase).toBe("/api");

    const app = express();
    app.use(express.json());
    app.use("/api", createProcurementApi());

    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 3000;

    try {
      const response = await fetch(`http://127.0.0.1:${port}${apiBase}/centres`);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ prototypeData: true });
    } finally {
      server.close();
    }
  });
});
