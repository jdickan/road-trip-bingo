import { useState, useRef, useEffect } from "react";
import { ListWordsParams, useListDeletedWords, getListDeletedWordsQueryKey } from "@workspace/api-client-react";
import WordTable from "@/components/WordTable";
import WordFilterBar from "@/components/WordFilterBar";
import BoardsPanel from "@/components/BoardsPanel";
import ThemePanel from "@/components/ThemePanel";
import DefinitionsPanel from "@/components/DefinitionsPanel";
import SnapshotsPanel from "@/components/SnapshotsPanel";
import AnalysisPanel from "@/components/AnalysisPanel";
import DeletedWordsPanel from "@/components/DeletedWordsPanel";
import TodoPanel from "@/components/TodoPanel";
import ConnectionBanner from "@/components/ConnectionBanner";
import { cn } from "@/lib/utils";
import { TableIcon, LayoutGrid, Palette, BookOpen, DatabaseZap, BarChart2, Trash2, ClipboardList } from "lucide-react";
import appIcon from "@assets/icon-512_1775010520611.png";

const STATIC_TABS = [
  { id: "words",       icon: TableIcon,     label: "Words" },
  { id: "analysis",    icon: BarChart2,     label: "Stats" },
  { id: "boards",      icon: LayoutGrid,    label: "Boards" },
  { id: "definitions", icon: BookOpen,      label: "Definitions" },
  { id: "theme",       icon: Palette,       label: "Theme" },
  { id: "snapshots",   icon: DatabaseZap,   label: "Snapshots" },
  { id: "todo",        icon: ClipboardList, label: "To-Do" },
] as const;

const TRASH_TAB = { id: "trash", icon: Trash2, label: "Trash" } as const;

type StaticTab = typeof STATIC_TABS[number]["id"];
type Tab = StaticTab | "trash";

export default function Home() {
  const [tab, setTab] = useState<Tab>("words");
  const [filters, setFilters] = useState<ListWordsParams>({ limit: 500, offset: 0 });
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [aiChanges, setAiChanges] = useState<Record<number, Set<string>>>({});
  const [filterBarFixed, setFilterBarFixed] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const filterBarInlineRef = useRef<HTMLDivElement>(null);
  const aiClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: deletedData } = useListDeletedWords({
    query: { queryKey: getListDeletedWordsQueryKey(), staleTime: 10_000 },
  });
  const deletedTotal = deletedData?.total ?? 0;

  // If trash tab is active but trash is now empty, bounce back to words
  useEffect(() => {
    if (tab === "trash" && deletedData && deletedTotal === 0) {
      setTab("words");
    }
  }, [tab, deletedData, deletedTotal]);

  useEffect(() => () => { if (aiClearTimer.current) clearTimeout(aiClearTimer.current); }, []);

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
      setFilterBarFixed(scrollEl.scrollTop > threshold);
    };

    const handleScroll = () => {
      setFilterBarFixed(scrollEl.scrollTop > threshold);
    };

    recompute();
    scrollEl.addEventListener("scroll", handleScroll, { passive: true });

    const ro = new ResizeObserver(recompute);
    if (filterBarInlineRef.current) ro.observe(filterBarInlineRef.current);
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

      {/* ── Connection status banner ── */}
      <ConnectionBanner />

      {/* ── Fixed filter overlay ── */}
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

      {/* ── Single scrollable container ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
      >
        {/* Header */}
        <header className="bg-card border-b">

          {/* Brand + tabs row */}
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
              <h1 className="font-mono text-[10.5px] tracking-[0.06em] uppercase leading-none">
                <span className="text-primary">Road Trip Bingo</span>
                <span className="text-muted-foreground"> · Data</span>
              </h1>
            </button>

            {/* Tabs */}
            <div className="flex items-end">
              {STATIC_TABS.map(({ id, icon: Icon, label }) => (
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
                </button>
              ))}

              {/* Trash tab — only when deleted words exist */}
              {deletedTotal > 0 && (
                <button
                  onClick={() => handleTabChange("trash")}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2.5 font-mono text-[10.5px] tracking-[0.06em] uppercase border-b-2 transition-colors",
                    tab === "trash"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground/60 hover:text-foreground hover:border-border"
                  )}
                  data-testid="tab-trash"
                >
                  <TRASH_TAB.icon className="h-3 w-3" />
                  {TRASH_TAB.label}
                  <span className="ml-0.5 tabular-nums opacity-60">{deletedTotal}</span>
                </button>
              )}
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
            <AnalysisPanel onGoToWords={() => handleTabChange("words")} />
          ) : tab === "definitions" ? (
            <DefinitionsPanel />
          ) : tab === "snapshots" ? (
            <SnapshotsPanel />
          ) : tab === "todo" ? (
            <TodoPanel />
          ) : tab === "trash" ? (
            <DeletedWordsPanel onEmpty={() => handleTabChange("words")} />
          ) : (
            <ThemePanel />
          )}
        </main>
      </div>
    </div>
  );
}
