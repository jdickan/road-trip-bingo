import { cn } from "@/lib/utils";

// Ink-scale weight classes — no color fills, differentiate by weight only.
// Findability and Age use weight contrast (semibold → regular → muted) to
// signal priority without introducing a second accent color.

function getWeightClass(type: string, value: string | null): string {
  if (!value) return "";

  if (type === "findability") {
    switch (value.toLowerCase()) {
      case "high":   return "font-semibold text-foreground";
      case "medium": return "font-medium text-foreground/80";
      case "low":    return "font-normal text-muted-foreground";
    }
  }

  if (type === "age") {
    switch (value.toLowerCase()) {
      case "young":  return "font-semibold text-foreground";
      case "kid":    return "font-medium text-foreground/80";
      case "tween":  return "font-normal text-muted-foreground";
    }
  }

  if (value === "All") return "font-normal text-muted-foreground/60";

  return "font-medium text-foreground";
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
        "px-1.5 py-px border border-border/50 rounded-[3px] bg-muted/25 whitespace-nowrap",
        getWeightClass(type, value),
        onClick && "cursor-pointer hover:bg-muted/50 transition-colors",
        className
      )}
      onClick={onClick}
    >
      {value}
    </span>
  );
}

