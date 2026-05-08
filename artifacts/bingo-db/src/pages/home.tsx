import { useState, useRef, useCallback, useEffect } from "react";
import { ListWordsParams } from "@workspace/api-client-react";
import WordTable from "@/components/WordTable";
import WordToolbar from "@/components/WordToolbar";
import StatsSidebar from "@/components/StatsSidebar";
import BoardsPanel from "@/components/BoardsPanel";
import ThemePanel from "@/components/ThemePanel";
import DefinitionsPanel from "@/components/DefinitionsPanel";
import SnapshotsPanel from "@/components/SnapshotsPanel";
import AnalysisPanel from "@/components/AnalysisPanel";
import { cn } from "@/lib/utils";
import { TableIcon, LayoutGrid, Palette, BookOpen, DatabaseZap, BarChart2 } from "lucide-react";
import appIcon from "@assets/icon-512_1775010520611.png";

// Single source of truth for tabs — Tab type is derived automatically so the
// type and the array can never drift apart. Adding a tab to TABS but forgetting
// to update the type produces a compile-time error at every call site.
const TABS = [
  { id: "words",       icon: TableIcon,    label: "Words" },
  { id: "boards",      icon: LayoutGrid,   label: "Boards" },
  { id: "analysis",    icon: BarChart2,    label: "Analysis" },
  { id: "definitions", icon: BookOpen,     label: "Definitions" },
  { id: "theme",       icon: Palette,      label: "Theme" },
  { id: "snapshots",   icon: DatabaseZap,  label: "Snapshots" },
] as const;

type Tab = typeof TABS[number]["id"];

export default function Home() {
  const [tab, setTab] = useState<Tab>("words");
  const [filters, setFilters] = useState<ListWordsParams>({ limit: 500, offset: 0 });
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [filterBarFixed, setFilterBarFixed] = useState(false);
  const [aiChanges, setAiChanges] = useState<Record<number, Set<string>>>({});

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const filterRowRef = useRef<HTMLDivElement>(null);
  // Actual rendered height of the filter bar — measured via ResizeObserver so
  // the scroll swap stays correct at any browser zoom level or text size.
  const filterBarHeightRef = useRef<number>(49);
  const aiClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (aiClearTimer.current) clearTimeout(aiClearTimer.current); }, []);

  // Re-run whenever tab changes so we pick up the element after it mounts.
  useEffect(() => {
    const el = filterRowRef.current;
    if (!el) return;
    // Measure immediately so the first scroll event uses the real height.
    filterBarHeightRef.current = el.getBoundingClientRect().height;
    const observer = new ResizeObserver(() => {
      filterBarHeightRef.current = el.getBoundingClientRect().height;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [tab]);

  function handleAutofillComplete(results: Array<{ id: number }>, fields: string[]) {
    if (aiClearTimer.current) clearTimeout(aiClearTimer.current);
    const changes: Record<number, Set<string>> = {};
    for (const w of results) changes[w.id] = new Set(fields);
    setAiChanges(changes);
    aiClearTimer.current = setTimeout(() => setAiChanges({}), 90_000);
  }

  // Show the fixed overlay exactly when the native filter row's bottom has
  // scrolled to the position of the fixed bar — seamless swap at any zoom.
  const handleScroll = useCallback(() => {
    if (!filterRowRef.current) {
      setFilterBarFixed(false);
      return;
    }
    const bottom = filterRowRef.current.getBoundingClientRect().bottom;
    setFilterBarFixed(bottom <= filterBarHeightRef.current);
  }, []);

  function handleTabChange(next: Tab) {
    setTab(next);
    setFilterBarFixed(false);
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }

  function handleSelectBoard(boardName: string | null) {
    setSelectedBoard(boardName);
    setFilters((prev) => ({ ...prev, board: boardName ?? undefined, offset: 0 }));
    if (boardName) handleTabChange("words");
  }

  function resetHome() {
    handleTabChange("words");
    setFilters({ limit: 500, offset: 0 });
    setSelectedBoard(null);
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }

  function clearBoard() {
    setSelectedBoard(null);
  }

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground flex flex-col font-sans">

      {/* ── Fixed filter overlay — only rendered when filter row is off-screen ── */}
      {tab === "words" && filterBarFixed && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b shadow-md px-4 py-2">
          <WordToolbar
            filters={filters}
            setFilters={setFilters}
            onClearBoard={clearBoard}
            section="filters"
          />
        </div>
      )}

      {/* ── Single scrollable container — header + content scroll together ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {/* Header flows naturally with content */}
        <header className="bg-card border-b shadow-sm">

          {/* Brand + stats row */}
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              title="Reset to home"
              onClick={resetHome}
            >
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm shrink-0">
                <img src={appIcon} alt="Road Trip Bingo" className="w-full h-full object-cover" />
              </div>
              <div className="text-left">
                <h1 className="font-bold text-lg leading-tight tracking-tight">Road Trip Bingo</h1>
                <p className="text-xs text-muted-foreground font-medium">Data Cockpit</p>
              </div>
            </button>
            <StatsSidebar onClick={() => handleTabChange("analysis")} />
          </div>

          {/* Tab row */}
          <div className="flex items-center px-4 border-t">
            {TABS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  tab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
                data-testid={`tab-${id}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {id === "words" && selectedBoard && (
                  <span className="ml-1 px-1.5 py-0 text-[10px] rounded-full bg-primary/15 text-primary font-semibold">
                    {selectedBoard}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search + actions row — words tab only */}
          {tab === "words" && (
            <div className="border-t bg-muted/30 px-4 py-2">
              <WordToolbar
                filters={filters}
                setFilters={setFilters}
                onClearBoard={clearBoard}
                section="search"
                onAutofillComplete={handleAutofillComplete}
              />
            </div>
          )}

          {/* Filter row — words tab only; ref tracked for scroll + height measurement */}
          {tab === "words" && (
            <div ref={filterRowRef} className="border-t bg-muted/20 px-4 py-2">
              <WordToolbar
                filters={filters}
                setFilters={setFilters}
                onClearBoard={clearBoard}
                section="filters"
              />
            </div>
          )}
        </header>

        {/* Main content */}
        <main className="p-4">
          {tab === "words" ? (
            <WordTable
              filters={filters}
              stickyTop={filterBarFixed ? filterBarHeightRef.current : 0}
              aiChanges={aiChanges}
            />
          ) : tab === "boards" ? (
            <BoardsPanel onSelectBoard={handleSelectBoard} selectedBoard={selectedBoard} />
          ) : tab === "analysis" ? (
            <AnalysisPanel />
          ) : tab === "definitions" ? (
            <DefinitionsPanel />
          ) : tab === "snapshots" ? (
            <SnapshotsPanel />
          ) : (
            <ThemePanel />
          )}
        </main>
      </div>
    </div>
  );
}
