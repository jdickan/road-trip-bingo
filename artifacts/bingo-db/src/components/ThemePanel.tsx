import { useState, useEffect, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
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

// ── Mini app preview thumbnail inside a skin card ─────────────────────────────

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
      className="w-full h-[68px] rounded overflow-hidden border border-border"
      style={{ background: bgColor }}
    >
      <div className="h-5 border-b border-border flex items-center px-2 gap-1.5" style={{ background: bgColor }}>
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: primaryColor }} />
        <div className="flex-1 h-1 rounded-full bg-current opacity-10" />
        <div className="w-8 h-1.5 rounded-full" style={{ background: primaryColor, opacity: 0.5, borderRadius: r }} />
      </div>
      <div className="p-1.5 space-y-1">
        {[0.9, 0.7, 0.5].map((op, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm bg-current opacity-10" />
            <div className="flex-1 h-2 rounded-sm bg-current opacity-[0.07]" />
            <div className="w-6 h-2 rounded" style={{ background: primaryColor, opacity: op, borderRadius: r }} />
            <div className="w-4 h-2 rounded" style={{ background: primaryColor, opacity: op * 0.5, borderRadius: r }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Basic-mode skin card (rounded, traditional) ───────────────────────────────
// Shown when Basic skin is active — uses shadow-md/rounded-xl so it looks like
// the original design. Shadows are real here because [data-skin="custom"] is
// NOT on <html> when Basic is selected.

function BasicSkinCard({
  active,
  onClick,
  label,
  subtitle,
  primaryColor,
  bgColor,
  radius,
  badge,
}: {
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
          <span className="text-[9px] font-bold uppercase tracking-widest text-primary border border-primary/40 rounded px-1.5 py-0.5 shrink-0">
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

// ── Atelier-mode skin button (flat, hairline) ─────────────────────────────────
// Shown when My Theme skin is active — uses flat hairline borders.
// The whole app is already flat at this point via [data-skin="custom"] CSS.

function AtelierSkinButton({
  active,
  onClick,
  label,
  subtitle,
  primaryColor,
  bgColor,
  radius,
  badge,
}: {
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
        "relative flex flex-col gap-3 p-3 rounded-[6px] text-left transition-colors border",
        active
          ? "border-primary bg-background"
          : "border-border bg-background hover:border-foreground/30"
      )}
    >
      <SkinPreview primaryColor={primaryColor} bgColor={bgColor} radius={radius} />
      <div className="flex items-end justify-between gap-1">
        <div>
          <p className="text-[13px] font-medium leading-tight">{label}</p>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge && (
            <span className="border border-border text-[9px] font-mono uppercase tracking-widest text-muted-foreground px-1.5 py-0.5 rounded-sm">
              {badge}
            </span>
          )}
          {active && (
            <span className="border border-foreground text-[9px] font-mono uppercase tracking-widest text-foreground px-1.5 py-0.5 rounded-sm">
              Active
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Atelier eyebrow label ─────────────────────────────────────────────────────

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground", className)}>
      {children}
    </p>
  );
}

// ── Hairline divider ──────────────────────────────────────────────────────────

function Hairline({ className }: { className?: string }) {
  return <div className={cn("border-t border-border", className)} />;
}

// ── Color presets ─────────────────────────────────────────────────────────────

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
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
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
      {divider && <Hairline />}
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

  // Apply theme + skin on every change, passing activeSkin so applyTheme()
  // knows whether to stamp or remove [data-skin="custom"] on <html>.
  useEffect(() => {
    applyTheme(theme, activeSkin);
    if (activeSkin === "custom") {
      saveCustomTheme(theme);
    } else {
      saveDarkModePref(theme.darkMode);
    }
  }, [theme, activeSkin]);

  // Also apply on first mount (handles page reload with correct skin)
  useEffect(() => {
    applyTheme(theme, activeSkin);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Follow system dark-mode if user hasn't saved a preference
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

  // Colors for the Basic skin card thumbnail
  const basicPrimaryColor = `hsl(${BASIC_THEME.primaryHue}, ${BASIC_THEME.primarySat}%, ${BASIC_THEME.primaryLight}%)`;
  const basicBgColor      = `hsl(${BASIC_THEME.bgHue}, ${BASIC_THEME.bgSat}%, 97%)`;

  // For the custom card thumbnail: use the saved custom values when Basic is
  // active (theme state holds BASIC_THEME in that case), or live values when
  // My Theme is active.
  const savedCustom = loadCustomTheme();
  const customCardPrimary = activeSkin === "custom"
    ? `hsl(${theme.primaryHue}, ${theme.primarySat}%, ${theme.primaryLight}%)`
    : `hsl(${savedCustom.primaryHue}, ${savedCustom.primarySat}%, ${savedCustom.primaryLight}%)`;
  const customCardBg     = activeSkin === "custom"
    ? `hsl(${theme.bgHue}, ${theme.bgSat}%, 97%)`
    : `hsl(${savedCustom.bgHue}, ${savedCustom.bgSat}%, 97%)`;
  const customCardRadius = activeSkin === "custom" ? theme.radius : savedCustom.radius;

  // Live primary color used in the custom controls
  const customPrimaryColor = `hsl(${theme.primaryHue}, ${theme.primarySat}%, ${theme.primaryLight}%)`;

  // ── Basic skin is active ─────────────────────────────────────────────────────
  // The ENTIRE ThemePanel — including its own chrome — looks like the original
  // Basic design here: rounded cards, real shadows, Inter font.
  // None of the Atelier CSS is in effect (data-skin is absent from <html>).

  if (activeSkin === "basic") {
    return (
      <div className="max-w-2xl py-2 space-y-4">

        {/* Skin selector */}
        <div>
          <h2 className="text-base font-semibold">Look &amp; Feel</h2>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">
            Choose between the stable original design or build your own
          </p>
          <div className="grid grid-cols-2 gap-3 p-2 rounded-xl bg-muted/40 border">
            <BasicSkinCard
              active={true}
              onClick={() => switchToSkin("basic")}
              label="Basic"
              subtitle="Original design · read-only"
              primaryColor={basicPrimaryColor}
              bgColor={basicBgColor}
              radius={BASIC_THEME.radius}
              badge="Stable"
            />
            <BasicSkinCard
              active={false}
              onClick={() => switchToSkin("custom")}
              label="My Theme"
              subtitle="Atelier editorial skin"
              primaryColor={customCardPrimary}
              bgColor={customCardBg}
              radius={customCardRadius}
              badge="Custom"
            />
          </div>
        </div>

        {/* Dark mode */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card">
          <div>
            <Label className="text-sm font-medium">Dark Mode</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Switch between light and dark appearance
            </p>
          </div>
          <Switch
            checked={theme.darkMode}
            onCheckedChange={(v) => update({ darkMode: v })}
            data-testid="switch-dark-mode"
          />
        </div>

        {/* Locked notice */}
        <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
          <Lock className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Basic</strong> is the original design — colors,
            typography, and layout are fixed and cannot be changed. Switch to{" "}
            <button
              className="font-semibold text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
              onClick={() => switchToSkin("custom")}
            >
              My Theme
            </button>{" "}
            to unlock the Atelier editorial skin with full customization.
          </p>
        </div>

      </div>
    );
  }

  // ── My Theme (Atelier) skin is active ────────────────────────────────────────
  // [data-skin="custom"] is now on <html>, so:
  //   • All shadow-* utilities resolve to none — site-wide
  //   • font-sans / font-mono switch to Geist / Geist Mono — site-wide
  //   • This ThemePanel renders the flat editorial layout naturally
  // No inline font styles needed here — the global CSS handles it.

  return (
    <div className="max-w-2xl py-2 space-y-0">

      {/* ── Skin selector ──────────────────────────────────────────────────── */}
      <div className="border border-border rounded-[6px] p-4 space-y-3">
        <Eyebrow>Appearance · Skin</Eyebrow>
        <div className="grid grid-cols-2 gap-3">
          <AtelierSkinButton
            active={false}
            onClick={() => switchToSkin("basic")}
            label="Basic"
            subtitle="Original design · read-only"
            primaryColor={basicPrimaryColor}
            bgColor={basicBgColor}
            radius={BASIC_THEME.radius}
            badge="Stable"
          />
          <AtelierSkinButton
            active={true}
            onClick={() => switchToSkin("custom")}
            label="My Theme"
            subtitle="Your custom look"
            primaryColor={customCardPrimary}
            bgColor={customCardBg}
            radius={theme.radius}
            badge="Custom"
          />
        </div>
      </div>

      {/* ── Dark mode ───────────────────────────────────────────────────────── */}
      <div className="border-x border-b border-border px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <Eyebrow className="mb-1">Dark Mode</Eyebrow>
          <p className="text-[13px] text-muted-foreground">Switch between light and dark appearance</p>
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
          <p className="text-[13px] text-muted-foreground">Used for buttons, tabs, badges, and highlights</p>
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
        <p className="text-[13px] text-muted-foreground -mt-2">Subtle hue applied to the page background (light mode only)</p>

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
        <p className="text-[13px] text-muted-foreground">Strength of the separator line between rows</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground w-10">Subtle</span>
          <Slider
            min={0} max={0.6} step={0.01}
            value={[theme.rowDividerOpacity]}
            onValueChange={([v]) => update({ rowDividerOpacity: v })}
            className="flex-1 [&_[role=slider]]:shadow-none"
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground w-10 text-right">Strong</span>
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
        <p className="text-[13px] text-muted-foreground">Rounding applied to cards, buttons, and inputs</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground w-10">Square</span>
          <Slider
            min={0} max={1.5} step={0.05}
            value={[theme.radius]}
            onValueChange={([v]) => update({ radius: v })}
            className="flex-1 [&_[role=slider]]:shadow-none"
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground w-10 text-right">Round</span>
        </div>
        <p className="font-mono tabular-nums text-xs text-muted-foreground text-center">{theme.radius.toFixed(2)} rem</p>
      </div>

      {/* ── Live Specimen ───────────────────────────────────────────────────── */}
      <div className="border-x border-b border-border px-4 py-4 space-y-3">
        <Eyebrow>Specimen · Live</Eyebrow>
        <div className="flex flex-wrap gap-2 items-center border border-border rounded-sm px-4 py-3">
          <button
            className="px-3 py-1.5 text-[13px] font-medium"
            style={{
              background: theme.darkMode ? "#f0f0f0" : "#111111",
              color: theme.darkMode ? "#111111" : "#f9f9f9",
              borderRadius: `${theme.radius * 0.875}rem`,
            }}
          >
            Primary
          </button>
          <button
            className="px-3 py-1.5 text-[13px] font-medium border border-border bg-transparent text-foreground"
            style={{ borderRadius: `${theme.radius * 0.875}rem` }}
          >
            Outline
          </button>
          <button
            className="px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors bg-transparent"
            style={{ borderRadius: `${theme.radius * 0.875}rem` }}
          >
            Ghost
          </button>
          <span
            className="px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-primary-foreground"
            style={{
              background: customPrimaryColor,
              borderRadius: `${theme.radius * 0.5}rem`,
            }}
          >
            Badge
          </span>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Changes apply instantly — no save needed.
        </p>
      </div>

      {/* ── Reset ───────────────────────────────────────────────────────────── */}
      <div className="border-x border-b border-border px-4 py-3 flex items-center justify-between gap-4">
        <Eyebrow>Reset</Eyebrow>
        <button
          onClick={resetCustom}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
        >
          Reset to Basic defaults
        </button>
      </div>

    </div>
  );
}
