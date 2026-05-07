import { useGetWordStats } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsSidebarProps {
  onClick?: () => void;
}

export default function StatsSidebar({ onClick }: StatsSidebarProps) {
  const { data: stats, isLoading } = useGetWordStats();

  if (isLoading) {
    return (
      <div className="hidden md:flex items-center gap-4" data-testid="stats-loading">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <button
      onClick={onClick}
      className={`hidden md:flex items-center gap-4 text-sm rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors ${onClick ? "hover:bg-muted/60 cursor-pointer" : "cursor-default"}`}
      data-testid="stats-container"
    >
      <div className="flex flex-col items-end">
        <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Total</span>
        <span className="font-mono font-bold">{stats.total}</span>
      </div>

      <div className="h-8 w-px bg-border" />

      <div className="flex flex-col items-end">
        <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Incomplete</span>
        <span className="font-mono font-bold text-destructive">{stats.incomplete}</span>
      </div>
    </button>
  );
}
