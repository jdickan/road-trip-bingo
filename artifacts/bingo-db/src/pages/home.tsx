import { useState, useRef, useEffect } from "react";
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
  const [aiChanges, setAiChanges] = useState<Record<number, Set<string>>>({});

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const aiClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (aiClearTimer.current) clearTimeout(aiClearTimer.current); }, []);

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

      {/* ── Single scrollable container ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
      >
        {/* Header flows naturally with content */}
        <header className="bg-card border-b shadow-sm">

          {/* Brand + stats row */}
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              className="flex items-center gap-3 hover:opacity-75 transition-opacity"
              title="Reset to home"
              onClick={resetHome}
            >
              <div className="w-9 h-9 rounded-[6px] overflow-hidden shrink-0">
                <img src={appIcon} alt="Road Trip Bingo" className="w-full h-full object-cover" />
              </div>
              <div className="text-left">
                <h1 className="font-semibold text-[17px] leading-tight tracking-[-0.025em]">Road Trip Bingo</h1>
                <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground leading-none mt-0.5">Data Cockpit</p>
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
                  <span className="ml-1 px-1.5 py-px font-mono text-[9px] tracking-[0.04em] border border-primary/30 text-primary bg-primary/10">
                    {selectedBoard}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search + actions row — words tab only */}
          {tab === "words" && (
            <div className="border-t">
              <WordToolbar
                filters={filters}
                setFilters={setFilters}
                onClearBoard={clearBoard}
                section="search"
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
