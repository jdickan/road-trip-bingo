import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function getFindabilityColors(value: string | null) {
  if (!value) return "bg-muted text-muted-foreground";
  switch (value.toLowerCase()) {
    case "high": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "medium": return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    case "low": return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800";
    default: return "bg-secondary text-secondary-foreground";
  }
}

export function getAgeColors(value: string | null) {
  if (!value) return "bg-muted text-muted-foreground";
  switch (value.toLowerCase()) {
    case "young": return "bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300 border-lime-200 dark:border-lime-800";
    case "kid": return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800";
    case "tween": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
    default: return "bg-secondary text-secondary-foreground";
  }
}

export function getSeasonColors(value: string) {
  switch (value.toLowerCase()) {
    case "spring": return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800";
    case "summer": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
    case "fall": return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800";
    case "winter": return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    default: return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
  }
}

export function getGenericColors(type: string, value: string) {
  if (value === "All") return "bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  
  if (type === "region") return "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border-sky-100 dark:border-sky-900/50";
  if (type === "surroundings") return "bg-stone-100 text-stone-700 dark:bg-stone-900/50 dark:text-stone-300 border-stone-200 dark:border-stone-800";
  if (type === "board") return "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-100 dark:border-violet-900/50";
  if (type === "dayNight") {
    if (value === "Day") return "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-100 dark:border-yellow-900/50";
    if (value === "Night") return "bg-indigo-950 text-indigo-200 dark:bg-indigo-950 dark:text-indigo-200 border-indigo-900";
  }
  
  return "bg-secondary text-secondary-foreground border-transparent";
}

interface TagBadgeProps {
  type: "findability" | "age" | "season" | "region" | "surroundings" | "board" | "dayNight";
  value: string | null;
  className?: string;
  onClick?: () => void;
}

export function TagBadge({ type, value, className, onClick }: TagBadgeProps) {
  if (!value) {
    return (
      <Badge 
        variant="outline" 
        className={cn("bg-muted/50 text-muted-foreground/50 border-dashed hover:bg-muted/80 cursor-pointer font-normal", className)}
        onClick={onClick}
      >
        + Add
      </Badge>
    );
  }

  let colorClass = "";
  if (type === "findability") colorClass = getFindabilityColors(value);
  else if (type === "age") colorClass = getAgeColors(value);
  else if (type === "season") colorClass = getSeasonColors(value);
  else colorClass = getGenericColors(type, value);

  return (
    <Badge 
      variant="outline" 
      className={cn("font-medium whitespace-nowrap", colorClass, onClick && "cursor-pointer hover:opacity-80 transition-opacity", className)}
      onClick={onClick}
    >
      {value}
    </Badge>
  );
}
