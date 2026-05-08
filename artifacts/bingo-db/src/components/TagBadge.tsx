import { cn } from "@/lib/utils";

// Per-type pastel backgrounds — each tag category gets its own hue,
// kept soft enough not to fight the text. Findability and Age also get
// weight contrast (semibold / medium / normal) so priority still scans fast.

function getTypeColors(type: TagBadgeProps["type"]): string {
  switch (type) {
    case "findability":  return "bg-amber-50   border-amber-200   text-amber-900   dark:bg-amber-950/30  dark:border-amber-800/40  dark:text-amber-300";
    case "age":          return "bg-violet-50  border-violet-200  text-violet-900  dark:bg-violet-950/30 dark:border-violet-800/40 dark:text-violet-300";
    case "season":       return "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800/40 dark:text-emerald-300";
    case "region":       return "bg-blue-50    border-blue-200    text-blue-900    dark:bg-blue-950/30   dark:border-blue-800/40   dark:text-blue-300";
    case "surroundings": return "bg-teal-50    border-teal-200    text-teal-900    dark:bg-teal-950/30   dark:border-teal-800/40   dark:text-teal-300";
    case "board":        return "bg-indigo-50  border-indigo-200  text-indigo-900  dark:bg-indigo-950/30 dark:border-indigo-800/40 dark:text-indigo-300";
    case "dayNight":     return "bg-sky-50     border-sky-200     text-sky-900     dark:bg-sky-950/30    dark:border-sky-800/40    dark:text-sky-300";
    default:             return "bg-muted/25   border-border/50   text-foreground";
  }
}

// Weight contrast for priority fields — layered on top of the hue.
function getWeightClass(type: string, value: string): string {
  if (type === "findability") {
    switch (value.toLowerCase()) {
      case "high":   return "font-semibold";
      case "medium": return "font-medium";
      case "low":    return "font-normal opacity-70";
    }
  }
  if (type === "age") {
    switch (value.toLowerCase()) {
      case "young": return "font-semibold";
      case "kid":   return "font-medium";
      case "tween": return "font-normal opacity-70";
    }
  }
  if (value === "All") return "font-normal opacity-50";
  return "font-medium";
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
      <span
        className={cn(
          "inline-flex items-center font-mono text-[10px] tracking-[0.04em] text-muted-foreground/35 select-none",
          onClick && "cursor-pointer hover:text-muted-foreground/60 transition-colors",
          className
        )}
        onClick={onClick}
      >
        + add
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center font-mono text-[10px] tracking-[0.04em]",
        "px-1.5 py-px border rounded-[3px] whitespace-nowrap",
        getTypeColors(type),
        getWeightClass(type, value),
        onClick && "cursor-pointer hover:brightness-95 transition-[filter]",
        className
      )}
      onClick={onClick}
    >
      {value}
    </span>
  );
}
