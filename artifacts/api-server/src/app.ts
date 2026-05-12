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
// AI route protections
// ---------------------------------------------------------------------------

const aiSecret = process.env["AI_ROUTE_SECRET"] ?? null;

if (!aiSecret) {
  if (process.env["NODE_ENV"] === "production") {
    logger.error(
      "AI_ROUTE_SECRET is not set — AI endpoints are disabled in production. " +
      "Set AI_ROUTE_SECRET to a long random string.",
    );
  } else {
    logger.warn(
      "AI_ROUTE_SECRET is not set — AI token auth is disabled in development. " +
      "Set AI_ROUTE_SECRET for a production-like environment.",
    );
  }
}

// 1. Rate limit for the token issuance endpoint: very strict (3 per hour per IP)
//    to limit token farming without impeding legitimate use.
const aiTokenRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many token requests. Please try again later." },
});

// 2. Rate limit for the AI action endpoints: 10 requests per minute per IP.
const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests. Please wait and try again." },
});

// 3. Token issuance endpoint: POST /api/ai/token
//    Issues a short-lived HMAC-signed token.  The raw AI_ROUTE_SECRET is
//    never sent to clients; they only receive the signed token.
app.post(
  "/api/ai/token",
  aiTokenRateLimit,
  (_req: Request, res: Response): void => {
    if (!aiSecret) {
      if (process.env["NODE_ENV"] === "production") {
        res.status(503).json({ error: "AI endpoints are not configured." });
        return;
      }
      // Development without a secret: issue an unsigned sentinel so the UI works.
      res.json({ token: "dev-no-secret", expiresIn: 3600 });
      return;
    }

    const { token, expiresIn } = issueAiToken(aiSecret);
    res.json({ token, expiresIn });
  },
);

// 4. Token verification middleware for all other /api/ai/* routes.
//    Callers must present a valid short-lived token issued by /api/ai/token,
//    not the raw AI_ROUTE_SECRET.
function aiTokenGuard(req: Request, res: Response, next: NextFunction): void {
  if (!aiSecret) {
    if (process.env["NODE_ENV"] === "production") {
      res.status(503).json({ error: "AI endpoints are not configured." });
      return;
    }
    next();
    return;
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header." });
    return;
  }

  const token = authHeader.slice("Bearer ".length);

  // Development sentinel
  if (process.env["NODE_ENV"] !== "production" && token === "dev-no-secret") {
    next();
    return;
  }

  if (!verifyAiToken(token, aiSecret)) {
    res.status(401).json({ error: "AI token is invalid or expired. Please retry." });
    return;
  }

  next();
}

app.use("/api/ai", aiRateLimit, aiTokenGuard);

app.use("/api", router);

export default app;
