export const STORAGE_KEY      = "bingo-theme-v1";         // stores My Theme + darkMode pref
export const ACTIVE_SKIN_KEY  = "bingo-active-skin";       // "basic" | "custom"
export const PRESETS_KEY      = "bingo-theme-presets-v1";  // named user presets

export type Density = "compact" | "cozy" | "comfortable";

export interface ThemeValue {
  primaryHue: number;
  primarySat: number;
  primaryLight: number;
  bgHue: number;
  bgSat: number;
  radius: number;
  darkMode: boolean;
  rowDividerOpacity: number;
  coloredTags: boolean;
  density: Density;
}

export interface SavedPreset {
  id: string;
  name: string;
  theme: ThemeValue;
  savedAt: string;
}

// ── Basic theme — the original designed look, always recoverable ──────────────
export const BASIC_THEME: ThemeValue = {
  primaryHue: 220,
  primarySat: 10,
  primaryLight: 12,
  bgHue: 40,
  bgSat: 33,
  radius: 0.5,
  darkMode: false,
  rowDividerOpacity: 0.38,
  coloredTags: true,
  density: "cozy",
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
  coloredTags: true,
  density: "cozy",
};

export type SkinName = "basic" | "custom";

// ── Skin helpers ──────────────────────────────────────────────────────────────

export function getActiveSkin(): SkinName {
  return "custom";
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
  return { ...loadCustomTheme(), darkMode };
}

// ── Named presets ─────────────────────────────────────────────────────────────

export function loadSavedPresets(): SavedPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (raw) return JSON.parse(raw) as SavedPreset[];
  } catch {}
  return [];
}

export function savePreset(name: string, theme: ThemeValue): SavedPreset {
  const preset: SavedPreset = {
    id: `preset_${Date.now()}`,
    name: name.trim() || "Untitled",
    theme: { ...theme },
    savedAt: new Date().toISOString(),
  };
  const existing = loadSavedPresets();
  localStorage.setItem(PRESETS_KEY, JSON.stringify([...existing, preset]));
  return preset;
}

export function deletePreset(id: string): void {
  const existing = loadSavedPresets().filter((p) => p.id !== id);
  localStorage.setItem(PRESETS_KEY, JSON.stringify(existing));
}

// ── Apply ─────────────────────────────────────────────────────────────────────

export function applyTheme(t: ThemeValue, skin?: SkinName): void {
  const root = document.documentElement;
  const activeSkin = skin ?? getActiveSkin();

  // Drive global Atelier CSS overrides (fonts, shadow-zeroing, etc.)
  if (activeSkin === "custom") {
    root.setAttribute("data-skin", "custom");
  } else {
    root.removeAttribute("data-skin");
  }

  if (t.darkMode) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // ── Atelier skin flag ─────────────────────────────────────────────────────
  const isAtelier = getActiveSkin() === "custom";
  root.classList.toggle("skin-atelier", isAtelier);

  // Colored tag pills toggle — works for both skins
  if (t.coloredTags) {
    root.setAttribute("data-colored-tags", "1");
  } else {
    root.removeAttribute("data-colored-tags");
  }

  // Density
  root.setAttribute("data-density", t.density ?? "cozy");

  // ── Primary color (both skins) — slider-driven with dark-mode lightness flip ─
  const effectivePrimaryLight = t.darkMode ? 100 - t.primaryLight : t.primaryLight;
  const primaryFg = effectivePrimaryLight > 55 ? "0 0% 9%" : "0 0% 99%";
  const primaryVal = `${t.primaryHue} ${t.primarySat}% ${effectivePrimaryLight}%`;
  root.style.setProperty("--primary",                      primaryVal);
  root.style.setProperty("--primary-foreground",           primaryFg);
  root.style.setProperty("--ring",                         primaryVal);
  root.style.setProperty("--sidebar-primary",              primaryVal);
  root.style.setProperty("--sidebar-primary-foreground",   primaryFg);
  root.style.setProperty("--sidebar-ring",                 primaryVal);

  if (isAtelier) {
    // Atelier owns background, radius, and row-divider via .skin-atelier CSS.
    // Strip any inline overrides left by Basic so the CSS cascade applies.
    root.style.removeProperty("--background");
    root.style.removeProperty("--radius");
    root.style.removeProperty("--row-divider");
    return;
  }

  // ── Basic skin: set remaining slider-driven tokens ────────────────────────

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
