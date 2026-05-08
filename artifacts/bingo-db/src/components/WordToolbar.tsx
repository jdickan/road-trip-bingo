import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListWordsParams, useCreateWord } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REGIONS, SURROUNDINGS, AGES, FINDABILITY, SEASONS } from "@/lib/constants";
import { Search, X, Plus } from "lucide-react";
import SuggestWordsModal from "./SuggestWordsModal";
import AutofillPanel from "./AutofillPanel";
import ExportModal from "./ExportModal";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

interface BoardSummary { id: number; name: string; status: string; }
interface BoardsResponse { boards: BoardSummary[]; }

function fetchBoards(): Promise<BoardsResponse> {
  return fetch(`${API_BASE}/boards`).then((r) => r.json());
}

interface WordToolbarProps {
  filters: ListWordsParams;
  setFilters: React.Dispatch<React.SetStateAction<ListWordsParams>>;
  onClearBoard?: () => void;
  /** "search" = top row only; "filters" = dropdowns only; default = both */
  section?: "search" | "filters";
  onAutofillComplete?: (results: Array<{ id: number }>, fields: string[]) => void;
}

export default function WordToolbar({ filters, setFilters, onClearBoard, section, onAutofillComplete }: WordToolbarProps) {
  const [searchQuery, setSearchQuery] = useState(filters.search || "");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState("");
  const quickAddRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const createMutation = useCreateWord();
  const qc = useQueryClient();

  const { data: boardsData } = useQuery<BoardsResponse>({
    queryKey: ["boards"],
    queryFn: fetchBoards,
    staleTime: 60_000,
  });
  const boardNames = boardsData?.boards.map((b) => b.name).sort() ?? [];

  function handleQuickAddToggle() {
    setQuickAddOpen((o) => {
      if (!o) setTimeout(() => quickAddRef.current?.focus(), 50);
      return !o;
    });
  }

  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const word = quickAddValue.trim();
    if (!word) return;
    createMutation.mutate(
      { data: { word } },
      {
        onSuccess: () => {
          setQuickAddValue("");
          qc.invalidateQueries({ queryKey: ["/api/words"] });
          qc.invalidateQueries({ queryKey: ["/api/words/stats"] });
          toast({ title: `"${word}" added` });
        },
      }
    );
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchQuery, offset: 0 }));
  };

  const handleFilterChange = (key: keyof ListWordsParams, value: any) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value === "all" ? undefined : value, offset: 0 };
      return newFilters;
    });
    if (key === "board" && (value === "all" || !value)) {
      onClearBoard?.();
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilters({ limit: 500, offset: 0 });
    onClearBoard?.();
  };

  const hasActiveFilters = Object.keys(filters).some(
    (k) => !["limit", "offset", "search"].includes(k) && filters[k as keyof ListWordsParams] !== undefined
  ) || !!filters.search;

  const showSearch = !section || section === "search";
  const showFilters = !section || section === "filters";

  return (
    <div className="flex flex-col">
      {/* ── Search bar — Boards-style flat strip ── */}
      {showSearch && (
        <div className="flex items-stretch">

          {/* Search input — borderless, right divider */}
          <div className="relative flex items-center py-3 px-4 border-r border-border shrink-0">
            <Search className="h-3.5 w-3.5 text-muted-foreground mr-2.5 shrink-0" />
            <input
              type="text"
              placeholder="Search words..."
              className="bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground/60 placeholder:text-xs outline-none border-none w-44"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setFilters((prev) => ({ ...prev, search: searchQuery, offset: 0 }));
              }}
              data-testid="input-search"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setFilters((prev) => ({ ...prev, search: undefined, offset: 0 })); }}
                className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* + Add Word — flat mono button or inline form */}
          {quickAddOpen ? (
            <form onSubmit={handleQuickAdd} className="flex items-center gap-3 px-4 border-r border-border">
              <input
                ref={quickAddRef}
                type="text"
                placeholder="New word name…"
                className="bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none border-none w-40"
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setQuickAddOpen(false); setQuickAddValue(""); }
                }}
                data-testid="input-quick-add-toolbar"
              />
              <button
                type="submit"
                disabled={!quickAddValue.trim() || createMutation.isPending}
                className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-foreground border border-border px-3 py-1.5 hover:bg-muted/40 transition-colors disabled:opacity-40"
                data-testid="btn-quick-add-toolbar"
              >
                {createMutation.isPending ? "Adding…" : "Add"}
              </button>
              <button
                type="button"
                onClick={() => { setQuickAddOpen(false); setQuickAddValue(""); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : (
            <button
              onClick={handleQuickAddToggle}
              className="flex items-center gap-1.5 px-5 py-3 font-mono text-[10.5px] tracking-[0.18em] uppercase border-r border-border text-muted-foreground hover:text-foreground transition-colors"
              data-testid="btn-open-quick-add"
            >
              <Plus className="h-3 w-3" />
              Add Word
            </button>
          )}

          {/* Right: primary action buttons */}
          <div className="ml-auto flex items-center gap-3 px-4">
            <SuggestWordsModal />
            <AutofillPanel onComplete={onAutofillComplete} />
            <ExportModal filters={filters} />
          </div>
        </div>
      )}

      {/* ── Filter row ── */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filters.region || "all"} onValueChange={(v) => handleFilterChange("region", v)}>
            <SelectTrigger className="w-[120px] h-8 text-xs bg-background" data-testid="select-region">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {REGIONS.filter(r => r !== "All").map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.surroundings || "all"} onValueChange={(v) => handleFilterChange("surroundings", v)}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-background" data-testid="select-surroundings">
              <SelectValue placeholder="Surroundings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Surr.</SelectItem>
              {SURROUNDINGS.filter(s => s !== "All").map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.age || "all"} onValueChange={(v) => handleFilterChange("age", v)}>
            <SelectTrigger className="w-[110px] h-8 text-xs bg-background" data-testid="select-age">
              <SelectValue placeholder="Age" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ages</SelectItem>
              {AGES.map(a => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.findability || "all"} onValueChange={(v) => handleFilterChange("findability", v)}>
            <SelectTrigger className="w-[120px] h-8 text-xs bg-background" data-testid="select-findability">
              <SelectValue placeholder="Findability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Findability</SelectItem>
              {FINDABILITY.map(f => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.season || "all"} onValueChange={(v) => handleFilterChange("season", v)}>
            <SelectTrigger className="w-[110px] h-8 text-xs bg-background" data-testid="select-season">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons</SelectItem>
              {SEASONS.filter(s => s !== "All").map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.board || "all"} onValueChange={(v) => handleFilterChange("board", v)}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-background" data-testid="select-board">
              <SelectValue placeholder="Board" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Boards</SelectItem>
              {boardNames.map(b => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2 bg-background border px-3 py-1.5 rounded-md h-8">
            <Switch
              id="incomplete-only"
              checked={!!filters.incomplete}
              onCheckedChange={(c) => handleFilterChange("incomplete", c ? true : undefined)}
              data-testid="switch-incomplete"
            />
            <Label htmlFor="incomplete-only" className="text-xs cursor-pointer">Incomplete Only</Label>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              data-testid="btn-clear-filters"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
