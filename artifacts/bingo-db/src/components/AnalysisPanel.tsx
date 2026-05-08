import { useGetWordStats, getGetWordStatsQueryKey } from "@workspace/api-client-react";
import { keepPreviousData } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

// Bar fill colors — CSS custom property references so they re-skin with the
// active theme. chart-1=amber, chart-2=emerald, chart-3=blue, chart-4=violet,
// chart-5=red, chart-6=indigo, chart-7=teal, chart-8=sky
const DAY_NIGHT_COLORS: Record<string, string> = {
  "Day only":    "hsl(var(--chart-8) / 0.7)",
  "Night only":  "hsl(var(--chart-6) / 0.7)",
  "Day + Night": "hsl(var(--chart-4) / 0.7)",
  "Unknown":     "hsl(var(--border))",
};
const AGE_COLORS: Record<string, string> = {
  "Young":   "hsl(var(--chart-4) / 0.8)",
  "Kid":     "hsl(var(--chart-4) / 0.6)",
  "Tween":   "hsl(var(--chart-4) / 0.4)",
  "Unknown": "hsl(var(--border))",
};
const FINDABILITY_COLORS: Record<string, string> = {
  "High":    "hsl(var(--chart-1) / 0.85)",
  "Medium":  "hsl(var(--chart-1) / 0.65)",
  "Low":     "hsl(var(--chart-1) / 0.45)",
  "Unknown": "hsl(var(--border))",
};
const SEASON_COLORS: Record<string, string> = {
  "All":    "hsl(var(--border))",
  "Spring": "hsl(var(--chart-2) / 0.65)",
  "Summer": "hsl(var(--chart-2) / 0.85)",
  "Fall":   "hsl(var(--chart-2) / 0.55)",
  "Winter": "hsl(var(--chart-2) / 0.40)",
};
const REGION_COLORS: Record<string, string> = {
  "All":      "hsl(var(--border))",
  "NE":       "hsl(var(--chart-3) / 0.70)",
  "SE":       "hsl(var(--chart-3) / 0.85)",
  "N Cent":   "hsl(var(--chart-3) / 0.60)",
  "S Cent":   "hsl(var(--chart-3) / 0.55)",
  "NW + AK":  "hsl(var(--chart-8) / 0.65)",
  "SW + HI":  "hsl(var(--chart-8) / 0.50)",
  "Unknown":  "hsl(var(--border))",
};
const SURROUNDINGS_COLORS: Record<string, string> = {
  "All":               "hsl(var(--border))",
  "Rural / Xurban":    "hsl(var(--chart-7) / 0.80)",
  "Suburban / Town":   "hsl(var(--chart-7) / 0.65)",
  "Urban / City":      "hsl(var(--chart-7) / 0.50)",
  "Highway":           "hsl(var(--chart-7) / 0.60)",
  "Coast":             "hsl(var(--chart-8) / 0.50)",
  "Unknown":           "hsl(var(--border))",
};
const BOARD_COLOR = "hsl(var(--chart-6) / 0.65)";

const DAY_NIGHT_ORDER    = ["Day only", "Night only", "Day + Night", "Unknown"];
const AGE_ORDER          = ["Young", "Kid", "Tween", "Unknown"];
const FINDABILITY_ORDER  = ["High", "Medium", "Low", "Unknown"];
const SEASON_ORDER       = ["All", "Spring", "Summer", "Fall", "Winter"];
const REGION_ORDER       = ["All", "NE", "SE", "N Cent", "S Cent", "NW + AK", "SW + HI"];
const SURROUNDINGS_ORDER = ["All", "Rural / Xurban", "Suburban / Town", "Urban / City", "Highway", "Coast"];

/** Thin flat bar — no rounded ends, track is a hairline. */
function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex-1 h-1.5 bg-border/30 overflow-hidden min-w-0">
      <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

/** A single stat row: label · bar · number */
function StatRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="font-mono text-[10.5px] text-muted-foreground truncate" style={{ minWidth: "7rem", maxWidth: "7rem" }}>
        {label}
      </span>
      <Bar value={value} max={max} color={color} />
      <span className="font-mono text-xs font-semibold tabular-nums w-8 text-right shrink-0 text-foreground">
        {value}
      </span>
    </div>
  );
}

/** Flat section — no card chrome, eyebrow heading + hairline, then children. */
function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground pb-2 mb-3 border-b border-border/50">
        {title}
      </p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

/** Completion ring — monochrome track, accent fill as the single positive signal. */
function CompletionArc({ pct }: { pct: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(pct / 100, 1) * circ;
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" className="shrink-0">
      <circle cx="34" cy="34" r={r} fill="none" strokeWidth="5" className="stroke-border/40" />
      <circle
        cx="34" cy="34" r={r} fill="none" strokeWidth="5"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="butt"
        style={{ stroke: "hsl(var(--chart-2) / 0.75)" }}
        className="transition-all duration-700"
        transform="rotate(-90 34 34)"
      />
      <text x="34" y="39" textAnchor="middle" fontSize="13" fontWeight="700" className="fill-foreground font-mono">
        {pct}%
      </text>
    </svg>
  );
}

/** A single display-stat for the KPI strip. */
function KpiStat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="flex flex-col items-end px-4 py-3 min-w-[72px]">
      <span className="font-mono text-[9.5px] tracking-[0.2em] uppercase text-muted-foreground whitespace-nowrap">
        {label}
      </span>
      <span
        className="font-mono text-3xl font-medium tabular-nums leading-none mt-0.5"
        style={{ color: color ?? "hsl(var(--foreground))" }}
      >
        {value}
      </span>
    </div>
  );
}

export default function AnalysisPanel() {
  const { data: stats, isLoading, isError } = useGetWordStats({
    query: { queryKey: getGetWordStatsQueryKey(), placeholderData: keepPreviousData },
  });

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="font-mono text-xs tracking-wide">Loading analysis…</span>
      </div>
    );
  }
  if (!stats) return null;

  const total       = stats.total;
  const complete    = total - stats.incomplete;
  const completePct = total > 0 ? Math.round((complete / total) * 100) : 0;

  const dn  = stats.byDayNight     ?? {};
  const age = stats.byAge          ?? {};
  const fi  = stats.byFindability  ?? {};
  const sea = stats.bySeason       ?? {};
  const reg = stats.byRegion       ?? {};
  const sur = stats.bySurroundings ?? {};
  const brd = stats.byBoard        ?? {};

  const dnMax   = Math.max(...DAY_NIGHT_ORDER.map(k   => dn[k]  ?? 0), 1);
  const ageMax  = Math.max(...AGE_ORDER.map(k          => age[k] ?? 0), 1);
  const fiMax   = Math.max(...FINDABILITY_ORDER.map(k  => fi[k]  ?? 0), 1);
  const seaMax  = Math.max(...SEASON_ORDER.map(k       => sea[k] ?? 0), 1);
  const regMax  = Math.max(...REGION_ORDER.map(k       => reg[k] ?? 0), 1);
  const surMax  = Math.max(...SURROUNDINGS_ORDER.map(k => sur[k] ?? 0), 1);

  const sortedBoards = Object.entries(brd).sort((a, b) => b[1] - a[1]);
  const brdMax       = Math.max(...sortedBoards.map(([, v]) => v), 1);

  return (
    <div className="space-y-5">
      {isError && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border border-border/50 text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500/70 shrink-0" />
          <span className="font-mono text-[10.5px] tracking-wide">Server offline — showing last known data</span>
        </div>
      )}

      {/* ── Main section grid ── */}
      <div className="border border-border">

        {/* Row 1 — 4 sections */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-border/50">

          {/* Completion */}
          <div className="p-4">
            <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground pb-2 mb-3 border-b border-border/50">
              Completion
            </p>
            <div className="flex items-center gap-3">
              <CompletionArc pct={completePct} />
              <div className="flex flex-col gap-1.5 text-xs min-w-0">
                <div className="flex justify-between gap-3">
                  <span className="font-mono text-muted-foreground">Complete</span>
                  <span className="font-mono font-semibold tabular-nums" style={{ color: "hsl(var(--chart-2))" }}>{complete}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="font-mono text-muted-foreground">Missing</span>
                  <span className="font-mono font-semibold tabular-nums" style={{ color: "hsl(var(--chart-5))" }}>{stats.incomplete}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="font-mono text-muted-foreground">Total</span>
                  <span className="font-mono font-semibold tabular-nums">{total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Day / Night */}
          <div className="p-4">
            <Section title="Day / Night">
              {DAY_NIGHT_ORDER.map(k => (
                <StatRow key={k} label={k} value={dn[k] ?? 0} max={dnMax} color={DAY_NIGHT_COLORS[k] ?? "hsl(var(--border))"} />
              ))}
            </Section>
          </div>

          {/* Age */}
          <div className="p-4">
            <Section title="Age Group">
              {AGE_ORDER.map(k => (
                <StatRow key={k} label={k} value={age[k] ?? 0} max={ageMax} color={AGE_COLORS[k] ?? "hsl(var(--border))"} />
              ))}
            </Section>
          </div>

          {/* Findability */}
          <div className="p-4">
            <Section title="Findability">
              {FINDABILITY_ORDER.map(k => (
                <StatRow key={k} label={k} value={fi[k] ?? 0} max={fiMax} color={FINDABILITY_COLORS[k] ?? "hsl(var(--border))"} />
              ))}
            </Section>
          </div>
        </div>

        {/* Row 2 — Seasons + Regions + Surroundings */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-border/50 border-t border-border/50">

          {/* Seasons */}
          <div className="p-4">
            <Section title="Seasons">
              {SEASON_ORDER.map(k => (
                <StatRow key={k} label={k} value={sea[k] ?? 0} max={seaMax} color={SEASON_COLORS[k] ?? "hsl(var(--border))"} />
              ))}
            </Section>
          </div>

          {/* US Regions */}
          <div className="p-4">
            <Section title="US Regions">
              {REGION_ORDER.map(k => (
                <StatRow key={k} label={k} value={reg[k] ?? 0} max={regMax} color={REGION_COLORS[k] ?? "hsl(var(--border))"} />
              ))}
            </Section>
          </div>

          {/* Surroundings — spans 2 cols */}
          <div className="p-4 col-span-2">
            <Section title="Surroundings">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {SURROUNDINGS_ORDER.map(k => (
                  <StatRow key={k} label={k} value={sur[k] ?? 0} max={surMax} color={SURROUNDINGS_COLORS[k] ?? "hsl(var(--border))"} />
                ))}
              </div>
            </Section>
          </div>
        </div>

        {/* Row 3 — Boards full width */}
        <div className="p-4 border-t border-border/50">
          <Section title="Boards">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1.5">
              {sortedBoards.map(([name, count]) => (
                <StatRow key={name} label={name} value={count} max={brdMax} color={BOARD_COLOR} />
              ))}
            </div>
          </Section>
        </div>

      </div>
    </div>
  );
}
