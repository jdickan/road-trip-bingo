import { useGetWordStats, getGetWordStatsQueryKey } from "@workspace/api-client-react";
import { keepPreviousData } from "@tanstack/react-query";
import { useMemo } from "react";
import { BarChart2 } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { getTagColor, isSubduedValue, type TagType } from "@/lib/tagColors";

const DAY_NIGHT_ORDER    = ["Day only", "Night only", "Day + Night", "Unknown"];
const AGE_ORDER          = ["Young", "Kid", "Tween", "Unknown"];
const FINDABILITY_ORDER  = ["High", "Medium", "Low", "Unknown"];
const SEASON_ORDER       = ["All", "Spring", "Summer", "Fall", "Winter"];
const REGION_ORDER       = ["All", "NE", "SE", "N Cent", "S Cent", "NW + AK", "SW + HI"];
const SURROUNDINGS_ORDER = ["All", "Rural / Xurban", "Suburban / Town", "Urban / City", "Highway", "Coast"];

/** Thin flat bar — no rounded ends, track is a hairline.
 *  tagColor drives --_bar-h / --_bar-s CSS vars consumed by .analysis-bar-fill
 *  in index.css, keeping Atelier skin monochrome override working. */
function Bar({ value, max, tagColor }: { value: number; max: number; tagColor: { h: number; s: string } | null }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  const fillStyle: React.CSSProperties = {
    width: `${pct}%`,
    ...(tagColor ? { "--_bar-h": String(tagColor.h), "--_bar-s": tagColor.s } as React.CSSProperties : {}),
  };
  return (
    <div className="flex-1 h-1.5 bg-border/30 overflow-hidden min-w-0">
      <div
        className={`h-full transition-all duration-500 analysis-bar-fill${tagColor === null ? " analysis-bar-subdued" : ""}`}
        style={fillStyle}
      />
    </div>
  );
}

/** A single stat row: label · bar · number */
function StatRow({ label, value, max, tagColor }: { label: string; value: number; max: number; tagColor: { h: number; s: string } | null }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="font-mono text-[10.5px] text-muted-foreground truncate" style={{ minWidth: "7rem", maxWidth: "7rem" }}>
        {label}
      </span>
      <Bar value={value} max={max} tagColor={tagColor} />
      <span className="font-mono text-xs font-semibold tabular-nums w-8 text-right shrink-0 text-foreground">
        {value}
      </span>
    </div>
  );
}

function tagColor(type: TagType, value: string): { h: number; s: string } | null {
  return isSubduedValue(value) ? null : getTagColor(type, value);
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
        style={{ stroke: "hsl(var(--primary) / 0.85)" }}
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

interface AnalysisPanelProps {
  onGoToWords?: () => void;
}

export default function AnalysisPanel({ onGoToWords }: AnalysisPanelProps = {}) {
  const { data: stats, isLoading, isError } = useGetWordStats({
    query: { queryKey: getGetWordStatsQueryKey(), placeholderData: keepPreviousData },
  });

  const derived = useMemo(() => {
    const dn  = stats?.byDayNight     ?? {};
    const age = stats?.byAge          ?? {};
    const fi  = stats?.byFindability  ?? {};
    const sea = stats?.bySeason       ?? {};
    const reg = stats?.byRegion       ?? {};
    const sur = stats?.bySurroundings ?? {};
    const brd = stats?.byBoard        ?? {};

    const dnMax  = Math.max(...DAY_NIGHT_ORDER.map(k    => dn[k]  ?? 0), 1);
    const ageMax = Math.max(...AGE_ORDER.map(k           => age[k] ?? 0), 1);
    const fiMax  = Math.max(...FINDABILITY_ORDER.map(k   => fi[k]  ?? 0), 1);
    const seaMax = Math.max(...SEASON_ORDER.map(k        => sea[k] ?? 0), 1);
    const regMax = Math.max(...REGION_ORDER.map(k        => reg[k] ?? 0), 1);
    const surMax = Math.max(...SURROUNDINGS_ORDER.map(k  => sur[k] ?? 0), 1);

    const sortedBoards = Object.entries(brd).sort((a, b) => b[1] - a[1]);
    const brdMax       = Math.max(...sortedBoards.map(([, v]) => v), 1);

    return { dn, age, fi, sea, reg, sur, dnMax, ageMax, fiMax, seaMax, regMax, surMax, sortedBoards, brdMax };
  }, [stats]);

  if (isLoading && !stats) {
    return (
      <div className="space-y-5 animate-pulse">
        {/* KPI strip skeleton */}
        <div className="flex border border-border divide-x divide-border">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex flex-col items-end px-4 py-3 min-w-[72px] gap-1.5">
              <div className="h-2 w-10 bg-muted/50 rounded-sm" />
              <div className="h-7 w-12 bg-muted/50 rounded-sm" />
            </div>
          ))}
        </div>
        {/* Card grid skeleton */}
        <div className="border border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-border/50">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 space-y-3">
                <div className="h-2 w-20 bg-muted/50 rounded-sm" />
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex items-center gap-2.5">
                    <div className="h-2.5 w-28 bg-muted/40 rounded-sm shrink-0" />
                    <div className="flex-1 h-1.5 bg-muted/30 rounded-sm" />
                    <div className="h-2.5 w-6 bg-muted/40 rounded-sm" />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-border/50 border-t border-border/50">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`p-4 space-y-3 ${i === 3 ? "col-span-2" : ""}`}>
                <div className="h-2 w-20 bg-muted/50 rounded-sm" />
                {[...Array(i === 3 ? 3 : 4)].map((_, j) => (
                  <div key={j} className="flex items-center gap-2.5">
                    <div className="h-2.5 w-28 bg-muted/40 rounded-sm shrink-0" />
                    <div className="flex-1 h-1.5 bg-muted/30 rounded-sm" />
                    <div className="h-2.5 w-6 bg-muted/40 rounded-sm" />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-border/50 space-y-3">
            <div className="h-2 w-16 bg-muted/50 rounded-sm" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="h-2.5 w-20 bg-muted/40 rounded-sm shrink-0" />
                  <div className="flex-1 h-1.5 bg-muted/30 rounded-sm" />
                  <div className="h-2.5 w-6 bg-muted/40 rounded-sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!stats) return null;

  if (stats.total === 0) {
    return (
      <EmptyState
        icon={<BarChart2 className="h-12 w-12 text-muted-foreground/25" />}
        headline="No data yet"
        body="Stats and charts appear once words are added to the database."
      >
        {onGoToWords && (
          <button
            onClick={onGoToWords}
            className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] uppercase border border-border px-4 py-2 hover:bg-muted/40 transition-colors"
          >
            Go to Words →
          </button>
        )}
      </EmptyState>
    );
  }

  const total       = stats.total;
  const complete    = total - stats.incomplete;
  const completePct = total > 0 ? Math.round((complete / total) * 100) : 0;

  const { dn, age, fi, sea, reg, sur, dnMax, ageMax, fiMax, seaMax, regMax, surMax, sortedBoards, brdMax } = derived;

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
                  <span className="font-mono font-semibold tabular-nums" style={{ color: "hsl(var(--primary))" }}>{complete}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="font-mono text-muted-foreground">Incomplete</span>
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
                <StatRow key={k} label={k} value={dn[k] ?? 0} max={dnMax} tagColor={tagColor("dayNight", k)} />
              ))}
            </Section>
          </div>

          {/* Age */}
          <div className="p-4">
            <Section title="Age Group">
              {AGE_ORDER.map(k => (
                <StatRow key={k} label={k} value={age[k] ?? 0} max={ageMax} tagColor={tagColor("age", k)} />
              ))}
            </Section>
          </div>

          {/* Findability */}
          <div className="p-4">
            <Section title="Findability">
              {FINDABILITY_ORDER.map(k => (
                <StatRow key={k} label={k} value={fi[k] ?? 0} max={fiMax} tagColor={tagColor("findability", k)} />
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
                <StatRow key={k} label={k} value={sea[k] ?? 0} max={seaMax} tagColor={tagColor("season", k)} />
              ))}
            </Section>
          </div>

          {/* US Regions */}
          <div className="p-4">
            <Section title="US Regions">
              {REGION_ORDER.map(k => (
                <StatRow key={k} label={k} value={reg[k] ?? 0} max={regMax} tagColor={tagColor("region", k)} />
              ))}
            </Section>
          </div>

          {/* Surroundings — spans 2 cols */}
          <div className="p-4 col-span-2">
            <Section title="Surroundings">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {SURROUNDINGS_ORDER.map(k => (
                  <StatRow key={k} label={k} value={sur[k] ?? 0} max={surMax} tagColor={tagColor("surroundings", k)} />
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
                <StatRow key={name} label={name} value={count} max={brdMax} tagColor={tagColor("board", name)} />
              ))}
            </div>
          </Section>
        </div>

      </div>
    </div>
  );
}
