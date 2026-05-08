import { useState, useEffect, useCallback } from "react";
import { Palette } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  type ThemeValue,
  ATELIER_THEME,
  loadCustomTheme,
  saveCustomTheme,
  getSystemDark,
  applyTheme,
} from "@/lib/theme";

// ── Eyebrow label ─────────────────────────────────────────────────────────────

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground", className)}>
      {children}
    </p>
  );
}

// ── Color presets ─────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  { label: "Noir",   hue: 0,   sat: 0,  light: 7  },
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

// ── Color swatch ──────────────────────────────────────────────────────────────

function ColorChip({
  label,
  color,
  selected,
  onClick,
}: {
  label: string;
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group">
      <div
        className="w-7 h-7 rounded-full transition-transform group-hover:scale-110"
        style={{
          background: color,
          border: selected ? `1.5px solid ${color}` : "1px solid hsl(var(--border))",
          outline: selected ? `2px solid hsl(var(--border))` : "none",
          outlineOffset: "2px",
        }}
      />
      <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
    </button>
  );
}

// ── Slider row ────────────────────────────────────────────────────────────────

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
  divider = true,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  divider?: boolean;
}) {
  return (
    <div>
      {divider && <div className="border-t border-border" />}
      <div className="pt-3 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">{label}</Label>
          <span className="font-mono tabular-nums text-xs text-muted-foreground">{display}</span>
        </div>
        <Slider
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:shadow-none"
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ThemePanel() {
  const [theme, setTheme] = useState<ThemeValue>(() => {
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
    return { ...loadCustomTheme(), darkMode };
  });

  useEffect(() => {
    applyTheme(theme, "custom");
    saveCustomTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyTheme(theme, "custom");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const [confirmReset, setConfirmReset] = useState(false);

  const resetToDefaults = () => {
    setTheme((prev) => ({ ...ATELIER_THEME, darkMode: prev.darkMode }));
    setConfirmReset(false);
  };

  const customPrimaryColor = `hsl(${theme.primaryHue}, ${theme.primarySat}%, ${theme.primaryLight}%)`;

  return (
    <div className="max-w-5xl mx-auto pb-16">

      {/* ── Page header ── */}
      <div className="border-b border-border py-8">
        <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground mb-2">
          Theme · Appearance settings
        </p>
        <h2 className="text-3xl md:text-4xl font-editorial italic text-foreground leading-tight flex items-center gap-3">
          <Palette className="h-6 w-6 shrink-0 text-muted-foreground/50" />
          Appearance
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-[65ch] leading-relaxed">
          Customize colors, dark mode, and visual settings for the interface.
        </p>
      </div>

    <div className="py-2 space-y-0">

      {/* ── Dark mode ───────────────────────────────────────────────────────── */}
      <div className="border border-border px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <Eyebrow className="mb-1">Dark Mode</Eyebrow>
          <p className="text-sm text-muted-foreground">Switch between light and dark appearance</p>
        </div>
        <Switch
          checked={theme.darkMode}
          onCheckedChange={(v) => update({ darkMode: v })}
          data-testid="switch-dark-mode"
        />
      </div>

      {/* ── Primary Color ───────────────────────────────────────────────────── */}
      <div className="border-x border-b border-border px-4 py-4 space-y-4">
        <Eyebrow>Primary Color</Eyebrow>

        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border border-border shrink-0"
            style={{ background: customPrimaryColor }}
          />
          <p className="text-sm text-muted-foreground">Used for buttons, tabs, badges, and highlights</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {PRESET_COLORS.map((p) => (
            <ColorChip
              key={p.label}
              label={p.label}
              color={`hsl(${p.hue}, ${p.sat}%, ${p.light}%)`}
              selected={theme.primaryHue === p.hue && theme.primarySat === p.sat}
              onClick={() => update({ primaryHue: p.hue, primarySat: p.sat, primaryLight: p.light })}
            />
          ))}
        </div>

        <div>
          <SliderRow
            label="Hue"
            value={theme.primaryHue}
            display={`${theme.primaryHue}°`}
            min={0} max={360} step={1}
            onChange={(v) => update({ primaryHue: v })}
            divider={false}
          />
          <SliderRow
            label="Saturation"
            value={theme.primarySat}
            display={`${theme.primarySat}%`}
            min={20} max={100} step={1}
            onChange={(v) => update({ primarySat: v })}
          />
          <SliderRow
            label="Lightness"
            value={theme.primaryLight}
            display={`${theme.primaryLight}%`}
            min={25} max={75} step={1}
            onChange={(v) => update({ primaryLight: v })}
          />
        </div>
      </div>

      {/* ── Background Tint ─────────────────────────────────────────────────── */}
      <div className="border-x border-b border-border px-4 py-4 space-y-4">
        <Eyebrow>Background Tint</Eyebrow>
        <p className="text-sm text-muted-foreground -mt-2">Subtle hue applied to the page background (light mode only)</p>

        <div className="flex flex-wrap gap-3">
          {PRESET_BG.map((p) => (
            <ColorChip
              key={p.label}
              label={p.label}
              color={`hsl(${p.hue}, ${p.sat}%, 91%)`}
              selected={theme.bgHue === p.hue && theme.bgSat === p.sat}
              onClick={() => update({ bgHue: p.hue, bgSat: p.sat })}
            />
          ))}
        </div>

        <div>
          <SliderRow
            label="Hue"
            value={theme.bgHue}
            display={`${theme.bgHue}°`}
            min={0} max={360} step={1}
            onChange={(v) => update({ bgHue: v })}
            divider={false}
          />
          <SliderRow
            label="Saturation"
            value={theme.bgSat}
            display={`${theme.bgSat}%`}
            min={0} max={60} step={1}
            onChange={(v) => update({ bgSat: v })}
          />
        </div>
      </div>

      {/* ── Row Divider ─────────────────────────────────────────────────────── */}
      <div className="border-x border-b border-border px-4 py-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <Eyebrow>Row Divider</Eyebrow>
          <div
            className="w-16 h-6 rounded-sm shrink-0 border border-border overflow-hidden"
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
        <p className="text-sm text-muted-foreground">Strength of the separator line between rows</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground w-10">Subtle</span>
          <Slider
            min={0} max={0.6} step={0.01}
            value={[theme.rowDividerOpacity]}
            onValueChange={([v]) => update({ rowDividerOpacity: v })}
            className="flex-1 [&_[role=slider]]:shadow-none"
          />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground w-10 text-right">Strong</span>
        </div>
        <p className="font-mono tabular-nums text-xs text-muted-foreground text-center">
          {Math.round(theme.rowDividerOpacity * 100)}% opacity ·{" "}
          {theme.darkMode ? "near-white on dark" : "near-black on light"}
        </p>
      </div>

      {/* ── Corner Radius ───────────────────────────────────────────────────── */}
      <div className="border-x border-b border-border px-4 py-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <Eyebrow>Corner Radius</Eyebrow>
          <div
            className="w-10 h-10 border border-primary bg-primary/10 shrink-0"
            style={{ borderRadius: `${theme.radius}rem` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">Rounding applied to cards, buttons, and inputs</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground w-10">Square</span>
          <Slider
            min={0} max={1.5} step={0.05}
            value={[theme.radius]}
            onValueChange={([v]) => update({ radius: v })}
            className="flex-1 [&_[role=slider]]:shadow-none"
          />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground w-10 text-right">Round</span>
        </div>
        <p className="font-mono tabular-nums text-xs text-muted-foreground text-center">{theme.radius.toFixed(2)} rem</p>
      </div>

      {/* ── Tag Pill Colors ─────────────────────────────────────────────────── */}
      <div className="border-x border-b border-border px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Eyebrow className="mb-1">Tag Pill Colors</Eyebrow>
          <p className="text-sm text-muted-foreground">Show category badges in pastel colors instead of monochrome</p>
          {/* Mini tag preview */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {[
              { label: "High",    h: 35,  s: "85%" },
              { label: "Kid",     h: 270, s: "70%" },
              { label: "Summer",  h: 145, s: "65%" },
              { label: "NE",      h: 215, s: "85%" },
              { label: "Day",     h: 200, s: "82%" },
            ].map(({ label, h, s }) => (
              <span
                key={label}
                className="font-mono text-[10px] px-1.5 py-px border rounded-[3px] transition-colors"
                style={theme.coloredTags ? {
                  backgroundColor: `hsl(${h} ${s} 95%)`,
                  borderColor: `hsl(${h} ${s} 82%)`,
                  color: `hsl(${h} ${s} 22%)`,
                } : {
                  backgroundColor: "hsl(var(--muted))",
                  borderColor: "hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <Switch
          checked={theme.coloredTags}
          onCheckedChange={(v) => update({ coloredTags: v })}
          data-testid="switch-colored-tags"
        />
      </div>

      {/* ── Live Specimen ───────────────────────────────────────────────────── */}
      <div className="border-x border-b border-border px-4 py-4 space-y-3">
        <Eyebrow>Specimen · Live</Eyebrow>
        <div className="flex flex-wrap gap-2 items-center border border-border rounded-sm px-4 py-3">
          <button
            className="px-3 py-1.5 text-sm font-medium"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              borderRadius: `${theme.radius * 0.875}rem`,
            }}
          >
            Primary
          </button>
          <button
            className="px-3 py-1.5 text-sm font-medium border border-border bg-transparent text-foreground"
            style={{ borderRadius: `${theme.radius * 0.875}rem` }}
          >
            Outline
          </button>
          <button
            className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors bg-transparent"
            style={{ borderRadius: `${theme.radius * 0.875}rem` }}
          >
            Ghost
          </button>
          <span
            className="px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-primary-foreground"
            style={{
              background: customPrimaryColor,
              borderRadius: `${theme.radius * 0.5}rem`,
            }}
          >
            Badge
          </span>
        </div>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
          Changes apply instantly — no save needed.
        </p>
      </div>

      {/* ── Reset ───────────────────────────────────────────────────────────── */}
      <div className="border-x border-b border-border px-4 py-3 flex items-center justify-between gap-4">
        <Eyebrow>Reset</Eyebrow>
        {confirmReset ? (
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground/50">Sure?</span>
            <button
              onClick={resetToDefaults}
              className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-foreground hover:text-foreground/70 transition-colors underline underline-offset-4 decoration-border shrink-0"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border shrink-0"
          >
            Reset Defaults
          </button>
        )}
      </div>

    </div>

    </div>
  );
}
