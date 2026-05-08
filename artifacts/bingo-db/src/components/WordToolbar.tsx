import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ListWordsParams, useCreateWord } from "@workspace/api-client-react";
import { Search, X, Plus } from "lucide-react";
import SuggestWordsModal from "./SuggestWordsModal";
import AutofillPanel from "./AutofillPanel";
import ExportModal from "./ExportModal";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface WordToolbarProps {
  filters: ListWordsParams;
  setFilters: React.Dispatch<React.SetStateAction<ListWordsParams>>;
  onClearBoard?: () => void;
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

  const clearFilters = () => {
    setSearchQuery("");
    setFilters({ limit: 500, offset: 0 });
    onClearBoard?.();
  };

  const hasActiveFilters = Object.keys(filters).some(
    (k) => !["limit", "offset", "search"].includes(k) && filters[k as keyof ListWordsParams] !== undefined
  ) || !!filters.search;

  const showSearch = !section || section === "search";

  return (
    <div className="flex flex-col">
      {/* ── Search bar — flat strip ── */}
      {showSearch && (
        <div className="flex items-stretch">

          {/* Search input */}
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

          {/* + Add Word */}
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

          {/* Incomplete toggle */}
          <button
            onClick={() => setFilters((prev) => ({ ...prev, incomplete: prev.incomplete ? undefined : true, offset: 0 }))}
            className={cn(
              "flex items-center gap-1.5 px-5 py-3 font-mono text-[10.5px] tracking-[0.18em] uppercase border-r border-border transition-colors",
              filters.incomplete ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            data-testid="switch-incomplete"
          >
            {filters.incomplete && <span className="h-1.5 w-1.5 rounded-full bg-foreground" />}
            Incomplete
          </button>

          {/* Clear — only when filters active */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-4 py-3 font-mono text-[10.5px] tracking-[0.18em] uppercase border-r border-border text-muted-foreground hover:text-foreground transition-colors"
              data-testid="btn-clear-filters"
            >
              <X className="h-3 w-3" />
              Clear
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
    </div>
  );
}
