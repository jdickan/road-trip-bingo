import { useState, useEffect, useRef } from "react";
import {
  Word,
  ListWordsParams,
  useListWords,
  useCreateWord,
  useDeleteWord,
  useBulkDeleteWords,
  getListWordsQueryKey,
  getListDeletedWordsQueryKey,
} from "@workspace/api-client-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, ArrowRight, ArrowLeft, X, Check, ChevronDown, Sparkles, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CellEditor } from "./CellEditor";
import { REGIONS, SURROUNDINGS, AGES, FINDABILITY, SEASONS, BOARDS, DAY_NIGHT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";
import SuggestWordsModal from "./SuggestWordsModal";

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

const COL_WIDTHS_KEY = "bingo-column-widths-v1";

const DEFAULT_COL_WIDTHS = {
  word: 220,
  spanish: 180,
  region: 100,
  surroundings: 150,
  dayNight: 96,
  age: 78,
  findability: 100,
  season: 128,
  boards: 155,
  notes: 160,
} as const;

type ColWidths = { [K in keyof typeof DEFAULT_COL_WIDTHS]: number };

function loadColWidths(): ColWidths {
  try {
    const raw = localStorage.getItem(COL_WIDTHS_KEY);
    if (!raw) return { ...DEFAULT_COL_WIDTHS };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result = { ...DEFAULT_COL_WIDTHS } as Record<keyof ColWidths, number>;
    for (const key of Object.keys(DEFAULT_COL_WIDTHS) as (keyof ColWidths)[]) {
      if (typeof parsed[key] === "number" && (parsed[key] as number) > 0) {
        result[key] = parsed[key] as number;
      }
    }
    return result;
  } catch {
    return { ...DEFAULT_COL_WIDTHS };
  }
}

/** Start a column resize drag. Captures startX + startW so closure is correct. */
function startResize(
  e: React.MouseEvent,
  currentWidth: number,
  setter: (w: number) => void,
  minWidth = 60
) {
  e.preventDefault();
  const startX = e.clientX;
  const startW = currentWidth;
  const onMove = (ev: MouseEvent) => setter(Math.max(minWidth, startW + ev.clientX - startX));
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
      className="absolute right-0 top-0 h-full w-3 cursor-col-resize group/rh flex items-center justify-center z-10"
      onMouseDown={onMouseDown}
    >
      <div className="w-px h-4 bg-border group-hover/rh:bg-foreground/50 transition-colors" />
    </div>
  );
}

export default function WordTable({ filters, setFilters, stickyTop = 0, aiChanges }: WordTableProps) {
  const [page, setPage] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [draftSelections, setDraftSelections] = useState<Set<string>>(new Set());

  // Sync draft from current filter value whenever the panel opens.
  // No active filter = all options visible = initialize all as checked.
  useEffect(() => {
    if (!activeFilter) return;
    const col = FILTER_COLS[activeFilter];
    if (!col) return;
    const currentVal = filters[col.filterKey] as string | undefined;
    setDraftSelections(
      currentVal
        ? new Set(currentVal.split(",").map((s) => s.trim()).filter(Boolean))
        : new Set(col.options)
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
    // All options checked (or none) = no filter active
    const allSelected = activeFiltOpts.length > 0 && activeFiltOpts.every((o) => draftSelections.has(o));
    const val = (!allSelected && draftSelections.size > 0) ? [...draftSelections].join(",") : undefined;
    setFilters?.((p) => ({ ...p, [activeFiltKey]: val, offset: 0 }));
    setPage(0);
    setActiveFilter(null);
  }

  function clearDraft() {
    setDraftSelections(new Set());
  }
  const limit = filters.limit || 100;
  const offset = page * limit;

  // Resizable column widths (px) — persisted to localStorage
  const [colWidths, setColWidths] = useState<ColWidths>(loadColWidths);

  const { word: wordWidth, spanish: spanishWidth, region: regionWidth, surroundings: surroundingsWidth, dayNight: dayNightWidth, age: ageWidth, findability: findabilityWidth, season: seasonWidth, boards: boardsWidth, notes: notesWidth } = colWidths;

  const setWordWidth       = (w: number) => setColWidths(p => ({ ...p, word: w }));
  const setSpanishWidth    = (w: number) => setColWidths(p => ({ ...p, spanish: w }));
  const setRegionWidth     = (w: number) => setColWidths(p => ({ ...p, region: w }));
  const setSurroundingsWidth = (w: number) => setColWidths(p => ({ ...p, surroundings: w }));
  const setDayNightWidth   = (w: number) => setColWidths(p => ({ ...p, dayNight: w }));
  const setAgeWidth        = (w: number) => setColWidths(p => ({ ...p, age: w }));
  const setFindabilityWidth = (w: number) => setColWidths(p => ({ ...p, findability: w }));
  const setSeasonWidth     = (w: number) => setColWidths(p => ({ ...p, season: w }));
  const setBoardsWidth     = (w: number) => setColWidths(p => ({ ...p, boards: w }));
  const setNotesWidth      = (w: number) => setColWidths(p => ({ ...p, notes: w }));

  useEffect(() => {
    try {
      localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(colWidths));
    } catch {
      // Storage may be unavailable in restricted browser environments
    }
  }, [colWidths]);

  const hasCustomWidths = (Object.keys(DEFAULT_COL_WIDTHS) as (keyof ColWidths)[]).some(
    k => colWidths[k] !== DEFAULT_COL_WIDTHS[k]
  );

  function resetColWidths() {
    setColWidths({ ...DEFAULT_COL_WIDTHS });
  }

  const queryParams = { ...filters, limit, offset };
  const { data, isLoading, isError } = useListWords(queryParams, {
    query: { queryKey: getListWordsQueryKey(queryParams), placeholderData: keepPreviousData },
  });

  const createMutation = useCreateWord();
  const deleteMutation = useDeleteWord();
  const bulkDeleteMutation = useBulkDeleteWords();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newWordTop, setNewWordTop] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const quickAddTopRef = useRef<HTMLInputElement>(null);

  // ── Select mode ─────────────────────────────────────────────────────────────
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const colCount = selectMode ? 13 : 12;
  const pageIds = data?.words.map(w => w.id) ?? [];
  const allOnPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));

  function toggleSelectAll() {
    if (allOnPageSelected) {
      setSelectedIds(prev => { const n = new Set(prev); pageIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); pageIds.forEach(id => n.add(id)); return n; });
    }
  }

  function toggleRowSelect(id: number) {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    bulkDeleteMutation.mutate(
      { data: { ids } },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListWordsQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
          queryClient.invalidateQueries({ queryKey: getListDeletedWordsQueryKey() });
          toast({ title: `${result.count} word${result.count === 1 ? "" : "s"} moved to Trash` });
          setSelectedIds(new Set());
          setSelectMode(false);
        },
        onError: () => toast({ title: "Couldn't delete words", variant: "destructive" }),
      }
    );
  }

  const hasActiveFilters = Boolean(
    filters.search || filters.region || filters.surroundings ||
    filters.age || filters.findability || filters.season ||
    filters.board || filters.dayNight || filters.incomplete
  );

  function clearFilters() {
    setFilters?.({ limit: filters.limit ?? 100, offset: 0 });
    setPage(0);
  }

  async function handleImportWords(
    rows: Record<string, unknown>[],
    onProgress: (done: number, total: number) => void
  ) {
    const wordRows = rows.filter(r => typeof r.word === "string" && String(r.word).trim());
    if (wordRows.length === 0) {
      toast({ title: "Couldn't import", description: "Each entry needs a 'word' field.", variant: "destructive" });
      return;
    }
    const total = wordRows.length;
    let done = 0;
    onProgress(0, total);
    const results = await Promise.allSettled(
      wordRows.map(row => {
        const s = (k: string) => typeof row[k] === "string" ? String(row[k]) : undefined;
        const a = (k: string) => Array.isArray(row[k]) ? (row[k] as string[]) : undefined;
        return createMutation.mutateAsync({
          data: {
            word: String(row.word).trim(),
            spanish: s("spanish"), emoji: s("emoji"), age: s("age"),
            findability: s("findability"), notes: s("notes"),
            regions: a("regions"), surroundings: a("surroundings"),
            dayNight: a("dayNight"), seasons: a("seasons"), boards: a("boards"),
          },
        }).then(
          (r) => { onProgress(++done, total); return r; },
          (e) => { onProgress(++done, total); throw e; }
        );
      })
    );
    queryClient.invalidateQueries({ queryKey: ["/api/words"] });
    queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
    const succeeded = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;
    if (failed === 0) toast({ title: `${succeeded} word${succeeded === 1 ? "" : "s"} imported` });
    else toast({ title: "Couldn't import all words", description: `${succeeded} of ${total} succeeded, ${failed} failed`, variant: "destructive" });
  }

  function parseQuickAddWords(raw: string): string[] {
    return raw
      .split(/[,\t]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0)
      .filter((w, i, arr) => arr.indexOf(w) === i);
  }

  const handleAddWordTop = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = newWordTop.trim();

    // Detect JSON paste — try to parse as array or {words:[]} object
    if (raw.startsWith("[") || raw.startsWith("{")) {
      try {
        const parsed: unknown = JSON.parse(raw);
        let rows: Record<string, unknown>[] | null = null;
        if (Array.isArray(parsed)) {
          rows = parsed as Record<string, unknown>[];
        } else if (parsed && typeof parsed === "object") {
          const d = parsed as Record<string, unknown>;
          if (Array.isArray(d.words)) rows = d.words as Record<string, unknown>[];
        }
        if (rows) {
          setNewWordTop("");
          void handleImportWords(rows, () => {});
          return;
        }
      } catch {
        // not valid JSON — fall through to comma-separated handling
      }
    }

    const words = parseQuickAddWords(raw);
    if (words.length === 0) return;

    if (words.length === 1) {
      createMutation.mutate(
        { data: { word: words[0] } },
        {
          onSuccess: () => {
            setNewWordTop("");
            queryClient.invalidateQueries({ queryKey: ["/api/words"] });
            queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
            toast({ title: "Word added" });
          },
          onError: () => toast({ title: "Couldn't add word", description: "Try again in a moment.", variant: "destructive" }),
        }
      );
    } else {
      // Bulk: fire all in parallel, then invalidate once
      setNewWordTop("");
      let done = 0;
      let failed = 0;
      const total = words.length;
      const finish = () => {
        queryClient.invalidateQueries({ queryKey: ["/api/words"] });
        queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
        if (failed === 0) toast({ title: `${total} words added` });
        else toast({ title: "Couldn't add all words", description: `${done} of ${total} succeeded, ${failed} failed`, variant: "destructive" });
      };
      for (const word of words) {
        createMutation.mutate(
          { data: { word } },
          {
            onSuccess: () => { done++; if (done + failed === total) finish(); },
            onError: () => { failed++; if (done + failed === total) finish(); },
          }
        );
      }
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/words"] });
          queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
          toast({ title: "Word deleted" });
          // Step back to previous page when the last word on a non-first page is deleted
          if (page > 0 && (data?.words.length ?? 0) <= 1) {
            setPage(p => Math.max(0, p - 1));
          }
        },
        onError: () => toast({ title: "Couldn't delete word", description: "Try again in a moment.", variant: "destructive" }),
      }
    );
  };

  const thBase = "font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground font-normal relative select-none";

  function FilterableHead({
    label,
    className,
    style,
    width,
    setWidth,
    minWidth = 60,
  }: {
    label: string;
    className?: string;
    style?: React.CSSProperties;
    width?: number;
    setWidth?: (w: number) => void;
    minWidth?: number;
  }) {
    const col = FILTER_COLS[label];
    const combinedStyle: React.CSSProperties = width !== undefined
      ? { width, minWidth, ...style }
      : style ?? {};

    if (!col || !setFilters) {
      return (
        <TableHead className={cn(thBase, className)} style={combinedStyle}>
          {label}
          {setWidth && <ResizeHandle onMouseDown={(e) => startResize(e, width!, setWidth, minWidth)} />}
        </TableHead>
      );
    }

    const isOpen = activeFilter === label;
    const isActive = filters[col.filterKey] !== undefined && filters[col.filterKey] !== null;
    const opts = col.options;

    return (
      <Popover
        open={isOpen}
        onOpenChange={(open) => open ? setActiveFilter(label) : applyDraft()}
      >
        <PopoverTrigger asChild>
          <TableHead
            className={cn(
              thBase,
              "cursor-pointer transition-colors duration-150",
              isActive ? "text-foreground" : "hover:text-foreground/70",
              className
            )}
            style={combinedStyle}
          >
            <span className="flex items-center gap-1">
              {label}
              <ChevronDown className={cn(
                "h-2.5 w-2.5 shrink-0 transition-transform duration-150",
                isOpen ? "rotate-180 text-foreground/70" : "text-muted-foreground/30"
              )} />
              {isActive && <span className="h-1.5 w-1.5 rounded-full bg-foreground/60 shrink-0 ml-0.5" />}
            </span>
            {setWidth && <ResizeHandle onMouseDown={(e) => { e.stopPropagation(); startResize(e, width!, setWidth, minWidth); }} />}
          </TableHead>
        </PopoverTrigger>

        <PopoverContent
          className="w-64 p-0 shadow-[0_8px_40px_rgba(0,0,0,0.13),0_2px_8px_rgba(0,0,0,0.06)]"
          align="start"
          sideOffset={2}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
            <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground">
              {label}
            </p>
            <button
              onClick={() => applyDraft()}
              aria-label={`Close ${label} filter`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Options */}
          <div className="py-1 max-h-[52vh] overflow-y-auto">
            {opts.map((opt) => {
              const selected = draftSelections.has(opt);
              return (
                <button
                  key={opt}
                  onClick={() => toggleDraft(opt)}
                  className={cn(
                    "w-full text-left px-4 py-2 flex items-center gap-3 transition-colors",
                    selected
                      ? "bg-muted/40 text-foreground"
                      : "text-foreground/70 hover:bg-muted/20 hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "h-[14px] w-[14px] border flex-none flex items-center justify-center transition-colors",
                    selected ? "bg-foreground border-foreground" : "border-border bg-background"
                  )}>
                    {selected && <Check className="h-2.5 w-2.5 text-background" strokeWidth={3} />}
                  </div>
                  <span className={cn("text-xs", selected && "font-medium")}>{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border flex items-center justify-between shrink-0">
            <button
              onClick={clearDraft}
              disabled={draftSelections.size === 0}
              className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={applyDraft}
              className="font-mono text-[10.5px] tracking-[0.18em] uppercase bg-foreground text-background px-3 py-1.5 hover:opacity-80 transition-opacity"
            >
              Apply{draftSelections.size > 0 ? ` (${draftSelections.size})` : ""}
            </button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  const activeFiltCol = activeFilter ? FILTER_COLS[activeFilter] : null;
  const activeFiltOpts = activeFiltCol ? activeFiltCol.options : [];
  const activeFiltKey = activeFiltCol ? activeFiltCol.filterKey : null;
  const activeFiltVal = activeFiltKey ? (filters[activeFiltKey] as string | undefined) : undefined;

  return (
    <div className="border border-border">
      {isError && data && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border/50 text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500/70 shrink-0" />
          <span className="font-mono text-[10.5px] tracking-wide">Server offline — showing last known data</span>
        </div>
      )}
      <Table>
        <TableHeader
          className="bg-background z-10"
          style={{ position: "sticky", top: stickyTop }}
        >
          <TableRow className="border-b border-border hover:bg-transparent">
            {selectMode && (
              <TableHead className="w-[36px] text-center">
                <label className="relative cursor-pointer flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all words on this page"
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      "h-[14px] w-[14px] border flex-none flex items-center justify-center transition-colors",
                      allOnPageSelected ? "bg-foreground border-foreground" : "border-border bg-background hover:border-foreground/40"
                    )}
                  >
                    {allOnPageSelected && <Check className="h-2.5 w-2.5 text-background" strokeWidth={3} />}
                  </div>
                </label>
              </TableHead>
            )}
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

            <FilterableHead label="Region" width={regionWidth} setWidth={setRegionWidth} minWidth={60} />
            <FilterableHead label="Surroundings" width={surroundingsWidth} setWidth={setSurroundingsWidth} minWidth={80} />
            <FilterableHead label="Day/Night" width={dayNightWidth} setWidth={setDayNightWidth} minWidth={60} />
            <FilterableHead label="Age" width={ageWidth} setWidth={setAgeWidth} minWidth={55} />
            <FilterableHead label="Findability" width={findabilityWidth} setWidth={setFindabilityWidth} minWidth={70} />
            <FilterableHead label="Season" width={seasonWidth} setWidth={setSeasonWidth} minWidth={70} />
            <FilterableHead label="Boards" width={boardsWidth} setWidth={setBoardsWidth} minWidth={80} />
            <TableHead className={thBase} style={{ width: notesWidth, minWidth: 80 }}>
              Notes
              <ResizeHandle onMouseDown={(e) => startResize(e, notesWidth, setNotesWidth, 80)} />
            </TableHead>
            <TableHead className="w-[40px] text-right">
              {hasCustomWidths && (
                <button
                  onClick={resetColWidths}
                  aria-label="Reset column widths"
                  title="Reset column widths"
                  className="inline-flex items-center justify-center h-5 w-5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody className="text-sm">
          {/* Quick-add row — top (hidden when database is truly empty so the empty state card is the sole content) */}
          {!(data?.total === 0 && !hasActiveFilters) && (
          <TableRow className="hover:bg-muted/10 border-b border-border/50">
            <TableCell colSpan={colCount} className="p-2">
              <form onSubmit={handleAddWordTop} className="flex items-center gap-2">
                <Plus className="h-3.5 w-3.5 text-muted-foreground/50 ml-2 shrink-0" />
                <Input
                  ref={quickAddTopRef}
                  placeholder="Quick add — separate multiple with commas…"
                  value={newWordTop}
                  onChange={(e) => setNewWordTop(e.target.value)}
                  aria-label="Quick add word"
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
          )}

          {isLoading && !data ? (
            <TableRow>
              <TableCell colSpan={colCount} className="h-24 text-center">
                <div className="flex items-center justify-center text-muted-foreground gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="font-mono text-xs tracking-wide">Loading words…</span>
                </div>
              </TableCell>
            </TableRow>
          ) : data?.total === 0 && !hasActiveFilters ? (
            /* True empty database — big inviting drop zone */
            <TableRow>
              <TableCell colSpan={colCount} className="p-0">
                <SuggestWordsModal open={suggestOpen} onOpenChange={setSuggestOpen} />
                <EmptyState
                  icon="🗺️"
                  headline="No words yet"
                  body="Add your first bingo word, import an existing list from JSON, or let AI suggest some ideas."
                  onJsonImport={handleImportWords}
                  jsonLabel="word"
                >
                  <button
                    onClick={() => quickAddTopRef.current?.focus()}
                    className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] uppercase border border-border px-4 py-2 hover:bg-muted/40 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add a word
                  </button>
                  <button
                    onClick={() => setSuggestOpen(true)}
                    className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] uppercase border border-border px-4 py-2 hover:bg-muted/40 transition-colors"
                  >
                    <Sparkles className="h-3 w-3" />
                    Suggest with AI
                  </button>
                </EmptyState>
              </TableCell>
            </TableRow>
          ) : data?.words.length === 0 ? (
            /* Filtered empty — compact message + clear filters */
            <TableRow>
              <TableCell colSpan={colCount} className="py-16 text-center">
                <p className="font-mono text-xs text-muted-foreground tracking-wide mb-4">No words match your filters.</p>
                {setFilters && (
                  <button
                    onClick={clearFilters}
                    className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 hover:bg-muted/40 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </TableCell>
            </TableRow>
          ) : (
            data?.words.map((word: Word) => {
              const changed = aiChanges?.[word.id];
              const isRowSelected = selectedIds.has(word.id);
              return (
                <TableRow
                  key={word.id}
                  className={cn(
                    "group border-b border-border/50 hover:bg-muted/20 transition-colors",
                    selectMode && isRowSelected && "bg-muted/30"
                  )}
                >
                  {selectMode && (
                    <TableCell className="p-1 align-middle text-center w-[36px]">
                      <label className="relative cursor-pointer flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={() => toggleRowSelect(word.id)}
                          aria-label={`Select "${word.word}"`}
                          className="sr-only"
                        />
                        <div
                          className={cn(
                            "h-[14px] w-[14px] border flex-none flex items-center justify-center transition-colors",
                            isRowSelected ? "bg-foreground border-foreground" : "border-border bg-background hover:border-foreground/40"
                          )}
                        >
                          {isRowSelected && <Check className="h-2.5 w-2.5 text-background" strokeWidth={3} />}
                        </div>
                      </label>
                    </TableCell>
                  )}
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
                    {word.notes ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <CellEditor word={word} field="notes" type="text" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[260px] text-xs whitespace-pre-wrap break-words">
                          {word.notes}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <CellEditor word={word} field="notes" type="text" />
                    )}
                  </TableCell>
                  <TableCell className="p-1 align-top text-right">
                    {!selectMode && (
                      <button
                        className="h-7 w-7 inline-flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(word.id)}
                        aria-label={`Delete "${word.word}"`}
                        data-testid={`btn-delete-word-${word.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}

          {/* Quick-add row — bottom (shown when page has ≥50 words) */}
          {(data?.words.length ?? 0) >= 50 && (
            <TableRow className="hover:bg-muted/10 border-t border-border/50">
              <TableCell colSpan={colCount} className="p-2">
                <form onSubmit={handleAddWordTop} className="flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground/50 ml-2 shrink-0" />
                  <Input
                    placeholder="Quick add — separate multiple with commas…"
                    value={newWordTop}
                    onChange={(e) => setNewWordTop(e.target.value)}
                    className="h-7 text-xs border-transparent bg-transparent hover:border-border/50 focus:bg-background focus-visible:ring-0 focus-visible:border-border flex-1 max-w-[260px] rounded-none font-mono placeholder:text-muted-foreground/30"
                  />
                  {newWordTop.trim() && (
                    <button
                      type="submit"
                      className="h-7 px-3 text-xs font-mono border border-border hover:bg-muted/40 transition-colors disabled:opacity-40"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                    </button>
                  )}
                </form>
              </TableCell>
            </TableRow>
          )}

        </TableBody>
      </Table>

      {/* ── Footer: SELECT/CANCEL · action strip · pagination ── */}
      <div className="border-t border-border">

        {/* Action strip — shown when in select mode with ≥1 item checked */}
        {selectMode && selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/50">
            <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted-foreground tabular-nums">
              {selectedIds.size} selected
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-destructive border border-destructive/40 px-3 py-1 hover:bg-destructive/10 transition-colors disabled:opacity-40"
            >
              {bulkDeleteMutation.isPending ? "Deleting…" : "Delete selected"}
            </button>
          </div>
        )}

        {/* Bottom row: SELECT/CANCEL on left, pagination on right */}
        <div className="flex items-center justify-between px-4 py-2">
          <button
            onClick={() => { setSelectMode(m => !m); setSelectedIds(new Set()); }}
            className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border"
          >
            {selectMode ? "Cancel" : "Select"}
          </button>

          {data && data.total > limit && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10.5px] tracking-[0.04em] text-muted-foreground tabular-nums">
                {offset + 1}–{Math.min(offset + limit, data.total)} of {data.total}
              </span>
              <button
                className="flex items-center gap-1 font-mono text-[10.5px] tracking-[0.04em] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                aria-label="Previous page"
              >
                <ArrowLeft className="h-3 w-3" /> Prev
              </button>
              <button
                className="flex items-center gap-1 font-mono text-[10.5px] tracking-[0.04em] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                onClick={() => setPage((p) => p + 1)}
                disabled={offset + limit >= data.total}
                aria-label="Next page"
              >
                Next <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
