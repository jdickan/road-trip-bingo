import { useGetWordStats } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

const DAY_NIGHT_COLORS: Record<string, string> = {
  "Day only":    "bg-amber-400",
  "Night only":  "bg-indigo-500",
  "Day + Night": "bg-violet-500",
  "Unknown":     "bg-slate-400",
};

const AGE_COLORS: Record<string, string> = {
  "Young":   "bg-sky-400",
  "Kid":     "bg-violet-500",
  "Tween":   "bg-fuchsia-500",
  "Unknown": "bg-slate-400",
};

const FINDABILITY_COLORS: Record<string, string> = {
  "High":    "bg-emerald-500",
  "Medium":  "bg-amber-400",
  "Low":     "bg-rose-500",
  "Unknown": "bg-slate-400",
};

const SEASON_COLORS: Record<string, string> = {
  "All":    "bg-slate-400",
  "Spring": "bg-green-500",
  "Summer": "bg-orange-400",
  "Fall":   "bg-amber-500",
  "Winter": "bg-blue-500",
};

const REGION_COLORS: Record<string, string> = {
  "All":      "bg-slate-400",
  "NE":       "bg-blue-500",
  "SE":       "bg-teal-500",
  "N Cent":   "bg-sky-500",
  "S Cent":   "bg-orange-500",
  "NW + AK":  "bg-violet-500",
  "SW + HI":  "bg-pink-500",
  "Unknown":  "bg-slate-400",
};

const SURROUNDINGS_COLORS: Record<string, string> = {
  "All":               "bg-slate-400",
  "Rural / Xurban":    "bg-green-600",
  "Suburban / Town":   "bg-teal-500",
  "Urban / City":      "bg-blue-500",
  "Highway":           "bg-amber-500",
  "Coast":             "bg-cyan-500",
  "Unknown":           "bg-slate-400",
};

const BOARD_COLOR = "bg-primary/70";

const DAY_NIGHT_ORDER   = ["Day only", "Night only", "Day + Night", "Unknown"];
const AGE_ORDER         = ["Young", "Kid", "Tween", "Unknown"];
const FINDABILITY_ORDER = ["High", "Medium", "Low", "Unknown"];
const SEASON_ORDER      = ["All", "Spring", "Summer", "Fall", "Winter"];
const REGION_ORDER      = ["All", "NE", "SE", "N Cent", "S Cent", "NW + AK", "SW + HI"];
const SURROUNDINGS_ORDER= ["All", "Rural / Xurban", "Suburban / Town", "Urban / City", "Highway", "Coast"];

function Bar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex-1 bg-muted/50 rounded-full h-1.5 overflow-hidden min-w-0">
      <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatRow({
  label, value, max, colorClass,
}: { label: string; value: number; max: number; colorClass: string }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="text-[11px] text-muted-foreground truncate" style={{ minWidth: "7rem", maxWidth: "7rem" }}>{label}</span>
      <Bar value={value} max={max} colorClass={colorClass} />
      <span className="text-xs font-mono font-bold tabular-nums w-8 text-right shrink-0">{value}</span>
    </div>
  );
}

function Card({
  title, accentClass, children, className = "",
}: { title: string; accentClass: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border rounded-xl p-4 flex flex-col gap-3 shadow-sm ${className}`}>
      <p className={`text-[10px] font-black uppercase tracking-[0.15em] ${accentClass}`}>{title}</p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function CompletionArc({ pct }: { pct: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(pct / 100, 1) * circ;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="shrink-0">
      <circle cx="38" cy="38" r={r} fill="none" strokeWidth="7" className="stroke-muted/30" />
      <circle
        cx="38" cy="38" r={r} fill="none" strokeWidth="7"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        className="stroke-emerald-500 transition-all duration-700"
        transform="rotate(-90 38 38)"
      />
      <text x="38" y="43" textAnchor="middle" fontSize="14" fontWeight="800" className="fill-foreground font-mono">
        {pct}%
      </text>
    </svg>
  );
}

function KpiPill({ label, value, colorClass }: { label: string; value: number | string; colorClass?: string }) {
  return (
    <div className="flex flex-col items-center justify-center bg-card border rounded-lg px-4 py-2.5 gap-0.5 min-w-[80px]">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={`text-2xl font-black font-mono tabular-nums leading-none ${colorClass ?? "text-foreground"}`}>{value}</span>
    </div>
  );
}

export default function AnalysisPanel() {
  const { data: stats, isLoading } = useGetWordStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading analysis…
      </div>
    );
  }
  if (!stats) return null;

  const total = stats.total;
  const completePct = total > 0 ? Math.round(((total - stats.incomplete) / total) * 100) : 0;

  const dn  = stats.byDayNight       ?? {};
  const age = stats.byAge            ?? {};
  const fi  = stats.byFindability    ?? {};
  const sea = stats.bySeason         ?? {};
  const reg = stats.byRegion         ?? {};
  const sur = stats.bySurroundings   ?? {};
  const brd = stats.byBoard          ?? {};

  const dnMax  = Math.max(...DAY_NIGHT_ORDER.map(k => dn[k] ?? 0), 1);
  const ageMax = Math.max(...AGE_ORDER.map(k => age[k] ?? 0), 1);
  const fiMax  = Math.max(...FINDABILITY_ORDER.map(k => fi[k] ?? 0), 1);
  const seaMax = Math.max(...SEASON_ORDER.map(k => sea[k] ?? 0), 1);
  const regMax = Math.max(...REGION_ORDER.map(k => reg[k] ?? 0), 1);
  const surMax = Math.max(...SURROUNDINGS_ORDER.map(k => sur[k] ?? 0), 1);

  const sortedBoards = Object.entries(brd).sort((a, b) => b[1] - a[1]);
  const brdMax = Math.max(...sortedBoards.map(([, v]) => v), 1);

  return (
    <div className="space-y-4">

      {/* ── KPI strip ── */}
      <div className="flex flex-wrap gap-2">
        <KpiPill label="Total Words" value={total} />
        <KpiPill label="Complete"    value={total - stats.incomplete} colorClass="text-emerald-600 dark:text-emerald-400" />
        <KpiPill label="Incomplete"  value={stats.incomplete}          colorClass="text-rose-600 dark:text-rose-400" />
        <KpiPill label="Day Only"    value={dn["Day only"] ?? 0}        colorClass="text-amber-600 dark:text-amber-400" />
        <KpiPill label="Night Only"  value={dn["Night only"] ?? 0}      colorClass="text-indigo-600 dark:text-indigo-400" />
        <KpiPill label="Day + Night" value={dn["Day + Night"] ?? 0}     colorClass="text-violet-600 dark:text-violet-400" />
        <KpiPill label="High Find."  value={fi["High"] ?? 0}            colorClass="text-emerald-600 dark:text-emerald-400" />
        <KpiPill label="Med Find."   value={fi["Medium"] ?? 0}          colorClass="text-amber-600 dark:text-amber-400" />
        <KpiPill label="Low Find."   value={fi["Low"] ?? 0}             colorClass="text-rose-600 dark:text-rose-400" />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        {/* Completion arc card */}
        <Card title="Completion" accentClass="text-emerald-600 dark:text-emerald-400">
          <div className="flex items-center gap-3">
            <CompletionArc pct={completePct} />
            <div className="flex flex-col gap-1 text-xs min-w-0">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Complete</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{total - stats.incomplete}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Missing</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{stats.incomplete}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Total</span>
                <span className="font-mono font-bold">{total}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Day / Night */}
        <Card title="Day / Night" accentClass="text-violet-600 dark:text-violet-400">
          {DAY_NIGHT_ORDER.map(k => (
            <StatRow key={k} label={k} value={dn[k] ?? 0} max={dnMax} colorClass={DAY_NIGHT_COLORS[k] ?? "bg-slate-400"} />
          ))}
        </Card>

        {/* Age */}
        <Card title="Age Group" accentClass="text-fuchsia-600 dark:text-fuchsia-400">
          {AGE_ORDER.map(k => (
            <StatRow key={k} label={k} value={age[k] ?? 0} max={ageMax} colorClass={AGE_COLORS[k] ?? "bg-slate-400"} />
          ))}
        </Card>

        {/* Findability */}
        <Card title="Findability" accentClass="text-emerald-600 dark:text-emerald-400">
          {FINDABILITY_ORDER.map(k => (
            <StatRow key={k} label={k} value={fi[k] ?? 0} max={fiMax} colorClass={FINDABILITY_COLORS[k] ?? "bg-slate-400"} />
          ))}
        </Card>

        {/* Seasons */}
        <Card title="Seasons" accentClass="text-green-600 dark:text-green-400">
          {SEASON_ORDER.map(k => (
            <StatRow key={k} label={k} value={sea[k] ?? 0} max={seaMax} colorClass={SEASON_COLORS[k] ?? "bg-slate-400"} />
          ))}
        </Card>

        {/* Regions */}
        <Card title="US Regions" accentClass="text-blue-600 dark:text-blue-400">
          {REGION_ORDER.map(k => (
            <StatRow key={k} label={k} value={reg[k] ?? 0} max={regMax} colorClass={REGION_COLORS[k] ?? "bg-slate-400"} />
          ))}
        </Card>

        {/* Surroundings — 2 col */}
        <Card title="Surroundings" accentClass="text-teal-600 dark:text-teal-400" className="col-span-2">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {SURROUNDINGS_ORDER.map(k => (
              <StatRow key={k} label={k} value={sur[k] ?? 0} max={surMax} colorClass={SURROUNDINGS_COLORS[k] ?? "bg-slate-400"} />
            ))}
          </div>
        </Card>

        {/* Boards — full width */}
        <Card title="Boards" accentClass="text-primary" className="col-span-2 md:col-span-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1.5">
            {sortedBoards.map(([name, count]) => (
              <StatRow key={name} label={name} value={count} max={brdMax} colorClass={BOARD_COLOR} />
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}
