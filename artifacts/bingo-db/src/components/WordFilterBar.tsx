import { useState, useRef } from "react";
import { ListWordsParams, useGetWordStats } from "@workspace/api-client-react";
import { Search, X, LayoutGrid } from "lucide-react";
import SuggestWordsModal from "./SuggestWordsModal";
import BulkAddModal from "./BulkAddModal";
import VoiceAddModal from "./VoiceAddModal";
import AutofillPanel from "./AutofillPanel";
import ExportModal from "./ExportModal";
import { cn } from "@/lib/utils";

interface WordFilterBarProps {
  filters: ListWordsParams;
  setFilters: React.Dispatch<React.SetStateAction<ListWordsParams>>;
  onClearBoard?: () => void;
  onAutofillComplete?: (results: Array<{ id: number }>, fields: string[]) => void;
}

type ViewMode = "all" | "complete" | "incomplete";

function getViewMode(filters: ListWordsParams): ViewMode {
  if (filters.incomplete) return "incomplete";
  if ((filters as Record<string, unknown>).complete) return "complete";
  return "all";
}

export default function WordFilterBar({
  filters,
  setFilters,
  onClearBoard,
  onAutofillComplete,
}: WordFilterBarProps) {
  const [searchQuery, setSearchQuery] = useState(filters.search || "");
  const [searchOpen, setSearchOpen] = useState(!!filters.search);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: stats } = useGetWordStats();
  const total = stats?.total ?? 0;
  const incomplete = stats?.incomplete ?? 0;
  const complete = total - incomplete;

  const viewMode = getViewMode(filters);

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
    setFilters((prev) => ({ ...prev, search: undefined, offset: 0 }));
  }

  function setViewMode(mode: ViewMode) {
    setFilters((prev) => ({
      ...prev,
      incomplete: mode === "incomplete" ? true : undefined,
      complete: mode === "complete" ? true : undefined,
      offset: 0,
    } as ListWordsParams));
  }

  const TABS: { id: ViewMode; label: string; count: number }[] = [
    { id: "all", label: "All", count: total },
    { id: "complete", label: "Complete", count: complete },
    { id: "incomplete", label: "Incomplete", count: incomplete },
  ];

  return (
    <div className="flex items-stretch border-b border-border">

      {/* Search — icon that slides open */}
      <div className={cn(
        "flex items-center border-r border-border transition-all duration-200",
        searchOpen ? "pl-3 pr-2" : ""
      )}>
        <button
          onClick={searchOpen ? closeSearch : openSearch}
          className={cn(
            "p-3 transition-colors shrink-0",
            searchOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
          title={searchOpen ? "Close search" : "Search words"}
        >
          <Search className="h-3.5 w-3.5" />
        </button>

        <div className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out flex items-center",
          searchOpen ? "max-w-[12rem] opacity-100" : "max-w-0 opacity-0 pointer-events-none"
        )}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search words…"
            className="bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground/50 placeholder:text-xs outline-none border-none w-44 shrink-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setFilters((prev) => ({ ...prev, search: searchQuery, offset: 0 }));
              if (e.key === "Escape") closeSearch();
            }}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setFilters((prev) => ({ ...prev, search: undefined, offset: 0 })); }}
              className="ml-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* View mode tabs: ALL | COMPLETE | INCOMPLETE */}
      <div className="flex items-stretch divide-x divide-border">
        {TABS.map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setViewMode(id)}
            className={cn(
              "relative px-5 py-3 font-mono text-[10.5px] tracking-[0.18em] uppercase transition-colors duration-150",
              viewMode === id
                ? "text-primary after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-px after:bg-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            {stats && (
              <span className="ml-1.5 opacity-50 tabular-nums">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Active board chip */}
      {filters.board && (
        <div className="flex items-center border-l border-border px-4">
          <div className="flex items-center gap-1.5 pl-1.5 pr-1 py-1 font-mono text-[10.5px] tracking-[0.12em] uppercase border border-border text-foreground bg-muted/40">
            <LayoutGrid className="h-3 w-3 text-muted-foreground shrink-0" />
            <span>{filters.board}</span>
            <button
              onClick={() => {
                setFilters((prev) => ({ ...prev, board: undefined, offset: 0 }));
                onClearBoard?.();
              }}
              className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
              title="Remove board filter"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Right: action buttons */}
      <div className="ml-auto flex items-center gap-3 px-4">
        <VoiceAddModal />
        <BulkAddModal />
        <SuggestWordsModal />
        <AutofillPanel onComplete={onAutofillComplete} />
        <ExportModal filters={filters} />
      </div>
    </div>
  );
}
