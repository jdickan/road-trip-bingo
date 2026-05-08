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
  ATELIER_THEME,
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
    setTheme({ ...ATELIER_THEME, darkMode: theme.darkMode });
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
            subtitle="Atelier · editorial monochrome"
            primaryColor="hsl(0, 0%, 7%)"
            bgColor="hsl(0, 0%, 99%)"
            radius={0.375}
            badge="Atelier"
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

      {/* ── Atelier notice (My Theme active) ── */}
      {activeSkin === "custom" && (
        <>
          <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
            <div className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">My Theme · Atelier</strong> — a fixed editorial
              design system: monochrome canvas, hairline borders, electric cobalt accent, and Geist
              typography. Color, radius, and divider sliders are disabled to keep the look
              consistent. Toggle <strong className="text-foreground">Dark Mode</strong> above to
              flip the canvas between paper-white and near-black.
            </div>
          </div>

          {/* Live preview */}
          <div className="space-y-3 p-4 rounded-lg border bg-card">
            <Label className="text-sm font-medium">Live Preview</Label>
            <div className="flex flex-wrap gap-2 items-center">
              <Button size="sm">Primary Button</Button>
              <Button size="sm" variant="outline">Outline</Button>
              <Button size="sm" variant="ghost">Ghost</Button>
              <span
                className="px-2 py-0.5 text-xs font-medium rounded"
                style={{ background: "hsl(230,100%,56%)", color: "#fff" }}
              >
                Accent
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              The whole app repainted — sidebar, cards, popovers, dialogs, charts.
            </p>
          </div>

          {/* Reset */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <p className="text-sm font-medium">Reset My Theme</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Restore Atelier defaults (dark mode preference is kept)
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={resetCustom} className="gap-1.5 text-xs h-8 shrink-0">
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
