import { useState } from "react";
import { ListWordsParams } from "@workspace/api-client-react";
import WordTable from "@/components/WordTable";
import WordToolbar from "@/components/WordToolbar";
import StatsSidebar from "@/components/StatsSidebar";

export default function Home() {
  const [filters, setFilters] = useState<ListWordsParams>({
    limit: 500,
    offset: 0,
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Header / Stats */}
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
        <div className="border-t bg-muted/30 px-4 py-2">
          <WordToolbar filters={filters} setFilters={setFilters} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 flex flex-col">
        <WordTable filters={filters} />
      </main>
    </div>
  );
}
