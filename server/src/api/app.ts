import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { loadSeedSchemes, validateSchemes } from "../db/load.js";
import type { Scheme, SchemeInput } from "../db/load.js";
import { createEvaluateRouter } from "./routes/match.js";
import { createExtractRouter } from "./routes/extract.js";
import { createSchemesRouter } from "./routes/schemes.js";

// Resolves to <repo root>/client/dist from server/src/api/app.ts (tsx, no compiled output).
const DEFAULT_CLIENT_DIST_PATH = fileURLToPath(new URL("../../../client/dist", import.meta.url));

export interface CreateAppOptions {
  /** Injected schemes (tests). Defaults to the seed in server/src/db/schemes.json. */
  schemes?: SchemeInput[];
  /** Built client directory to serve (tests). Defaults to the repo's client/dist. */
  clientDistPath?: string;
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
  const clientDistPath = resolve(options.clientDistPath ?? DEFAULT_CLIENT_DIST_PATH);
  const indexHtmlPath = join(clientDistPath, "index.html");
  const clientBuilt = existsSync(clientDistPath) && existsSync(indexHtmlPath);

  const app = express();
  app.use(express.json());
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use(createSchemesRouter(schemes));
  app.use(createEvaluateRouter(schemes));
  app.use(createExtractRouter());
  app.use(jsonBodyErrorHandler);

  // Unknown /api requests get a JSON 404 and never reach the SPA fallback.
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    next();
  });

  if (clientBuilt) {
    app.use(express.static(clientDistPath));
    app.get("*", (_req, res) => {
      res.sendFile(indexHtmlPath);
    });
  } else {
    console.log("client build not found; serving API only");
  }

  return app;
}
