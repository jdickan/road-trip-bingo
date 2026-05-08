import { useState, useEffect } from "react";
import {
  Word,
  ListWordsParams,
  useListWords,
  useCreateWord,
  useDeleteWord,
  getListWordsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, ArrowRight, ArrowLeft, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CellEditor } from "./CellEditor";
import { REGIONS, SURROUNDINGS, AGES, FINDABILITY, SEASONS, BOARDS, DAY_NIGHT } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface WordTableProps {
  filters: ListWordsParams;
  setFilters?: React.Dispatch<React.SetStateAction<ListWordsParams>>;
  stickyTop?: number;
  aiChanges?: Record<number, Set<string>>;
}

const FILTER_COLS: Record<string, { filterKey: keyof ListWordsParams; options: readonly string[] }> = {
  "Region":       { filterKey: "region",       options: REGIONS.filter(r => r !== "All") },
  "Surroundings": { filterKey: "surroundings", options: SURROUNDINGS.filter(s => s !== "All") },
  "Day/Night":    { filterKey: "dayNight",     options: DAY_NIGHT },
  "Age":          { filterKey: "age",          options: AGES },
  "Findability":  { filterKey: "findability",  options: FINDABILITY },
  "Season":       { filterKey: "season",       options: SEASONS.filter(s => s !== "All") },
  "Boards":       { filterKey: "board",        options: BOARDS },
};

/** Start a column resize drag. Captures startX + startW so closure is correct. */
function startResize(
  e: React.MouseEvent,
  currentWidth: number,
  setter: (w: number) => void
) {
  e.preventDefault();
  const startX = e.clientX;
  const startW = currentWidth;
  const onMove = (ev: MouseEvent) => setter(Math.max(80, startW + ev.clientX - startX));
  const onUp = () => {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

/** Resize handle rendered at the right edge of a <th>. */
function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      className="absolute right-0 top-0 h-full w-2 cursor-col-resize group/rh flex items-center justify-center"
      onMouseDown={onMouseDown}
    >
      <div className="w-px h-4 bg-border/40 group-hover/rh:bg-border transition-colors" />
    </div>
  );
}

export default function WordTable({ filters, setFilters, stickyTop = 0, aiChanges }: WordTableProps) {
  const [page, setPage] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [draftSelections, setDraftSelections] = useState<Set<string>>(new Set());

  // Sync draft from current filter value whenever the panel opens
  useEffect(() => {
    if (!activeFilter) return;
    const col = FILTER_COLS[activeFilter];
    if (!col) return;
    const currentVal = filters[col.filterKey] as string | undefined;
    setDraftSelections(
      currentVal
        ? new Set(currentVal.split(",").map((s) => s.trim()).filter(Boolean))
        : new Set()
    );
  }, [activeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleDraft(opt: string) {
    setDraftSelections((prev) => {
      const next = new Set(prev);
      if (next.has(opt)) next.delete(opt);
      else next.add(opt);
      return next;
    });
  }

  function applyDraft() {
    if (!activeFilter || !activeFiltKey) return;
    const val = draftSelections.size > 0 ? [...draftSelections].join(",") : undefined;
    setFilters?.((p) => ({ ...p, [activeFiltKey]: val, offset: 0 }));
    setPage(0);
    setActiveFilter(null);
  }

  function clearDraft() {
    setDraftSelections(new Set());
  }
  const limit = filters.limit || 100;
  const offset = page * limit;

  // Resizable column widths (px)
  const [wordWidth, setWordWidth] = useState(220);
  const [spanishWidth, setSpanishWidth] = useState(180);

  const queryParams = { ...filters, limit, offset };
  const { data, isLoading } = useListWords(queryParams, {
    query: { queryKey: getListWordsQueryKey(queryParams), keepPreviousData: true },
  });

  const createMutation = useCreateWord();
  const deleteMutation = useDeleteWord();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newWordTop, setNewWordTop] = useState("");

  const handleAddWordTop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWordTop.trim()) return;
    createMutation.mutate(
      { data: { word: newWordTop.trim() } },
      {
        onSuccess: () => {
          setNewWordTop("");
          queryClient.invalidateQueries({ queryKey: ["/api/words"] });
          queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
          toast({ title: "Word added" });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/words"] });
          queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
          toast({ title: "Word deleted" });
        },
      }
    );
  };

  const thBase = "font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground font-normal relative select-none";

  function FilterableHead({
    label,
    className,
    style,
  }: {
    label: string;
    className?: string;
    style?: React.CSSProperties;
  }) {
    const col = FILTER_COLS[label];
    if (!col || !setFilters) {
      return <TableHead className={cn(thBase, className)} style={style}>{label}</TableHead>;
    }
    const isActive = filters[col.filterKey] !== undefined && filters[col.filterKey] !== null;
    return (
      <TableHead
        className={cn(
          thBase,
          "cursor-pointer transition-colors duration-150",
          isActive ? "text-foreground" : "hover:text-foreground/70",
          className
        )}
        style={style}
        onClick={(e) => {
          e.stopPropagation();
          setActiveFilter(activeFilter === label ? null : label);
        }}
      >
        <span className="flex items-center gap-1.5">
          {label}
          {isActive && <span className="h-1.5 w-1.5 rounded-full bg-foreground/60 shrink-0" />}
        </span>
      </TableHead>
    );
  }

  const activeFiltCol = activeFilter ? FILTER_COLS[activeFilter] : null;
  const activeFiltOpts = activeFiltCol ? activeFiltCol.options : [];
  const activeFiltKey = activeFiltCol ? activeFiltCol.filterKey : null;
  const activeFiltVal = activeFiltKey ? (filters[activeFiltKey] as string | undefined) : undefined;

  return (
    <div className="border border-border">
      <Table>
        <TableHeader
          className="bg-background z-10"
          style={{ position: "sticky", top: stickyTop }}
        >
          <TableRow className="border-b border-border hover:bg-transparent">
            <TableHead className={`${thBase} w-[52px]`}>Emoji</TableHead>

            {/* English — resizable */}
            <TableHead className={thBase} style={{ width: wordWidth, minWidth: 80 }}>
              English
              <ResizeHandle onMouseDown={(e) => startResize(e, wordWidth, setWordWidth)} />
            </TableHead>

            {/* Spanish — resizable */}
            <TableHead className={thBase} style={{ width: spanishWidth, minWidth: 80 }}>
              Spanish
              <ResizeHandle onMouseDown={(e) => startResize(e, spanishWidth, setSpanishWidth)} />
            </TableHead>

            <FilterableHead label="Region" className="w-[100px]" />
            <FilterableHead label="Surroundings" className="w-[150px]" />
            <FilterableHead label="Day/Night" className="w-[96px]" />
            <FilterableHead label="Age" className="w-[78px]" />
            <FilterableHead label="Findability" className="w-[100px]" />
            <FilterableHead label="Season" className="w-[128px]" />
            <FilterableHead label="Boards" className="w-[155px]" />
            <TableHead className={`${thBase} min-w-[120px]`}>Notes</TableHead>
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>

        <TableBody className="text-sm">
          {/* Quick-add row — top */}
          <TableRow className="hover:bg-muted/10 border-b border-border/50">
            <TableCell colSpan={12} className="p-2">
              <form onSubmit={handleAddWordTop} className="flex items-center gap-2">
                <Plus className="h-3.5 w-3.5 text-muted-foreground/40 ml-2 shrink-0" />
                <Input
                  placeholder="Quick add new word…"
                  value={newWordTop}
                  onChange={(e) => setNewWordTop(e.target.value)}
                  className="h-7 text-xs border-transparent bg-transparent hover:border-border/50 focus:bg-background focus-visible:ring-0 focus-visible:border-border flex-1 max-w-[260px] rounded-none font-mono placeholder:text-muted-foreground/30"
                  data-testid="input-quick-add-top"
                />
                {newWordTop.trim() && (
                  <button
                    type="submit"
                    className="h-7 px-3 text-xs font-mono border border-border hover:bg-muted/40 transition-colors disabled:opacity-40"
                    disabled={createMutation.isPending}
                    data-testid="btn-submit-quick-add-top"
                  >
                    {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                  </button>
                )}
              </form>
            </TableCell>
          </TableRow>

          {isLoading && !data ? (
            <TableRow>
              <TableCell colSpan={12} className="h-24 text-center">
                <div className="flex items-center justify-center text-muted-foreground gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="font-mono text-xs tracking-wide">Loading words…</span>
                </div>
              </TableCell>
            </TableRow>
          ) : data?.words.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="h-24 text-center">
                <p className="font-mono text-xs text-muted-foreground tracking-wide">No words found.</p>
              </TableCell>
            </TableRow>
          ) : (
            data?.words.map((word: Word) => {
              const changed = aiChanges?.[word.id];
              return (
                <TableRow key={word.id} className="group border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <TableCell className="p-1 align-top text-center">
                    <CellEditor word={word} field="emoji" type="text" placeholder="🚗" className="text-center text-lg font-normal" />
                  </TableCell>
                  <TableCell className="p-1 align-top font-medium" style={{ width: wordWidth }}>
                    <CellEditor word={word} field="word" type="text" />
                  </TableCell>
                  <TableCell className="p-1 align-top" style={{ width: spanishWidth }}>
                    <CellEditor word={word} field="spanish" type="text" placeholder="Traducción…" />
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <CellEditor word={word} field="regions" type="multi-select" badgeType="region" options={REGIONS} aiChanged={changed?.has("regions")} />
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <CellEditor word={word} field="surroundings" type="multi-select" badgeType="surroundings" options={SURROUNDINGS} aiChanged={changed?.has("surroundings")} />
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <CellEditor word={word} field="dayNight" type="multi-select" badgeType="dayNight" options={DAY_NIGHT} aiChanged={changed?.has("dayNight")} />
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <CellEditor word={word} field="age" type="single-select" badgeType="age" options={AGES} aiChanged={changed?.has("age")} />
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <CellEditor word={word} field="findability" type="single-select" badgeType="findability" options={FINDABILITY} aiChanged={changed?.has("findability")} />
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <CellEditor word={word} field="seasons" type="multi-select" badgeType="season" options={SEASONS} aiChanged={changed?.has("seasons")} />
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <CellEditor word={word} field="boards" type="multi-select" badgeType="board" options={BOARDS} aiChanged={changed?.has("boards")} />
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <CellEditor word={word} field="notes" type="text" />
                  </TableCell>
                  <TableCell className="p-1 align-top text-right">
                    <button
                      className="h-7 w-7 inline-flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(word.id)}
                      data-testid={`btn-delete-word-${word.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })
          )}

        </TableBody>
      </Table>

      {/* Pagination */}
      {data && data.total > limit && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border">
          <span className="font-mono text-[10.5px] tracking-[0.04em] text-muted-foreground tabular-nums">
            {offset + 1}–{Math.min(offset + limit, data.total)} of {data.total}
          </span>
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-1 font-mono text-[10.5px] tracking-[0.04em] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ArrowLeft className="h-3 w-3" /> Prev
            </button>
            <button
              className="flex items-center gap-1 font-mono text-[10.5px] tracking-[0.04em] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
              onClick={() => setPage((p) => p + 1)}
              disabled={offset + limit >= data.total}
            >
              Next <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* ── Column filter overlay — multi-select ── */}
      {activeFilter && setFilters && activeFiltCol && (
        <>
          {/* Click-outside catcher */}
          <div className="fixed inset-0 z-40" onClick={applyDraft} />

          {/* Filter panel */}
          <div className="fixed top-[28vh] left-1/2 -translate-x-1/2 z-50 bg-card border border-border w-72 shadow-[0_8px_40px_rgba(0,0,0,0.13),0_2px_8px_rgba(0,0,0,0.06)] flex flex-col">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between shrink-0">
              <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground">
                {activeFilter}
              </p>
              <button
                onClick={() => { applyDraft(); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Options — checkboxes */}
            <div className="py-1.5 max-h-[52vh] overflow-y-auto">
              {activeFiltOpts.map((opt) => {
                const selected = draftSelections.has(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggleDraft(opt)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors",
                      selected
                        ? "bg-muted/40 text-foreground"
                        : "text-foreground/60 hover:bg-muted/20 hover:text-foreground"
                    )}
                  >
                    {/* Checkbox */}
                    <div className={cn(
                      "h-[15px] w-[15px] border flex-none flex items-center justify-center transition-colors",
                      selected
                        ? "bg-foreground border-foreground"
                        : "border-border bg-background"
                    )}>
                      {selected && <Check className="h-2.5 w-2.5 text-background" strokeWidth={3} />}
                    </div>
                    <span className={cn("text-sm", selected && "font-medium")}>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Footer — clear + apply */}
            <div className="px-4 py-3 border-t border-border flex items-center justify-between shrink-0">
              <button
                onClick={clearDraft}
                disabled={draftSelections.size === 0}
                className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={applyDraft}
                className="font-mono text-[10.5px] tracking-[0.18em] uppercase bg-foreground text-background px-4 py-1.5 hover:opacity-80 transition-opacity"
              >
                Apply{draftSelections.size > 0 ? ` (${draftSelections.size})` : ""}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
