import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SECONDS = 3600; // 1 hour

function base64url(data: string): string {
  return Buffer.from(data, "utf8").toString("base64url");
}

function base64urlDecode(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

interface TokenPayload {
  exp: number;
  jti: string;
}

/**
 * Issue a short-lived HMAC-signed bearer token using a server-only random key.
 * Callers must use SESSION_SECRET for editor sessions and AI_ROUTE_SECRET for
 * AI-scoped tokens. Never pass a user password: a captured MAC would allow
 * offline password guessing. The signing key never leaves the server.
 */
export function issueAiToken(secret: string): { token: string; expiresIn: number } {
  const payload: TokenPayload = {
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    jti: randomBytes(16).toString("hex"),
  };

  const encodedPayload = base64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  const token = `${encodedPayload}.${sig}`;

  return { token, expiresIn: TOKEN_TTL_SECONDS };
}

/**
 * Verify a token issued by issueAiToken.
 * Returns true only if the signature is valid and the token has not expired.
 */
export function verifyAiToken(token: string, secret: string): boolean {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return false;

  const encodedPayload = token.slice(0, dotIndex);
  const suppliedSig = token.slice(dotIndex + 1);

  // Constant-time signature comparison
  const expectedSig = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  const suppliedBuf = Buffer.from(suppliedSig, "utf8");

  if (expectedBuf.length !== suppliedBuf.length) return false;
  if (!timingSafeEqual(expectedBuf, suppliedBuf)) return false;

  // Check expiry
  try {
    const payload: TokenPayload = JSON.parse(base64urlDecode(encodedPayload));
    if (typeof payload.exp !== "number") return false;
    return Math.floor(Date.now() / 1000) < payload.exp;
  } catch {
    return false;
  }
}
