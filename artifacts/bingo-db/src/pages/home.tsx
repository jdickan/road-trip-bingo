import { useState } from "react";
import { ListWordsParams } from "@workspace/api-client-react";
import WordTable from "@/components/WordTable";
import WordToolbar from "@/components/WordToolbar";
import StatsSidebar from "@/components/StatsSidebar";
import BoardsPanel from "@/components/BoardsPanel";
import { cn } from "@/lib/utils";
import { TableIcon, LayoutGrid } from "lucide-react";

type Tab = "words" | "boards";

export default function Home() {
  const [tab, setTab] = useState<Tab>("words");
  const [filters, setFilters] = useState<ListWordsParams>({
    limit: 500,
    offset: 0,
  });
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);

  function handleSelectBoard(boardName: string | null) {
    setSelectedBoard(boardName);
    setFilters((prev) => ({
      ...prev,
      board: boardName ?? undefined,
      offset: 0,
    }));
    if (boardName) setTab("words");
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
              B
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">Road Trip Bingo</h1>
              <p className="text-xs text-muted-foreground font-medium">Data Cockpit</p>
            </div>
          </div>
          <StatsSidebar />
        </div>

        {/* Tabs */}
        <div className="border-t flex items-center gap-0 px-4">
          <button
            onClick={() => setTab("words")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === "words"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
            data-testid="tab-words"
          >
            <TableIcon className="h-3.5 w-3.5" />
            Words
            {selectedBoard && (
              <span className="ml-1 px-1.5 py-0 text-[10px] rounded-full bg-primary/15 text-primary font-semibold">
                {selectedBoard}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("boards")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === "boards"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
            data-testid="tab-boards"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Boards
          </button>
        </div>

        {/* Word toolbar only shows on words tab */}
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 flex flex-col">
        {tab === "words" ? (
          <WordTable filters={filters} />
        ) : (
          <BoardsPanel
            onSelectBoard={handleSelectBoard}
            selectedBoard={selectedBoard}
          />
        )}
      </main>
    </div>
  );
}
