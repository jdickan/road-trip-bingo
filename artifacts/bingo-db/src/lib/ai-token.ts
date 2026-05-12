// Short-lived AI session token fetched from /api/ai/token.
// Cached in memory — never stored in localStorage or exposed in the bundle.

interface CachedToken {
  value: string;
  expiresAt: number; // ms since epoch
}

let _cachedToken: CachedToken | null = null;
let _pendingFetch: Promise<string | null> | null = null;

/**
 * Returns a valid AI session token, fetching a fresh one from the server if
 * the cached token is absent or close to expiry (within 5 minutes).
 *
 * Concurrent callers share the same in-flight request to avoid thundering-herd.
 */
export async function getAiToken(): Promise<string | null> {
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000; // refresh 5 min before expiry

  if (_cachedToken && _cachedToken.expiresAt - now > bufferMs) {
    return _cachedToken.value;
  }

  // De-duplicate concurrent token fetches
  if (_pendingFetch) {
    return _pendingFetch;
  }

  _pendingFetch = fetchToken().finally(() => {
    _pendingFetch = null;
  });

  return _pendingFetch;
}

async function fetchToken(): Promise<string | null> {
  try {
    const resp = await fetch("/api/ai/token", { method: "POST" });
    if (!resp.ok) return null;

    const data = (await resp.json()) as { token: string; expiresIn: number };
    if (typeof data.token !== "string" || typeof data.expiresIn !== "number") {
      return null;
    }

    _cachedToken = {
      value: data.token,
      expiresAt: Date.now() + data.expiresIn * 1000,
    };
    return _cachedToken.value;
  } catch {
    return null;
  }
}
