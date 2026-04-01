import { useState } from "react";
import { useGetWordStats } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function StatsSidebar() {
  const { data: stats, isLoading } = useGetWordStats();

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 hidden md:flex" data-testid="stats-loading">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="flex items-center gap-4 text-sm hidden md:flex" data-testid="stats-container">
      <div className="flex flex-col items-end">
        <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Total</span>
        <span className="font-mono font-bold">{stats.total}</span>
      </div>
      
      <div className="h-8 w-px bg-border"></div>
      
      <div className="flex flex-col items-end">
        <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Incomplete</span>
        <span className="font-mono font-bold text-destructive">{stats.incomplete}</span>
      </div>

      <div className="h-8 w-px bg-border"></div>
      
      <div className="flex gap-2 items-center">
        <div className="flex flex-col items-center">
          <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">High</span>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 font-mono">
            {stats.byFindability?.["High"] || 0}
          </Badge>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Med</span>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 font-mono">
            {stats.byFindability?.["Medium"] || 0}
          </Badge>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Low</span>
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 font-mono">
            {stats.byFindability?.["Low"] || 0}
          </Badge>
        </div>
      </div>
    </div>
  );
}
