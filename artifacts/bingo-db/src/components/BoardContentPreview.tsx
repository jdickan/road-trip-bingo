interface PreviewWord {
  id: number;
  word: string;
  emoji: string | null;
}

interface BoardContentPreviewProps {
  preview: PreviewWord[];
  wordCount: number;
}

/**
 * Compact curation preview: a deterministic sample of the words actually
 * grouped into a board. Sparse/empty states stay visible on purpose — that
 * sparseness tells you the board idea needs more content assigned.
 */
export function BoardContentPreview({ preview, wordCount }: BoardContentPreviewProps) {
  if (preview.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 mt-3" aria-label="No words assigned yet">
        {[...Array(4)].map((_, i) => (
          <span
            key={i}
            className="h-6 w-14 border border-dashed border-border/60 rounded-sm"
            aria-hidden="true"
          />
        ))}
        <span className="font-mono text-[10.5px] tracking-wide text-muted-foreground/60 ml-1">
          no words yet
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-3">
      {preview.map((w) => (
        <span
          key={w.id}
          className="inline-flex items-center gap-1 border border-border/60 bg-muted/30 px-2 py-0.5 text-xs text-foreground/80 rounded-sm whitespace-nowrap"
        >
          {w.emoji && <span aria-hidden="true">{w.emoji}</span>}
          <span>{w.word}</span>
        </span>
      ))}
      {wordCount > preview.length && (
        <span className="font-mono text-[10.5px] tracking-wide text-muted-foreground ml-0.5 tabular-nums">
          +{wordCount - preview.length} more
        </span>
      )}
    </div>
  );
}
