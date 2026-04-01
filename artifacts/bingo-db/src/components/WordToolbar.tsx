import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListWordsParams, useCreateWord } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
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
}

export default function WordToolbar({ filters, setFilters, onClearBoard, section }: WordToolbarProps) {
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
    <div className="flex flex-col gap-2">
      {/* ── Search row ── */}
      {showSearch && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <form onSubmit={handleSearch} className="relative flex items-center w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search words..."
                className="pl-9 bg-background w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search"
              />
            </form>

            {quickAddOpen ? (
              <form onSubmit={handleQuickAdd} className="flex items-center gap-1.5">
                <Input
                  ref={quickAddRef}
                  placeholder="New word name…"
                  className="h-9 text-sm bg-background w-44"
                  value={quickAddValue}
                  onChange={(e) => setQuickAddValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { setQuickAddOpen(false); setQuickAddValue(""); }
                  }}
                  data-testid="input-quick-add-toolbar"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 text-xs px-3"
                  disabled={!quickAddValue.trim() || createMutation.isPending}
                  data-testid="btn-quick-add-toolbar"
                >
                  {createMutation.isPending ? "Adding…" : "Add"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setQuickAddOpen(false); setQuickAddValue(""); }}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs shrink-0"
                onClick={handleQuickAddToggle}
                data-testid="btn-open-quick-add"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Word
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SuggestWordsModal />
            <AutofillPanel />
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
