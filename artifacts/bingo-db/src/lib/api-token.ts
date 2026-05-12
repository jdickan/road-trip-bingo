// Short-lived API session token obtained by authenticating with ADMIN_PASSWORD.
// The token is cached in memory — never stored in localStorage or the bundle.

interface CachedToken {
  value: string;
  expiresAt: number; // ms since epoch
}

let _cachedToken: CachedToken | null = null;
let _pendingFetch: Promise<string | null> | null = null;

// The admin password is stored in module-level memory only for the lifetime of
// the browser session.  It is never written to localStorage or cookies.
let _password: string | null = null;

export function setAdminPassword(password: string): void {
  _password = password;
  // Clear any cached token so the next getApiToken() call uses the new password.
  _cachedToken = null;
}

export function clearAdminPassword(): void {
  _password = null;
  _cachedToken = null;
  _pendingFetch = null;
}

export function hasAdminPassword(): boolean {
  return _password !== null;
}

/**
 * Returns a valid API session token, fetching a fresh one from the server if
 * the cached token is absent or close to expiry (within 5 minutes).
 *
 * Returns null if no password has been set (triggers login screen).
 * Concurrent callers share the same in-flight request.
 */
export async function getApiToken(): Promise<string | null> {
  // No password → cannot authenticate → let the caller handle the 401.
  if (_password === null) return null;

  const now = Date.now();
  const bufferMs = 5 * 60 * 1000; // refresh 5 min before expiry

  if (_cachedToken && _cachedToken.expiresAt - now > bufferMs) {
    return _cachedToken.value;
  }

  if (_pendingFetch) {
    return _pendingFetch;
  }

  _pendingFetch = fetchToken(_password).finally(() => {
    _pendingFetch = null;
  });

  return _pendingFetch;
}

async function fetchToken(password: string): Promise<string | null> {
  try {
    const resp = await fetch("/api/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

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
