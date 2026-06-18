import { useQueryClient } from "@tanstack/react-query";
import {
  useListDeletedWords,
  useRestoreWord,
  usePurgeDeletedWords,
  useBulkRestoreWords,
  getListDeletedWordsQueryKey,
  getListWordsQueryKey,
} from "@workspace/api-client-react";
import { RotateCcw, Trash2, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DeletedWordsPanelProps {
  onEmpty: () => void;
}

function formatDeletedDate(raw: string | null): string {
  if (!raw) return "—";
  const d = new Date(raw);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function DeletedWordsPanel({ onEmpty }: DeletedWordsPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  // ── Select mode ─────────────────────────────────────────────────────────────
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data, isLoading } = useListDeletedWords({
    query: { queryKey: getListDeletedWordsQueryKey() },
  });

  const words = data?.words ?? [];
  const total = data?.total ?? 0;

  const restoreMutation = useRestoreWord({
    mutation: {
      onSuccess: (restored) => {
        setRestoringId(null);
        queryClient.invalidateQueries({ queryKey: getListWordsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
        queryClient.invalidateQueries({ queryKey: getListDeletedWordsQueryKey() });
        toast({ title: `"${restored.word}" restored` });
      },
      onError: () => {
        setRestoringId(null);
        toast({ title: "Couldn't restore word", variant: "destructive" });
      },
    },
  });

  const bulkRestoreMutation = useBulkRestoreWords();

  const purgeMutation = usePurgeDeletedWords({
    mutation: {
      onSuccess: () => {
        setConfirmPurge(false);
        queryClient.invalidateQueries({ queryKey: getListWordsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
        queryClient.invalidateQueries({ queryKey: getListDeletedWordsQueryKey() });
        toast({ title: `${total} word${total === 1 ? "" : "s"} permanently deleted` });
        onEmpty();
      },
      onError: () => {
        setConfirmPurge(false);
        toast({ title: "Couldn't purge words", variant: "destructive" });
      },
    },
  });

  function handleRestore(id: number) {
    setRestoringId(id);
    restoreMutation.mutate({ id });
  }

  function handlePurge() {
    purgeMutation.mutate();
  }

  function toggleRowSelect(id: number) {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  const allSelected = words.length > 0 && words.every(w => selectedIds.has(w.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(words.map(w => w.id)));
    }
  }

  function handleBulkRestore() {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    bulkRestoreMutation.mutate(
      { data: { ids } },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListWordsQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
          queryClient.invalidateQueries({ queryKey: getListDeletedWordsQueryKey() });
          toast({ title: `${result.count} word${result.count === 1 ? "" : "s"} restored` });
          setSelectedIds(new Set());
          setSelectMode(false);
          if (result.count === total) onEmpty();
        },
        onError: () => toast({ title: "Couldn't restore words", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-16">

      {/* ── Page header ── */}
      <div className="border-b border-border py-8">
        <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground mb-2">
          Soft-deleted · Restore or purge
        </p>
        <h2 className="text-3xl md:text-4xl font-editorial italic text-foreground leading-tight">
          Trash
          {!isLoading && total > 0 && (
            <span className="ml-3 font-mono text-xl not-italic text-muted-foreground/50 tabular-nums">
              {total}
            </span>
          )}
        </h2>
      </div>

      {/* ── Word rows ── */}
      <div className="divide-y divide-border/50">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-5 py-4 animate-pulse">
              <div className="w-8 h-5 rounded bg-muted" />
              <div className="h-4 w-48 rounded bg-muted" />
              <div className="ml-auto h-3 w-24 rounded bg-muted" />
            </div>
          ))
        ) : words.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground/50 font-mono tracking-wider uppercase">
            Nothing in trash
          </div>
        ) : (
          words.map((word) => (
            <div
              key={word.id}
              className={cn(
                "group/row flex items-center gap-4 py-4 -mx-4 px-4 hover:bg-muted/20 transition-colors",
                selectMode && selectedIds.has(word.id) && "bg-muted/30"
              )}
            >
              {/* Checkbox — visible in select mode */}
              {selectMode && (
                <label className="relative cursor-pointer flex items-center justify-center shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(word.id)}
                    onChange={() => toggleRowSelect(word.id)}
                    aria-label={`Select "${word.word}"`}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      "h-[14px] w-[14px] border flex-none flex items-center justify-center transition-colors",
                      selectedIds.has(word.id) ? "bg-foreground border-foreground" : "border-border bg-background hover:border-foreground/40"
                    )}
                  >
                    {selectedIds.has(word.id) && <Check className="h-2.5 w-2.5 text-background" strokeWidth={3} />}
                  </div>
                </label>
              )}

              {/* Emoji */}
              <span className="text-lg w-7 shrink-0 text-center leading-none">
                {word.emoji ?? "·"}
              </span>

              {/* Word + Spanish */}
              <div className="flex-1 min-w-0">
                <span className="font-editorial italic text-xl text-foreground leading-tight">
                  {word.word}
                </span>
                {word.spanish && (
                  <span className="ml-2 font-mono text-[10.5px] text-muted-foreground/50">
                    {word.spanish}
                  </span>
                )}
              </div>

              {/* Deleted date */}
              <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted-foreground/50 shrink-0">
                {formatDeletedDate(word.deletedAt)}
              </span>

              {/* Restore button — hover-reveal, hidden in select mode */}
              {!selectMode && (
                <button
                  onClick={() => handleRestore(word.id)}
                  disabled={restoringId === word.id}
                  aria-label={`Restore "${word.word}"`}
                  className="flex items-center gap-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity px-2.5 py-1.5 font-mono text-[10.5px] tracking-[0.12em] uppercase border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restore
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Select mode footer ── */}
      {!isLoading && words.length > 0 && (
        <div className="mt-4 border-t border-border/50">

          {/* Action strip */}
          {selectMode && selectedIds.size > 0 && (
            <div className="flex items-center justify-between px-0 py-2 border-b border-border/50">
              <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted-foreground tabular-nums">
                {selectedIds.size} selected
              </span>
              <button
                onClick={handleBulkRestore}
                disabled={bulkRestoreMutation.isPending}
                className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.18em] uppercase border border-border px-3 py-1 hover:bg-muted/40 transition-colors disabled:opacity-40"
              >
                <RotateCcw className="h-3 w-3" />
                {bulkRestoreMutation.isPending ? "Restoring…" : "Restore selected"}
              </button>
            </div>
          )}

          {/* SELECT/CANCEL + select-all link */}
          <div className="flex items-center gap-4 py-2">
            <button
              onClick={() => { setSelectMode(m => !m); setSelectedIds(new Set()); }}
              className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border"
            >
              {selectMode ? "Cancel" : "Select"}
            </button>
            {selectMode && words.length > 1 && (
              <button
                onClick={toggleSelectAll}
                className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            )}
          </div>

        </div>
      )}

      {/* ── Bottom purge section ── */}
      {total > 0 && (
        <div className="mt-6 border border-border p-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Words in trash are hidden from the main table but still exist in the database.
            Purging removes them permanently and cannot be undone.
          </p>
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground/50">
              {total} word{total === 1 ? "" : "s"} waiting to be purged
            </p>
            {confirmPurge ? (
              <div className="flex items-center gap-3">
                <span className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground/50">
                  Sure?
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs px-3 rounded-none"
                  onClick={handlePurge}
                  disabled={purgeMutation.isPending}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Purge {total} word{total === 1 ? "" : "s"}
                </Button>
                <button
                  onClick={() => setConfirmPurge(false)}
                  className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmPurge(true)}
                className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border shrink-0"
              >
                Purge all
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
