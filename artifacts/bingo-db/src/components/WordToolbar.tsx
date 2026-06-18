import { useState, useRef } from "react";
import { ListWordsParams } from "@workspace/api-client-react";
import { Search, X } from "lucide-react";
import SuggestWordsModal from "./SuggestWordsModal";
import AutofillPanel from "./AutofillPanel";
import ExportModal from "./ExportModal";
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
  const [searchOpen, setSearchOpen] = useState(!!filters.search);
  const searchInputRef = useRef<HTMLInputElement>(null);

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
    setFilters((prev) => ({ ...prev, search: undefined, offset: 0 }));
  }

  const clearFilters = () => {
    closeSearch();
    setFilters({ limit: 500, offset: 0 });
    onClearBoard?.();
  };

  const hasActiveFilters = Object.keys(filters).some(
    (k) => !["limit", "offset", "search", "incomplete"].includes(k) && filters[k as keyof ListWordsParams] !== undefined
  ) || !!filters.search;

  const showSearch = !section || section === "search";

  return (
    <div className="flex flex-col">
      {showSearch && (
        <div className="flex items-stretch">

          {/* Search — icon that slides open */}
          <div className={cn(
            "flex items-center border-r border-border transition-all duration-200",
            searchOpen ? "pl-3 pr-2" : ""
          )}>
            <button
              onClick={searchOpen ? closeSearch : openSearch}
              className={cn(
                "p-3 transition-colors shrink-0",
                searchOpen
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={searchOpen ? "Close search" : "Search words"}
              data-testid="btn-toggle-search"
            >
              <Search className="h-3.5 w-3.5" />
            </button>

            {/* Sliding input */}
            <div className={cn(
              "overflow-hidden transition-all duration-200 ease-in-out flex items-center",
              searchOpen ? "max-w-[12rem] opacity-100" : "max-w-0 opacity-0 pointer-events-none"
            )}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search words..."
                aria-label="Search words"
                className="bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground/50 placeholder:text-xs outline-none border-none w-44 shrink-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setFilters((prev) => ({ ...prev, search: searchQuery, offset: 0 }));
                  if (e.key === "Escape") closeSearch();
                }}
                data-testid="input-search"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setFilters((prev) => ({ ...prev, search: undefined, offset: 0 })); }}
                  aria-label="Clear search query"
                  className="ml-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Incomplete only toggle */}
          <button
            onClick={() => setFilters((prev) => ({ ...prev, incomplete: prev.incomplete ? undefined : true, offset: 0 }))}
            className={cn(
              "flex items-center gap-1.5 mx-3 my-2 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.18em] uppercase border transition-all rounded-sm",
              filters.incomplete
                ? "border-primary/30 bg-muted text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
            )}
            data-testid="switch-incomplete"
          >
            <span className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              filters.incomplete ? "bg-primary" : "bg-border"
            )} />
            Incomplete only
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
