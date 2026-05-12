import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import LoginScreen from "@/components/LoginScreen";
import {
  getApiToken,
  setAdminPassword,
  clearAdminPassword,
} from "@/lib/api-token";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

type AuthState = "checking" | "unauthenticated" | "authenticated";

// Returns true if authentication succeeded.
async function tryAuthenticate(password: string): Promise<boolean> {
  setAdminPassword(password);
  const token = await getApiToken();
  if (!token) {
    clearAdminPassword();
    return false;
  }
  return true;
}

function App() {
  const [authState, setAuthState] = useState<AuthState>("checking");

  useEffect(() => {
    // Wire up the session token getter so customFetch includes auth on every call.
    setAuthTokenGetter(getApiToken);

    // Use the lightweight status endpoint to decide whether auth is required.
    // This avoids burning login rate-limit budget on every page load.
    fetch(`${API_BASE}/auth/status`)
      .then((r) => r.json())
      .then((data: { required: boolean }) => {
        if (!data.required) {
          // Dev mode: server bypasses auth, no login screen needed.
          setAuthState("authenticated");
        } else {
          setAuthState("unauthenticated");
        }
      })
      .catch(() => {
        // If the status endpoint fails, fall back to showing login screen.
        setAuthState("unauthenticated");
      });
  }, []);

  async function handleLogin(password: string): Promise<boolean> {
    const ok = await tryAuthenticate(password);
    if (ok) {
      // Invalidate all cached queries so they re-fetch with the new token.
      await queryClient.invalidateQueries();
      setAuthState("authenticated");
    }
    return ok;
  }

  if (authState === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <TooltipProvider>
        <LoginScreen onLogin={handleLogin} />
        <Toaster />
      </TooltipProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
