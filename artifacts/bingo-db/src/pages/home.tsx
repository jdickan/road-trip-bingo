import { useState, useRef, useEffect } from "react";
import { ListWordsParams } from "@workspace/api-client-react";
import WordTable from "@/components/WordTable";
import WordFilterBar from "@/components/WordFilterBar";
import BoardsPanel from "@/components/BoardsPanel";
import ThemePanel from "@/components/ThemePanel";
import DefinitionsPanel from "@/components/DefinitionsPanel";
import SnapshotsPanel from "@/components/SnapshotsPanel";
import AnalysisPanel from "@/components/AnalysisPanel";
import ConnectionBanner from "@/components/ConnectionBanner";
import { cn } from "@/lib/utils";
import { TableIcon, LayoutGrid, Palette, BookOpen, DatabaseZap, BarChart2 } from "lucide-react";
import appIcon from "@assets/icon-512_1775010520611.png";

const TABS = [
  { id: "words",       icon: TableIcon,    label: "Words" },
  { id: "analysis",    icon: BarChart2,    label: "Stats" },
  { id: "boards",      icon: LayoutGrid,   label: "Boards" },
  { id: "definitions", icon: BookOpen,     label: "Definitions" },
  { id: "theme",       icon: Palette,      label: "Theme" },
  { id: "snapshots",   icon: DatabaseZap,  label: "Snapshots" },
] as const;

type Tab = typeof TABS[number]["id"];

export default function Home() {
  const [tab, setTab] = useState<Tab>("words");
  const [filters, setFilters] = useState<ListWordsParams>({ limit: 500, offset: 0 });
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [aiChanges, setAiChanges] = useState<Record<number, Set<string>>>({});
  const [filterBarFixed, setFilterBarFixed] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const filterBarInlineRef = useRef<HTMLDivElement>(null);
  const aiClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (aiClearTimer.current) clearTimeout(aiClearTimer.current); }, []);

  // Swap to the fixed overlay once the inline filter bar's bottom edge has
  // scrolled past the top of the scroll container. The threshold is measured
  // from the live DOM (offsetTop + offsetHeight) and recomputed via
  // ResizeObserver, so it stays correct under browser zoom, font-size changes,
  // tab switches, and dynamic header content (e.g. board pill).
  useEffect(() => {
    const scrollEl = scrollContainerRef.current;
    if (!scrollEl) return;

    let threshold = Infinity;

    const recompute = () => {
      const bar = filterBarInlineRef.current;
      if (!bar) {
        threshold = Infinity;
        return;
      }
      threshold = bar.offsetTop + bar.offsetHeight;
      // Re-evaluate immediately so a zoom change while scrolled doesn't leave
      // the overlay in a stale state.
      setFilterBarFixed(scrollEl.scrollTop > threshold);
    };

    const handleScroll = () => {
      setFilterBarFixed(scrollEl.scrollTop > threshold);
    };

    recompute();
    scrollEl.addEventListener("scroll", handleScroll, { passive: true });

    const ro = new ResizeObserver(recompute);
    if (filterBarInlineRef.current) ro.observe(filterBarInlineRef.current);
    // The container itself can resize when the user zooms or rotates; that
    // doesn't change offsetTop but may change which threshold value matters.
    ro.observe(scrollEl);
    window.addEventListener("resize", recompute);

    return () => {
      scrollEl.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", recompute);
      ro.disconnect();
    };
  }, [tab]);

  function handleAutofillComplete(results: Array<{ id: number }>, fields: string[]) {
    if (aiClearTimer.current) clearTimeout(aiClearTimer.current);
    const changes: Record<number, Set<string>> = {};
    for (const w of results) changes[w.id] = new Set(fields);
    setAiChanges(changes);
    aiClearTimer.current = setTimeout(() => setAiChanges({}), 90_000);
  }

  function handleTabChange(next: Tab) {
    setTab(next);
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

      {/* ── Connection status banner — shown when API server is unreachable ── */}
      <ConnectionBanner />

      {/* ── Fixed filter overlay — only rendered when filter row is off-screen ── */}
      {tab === "words" && filterBarFixed && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b">
          <WordFilterBar
            filters={filters}
            setFilters={setFilters}
            onClearBoard={clearBoard}
            onAutofillComplete={handleAutofillComplete}
          />
        </div>
      )}

      {/* ── Single scrollable container — header + content scroll together ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
      >
        {/* Header flows naturally with content */}
        <header className="bg-card border-b">

          {/* Brand + tabs row — logo left, tabs right-aligned and bottom-anchored */}
          <div className="flex items-end justify-between pl-4">
            {/* Logo */}
            <button
              className="flex items-center gap-2 pb-[11px] hover:opacity-75 transition-opacity"
              title="Reset to home"
              onClick={resetHome}
            >
              <div className="w-5 h-5 rounded-md overflow-hidden shrink-0">
                <img src={appIcon} alt="Road Trip Bingo Data" className="w-full h-full object-cover" />
              </div>
              <h1 className="font-mono text-[10.5px] tracking-[0.06em] uppercase text-foreground leading-none">Road Trip Bingo Data</h1>
            </button>

            {/* Tabs — right-aligned, bottom border acts as active indicator */}
            <div className="flex items-end">
              {TABS.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => handleTabChange(id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2.5 font-mono text-[10.5px] tracking-[0.06em] uppercase border-b-2 transition-colors",
                    tab === id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                  data-testid={`tab-${id}`}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                  {id === "words" && selectedBoard && (
                    <span className="ml-1 px-1.5 py-px font-mono text-[9.5px] tracking-[0.04em] border border-primary/30 text-primary bg-primary/10">
                      {selectedBoard}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Filter bar — words tab only */}
          {tab === "words" && (
            <div ref={filterBarInlineRef} className="border-t">
              <WordFilterBar
                filters={filters}
                setFilters={setFilters}
                onClearBoard={clearBoard}
                onAutofillComplete={handleAutofillComplete}
              />
            </div>
          )}
        </header>

        {/* Main content */}
        <main className="p-4">
          {tab === "words" ? (
            <WordTable
              filters={filters}
              setFilters={setFilters}
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
