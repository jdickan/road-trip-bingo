import { useState, useEffect, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RotateCcw } from "lucide-react";

interface ThemeValue {
  primaryHue: number;
  primarySat: number;
  primaryLight: number;
  bgHue: number;
  bgSat: number;
  radius: number;
  darkMode: boolean;
}

const DEFAULTS: ThemeValue = {
  primaryHue: 26,
  primarySat: 90,
  primaryLight: 55,
  bgHue: 40,
  bgSat: 33,
  radius: 0.5,
  darkMode: false,
};

const STORAGE_KEY = "bingo-theme-v1";

function getSystemDark(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function loadTheme(): ThemeValue {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // If darkMode was never explicitly saved, use system preference
      if (parsed.darkMode === undefined) {
        parsed.darkMode = getSystemDark();
      }
      return { ...DEFAULTS, ...parsed };
    }
  } catch {}
  // No saved theme — default to system preference
  return { ...DEFAULTS, darkMode: getSystemDark() };
}

function applyTheme(t: ThemeValue) {
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
}

function Swatch({ hue, sat, light }: { hue: number; sat: number; light: number }) {
  return (
    <div
      className="w-8 h-8 rounded-full border border-border shadow-sm shrink-0"
      style={{ background: `hsl(${hue}, ${sat}%, ${light}%)` }}
    />
  );
}

const PRESET_COLORS: Array<{ label: string; hue: number; sat: number; light: number }> = [
  { label: "Amber", hue: 26, sat: 90, light: 55 },
  { label: "Coral", hue: 10, sat: 85, light: 58 },
  { label: "Rose", hue: 345, sat: 80, light: 55 },
  { label: "Purple", hue: 270, sat: 75, light: 55 },
  { label: "Indigo", hue: 240, sat: 75, light: 55 },
  { label: "Blue", hue: 210, sat: 85, light: 50 },
  { label: "Teal", hue: 175, sat: 75, light: 42 },
  { label: "Green", hue: 142, sat: 71, light: 45 },
];

const PRESET_BG: Array<{ label: string; hue: number; sat: number }> = [
  { label: "Warm", hue: 40, sat: 33 },
  { label: "Cool", hue: 210, sat: 20 },
  { label: "Neutral", hue: 0, sat: 0 },
  { label: "Sage", hue: 150, sat: 15 },
  { label: "Lavender", hue: 270, sat: 20 },
];

export default function ThemePanel() {
  const [theme, setTheme] = useState<ThemeValue>(loadTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  }, [theme]);

  // Apply on first load
  useEffect(() => {
    applyTheme(loadTheme());
  }, []);

  // Listen for system color scheme changes (only affects if user hasn't saved a preference)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      // Only follow system if no explicit pref saved (i.e. no STORAGE_KEY)
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme((prev) => ({ ...prev, darkMode: e.matches }));
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const update = useCallback((partial: Partial<ThemeValue>) => {
    setTheme((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    const systemDark = getSystemDark();
    setTheme({ ...DEFAULTS, darkMode: systemDark });
  };

  return (
    <div className="max-w-2xl space-y-8 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Theme</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Customize the look and feel of the Data Cockpit</p>
        </div>
        <Button variant="outline" size="sm" onClick={reset} className="gap-1.5 text-xs h-8">
          <RotateCcw className="h-3 w-3" />
          Reset to defaults
        </Button>
      </div>

      {/* Dark mode */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card">
        <div>
          <Label className="text-sm font-medium">Dark Mode</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Switch between light and dark appearance</p>
        </div>
        <Switch
          checked={theme.darkMode}
          onCheckedChange={(v) => update({ darkMode: v })}
          data-testid="switch-dark-mode"
        />
      </div>

      {/* Primary color */}
      <div className="space-y-4 p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-3">
          <Swatch hue={theme.primaryHue} sat={theme.primarySat} light={theme.primaryLight} />
          <div>
            <Label className="text-sm font-medium">Primary Color</Label>
            <p className="text-xs text-muted-foreground">Used for buttons, tabs, badges, and highlights</p>
          </div>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((p) => (
            <button
              key={p.label}
              title={p.label}
              onClick={() => update({ primaryHue: p.hue, primarySat: p.sat, primaryLight: p.light })}
              className="flex flex-col items-center gap-1 group"
            >
              <div
                className="w-7 h-7 rounded-full border-2 transition-all group-hover:scale-110"
                style={{
                  background: `hsl(${p.hue}, ${p.sat}%, ${p.light}%)`,
                  borderColor:
                    theme.primaryHue === p.hue && theme.primarySat === p.sat
                      ? `hsl(${p.hue}, ${p.sat}%, ${p.light}%)`
                      : "transparent",
                  boxShadow:
                    theme.primaryHue === p.hue && theme.primarySat === p.sat
                      ? `0 0 0 2px white, 0 0 0 4px hsl(${p.hue}, ${p.sat}%, ${p.light}%)`
                      : undefined,
                }}
              />
              <span className="text-[10px] text-muted-foreground">{p.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Hue</Label>
              <span className="text-xs font-mono text-muted-foreground">{theme.primaryHue}°</span>
            </div>
            <Slider
              min={0} max={360} step={1}
              value={[theme.primaryHue]}
              onValueChange={([v]) => update({ primaryHue: v })}
              className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Saturation</Label>
              <span className="text-xs font-mono text-muted-foreground">{theme.primarySat}%</span>
            </div>
            <Slider
              min={20} max={100} step={1}
              value={[theme.primarySat]}
              onValueChange={([v]) => update({ primarySat: v })}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Lightness</Label>
              <span className="text-xs font-mono text-muted-foreground">{theme.primaryLight}%</span>
            </div>
            <Slider
              min={25} max={75} step={1}
              value={[theme.primaryLight]}
              onValueChange={([v]) => update({ primaryLight: v })}
            />
          </div>
        </div>
      </div>

      {/* Background tint */}
      <div className="space-y-4 p-4 rounded-lg border bg-card">
        <div>
          <Label className="text-sm font-medium">Background Tint</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Subtle hue applied to the page background (light mode only)</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_BG.map((p) => (
            <button
              key={p.label}
              title={p.label}
              onClick={() => update({ bgHue: p.hue, bgSat: p.sat })}
              className="flex flex-col items-center gap-1 group"
            >
              <div
                className="w-7 h-7 rounded-full border-2 transition-all group-hover:scale-110"
                style={{
                  background: `hsl(${p.hue}, ${p.sat}%, 96%)`,
                  borderColor:
                    theme.bgHue === p.hue && theme.bgSat === p.sat
                      ? `hsl(${p.hue}, 60%, 50%)`
                      : "transparent",
                  boxShadow:
                    theme.bgHue === p.hue && theme.bgSat === p.sat
                      ? `0 0 0 2px white, 0 0 0 4px hsl(${p.hue}, 60%, 50%)`
                      : undefined,
                }}
              />
              <span className="text-[10px] text-muted-foreground">{p.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Hue</Label>
              <span className="text-xs font-mono text-muted-foreground">{theme.bgHue}°</span>
            </div>
            <Slider
              min={0} max={360} step={1}
              value={[theme.bgHue]}
              onValueChange={([v]) => update({ bgHue: v })}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Saturation</Label>
              <span className="text-xs font-mono text-muted-foreground">{theme.bgSat}%</span>
            </div>
            <Slider
              min={0} max={60} step={1}
              value={[theme.bgSat]}
              onValueChange={([v]) => update({ bgSat: v })}
            />
          </div>
        </div>
      </div>

      {/* Corner radius */}
      <div className="space-y-3 p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Corner Radius</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Rounding applied to cards, buttons, and inputs</p>
          </div>
          <div
            className="w-10 h-10 border-2 border-primary bg-primary/10 shrink-0"
            style={{ borderRadius: `${theme.radius}rem` }}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-12">Square</span>
          <Slider
            min={0} max={1.5} step={0.05}
            value={[theme.radius]}
            onValueChange={([v]) => update({ radius: v })}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-12 text-right">Rounded</span>
        </div>
        <p className="text-xs text-muted-foreground text-center">{theme.radius.toFixed(2)}rem</p>
      </div>

      {/* Live preview */}
      <div className="space-y-3 p-4 rounded-lg border bg-card">
        <Label className="text-sm font-medium">Live Preview</Label>
        <div className="flex flex-wrap gap-2 items-center">
          <Button size="sm" style={{ borderRadius: `${theme.radius * 0.875}rem` }}>Primary Button</Button>
          <Button size="sm" variant="outline" style={{ borderRadius: `${theme.radius * 0.875}rem` }}>Outline</Button>
          <Button size="sm" variant="ghost" style={{ borderRadius: `${theme.radius * 0.875}rem` }}>Ghost</Button>
          <span
            className="px-2 py-0.5 text-xs font-medium text-primary-foreground"
            style={{
              background: `hsl(${theme.primaryHue}, ${theme.primarySat}%, ${theme.primaryLight}%)`,
              borderRadius: `${theme.radius * 0.5}rem`,
            }}
          >
            Badge
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Changes apply instantly — no need to save.
        </p>
      </div>
    </div>
  );
}
