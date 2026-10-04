import { createHmac } from "node:crypto";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { issueAiToken, verifyAiToken } from "../lib/ai-token";

// Exercise the real login endpoint and guard without loading database routes.
vi.mock("../routes", async () => {
  const { Router } = await import("express");
  const router = Router();
  router.get("/protected", (_req, res) => res.json({ ok: true }));
  router.get("/healthz", (_req, res) => res.json({ status: "ok" }));
  return { default: router };
});
vi.mock("../lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    child: vi.fn(),
  },
}));
vi.mock("pino-http", () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Synthetic test credentials only; never read workspace secret values.
const password = "human-memorable-password";
const sessionKey = "a".repeat(64);
const aiKey = "b".repeat(64);

async function loadApp() {
  vi.resetModules();
  return (await import("../app")).default;
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("ADMIN_PASSWORD", password);
  vi.stubEnv("SESSION_SECRET", sessionKey);
  vi.stubEnv("AI_ROUTE_SECRET", aiKey);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("editor session signing", () => {
  it("signs with the server key, not the login password, and authorizes access", async () => {
    const app = await loadApp();
    const login = await request(app).post("/api/auth/token").send({ password });
    expect(login.status).toBe(200);
    expect(login.body.expiresIn).toBe(3600);
    expect(verifyAiToken(login.body.token, sessionKey)).toBe(true);
    expect(verifyAiToken(login.body.token, password)).toBe(false);
    expect(verifyAiToken(login.body.token, aiKey)).toBe(false);
    const [payload, signature] = login.body.token.split(".");
    expect(createHmac("sha256", password).update(payload).digest("base64url"))
      .not.toBe(signature);
    expect(login.body).not.toHaveProperty("password");
    expect((await request(app).get("/api/protected")
      .set("Authorization", `Bearer ${login.body.token}`)).status).toBe(200);
  });

  it("rejects wrong passwords, missing tokens, legacy tokens, and AI-scoped tokens", async () => {
    const app = await loadApp();
    expect((await request(app).post("/api/auth/token")
      .send({ password: "wrong" })).status).toBe(401);
    expect((await request(app).post("/api/auth/token").send({})).status).toBe(400);
    expect((await request(app).get("/api/protected")).status).toBe(401);
    for (const token of [issueAiToken(password).token, issueAiToken(aiKey).token, "dev-no-secret"]) {
      expect((await request(app).get("/api/protected")
        .set("Authorization", `Bearer ${token}`)).status).toBe(401);
    }
  });

  it.each(["", "short-key", "p".repeat(64)])(
    "fails closed for missing, short, or password-reused session keys",
    async (key) => {
      vi.stubEnv("SESSION_SECRET", key);
      if (key === "p".repeat(64)) vi.stubEnv("ADMIN_PASSWORD", key);
      const app = await loadApp();
      expect((await request(app).post("/api/auth/token")
        .send({ password: key || password })).status).toBe(503);
      expect((await request(app).get("/api/protected")
        .set("Authorization", `Bearer ${issueAiToken(aiKey).token}`)).status).toBe(503);
      expect((await request(app).get("/api/healthz")).status).toBe(200);
    },
  );

  it("keeps the AI issuance endpoint working with its separate key", async () => {
    const app = await loadApp();
    const login = await request(app).post("/api/auth/token").send({ password });
    const ai = await request(app).post("/api/ai/token")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(ai.status).toBe(200);
    expect(verifyAiToken(ai.body.token, aiKey)).toBe(true);
    expect(verifyAiToken(ai.body.token, sessionKey)).toBe(false);
  });

  it("preserves unauthenticated development but fails closed in production", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.stubEnv("SESSION_SECRET", "");
    let app = await loadApp();
    expect((await request(app).post("/api/auth/token").send({})).body.token)
      .toBe("dev-no-secret");
    expect((await request(app).get("/api/protected")).status).toBe(200);
    vi.stubEnv("NODE_ENV", "production");
    app = await loadApp();
    expect((await request(app).post("/api/auth/token").send({})).status).toBe(503);
    expect((await request(app).get("/api/protected")).status).toBe(503);
  });
});

describe("token integrity and lifetime", () => {
  it("rejects expired, malformed, tampered, and rotated-key tokens", () => {
    vi.useFakeTimers();
    const { token, expiresIn } = issueAiToken(sessionKey);
    expect(verifyAiToken(token, sessionKey)).toBe(true);
    expect(verifyAiToken(token, "c".repeat(64))).toBe(false);
    expect(verifyAiToken(`x${token}`, sessionKey)).toBe(false);
    expect(verifyAiToken("malformed", sessionKey)).toBe(false);
    vi.advanceTimersByTime(expiresIn * 1000);
    expect(verifyAiToken(token, sessionKey)).toBe(false);
  });
});