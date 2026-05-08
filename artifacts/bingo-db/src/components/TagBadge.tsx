import { cn } from "@/lib/utils";

// Per-category hue + saturation — drives the .tag-badge CSS utility class
// (defined in index.css) so colors adapt to the active theme skin.
// Atelier collapses all categories to monochrome via a CSS override.
function getCategoryHSL(type: TagBadgeProps["type"]): { h: number; s: string } {
  switch (type) {
    case "findability":  return { h: 35,  s: "85%" };
    case "age":          return { h: 270, s: "70%" };
    case "season":       return { h: 145, s: "65%" };
    case "region":       return { h: 215, s: "85%" };
    case "surroundings": return { h: 175, s: "60%" };
    case "board":        return { h: 245, s: "65%" };
    case "dayNight":     return { h: 200, s: "82%" };
    default:             return { h: 215, s: "20%" };
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

  const { h, s } = getCategoryHSL(type);

  return (
    <span
      className={cn(
        "tag-badge inline-flex items-center font-mono text-[10px] tracking-[0.04em]",
        "px-1.5 py-px border rounded-[3px] whitespace-nowrap",
        getWeightClass(type, value),
        onClick && "cursor-pointer hover:brightness-95 transition-[filter]",
        className
      )}
      style={{ "--_h": String(h), "--_s": s } as React.CSSProperties}
      onClick={onClick}
    >
      {value}
    </span>
  );
}
