# Atelier "My Theme" — paste-ready edits for `artifacts/bingo-db`

These edits make the **Themes tab → My Theme** option apply the **Atelier 2027 Editorial** look (from `ai-headshot-wizard`) across the entire app. Basic stays untouched.

How it works:
- A new CSS class `.skin-atelier` overrides every shadcn token (light + dark).
- `applyTheme()` toggles `.skin-atelier` on `<html>` whenever the active skin is `custom` ("My Theme"). The slider values are ignored while atelier is on so the look stays consistent.
- ThemePanel's "My Theme" preview tile and label get an atelier-accurate look.

Three files to change. Copy each block over the existing one.

---

## 1. `artifacts/bingo-db/src/index.css`

**Add this** at the very top (above `@import "tailwindcss";`):

```css
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap');
```

**Append to the bottom of the file** (after the existing `@layer utilities` block):

```css
/* =========================================================
   ATELIER · 2027 EDITORIAL SYSTEM  (My Theme)
   Monochrome canvas, hairline borders, single electric accent.
   Activated by adding `.skin-atelier` to <html>.
   ========================================================= */
.skin-atelier {
  --background: 0 0% 99%;
  --foreground: 0 0% 7%;

  --card: 0 0% 100%;
  --card-foreground: 0 0% 7%;
  --card-border: 0 0% 90%;

  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 7%;
  --popover-border: 0 0% 90%;

  --primary: 0 0% 7%;
  --primary-foreground: 0 0% 99%;

  --secondary: 0 0% 96.5%;
  --secondary-foreground: 0 0% 7%;

  --muted: 0 0% 96.5%;
  --muted-foreground: 0 0% 46%;

  --accent: 230 100% 56%;
  --accent-foreground: 0 0% 100%;

  --destructive: 4 74% 48%;
  --destructive-foreground: 0 0% 100%;

  --border: 0 0% 90%;
  --input: 0 0% 88%;
  --ring: 230 100% 56%;

  --sidebar: 0 0% 96.5%;
  --sidebar-foreground: 0 0% 28%;
  --sidebar-border: 0 0% 90%;
  --sidebar-primary: 0 0% 7%;
  --sidebar-primary-foreground: 0 0% 99%;
  --sidebar-accent: 0 0% 92%;
  --sidebar-accent-foreground: 0 0% 7%;
  --sidebar-ring: 230 100% 56%;

  --chart-1: 0 0% 7%;
  --chart-2: 230 100% 56%;
  --chart-3: 0 0% 46%;
  --chart-4: 0 0% 64%;
  --chart-5: 4 74% 48%;

  --radius: 0.375rem;

  --app-font-sans: 'Geist', 'Inter', sans-serif;
  --app-font-serif: 'Instrument Serif', Georgia, serif;
  --app-font-mono: 'Geist Mono', Menlo, monospace;

  /* Flatten all elevation — atelier uses hairlines, no shadows */
  --shadow-2xs: 0 0 0 0 transparent;
  --shadow-xs:  0 0 0 0 transparent;
  --shadow-sm:  0 0 0 0 transparent;
  --shadow:     0 0 0 0 transparent;
  --shadow-md:  0 0 0 0 transparent;
  --shadow-lg:  0 0 0 0 transparent;
  --shadow-xl:  0 0 0 0 transparent;
  --shadow-2xl: 0 0 0 0 transparent;

  --button-outline: rgba(0,0,0, .12);
  --badge-outline: rgba(0,0,0, .08);
  --elevate-1: rgba(0,0,0, .025);
  --elevate-2: rgba(0,0,0, .05);

  letter-spacing: -0.01em;
  font-feature-settings: "ss01", "ss02", "cv11";
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.skin-atelier.dark,
.dark .skin-atelier,
.skin-atelier .dark {
  --background: 0 0% 6%;
  --foreground: 0 0% 96%;

  --card: 0 0% 9%;
  --card-foreground: 0 0% 96%;
  --card-border: 0 0% 16%;

  --popover: 0 0% 9%;
  --popover-foreground: 0 0% 96%;
  --popover-border: 0 0% 16%;

  --primary: 0 0% 96%;
  --primary-foreground: 0 0% 6%;

  --secondary: 0 0% 12%;
  --secondary-foreground: 0 0% 96%;

  --muted: 0 0% 12%;
  --muted-foreground: 0 0% 58%;

  --accent: 230 100% 65%;
  --accent-foreground: 0 0% 6%;

  --destructive: 4 70% 55%;
  --destructive-foreground: 0 0% 100%;

  --border: 0 0% 16%;
  --input: 0 0% 18%;
  --ring: 230 100% 65%;

  --sidebar: 0 0% 8%;
  --sidebar-foreground: 0 0% 78%;
  --sidebar-border: 0 0% 16%;
  --sidebar-primary: 0 0% 96%;
  --sidebar-primary-foreground: 0 0% 6%;
  --sidebar-accent: 0 0% 14%;
  --sidebar-accent-foreground: 0 0% 96%;
  --sidebar-ring: 230 100% 65%;

  --button-outline: rgba(255,255,255, .12);
  --badge-outline: rgba(255,255,255, .08);
  --elevate-1: rgba(255,255,255, .04);
  --elevate-2: rgba(255,255,255, .08);
}

/* Atelier headings + signature utilities */
.skin-atelier h1,
.skin-atelier h2,
.skin-atelier h3,
.skin-atelier h4 {
  letter-spacing: -0.025em;
  font-weight: 500;
}

.skin-atelier ::selection {
  background: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}

.skin-atelier .font-editorial {
  font-family: 'Instrument Serif', Georgia, serif;
  letter-spacing: -0.02em;
  font-weight: 400;
}

.skin-atelier .eyebrow {
  font-family: var(--app-font-mono);
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: hsl(var(--muted-foreground));
}

.skin-atelier .hairline { border-color: hsl(var(--border)); }

.skin-atelier .panel {
  border-radius: var(--radius);
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  box-shadow: none;
}

/* Kill stray shadows globally inside atelier — keeps the flat editorial feel */
.skin-atelier [class*="shadow-"] { box-shadow: none !important; }
```

---

## 2. `artifacts/bingo-db/src/lib/theme.ts`

**Replace the entire `applyTheme` function** with this version (it adds/removes the `.skin-atelier` class and skips slider overrides while atelier is active so the editorial look is pristine):

```ts
export function applyTheme(t: ThemeValue): void {
  const root = document.documentElement;

  if (t.darkMode) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // ── Atelier skin flag — driven by active skin selection ────────────────
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

  // ── Basic skin: original slider-driven behaviour ──────────────────────
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
```

Optional polish — make the atelier values the saved baseline for "My Theme" so the preview tile and (if user later turns atelier off) sliders feel coherent. Add this constant near `BASIC_THEME` and use it inside `loadCustomTheme()` as the fallback:

```ts
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
```

Then change the fallback inside `loadCustomTheme()` from `{ ...BASIC_THEME }` to `{ ...ATELIER_THEME }`.

---

## 3. `artifacts/bingo-db/src/components/ThemePanel.tsx`

Update the **"My Theme" `<SkinButton>`** (inside the skin selector grid) so the preview chip reflects the atelier look — black ink primary, paper-white background, tight radius:

```tsx
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
```

(Optional) Hide the hue / saturation / radius sliders while My Theme is active, since atelier overrides them. Wrap the slider section in `{activeSkin === "custom" ? null : ( ...sliders... )}` or show a small notice:

```tsx
{activeSkin === "custom" && (
  <div className="flex items-start gap-3 p-4 rounded-md border bg-muted/30">
    <div className="text-sm text-muted-foreground leading-relaxed">
      <strong className="text-foreground">My Theme · Atelier</strong> —
      a fixed editorial system. Color, radius, and divider sliders are
      disabled to keep the look consistent. Toggle Dark Mode above to flip the canvas.
    </div>
  </div>
)}
```

---

## What this gives you

| Aspect | Basic (unchanged) | My Theme (Atelier) |
|---|---|---|
| Background | Cream `40 33% 98%` | Paper white `0 0% 99%` |
| Primary | Amber `26 90% 55%` | Ink black `0 0% 7%` |
| Accent | Green `142 71% 45%` | Electric cobalt `230 100% 56%` |
| Radius | 0.5rem (slider) | 0.375rem (fixed) |
| Shadows | shadcn defaults | Removed (hairlines only) |
| Font | Inter | Geist + Instrument Serif (editorial) |
| Dark mode | Navy | Near-black `0 0% 6%` |

Switching themes in the Themes tab now repaints the whole app — sidebar, cards, popovers, dialogs, buttons, charts — because every shadcn token is rebound under `.skin-atelier`.
