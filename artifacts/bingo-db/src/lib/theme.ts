export const STORAGE_KEY      = "bingo-theme-v1";   // stores My Theme + darkMode pref
export const ACTIVE_SKIN_KEY  = "bingo-active-skin"; // "basic" | "custom"

export interface ThemeValue {
  primaryHue: number;
  primarySat: number;
  primaryLight: number;
  bgHue: number;
  bgSat: number;
  radius: number;
  darkMode: boolean;
  rowDividerOpacity: number;
}

// ── Basic theme — the original designed look, always recoverable ──────────────
export const BASIC_THEME: ThemeValue = {
  primaryHue: 26,
  primarySat: 90,
  primaryLight: 55,
  bgHue: 40,
  bgSat: 33,
  radius: 0.5,
  darkMode: false,
  rowDividerOpacity: 0.38,
};

// Backward-compat alias
export const DEFAULTS = BASIC_THEME;

// ── Atelier theme — editorial monochrome baseline for "My Theme" ──────────────
export const ATELIER_THEME: ThemeValue = {
  primaryHue: 0,
  primarySat: 0,
  primaryLight: 7,
  bgHue: 0,
  bgSat: 0,
  radius: 0.375,
  darkMode: false,
  rowDividerOpacity: 0.10,
};

export type SkinName = "basic" | "custom";

// ── Skin helpers ──────────────────────────────────────────────────────────────

export function getActiveSkin(): SkinName {
  try {
    if (localStorage.getItem(ACTIVE_SKIN_KEY) === "custom") return "custom";
  } catch {}
  return "basic";
}

export function setActiveSkin(skin: SkinName): void {
  try {
    localStorage.setItem(ACTIVE_SKIN_KEY, skin);
  } catch {}
}

export function getSystemDark(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Load the saved dark-mode preference (stored inside STORAGE_KEY). */
function loadSavedDarkMode(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.darkMode === "boolean") return parsed.darkMode;
    }
  } catch {}
  return getSystemDark();
}

/** Load the saved "My Theme" custom values (falls back to ATELIER_THEME). */
export function loadCustomTheme(): ThemeValue {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...ATELIER_THEME, ...parsed };
    }
  } catch {}
  return { ...ATELIER_THEME };
}

/** Save the "My Theme" custom values (+ darkMode) to STORAGE_KEY. */
export function saveCustomTheme(t: ThemeValue): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  } catch {}
}

/** Save just the dark-mode preference without touching other My Theme values. */
export function saveDarkModePref(dark: boolean): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, darkMode: dark }));
  } catch {}
}

/** Load the theme to apply on app startup. */
export function loadTheme(): ThemeValue {
  const darkMode = loadSavedDarkMode();
  if (getActiveSkin() === "basic") {
    return { ...BASIC_THEME, darkMode };
  }
  return { ...loadCustomTheme(), darkMode };
}

// ── Apply ─────────────────────────────────────────────────────────────────────

export function applyTheme(t: ThemeValue): void {
  const root = document.documentElement;

  if (t.darkMode) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // ── Atelier skin flag ─────────────────────────────────────────────────────
  const isAtelier = getActiveSkin() === "custom";
  root.classList.toggle("skin-atelier", isAtelier);

  if (isAtelier) {
    // Atelier owns every token via .skin-atelier in index.css.
    // Strip any inline overrides left by Basic so they don't leak through.
    root.style.removeProperty("--primary");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--sidebar-primary");
    root.style.removeProperty("--sidebar-ring");
    root.style.removeProperty("--background");
    root.style.removeProperty("--radius");
    root.style.removeProperty("--row-divider");
    return;
  }

  // ── Basic skin: original slider-driven behaviour ──────────────────────────
  root.style.setProperty("--primary",          `${t.primaryHue} ${t.primarySat}% ${t.primaryLight}%`);
  root.style.setProperty("--ring",             `${t.primaryHue} ${t.primarySat}% ${t.primaryLight}%`);
  root.style.setProperty("--sidebar-primary",  `${t.primaryHue} ${t.primarySat}% ${t.primaryLight}%`);
  root.style.setProperty("--sidebar-ring",     `${t.primaryHue} ${t.primarySat}% ${t.primaryLight}%`);

  if (!t.darkMode) {
    root.style.setProperty("--background", `${t.bgHue} ${t.bgSat}% 98%`);
  } else {
    root.style.removeProperty("--background");
  }

  root.style.setProperty("--radius", `${t.radius}rem`);

  const op = t.rowDividerOpacity;
  root.style.setProperty(
    "--row-divider",
    t.darkMode ? `rgba(255,255,255,${op})` : `rgba(0,0,0,${op})`
  );
}
