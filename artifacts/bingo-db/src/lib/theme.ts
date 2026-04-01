export const STORAGE_KEY = "bingo-theme-v1";

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

export const DEFAULTS: ThemeValue = {
  primaryHue: 26,
  primarySat: 90,
  primaryLight: 55,
  bgHue: 40,
  bgSat: 33,
  radius: 0.5,
  darkMode: false,
  rowDividerOpacity: 0.38,
};

export function getSystemDark(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function loadTheme(): ThemeValue {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.darkMode === undefined) parsed.darkMode = getSystemDark();
      return { ...DEFAULTS, ...parsed };
    }
  } catch {}
  return { ...DEFAULTS, darkMode: getSystemDark() };
}

export function applyTheme(t: ThemeValue) {
  const root = document.documentElement;

  if (t.darkMode) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  root.style.setProperty("--primary", `${t.primaryHue} ${t.primarySat}% ${t.primaryLight}%`);
  root.style.setProperty("--ring", `${t.primaryHue} ${t.primarySat}% ${t.primaryLight}%`);
  root.style.setProperty("--sidebar-primary", `${t.primaryHue} ${t.primarySat}% ${t.primaryLight}%`);
  root.style.setProperty("--sidebar-ring", `${t.primaryHue} ${t.primarySat}% ${t.primaryLight}%`);

  if (!t.darkMode) {
    root.style.setProperty("--background", `${t.bgHue} ${t.bgSat}% 98%`);
  } else {
    root.style.removeProperty("--background");
  }

  root.style.setProperty("--radius", `${t.radius}rem`);

  // Row divider: near-black in light mode, near-white in dark mode
  const op = t.rowDividerOpacity;
  const dividerColor = t.darkMode
    ? `rgba(255, 255, 255, ${op})`
    : `rgba(0, 0, 0, ${op})`;
  root.style.setProperty("--row-divider", dividerColor);
}
