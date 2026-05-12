import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { loadTheme, applyTheme } from "./lib/theme";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getAiToken } from "./lib/ai-token";

// Apply persisted theme immediately before React renders to prevent flash
applyTheme(loadTheme());

// Wire up the AI session token getter.  Before every API request that lacks an
// Authorization header, customFetch calls this getter.  The getter returns a
// short-lived token fetched from /api/ai/token (and cached in memory).
// The raw AI_ROUTE_SECRET is never exposed in the frontend bundle.
setAuthTokenGetter(getAiToken);

createRoot(document.getElementById("root")!).render(<App />);
