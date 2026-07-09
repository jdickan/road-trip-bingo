import { timingSafeEqual } from "node:crypto";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { rateLimit } from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { issueAiToken, verifyAiToken } from "./lib/ai-token";

const app: Express = express();

// Trust the first proxy hop (Replit's reverse proxy) so req.ip is correctly
// set from X-Forwarded-For via the trusted proxy chain.  express-rate-limit's
// default keyGenerator uses req.ip which is now safe and cannot be spoofed.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigins = process.env["REPLIT_DOMAINS"]
  ? process.env["REPLIT_DOMAINS"].split(",").map((d) => `https://${d.trim()}`)
  : [];

app.use(
  cors({
    origin:
      process.env["NODE_ENV"] === "production"
        ? allowedOrigins
        : true,
    credentials: false,
  }),
);

app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));

// ---------------------------------------------------------------------------
// Secrets and startup validation
// ---------------------------------------------------------------------------

// ADMIN_PASSWORD gates all privileged API routes and is used as the HMAC
// signing key for session tokens.  Must be set in production.
const adminPassword = process.env["ADMIN_PASSWORD"] ?? null;

if (!adminPassword) {
  if (process.env["NODE_ENV"] === "production") {
    logger.error(
      "ADMIN_PASSWORD is not set — all API routes are unprotected in production. " +
      "Set ADMIN_PASSWORD to a strong secret.",
    );
  } else {
    logger.warn(
      "ADMIN_PASSWORD is not set — API auth is disabled in development. " +
      "Set ADMIN_PASSWORD to enable the login screen locally.",
    );
  }
}

// AI_ROUTE_SECRET is used only for signing/verifying AI-specific tokens.
// It does NOT fall back to ADMIN_PASSWORD — these are separate secrets with
// different scopes.  If unset, the AI token endpoint is disabled in production.
const aiSecret = process.env["AI_ROUTE_SECRET"] ?? null;

if (!aiSecret) {
  if (process.env["NODE_ENV"] === "production") {
    logger.warn(
      "AI_ROUTE_SECRET is not set — POST /api/ai/token is disabled in production.",
    );
  }
}

// ---------------------------------------------------------------------------
// Rate limits
// ---------------------------------------------------------------------------

// Login attempts: 10 per 15 minutes per IP to slow brute-force.
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait and try again." },
});

// AI action endpoints: 10 requests per minute per IP.
const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests. Please wait and try again." },
});

// ---------------------------------------------------------------------------
// GET /api/auth/status — lightweight auth capability probe (PUBLIC)
// ---------------------------------------------------------------------------
// Returns whether the server requires a password for API access.
// The frontend uses this on startup to decide whether to show the login screen.
// This endpoint is exempt from apiAuthGuard (it is registered before the guard)
// and does NOT consume login rate-limit budget.
app.get("/api/auth/status", (_req: Request, res: Response): void => {
  res.json({ required: adminPassword !== null });
});

// ---------------------------------------------------------------------------
// POST /api/auth/token — password-gated session token issuance (PUBLIC)
// ---------------------------------------------------------------------------
// The caller must supply the ADMIN_PASSWORD in the request body.  On success
// the server issues a short-lived HMAC-signed Bearer token; the raw password
// is never returned and never stored on the client.
//
// In development without ADMIN_PASSWORD set the endpoint issues a sentinel
// token so that the local dev experience is unchanged.
app.post(
  "/api/auth/token",
  loginRateLimit,
  (req: Request, res: Response): void => {
    if (!adminPassword) {
      if (process.env["NODE_ENV"] === "production") {
        res.status(503).json({ error: "API is not configured." });
        return;
      }
      // Development without ADMIN_PASSWORD: skip password check.
      res.json({ token: "dev-no-secret", expiresIn: 3600 });
      return;
    }

    const { password } = req.body as { password?: string };

    if (typeof password !== "string" || password.length === 0) {
      res.status(400).json({ error: "password is required." });
      return;
    }

    // Timing-safe comparison to prevent timing-based password enumeration.
    const supplied = Buffer.from(password, "utf8");
    const expected = Buffer.from(adminPassword, "utf8");

    const match =
      supplied.length === expected.length &&
      timingSafeEqual(supplied, expected);

    if (!match) {
      res.status(401).json({ error: "Incorrect password." });
      return;
    }

    const { token, expiresIn } = issueAiToken(adminPassword);
    res.json({ token, expiresIn });
  },
);

// ---------------------------------------------------------------------------
// Middleware: /api/* — general API auth guard
// ---------------------------------------------------------------------------
// All /api routes require a valid short-lived Bearer token issued by
// POST /api/auth/token (password-gated).
//
// Public endpoints that must remain unauthenticated:
//   - POST /api/auth/token  (login — token issuance, handled above)
//   - GET  /api/healthz     (health check)
//
// In development without ADMIN_PASSWORD set the guard is skipped entirely
// so that the local dev experience is unchanged.
//
// The dev sentinel ("dev-no-secret") is ONLY accepted when ADMIN_PASSWORD is
// not set.  Once ADMIN_PASSWORD is configured, full HMAC validation applies
// even in development.
function apiAuthGuard(req: Request, res: Response, next: NextFunction): void {
  // /v1/* is the public read-only namespace: it is exempt from the admin
  // Bearer-token guard and instead protected by its own X-API-Key guard and
  // rate limit (publicApiKeyGuard below, mounted on /api/v1).
  if (
    req.path === "/auth/token" ||
    req.path === "/healthz" ||
    req.path.startsWith("/v1/")
  ) {
    next();
    return;
  }

  if (!adminPassword) {
    if (process.env["NODE_ENV"] === "production") {
      res.status(503).json({ error: "API is not configured." });
      return;
    }
    // Development without ADMIN_PASSWORD: allow all requests through.
    next();
    return;
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const token = authHeader.slice("Bearer ".length);

  if (!verifyAiToken(token, adminPassword)) {
    res.status(401).json({ error: "Session token is invalid or expired. Please log in again." });
    return;
  }

  next();
}

// Mount BEFORE /api/ai/token and the main router — all requests to /api/*
// that are not /auth/token or /healthz must pass the auth guard first.
app.use("/api", apiAuthGuard);

// ---------------------------------------------------------------------------
// Public /v1 namespace — API key guard + rate limit
// ---------------------------------------------------------------------------
// The /v1 routes are read-only endpoints for external consumers (the iOS
// app).  They are exempt from the admin Bearer-token guard above and instead
// require a static X-API-Key header matching PUBLIC_API_KEY.
//
// PUBLIC_API_KEY is read at REQUEST time (not module load) so that setting or
// rotating the key never requires reasoning about import order, and tests can
// toggle it per-request.
//
// Unset key: 503 in production (fail closed), open in development/test.
function publicApiKeyGuard(req: Request, res: Response, next: NextFunction): void {
  const configuredKey = process.env["PUBLIC_API_KEY"] ?? null;

  if (!configuredKey) {
    if (process.env["NODE_ENV"] === "production") {
      res.status(503).json({ error: "Public API is not configured." });
      return;
    }
    next();
    return;
  }

  const supplied = req.headers["x-api-key"];
  if (typeof supplied !== "string" || supplied.length === 0) {
    res.status(401).json({ error: "API key required." });
    return;
  }

  const suppliedBuf = Buffer.from(supplied, "utf8");
  const expectedBuf = Buffer.from(configuredKey, "utf8");
  const match =
    suppliedBuf.length === expectedBuf.length &&
    timingSafeEqual(suppliedBuf, expectedBuf);

  if (!match) {
    res.status(401).json({ error: "Invalid API key." });
    return;
  }

  next();
}

// 60 requests per minute per IP — generous for a sync client (one list call
// + a handful of bundle downloads), hostile to scraping/abuse.  Disabled
// under NODE_ENV=test so the suite never trips it.
const publicApiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env["NODE_ENV"] === "test",
  message: { error: "Too many requests. Please slow down." },
});

app.use("/api/v1", publicApiRateLimit, publicApiKeyGuard);

// ---------------------------------------------------------------------------
// AI rate limit on /api/ai/* — applied after auth guard, before router
// ---------------------------------------------------------------------------
app.use("/api/ai", aiRateLimit);

// ---------------------------------------------------------------------------
// POST /api/ai/token — AI-scoped token (protected by apiAuthGuard above)
// ---------------------------------------------------------------------------
// Requires a valid admin Bearer token (i.e. caller must already have logged in
// via POST /api/auth/token).  Issues a token signed with AI_ROUTE_SECRET for
// AI-specific routes.  Provided for external tooling / backward compatibility.
const aiTokenRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many token requests. Please try again later." },
});

app.post(
  "/api/ai/token",
  aiTokenRateLimit,
  (_req: Request, res: Response): void => {
    if (!aiSecret) {
      if (process.env["NODE_ENV"] === "production") {
        res.status(503).json({ error: "AI token endpoint is not configured." });
        return;
      }
      res.json({ token: "dev-no-secret", expiresIn: 3600 });
      return;
    }

    const { token, expiresIn } = issueAiToken(aiSecret);
    res.json({ token, expiresIn });
  },
);

// ---------------------------------------------------------------------------
// Main router
// ---------------------------------------------------------------------------

app.use("/api", router);

export default app;
