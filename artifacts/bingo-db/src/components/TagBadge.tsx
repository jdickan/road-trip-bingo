import { cn } from "@/lib/utils";
import { getTagColor, type TagType } from "@/lib/tagColors";

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
  type: TagType;
  value: string | null;
  className?: string;
  onClick?: () => void;
}

export function TagBadge({ type, value, className, onClick }: TagBadgeProps) {
  if (!value) {
    return (
      <span
        className={cn(
          "inline-flex items-center font-mono text-[10.5px] tracking-[0.04em] text-muted-foreground/30 select-none",
          onClick && "cursor-pointer hover:text-muted-foreground/50 transition-colors",
          className
        )}
        onClick={onClick}
      >
        + add
      </span>
    );
  }

  const { h, s } = getTagColor(type, value);

  return (
    <span
      className={cn(
        "tag-badge inline-flex items-center font-mono text-[10.5px] tracking-[0.04em]",
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
