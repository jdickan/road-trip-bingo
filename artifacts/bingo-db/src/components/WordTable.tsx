import { useState, useEffect, useRef } from "react";
import {
  Word,
  ListWordsParams,
  useListWords,
  useCreateWord,
  useDeleteWord,
  getListWordsQueryKey,
} from "@workspace/api-client-react";
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
import { Loader2, Plus, Trash2, ArrowRight, ArrowLeft, X, Check, ChevronDown, Sparkles } from "lucide-react";
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

  // Resizable column widths (px)
  const [wordWidth, setWordWidth] = useState(220);
  const [spanishWidth, setSpanishWidth] = useState(180);
  const [regionWidth, setRegionWidth] = useState(100);
  const [surroundingsWidth, setSurroundingsWidth] = useState(150);
  const [dayNightWidth, setDayNightWidth] = useState(96);
  const [ageWidth, setAgeWidth] = useState(78);
  const [findabilityWidth, setFindabilityWidth] = useState(100);
  const [seasonWidth, setSeasonWidth] = useState(128);
  const [boardsWidth, setBoardsWidth] = useState(155);
  const [notesWidth, setNotesWidth] = useState(160);

  const queryParams = { ...filters, limit, offset };
  const { data, isLoading, isError } = useListWords(queryParams, {
    query: { queryKey: getListWordsQueryKey(queryParams), placeholderData: keepPreviousData },
  });

  const createMutation = useCreateWord();
  const deleteMutation = useDeleteWord();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newWordTop, setNewWordTop] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);

  const hasActiveFilters = Boolean(
    filters.search || filters.region || filters.surroundings ||
    filters.age || filters.findability || filters.season ||
    filters.board || filters.dayNight || filters.incomplete
  );

  function clearFilters() {
    setFilters?.({ limit: filters.limit ?? 100, offset: 0 });
    setPage(0);
  }

  async function handleImportWords(rows: Record<string, unknown>[]) {
    const wordRows = rows.filter(r => typeof r.word === "string" && String(r.word).trim());
    if (wordRows.length === 0) {
      toast({ title: "No words found", description: "Each entry needs a 'word' field.", variant: "destructive" });
      return;
    }
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
        });
      })
    );
    queryClient.invalidateQueries({ queryKey: ["/api/words"] });
    queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
    const done = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;
    if (failed === 0) toast({ title: `${done} word${done === 1 ? "" : "s"} imported` });
    else toast({ title: `${done} of ${wordRows.length} words imported`, description: `${failed} failed`, variant: "destructive" });
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
    const words = parseQuickAddWords(newWordTop);
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
        else toast({ title: `${done} of ${total} words added`, description: `${failed} failed`, variant: "destructive" });
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
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>

        <TableBody className="text-sm">
          {/* Quick-add row — top (hidden when database is truly empty so the empty state card is the sole content) */}
          {!(data?.total === 0 && !hasActiveFilters) && (
          <TableRow className="hover:bg-muted/10 border-b border-border/50">
            <TableCell colSpan={12} className="p-2">
              <form onSubmit={handleAddWordTop} className="flex items-center gap-2">
                <Plus className="h-3.5 w-3.5 text-muted-foreground/50 ml-2 shrink-0" />
                <Input
                  placeholder="Quick add — separate multiple with commas…"
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
          )}

          {isLoading && !data ? (
            <TableRow>
              <TableCell colSpan={12} className="h-24 text-center">
                <div className="flex items-center justify-center text-muted-foreground gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="font-mono text-xs tracking-wide">Loading words…</span>
                </div>
              </TableCell>
            </TableRow>
          ) : data?.total === 0 && !hasActiveFilters ? (
            /* True empty database — big inviting drop zone */
            <TableRow>
              <TableCell colSpan={12} className="p-0">
                <SuggestWordsModal open={suggestOpen} onOpenChange={setSuggestOpen} />
                <EmptyState
                  icon="🗺️"
                  headline="No words yet"
                  body="Add your first bingo word, import an existing list from JSON, or let AI suggest some ideas."
                  onJsonImport={handleImportWords}
                  jsonLabel="word"
                >
                  <button
                    onClick={() => (document.querySelector('[data-testid="input-quick-add-top"]') as HTMLInputElement | null)?.focus()}
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
              <TableCell colSpan={12} className="py-16 text-center">
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

          {/* Quick-add row — bottom (shown when page has ≥50 words) */}
          {(data?.words.length ?? 0) >= 50 && (
            <TableRow className="hover:bg-muted/10 border-t border-border/50">
              <TableCell colSpan={12} className="p-2">
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

    </div>
  );
}
