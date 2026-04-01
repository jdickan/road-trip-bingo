import { useState, useRef, useCallback } from "react";
import { ListWordsParams } from "@workspace/api-client-react";
import WordTable from "@/components/WordTable";
import WordToolbar from "@/components/WordToolbar";
import StatsSidebar from "@/components/StatsSidebar";
import BoardsPanel from "@/components/BoardsPanel";
import ThemePanel from "@/components/ThemePanel";
import DefinitionsPanel from "@/components/DefinitionsPanel";
import { cn } from "@/lib/utils";
import { TableIcon, LayoutGrid, Palette, BookOpen } from "lucide-react";
import appIcon from "@assets/icon-512_1775010520611.png";

type Tab = "words" | "boards" | "definitions" | "theme";

// Height of the fixed filter overlay bar (py-2 × 2 + h-8 content + 1px border)
const FILTER_BAR_HEIGHT = 49;

export default function Home() {
  const [tab, setTab] = useState<Tab>("words");
  const [filters, setFilters] = useState<ListWordsParams>({ limit: 500, offset: 0 });
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [filterBarFixed, setFilterBarFixed] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const filterRowRef = useRef<HTMLDivElement>(null);

  // Show the fixed overlay exactly when the native filter row's bottom
  // has scrolled to the position of the fixed bar (seamless swap).
  const handleScroll = useCallback(() => {
    if (!filterRowRef.current) {
      setFilterBarFixed(false);
      return;
    }
    const bottom = filterRowRef.current.getBoundingClientRect().bottom;
    setFilterBarFixed(bottom <= FILTER_BAR_HEIGHT);
  }, []);

  function handleTabChange(next: Tab) {
    setTab(next);
    setFilterBarFixed(false);
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
            <StatsSidebar />
          </div>

          {/* Tab row */}
          <div className="flex items-center px-4 border-t">
            {(
              [
                { id: "words",       icon: <TableIcon className="h-3.5 w-3.5" />, label: "Words" },
                { id: "boards",      icon: <LayoutGrid className="h-3.5 w-3.5" />, label: "Boards" },
                { id: "definitions", icon: <BookOpen className="h-3.5 w-3.5" />, label: "Definitions" },
                { id: "theme",       icon: <Palette className="h-3.5 w-3.5" />, label: "Theme" },
              ] as const
            ).map(({ id, icon, label }) => (
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
                {icon}
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
              />
            </div>
          )}

          {/* Filter row — words tab only; ref tracked for scroll detection */}
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
              stickyTop={filterBarFixed ? FILTER_BAR_HEIGHT : 0}
            />
          ) : tab === "boards" ? (
            <BoardsPanel onSelectBoard={handleSelectBoard} selectedBoard={selectedBoard} />
          ) : tab === "definitions" ? (
            <DefinitionsPanel />
          ) : (
            <ThemePanel />
          )}
        </main>
      </div>
    </div>
  );
}
