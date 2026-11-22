import express from "express";
import { loadSeedSchemes, validateSchemes } from "../db/load.js";
import type { Scheme, SchemeInput } from "../db/load.js";
import { createEvaluateRouter } from "./routes/match.js";
import { createSchemesRouter } from "./routes/schemes.js";

export interface CreateAppOptions {
  /** Injected schemes (tests). Defaults to the seed in server/src/db/schemes.json. */
  schemes?: SchemeInput[];
}

function isJsonParseError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { type?: unknown }).type === "entity.parse.failed";
}

// Deliberately does not log the error, the body or the request.
const jsonBodyErrorHandler: express.ErrorRequestHandler = (err, _req, res, next) => {
  if (isJsonParseError(err)) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  next(err);
};

export function createApp(options: CreateAppOptions = {}): express.Express {
  const schemes: Scheme[] = options.schemes ? validateSchemes(options.schemes) : loadSeedSchemes();

  const app = express();
  app.use(express.json());
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use(createSchemesRouter(schemes));
  app.use(createEvaluateRouter(schemes));
  app.use(jsonBodyErrorHandler);
  return app;
}
