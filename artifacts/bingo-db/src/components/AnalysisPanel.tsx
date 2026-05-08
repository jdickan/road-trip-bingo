import { useGetWordStats } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

// Bar fill colors — pastel mid-tones matching the tag badge palette per category.
// Using 300-level so bars read clearly but don't compete with text.
const DAY_NIGHT_COLORS: Record<string, string> = {
  "Day only":    "bg-sky-400/70",
  "Night only":  "bg-indigo-400/70",
  "Day + Night": "bg-violet-400/70",
  "Unknown":     "bg-border",
};
const AGE_COLORS: Record<string, string> = {
  "Young":   "bg-violet-400/70",
  "Kid":     "bg-violet-300/70",
  "Tween":   "bg-violet-200/70",
  "Unknown": "bg-border",
};
const FINDABILITY_COLORS: Record<string, string> = {
  "High":    "bg-amber-400/80",
  "Medium":  "bg-amber-300/70",
  "Low":     "bg-amber-200/70",
  "Unknown": "bg-border",
};
const SEASON_COLORS: Record<string, string> = {
  "All":    "bg-border",
  "Spring": "bg-emerald-400/70",
  "Summer": "bg-emerald-500/70",
  "Fall":   "bg-emerald-300/70",
  "Winter": "bg-emerald-200/70",
};
const REGION_COLORS: Record<string, string> = {
  "All":      "bg-border",
  "NE":       "bg-blue-400/70",
  "SE":       "bg-blue-500/70",
  "N Cent":   "bg-blue-300/70",
  "S Cent":   "bg-blue-400/60",
  "NW + AK":  "bg-blue-500/60",
  "SW + HI":  "bg-blue-300/60",
  "Unknown":  "bg-border",
};
const SURROUNDINGS_COLORS: Record<string, string> = {
  "All":               "bg-border",
  "Rural / Xurban":    "bg-teal-500/70",
  "Suburban / Town":   "bg-teal-400/70",
  "Urban / City":      "bg-teal-300/70",
  "Highway":           "bg-teal-400/60",
  "Coast":             "bg-teal-300/60",
  "Unknown":           "bg-border",
};
const BOARD_COLOR = "bg-indigo-300/70";

const DAY_NIGHT_ORDER    = ["Day only", "Night only", "Day + Night", "Unknown"];
const AGE_ORDER          = ["Young", "Kid", "Tween", "Unknown"];
const FINDABILITY_ORDER  = ["High", "Medium", "Low", "Unknown"];
const SEASON_ORDER       = ["All", "Spring", "Summer", "Fall", "Winter"];
const REGION_ORDER       = ["All", "NE", "SE", "N Cent", "S Cent", "NW + AK", "SW + HI"];
const SURROUNDINGS_ORDER = ["All", "Rural / Xurban", "Suburban / Town", "Urban / City", "Highway", "Coast"];

/** Thin flat bar — no rounded ends, track is a hairline. */
function Bar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex-1 h-1.5 bg-border/30 overflow-hidden min-w-0">
      <div className={`h-full transition-all duration-500 ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** A single stat row: label · bar · number */
function StatRow({ label, value, max, colorClass }: { label: string; value: number; max: number; colorClass: string }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="font-mono text-[10.5px] text-muted-foreground truncate" style={{ minWidth: "7rem", maxWidth: "7rem" }}>
        {label}
      </span>
      <Bar value={value} max={max} colorClass={colorClass} />
      <span className="font-mono text-[11px] font-semibold tabular-nums w-8 text-right shrink-0 text-foreground">
        {value}
      </span>
    </div>
  );
}

/** Flat section — no card chrome, eyebrow heading + hairline, then children. */
function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground pb-2 mb-3 border-b border-border/50">
        {title}
      </p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

/** Completion ring — monochrome track, emerald fill kept as the single accent. */
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
        className="stroke-emerald-500/70 transition-all duration-700"
        transform="rotate(-90 34 34)"
      />
      <text x="34" y="39" textAnchor="middle" fontSize="13" fontWeight="700" className="fill-foreground font-mono">
        {pct}%
      </text>
    </svg>
  );
}

/** A single display-stat for the KPI strip. */
function KpiStat({ label, value, colorClass }: { label: string; value: number | string; colorClass?: string }) {
  return (
    <div className="flex flex-col items-end px-4 py-3 min-w-[72px]">
      <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground whitespace-nowrap">
        {label}
      </span>
      <span className={`font-mono text-3xl font-bold tabular-nums leading-none mt-0.5 ${colorClass ?? "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

export default function AnalysisPanel() {
  const { data: stats, isLoading } = useGetWordStats();

  if (isLoading) {
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

      {/* ── KPI metrics strip ── */}
      <div className="border border-border flex flex-wrap divide-x divide-border">
        <KpiStat label="Total"      value={total} />
        <KpiStat label="Complete"   value={complete}          colorClass="text-emerald-600 dark:text-emerald-400" />
        <KpiStat label="Incomplete" value={stats.incomplete}  colorClass="text-rose-600 dark:text-rose-400" />
        <div className="border-l border-border/50 mx-0" />
        <KpiStat label="Day Only"   value={dn["Day only"]   ?? 0} colorClass="text-sky-600 dark:text-sky-400" />
        <KpiStat label="Night Only" value={dn["Night only"] ?? 0} colorClass="text-indigo-600 dark:text-indigo-400" />
        <KpiStat label="Day + Night" value={dn["Day + Night"] ?? 0} colorClass="text-violet-600 dark:text-violet-400" />
        <div className="border-l border-border/50 mx-0" />
        <KpiStat label="High Find." value={fi["High"]   ?? 0} colorClass="text-amber-700 dark:text-amber-400" />
        <KpiStat label="Med Find."  value={fi["Medium"] ?? 0} colorClass="text-amber-600 dark:text-amber-400" />
        <KpiStat label="Low Find."  value={fi["Low"]    ?? 0} colorClass="text-amber-500 dark:text-amber-300" />
      </div>

      {/* ── Main section grid ── */}
      <div className="border border-border">

        {/* Row 1 — 4 sections */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-border/50">

          {/* Completion */}
          <div className="p-4">
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground pb-2 mb-3 border-b border-border/50">
              Completion
            </p>
            <div className="flex items-center gap-3">
              <CompletionArc pct={completePct} />
              <div className="flex flex-col gap-1.5 text-[11px] min-w-0">
                <div className="flex justify-between gap-3">
                  <span className="font-mono text-muted-foreground">Complete</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{complete}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="font-mono text-muted-foreground">Missing</span>
                  <span className="font-mono font-semibold text-rose-600 dark:text-rose-400 tabular-nums">{stats.incomplete}</span>
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
                <StatRow key={k} label={k} value={dn[k] ?? 0} max={dnMax} colorClass={DAY_NIGHT_COLORS[k] ?? "bg-border"} />
              ))}
            </Section>
          </div>

          {/* Age */}
          <div className="p-4">
            <Section title="Age Group">
              {AGE_ORDER.map(k => (
                <StatRow key={k} label={k} value={age[k] ?? 0} max={ageMax} colorClass={AGE_COLORS[k] ?? "bg-border"} />
              ))}
            </Section>
          </div>

          {/* Findability */}
          <div className="p-4">
            <Section title="Findability">
              {FINDABILITY_ORDER.map(k => (
                <StatRow key={k} label={k} value={fi[k] ?? 0} max={fiMax} colorClass={FINDABILITY_COLORS[k] ?? "bg-border"} />
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
                <StatRow key={k} label={k} value={sea[k] ?? 0} max={seaMax} colorClass={SEASON_COLORS[k] ?? "bg-border"} />
              ))}
            </Section>
          </div>

          {/* US Regions */}
          <div className="p-4">
            <Section title="US Regions">
              {REGION_ORDER.map(k => (
                <StatRow key={k} label={k} value={reg[k] ?? 0} max={regMax} colorClass={REGION_COLORS[k] ?? "bg-border"} />
              ))}
            </Section>
          </div>

          {/* Surroundings — spans 2 cols */}
          <div className="p-4 col-span-2">
            <Section title="Surroundings">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {SURROUNDINGS_ORDER.map(k => (
                  <StatRow key={k} label={k} value={sur[k] ?? 0} max={surMax} colorClass={SURROUNDINGS_COLORS[k] ?? "bg-border"} />
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
                <StatRow key={name} label={name} value={count} max={brdMax} colorClass={BOARD_COLOR} />
              ))}
            </div>
          </Section>
        </div>

      </div>
    </div>
  );
}
