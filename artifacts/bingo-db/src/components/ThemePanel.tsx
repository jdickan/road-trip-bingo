import { useState, useEffect, useCallback } from "react";
import { Palette, Save, Trash2, Check } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  type ThemeValue,
  type SavedPreset,
  type Density,
  ATELIER_THEME,
  loadCustomTheme,
  saveCustomTheme,
  getSystemDark,
  applyTheme,
  loadSavedPresets,
  savePreset,
  deletePreset,
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

// ── Density segmented control ─────────────────────────────────────────────────

const DENSITY_OPTIONS: { value: Density; label: string; hint: string }[] = [
  { value: "compact",     label: "Compact",     hint: "More rows visible at once" },
  { value: "cozy",        label: "Cozy",        hint: "Balanced default" },
  { value: "comfortable", label: "Comfortable", hint: "More breathing room" },
];

function DensityControl({ value, onChange }: { value: Density; onChange: (v: Density) => void }) {
  return (
    <div className="flex rounded-sm overflow-hidden border border-border">
      {DENSITY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors border-r border-border last:border-r-0",
            value === opt.value
              ? "bg-foreground text-background"
              : "bg-background text-muted-foreground hover:bg-muted/50"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Live chrome preview ───────────────────────────────────────────────────────

const MOCK_ROWS = [
  { emoji: "🎪", word: "Circus tent",    tag: "High",   tagH: 35,  tagS: "85%" },
  { emoji: "🦅", word: "Eagle",          tag: "Kid",    tagH: 270, tagS: "70%" },
  { emoji: "🏔️", word: "Mountain view",  tag: "Medium", tagH: 175, tagS: "60%" },
];

function LiveChromePreview({ theme }: { theme: ThemeValue }) {
  const primaryHsl = `hsl(${theme.primaryHue} ${theme.primarySat}% ${
    theme.darkMode ? 100 - theme.primaryLight : theme.primaryLight
  }%)`;
  const isDark = theme.darkMode;
  const bg = isDark ? "#171717" : `hsl(${theme.bgHue} ${theme.bgSat}% 98%)`;
  const border = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const fg = isDark ? "#f5f5f5" : "#0a0a0a";
  const muted = isDark ? "rgba(255,255,255,0.40)" : "rgba(0,0,0,0.40)";
  const divider = isDark
    ? `rgba(255,255,255,${theme.rowDividerOpacity})`
    : `rgba(0,0,0,${theme.rowDividerOpacity})`;
  const r = `${theme.radius * 0.5}rem`;

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "6px",
        overflow: "hidden",
        fontFamily: "'Geist', system-ui, sans-serif",
        width: "100%",
      }}
    >
      {/* Mini header */}
      <div
        style={{
          borderBottom: `1px solid ${border}`,
          background: bg,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px 0",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginRight: "8px" }}>
          <div style={{
            width: "14px", height: "14px", borderRadius: "3px",
            background: primaryHsl,
          }} />
          <span style={{ fontSize: "9px", fontWeight: 600, color: fg, letterSpacing: "0.04em" }}>
            ROAD TRIP BINGO
          </span>
        </div>
        {/* Tabs */}
        {["Words", "Boards", "Stats"].map((tab, i) => (
          <div
            key={tab}
            style={{
              fontSize: "9px",
              fontWeight: i === 0 ? 600 : 400,
              color: i === 0 ? fg : muted,
              padding: "4px 8px 5px",
              borderBottom: i === 0 ? `2px solid ${primaryHsl}` : "2px solid transparent",
              letterSpacing: "0.02em",
            }}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Mock table rows */}
      <div>
        {MOCK_ROWS.map((row, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              borderBottom: i < MOCK_ROWS.length - 1 ? `1px solid ${divider}` : "none",
              fontSize: "10px",
            }}
          >
            <span style={{ fontSize: "12px", lineHeight: 1 }}>{row.emoji}</span>
            <span style={{ flex: 1, color: fg, fontWeight: 500 }}>{row.word}</span>
            {theme.coloredTags ? (
              <span style={{
                fontSize: "8px",
                padding: "1px 5px",
                borderRadius: r,
                border: `1px solid hsl(${row.tagH} ${row.tagS} 72%)`,
                background: `hsl(${row.tagH} ${row.tagS} 95%)`,
                color: `hsl(${row.tagH} ${row.tagS} 22%)`,
                fontFamily: "monospace",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}>
                {row.tag}
              </span>
            ) : (
              <span style={{
                fontSize: "8px",
                padding: "1px 5px",
                borderRadius: r,
                border: `1px solid ${border}`,
                background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                color: muted,
                fontFamily: "monospace",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}>
                {row.tag}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Named preset card ─────────────────────────────────────────────────────────

function PresetCard({
  preset,
  onApply,
  onDelete,
}: {
  preset: SavedPreset;
  onApply: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const t = preset.theme;
  const primaryHsl = `hsl(${t.primaryHue} ${t.primarySat}% ${t.primaryLight}%)`;
  const bgHsl = t.bgSat > 0 ? `hsl(${t.bgHue} ${t.bgSat}% 91%)` : "#f5f5f5";

  return (
    <div className="border border-border rounded-sm overflow-hidden">
      {/* Mini color preview */}
      <div className="flex h-5" style={{ background: bgHsl }}>
        <div className="w-8 h-full" style={{ background: primaryHsl }} />
        <div className="flex-1 h-full border-l border-border/30" />
      </div>
      <div className="px-2.5 py-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-foreground truncate">
          {preset.name}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {confirmDelete ? (
            <>
              <button
                onClick={() => { onDelete(); setConfirmDelete(false); }}
                className="font-mono text-[9px] uppercase tracking-[0.12em] text-destructive hover:opacity-70"
              >
                Delete
              </button>
              <span className="text-muted-foreground/40 text-[9px]">·</span>
              <button
                onClick={() => setConfirmDelete(false)}
                className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onApply}
                className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors"
              >
                Apply
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-muted-foreground/50 hover:text-destructive transition-colors ml-1"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </>
          )}
        </div>
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

  const [presets, setPresets] = useState<SavedPreset[]>(() => loadSavedPresets());
  const [saveLabel, setSaveLabel] = useState("");
  const [savingOpen, setSavingOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

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

  const handleSavePreset = () => {
    if (!saveLabel.trim()) return;
    const preset = savePreset(saveLabel, theme);
    setPresets((prev) => [...prev, preset]);
    setSaveLabel("");
    setSavingOpen(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const handleApplyPreset = (preset: SavedPreset) => {
    setTheme({ ...preset.theme });
  };

  const handleDeletePreset = (id: string) => {
    deletePreset(id);
    setPresets((prev) => prev.filter((p) => p.id !== id));
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
          Customize colors, density, dark mode, and visual settings for the interface.
        </p>
      </div>

      <div className="py-2 space-y-0">

        {/* ── Density ─────────────────────────────────────────────────────────── */}
        <div className="border border-border px-4 py-4 space-y-3">
          <div>
            <Eyebrow className="mb-1">Row Density</Eyebrow>
            <p className="text-sm text-muted-foreground">
              Controls vertical spacing in the word table.{" "}
              <span className="text-muted-foreground/60">
                {DENSITY_OPTIONS.find((o) => o.value === theme.density)?.hint}
              </span>
            </p>
          </div>
          <DensityControl value={theme.density} onChange={(v) => update({ density: v })} />
        </div>

        {/* ── Dark mode ───────────────────────────────────────────────────────── */}
        <div className="border-x border-b border-border px-4 py-3 flex items-center justify-between gap-4">
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <Eyebrow>Background Tint</Eyebrow>
              <p className="text-sm text-muted-foreground mt-1">Subtle hue applied to the page background</p>
            </div>
            {theme.darkMode && (
              <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-sm shrink-0">
                No effect in dark mode
              </span>
            )}
          </div>

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

        {/* ── Live App Preview ─────────────────────────────────────────────────── */}
        <div className="border-x border-b border-border px-4 py-4 space-y-3">
          <Eyebrow>Live Preview</Eyebrow>
          <p className="text-sm text-muted-foreground -mt-1">
            How the word table looks with the current settings
          </p>
          <LiveChromePreview theme={theme} />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
            Changes apply instantly — no save needed.
          </p>
        </div>

        {/* ── Named Presets ────────────────────────────────────────────────────── */}
        <div className="border-x border-b border-border px-4 py-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Eyebrow>Saved Presets</Eyebrow>
              <p className="text-sm text-muted-foreground mt-0.5">
                Save named snapshots of your current settings to switch between
              </p>
            </div>
            {savedFlash && (
              <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
          </div>

          {presets.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {presets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  onApply={() => handleApplyPreset(preset)}
                  onDelete={() => handleDeletePreset(preset.id)}
                />
              ))}
            </div>
          )}

          {presets.length === 0 && !savingOpen && (
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground/50">
              No presets saved yet
            </p>
          )}

          {savingOpen ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSavePreset();
                  if (e.key === "Escape") { setSavingOpen(false); setSaveLabel(""); }
                }}
                placeholder="Preset name…"
                className="flex-1 font-mono text-xs px-2.5 py-1.5 border border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40"
              />
              <button
                onClick={handleSavePreset}
                disabled={!saveLabel.trim()}
                className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] border border-border px-2.5 py-1.5 hover:bg-muted/40 transition-colors disabled:opacity-40"
              >
                <Save className="h-3 w-3" />
                Save
              </button>
              <button
                onClick={() => { setSavingOpen(false); setSaveLabel(""); }}
                className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors px-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSavingOpen(true)}
              className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] border border-border px-3 py-1.5 hover:bg-muted/40 transition-colors"
            >
              <Save className="h-3 w-3" />
              Save current as preset…
            </button>
          )}
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
