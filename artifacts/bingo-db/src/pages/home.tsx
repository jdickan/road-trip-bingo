import { useState, useRef, useEffect, useCallback } from "react";
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

export default function Home() {
  const [tab, setTab] = useState<Tab>("words");
  const [filters, setFilters] = useState<ListWordsParams>({ limit: 500, offset: 0 });
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [headerCompact, setHeaderCompact] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  // Scroll-aware header: logo/stats row hides on scroll-down, reveals on scroll-up
  const handleScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      const el = mainRef.current;
      if (el) {
        const y = el.scrollTop;
        const delta = y - lastScrollY.current;
        if (y <= 48) {
          setHeaderCompact(false);
        } else if (delta > 6) {
          setHeaderCompact(true);   // scrolling down → hide brand row
        } else if (delta < -6) {
          setHeaderCompact(false);  // scrolling up → reveal brand row
        }
        lastScrollY.current = y;
      }
      ticking.current = false;
    });
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  function handleSelectBoard(boardName: string | null) {
    setSelectedBoard(boardName);
    setFilters((prev) => ({ ...prev, board: boardName ?? undefined, offset: 0 }));
    if (boardName) setTab("words");
  }

  function resetHome() {
    setTab("words");
    setFilters({ limit: 500, offset: 0 });
    setSelectedBoard(null);
    // Scroll back to top
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Sticky header */}
      <header className="border-b bg-card sticky top-0 z-20 shadow-sm">

        {/* Brand row — slides away when scrolling down */}
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            maxHeight: headerCompact ? "0px" : "64px",
            opacity: headerCompact ? 0 : 1,
          }}
        >
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
        </div>

        {/* Tab row — always sticky */}
        <div className={cn("flex items-center gap-0 px-4", !headerCompact && "border-t")}>
          {/* Compact logo shown when brand is hidden */}
          {headerCompact && (
            <button
              onClick={resetHome}
              className="mr-3 shrink-0 hover:opacity-70 transition-opacity"
              title="Reset to home"
            >
              <div className="w-7 h-7 rounded-lg overflow-hidden shadow-sm">
                <img src={appIcon} alt="Road Trip Bingo" className="w-full h-full object-cover" />
              </div>
            </button>
          )}

          {(
            [
              { id: "words", icon: <TableIcon className="h-3.5 w-3.5" />, label: "Words" },
              { id: "boards", icon: <LayoutGrid className="h-3.5 w-3.5" />, label: "Boards" },
              { id: "definitions", icon: <BookOpen className="h-3.5 w-3.5" />, label: "Definitions" },
              { id: "theme", icon: <Palette className="h-3.5 w-3.5" />, label: "Theme" },
            ] as const
          ).map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
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

        {/* Word toolbar — only on words tab, always sticky */}
        {tab === "words" && (
          <div className="border-t bg-muted/30 px-4 py-2">
            <WordToolbar
              filters={filters}
              setFilters={setFilters}
              onClearBoard={() => setSelectedBoard(null)}
            />
          </div>
        )}
      </header>

      {/* Main scrollable content */}
      <main ref={mainRef} className="flex-1 overflow-auto p-4 flex flex-col">
        {tab === "words" ? (
          <WordTable filters={filters} />
        ) : tab === "boards" ? (
          <BoardsPanel onSelectBoard={handleSelectBoard} selectedBoard={selectedBoard} />
        ) : tab === "definitions" ? (
          <DefinitionsPanel />
        ) : (
          <ThemePanel />
        )}
      </main>
    </div>
  );
}
