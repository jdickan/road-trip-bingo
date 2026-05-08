import { useState, useEffect, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Lock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ThemeValue,
  type SkinName,
  BASIC_THEME,
  getActiveSkin,
  setActiveSkin,
  loadCustomTheme,
  saveCustomTheme,
  saveDarkModePref,
  getSystemDark,
  applyTheme,
} from "@/lib/theme";

// ── Mini app preview inside a skin button ─────────────────────────────────────

function SkinPreview({
  primaryColor,
  bgColor,
  radius,
}: {
  primaryColor: string;
  bgColor: string;
  radius: number;
}) {
  const r = `${radius * 0.6}rem`;
  return (
    <div
      className="w-full h-[68px] rounded-lg overflow-hidden border shadow-sm"
      style={{ background: bgColor }}
    >
      {/* Fake header */}
      <div className="h-5 border-b flex items-center px-2 gap-1.5" style={{ background: bgColor }}>
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: primaryColor }} />
        <div className="flex-1 h-1 rounded-full bg-current opacity-10" />
        <div className="w-8 h-1.5 rounded-full" style={{ background: primaryColor, opacity: 0.5, borderRadius: r }} />
      </div>
      {/* Fake rows */}
      <div className="p-1.5 space-y-1">
        {[0.9, 0.7, 0.5].map((op, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm bg-current opacity-10" />
            <div className="flex-1 h-2 rounded-sm bg-current opacity-[0.07]" />
            <div
              className="w-6 h-2 rounded"
              style={{ background: primaryColor, opacity: op, borderRadius: r }}
            />
            <div
              className="w-4 h-2 rounded"
              style={{ background: primaryColor, opacity: op * 0.5, borderRadius: r }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkinButton({
  skin,
  active,
  onClick,
  label,
  subtitle,
  primaryColor,
  bgColor,
  radius,
  badge,
}: {
  skin: SkinName;
  active: boolean;
  onClick: () => void;
  label: string;
  subtitle: string;
  primaryColor: string;
  bgColor: string;
  radius: number;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col gap-3 p-3 rounded-xl text-left transition-all border-2",
        active
          ? "bg-background shadow-md border-primary"
          : "bg-background/50 border-transparent hover:border-border hover:bg-background/80"
      )}
    >
      <SkinPreview primaryColor={primaryColor} bgColor={bgColor} radius={radius} />
      <div className="flex items-end justify-between gap-1">
        <div>
          <p className="text-sm font-semibold leading-tight">{label}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        {badge && (
          <span className="text-[9px] font-black uppercase tracking-widest text-primary border border-primary/40 rounded px-1.5 py-0.5 shrink-0">
            {badge}
          </span>
        )}
      </div>
      {active && (
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary" />
      )}
    </button>
  );
}

// ── Swatch ────────────────────────────────────────────────────────────────────

function Swatch({ hue, sat, light }: { hue: number; sat: number; light: number }) {
  return (
    <div
      className="w-8 h-8 rounded-full border border-border shadow-sm shrink-0"
      style={{ background: `hsl(${hue}, ${sat}%, ${light}%)` }}
    />
  );
}

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  { label: "Amber",  hue: 26,  sat: 90, light: 55 },
  { label: "Coral",  hue: 10,  sat: 85, light: 58 },
  { label: "Rose",   hue: 345, sat: 80, light: 55 },
  { label: "Purple", hue: 270, sat: 75, light: 55 },
  { label: "Indigo", hue: 240, sat: 75, light: 55 },
  { label: "Blue",   hue: 210, sat: 85, light: 50 },
  { label: "Teal",   hue: 175, sat: 75, light: 42 },
  { label: "Green",  hue: 142, sat: 71, light: 45 },
];

const PRESET_BG = [
  { label: "Warm",     hue: 40,  sat: 33 },
  { label: "Cool",     hue: 210, sat: 20 },
  { label: "Neutral",  hue: 0,   sat: 0  },
  { label: "Sage",     hue: 150, sat: 15 },
  { label: "Lavender", hue: 270, sat: 20 },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function ThemePanel() {
  const [activeSkin, setActiveSkinState] = useState<SkinName>(getActiveSkin);

  const [theme, setTheme] = useState<ThemeValue>(() => {
    const skin = getActiveSkin();
    const darkMode = (() => {
      try {
        const raw = localStorage.getItem("bingo-theme-v1");
        if (raw) {
          const p = JSON.parse(raw);
          if (typeof p.darkMode === "boolean") return p.darkMode;
        }
      } catch {}
      return getSystemDark();
    })();
    if (skin === "basic") return { ...BASIC_THEME, darkMode };
    return { ...loadCustomTheme(), darkMode };
  });

  // Apply on every change
  useEffect(() => {
    applyTheme(theme);
    if (activeSkin === "custom") {
      saveCustomTheme(theme);
    } else {
      saveDarkModePref(theme.darkMode);
    }
  }, [theme, activeSkin]);

  // First-load apply
  useEffect(() => {
    applyTheme(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // System dark mode listener
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("bingo-theme-v1")) {
        setTheme((prev) => ({ ...prev, darkMode: e.matches }));
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const update = useCallback((partial: Partial<ThemeValue>) => {
    setTheme((prev) => ({ ...prev, ...partial }));
  }, []);

  const switchToSkin = useCallback(
    (skin: SkinName) => {
      setActiveSkin(skin);
      setActiveSkinState(skin);
      if (skin === "basic") {
        setTheme({ ...BASIC_THEME, darkMode: theme.darkMode });
      } else {
        const saved = loadCustomTheme();
        setTheme({ ...saved, darkMode: theme.darkMode });
      }
    },
    [theme.darkMode]
  );

  const resetCustom = () => {
    setTheme({ ...BASIC_THEME, darkMode: theme.darkMode });
  };

  const basicPrimaryColor = `hsl(${BASIC_THEME.primaryHue}, ${BASIC_THEME.primarySat}%, ${BASIC_THEME.primaryLight}%)`;
  const basicBgColor = `hsl(${BASIC_THEME.bgHue}, ${BASIC_THEME.bgSat}%, 97%)`;
  const customPrimaryColor = `hsl(${theme.primaryHue}, ${theme.primarySat}%, ${theme.primaryLight}%)`;
  const customBgColor = `hsl(${theme.bgHue}, ${theme.bgSat}%, 97%)`;

  return (
    <div className="max-w-2xl space-y-6 py-2">

      {/* ── Skin selector ── */}
      <div>
        <h2 className="text-base font-semibold">Look & Feel</h2>
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
          Switch between themes or build your own
        </p>
        <div className="grid grid-cols-2 gap-3 p-2 rounded-xl bg-muted/40 border">
          <SkinButton
            skin="basic"
            active={activeSkin === "basic"}
            onClick={() => switchToSkin("basic")}
            label="Basic"
            subtitle="Original design · read-only"
            primaryColor={basicPrimaryColor}
            bgColor={basicBgColor}
            radius={BASIC_THEME.radius}
            badge="Stable"
          />
          <SkinButton
            skin="custom"
            active={activeSkin === "custom"}
            onClick={() => switchToSkin("custom")}
            label="My Theme"
            subtitle="Your custom look"
            primaryColor={activeSkin === "custom" ? customPrimaryColor : customPrimaryColor}
            bgColor={activeSkin === "custom" ? customBgColor : customBgColor}
            radius={activeSkin === "custom" ? theme.radius : loadCustomTheme().radius}
            badge="Custom"
          />
        </div>
      </div>

      {/* ── Dark mode — always visible ── */}
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

      {/* ── Basic locked notice ── */}
      {activeSkin === "basic" && (
        <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
          <Lock className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <div className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Basic</strong> is the original design — frozen so you can always come back to it. Switch to{" "}
            <button
              className="font-semibold text-primary underline underline-offset-2 hover:no-underline"
              onClick={() => switchToSkin("custom")}
            >
              My Theme
            </button>{" "}
            to customize colors, radius, and more.
          </div>
        </div>
      )}

      {/* ── Custom fine-tune controls ── */}
      {activeSkin === "custom" && (
        <>
          {/* Primary color */}
          <div className="space-y-4 p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <Swatch hue={theme.primaryHue} sat={theme.primarySat} light={theme.primaryLight} />
              <div>
                <Label className="text-sm font-medium">Primary Color</Label>
                <p className="text-xs text-muted-foreground">Used for buttons, tabs, badges, and highlights</p>
              </div>
            </div>

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
                <Slider min={0} max={360} step={1} value={[theme.primaryHue]}
                  onValueChange={([v]) => update({ primaryHue: v })}
                  className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Saturation</Label>
                  <span className="text-xs font-mono text-muted-foreground">{theme.primarySat}%</span>
                </div>
                <Slider min={20} max={100} step={1} value={[theme.primarySat]}
                  onValueChange={([v]) => update({ primarySat: v })} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Lightness</Label>
                  <span className="text-xs font-mono text-muted-foreground">{theme.primaryLight}%</span>
                </div>
                <Slider min={25} max={75} step={1} value={[theme.primaryLight]}
                  onValueChange={([v]) => update({ primaryLight: v })} />
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
                <Slider min={0} max={360} step={1} value={[theme.bgHue]}
                  onValueChange={([v]) => update({ bgHue: v })} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Saturation</Label>
                  <span className="text-xs font-mono text-muted-foreground">{theme.bgSat}%</span>
                </div>
                <Slider min={0} max={60} step={1} value={[theme.bgSat]}
                  onValueChange={([v]) => update({ bgSat: v })} />
              </div>
            </div>
          </div>

          {/* Row divider */}
          <div className="space-y-3 p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Row Divider Line</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Strength of the separator line between rows
                </p>
              </div>
              <div
                className="w-16 h-6 rounded shrink-0 border border-border overflow-hidden"
                style={{ background: theme.darkMode ? "#1a1a1a" : "#f5f5f5" }}
              >
                <div
                  className="w-full"
                  style={{
                    height: "1px",
                    marginTop: "11px",
                    background: theme.darkMode
                      ? `rgba(255,255,255,${theme.rowDividerOpacity})`
                      : `rgba(0,0,0,${theme.rowDividerOpacity})`,
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-12">Subtle</span>
              <Slider min={0} max={0.6} step={0.01} value={[theme.rowDividerOpacity]}
                onValueChange={([v]) => update({ rowDividerOpacity: v })} className="flex-1" />
              <span className="text-xs text-muted-foreground w-12 text-right">Strong</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {Math.round(theme.rowDividerOpacity * 100)}% opacity ·{" "}
              {theme.darkMode ? "near-white on dark" : "near-black on light"}
            </p>
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
              <Slider min={0} max={1.5} step={0.05} value={[theme.radius]}
                onValueChange={([v]) => update({ radius: v })} className="flex-1" />
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
                  background: customPrimaryColor,
                  borderRadius: `${theme.radius * 0.5}rem`,
                }}
              >
                Badge
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Changes apply instantly — no need to save.</p>
          </div>

          {/* Reset */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <p className="text-sm font-medium">Reset My Theme</p>
              <p className="text-xs text-muted-foreground mt-0.5">Restore all custom values back to the Basic defaults</p>
            </div>
            <Button variant="outline" size="sm" onClick={resetCustom} className="gap-1.5 text-xs h-8 shrink-0">
              <RotateCcw className="h-3 w-3" />
              Reset to Basic
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
