import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { loadTheme, applyTheme } from "./lib/theme";

// Apply persisted theme immediately before React renders to prevent flash
applyTheme(loadTheme());

createRoot(document.getElementById("root")!).render(<App />);
