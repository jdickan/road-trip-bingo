import { useGetWordStats } from "@workspace/api-client-react";

interface StatsSidebarProps {
  onClick?: () => void;
}

export default function StatsSidebar({ onClick }: StatsSidebarProps) {
  const { data: stats, isLoading } = useGetWordStats();

  if (isLoading) {
    return (
      <div className="hidden md:flex items-center gap-5" data-testid="stats-loading">
        <div className="text-right">
          <div className="font-mono text-[9.5px] tracking-[0.2em] uppercase text-muted-foreground/50 mb-0.5">Total</div>
          <div className="h-7 w-12 bg-muted/40 rounded animate-pulse" />
        </div>
        <div className="text-right">
          <div className="font-mono text-[9.5px] tracking-[0.2em] uppercase text-muted-foreground/50 mb-0.5">Incomplete</div>
          <div className="h-7 w-10 bg-muted/40 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <button
      onClick={onClick}
      className={`hidden md:flex items-end gap-5 transition-opacity ${onClick ? "hover:opacity-70 cursor-pointer" : "cursor-default"}`}
      data-testid="stats-container"
    >
      <div className="text-right">
        <div className="font-mono text-[9.5px] tracking-[0.2em] uppercase text-muted-foreground leading-none mb-1">
          Total
        </div>
        <div className="font-mono text-xl font-semibold tabular-nums leading-none text-foreground">
          {stats.total}
        </div>
      </div>

      <div className="text-right">
        <div className="font-mono text-[9.5px] tracking-[0.2em] uppercase text-muted-foreground leading-none mb-1">
          Incomplete
        </div>
        <div className="font-mono text-3xl font-bold tabular-nums leading-none" style={{ color: "hsl(var(--chart-5))" }}>
          {stats.incomplete}
        </div>
      </div>
    </button>
  );
}
