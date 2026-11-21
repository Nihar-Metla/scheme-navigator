import express from "express";

// Routes come from ../../../shared/contracts.ts. Only the health check is wired in S0.
export function createApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}
