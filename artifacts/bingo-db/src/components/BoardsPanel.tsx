import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, X, LayoutGrid, CheckCircle2, FileText, Lightbulb } from "lucide-react";
import { useState } from "react";

interface Board {
  id: number;
  name: string;
  description: string | null;
  ageLevels: string[];
  difficulty: string | null;
  timeOfYear: string | null;
  availability: string | null;
  status: "active" | "draft" | "concept";
  notes: string | null;
  wordCount: number;
}

interface BoardsResponse {
  boards: Board[];
  total: number;
}

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

function fetchBoards(): Promise<BoardsResponse> {
  return fetch(`${API_BASE}/boards`).then((r) => r.json());
}

function getStatusBadge(status: Board["status"]) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 font-medium flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Active
        </Badge>
      );
    case "draft":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 font-medium flex items-center gap-1">
          <FileText className="h-3 w-3" />
          Draft
        </Badge>
      );
    case "concept":
      return (
        <Badge className="bg-sky-100 text-sky-800 border-sky-100 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800 font-medium flex items-center gap-1">
          <Lightbulb className="h-3 w-3" />
          Concept
        </Badge>
      );
  }
}

function getDifficultyColor(difficulty: string | null) {
  switch (difficulty?.toLowerCase()) {
    case "easy": return "text-emerald-600 dark:text-emerald-400";
    case "medium": return "text-amber-600 dark:text-amber-400";
    case "hard": return "text-red-600 dark:text-red-400";
    default: return "text-muted-foreground";
  }
}

function getAgeLevelColor(level: string) {
  switch (level.toLowerCase()) {
    case "young": return "bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300 border-lime-200 dark:border-lime-800";
    case "kid": return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800";
    case "tween": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
    default: return "bg-secondary text-secondary-foreground";
  }
}

type StatusFilter = "all" | "active" | "draft" | "concept";

interface BoardsPanelProps {
  onSelectBoard: (boardName: string | null) => void;
  selectedBoard: string | null;
}

export default function BoardsPanel({ onSelectBoard, selectedBoard }: BoardsPanelProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data, isLoading, isError } = useQuery<BoardsResponse>({
    queryKey: ["boards"],
    queryFn: fetchBoards,
  });

  const boards = data?.boards ?? [];

  const filtered = boards.filter((b) => {
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    const matchesSearch =
      !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.description ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const activeCounts = {
    all: boards.length,
    active: boards.filter((b) => b.status === "active").length,
    draft: boards.filter((b) => b.status === "draft").length,
    concept: boards.filter((b) => b.status === "concept").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Loading boards…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-16 text-destructive text-sm">
        Failed to load boards.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex items-center w-full max-w-xs">
          <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search boards…"
            className="pl-9 h-8 text-sm bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {(["all", "active", "draft", "concept"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}{" "}
              <span className="opacity-70">{activeCounts[s]}</span>
            </button>
          ))}
        </div>

        {selectedBoard && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-foreground ml-auto"
            onClick={() => onSelectBoard(null)}
          >
            <X className="h-3 w-3 mr-1" />
            Clear filter
          </Button>
        )}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
          <LayoutGrid className="h-8 w-8 opacity-30" />
          <span>No boards match your search.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((board) => {
            const isSelected = selectedBoard === board.name;
            return (
              <div
                key={board.id}
                onClick={() => onSelectBoard(isSelected ? null : board.name)}
                className={cn(
                  "group relative flex flex-col gap-3 rounded-lg border bg-card p-4 cursor-pointer transition-all duration-150",
                  isSelected
                    ? "border-primary ring-1 ring-primary shadow-sm"
                    : "border-border hover:border-primary/40 hover:shadow-sm"
                )}
                data-testid={`board-card-${board.id}`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-snug flex-1">{board.name}</h3>
                  {getStatusBadge(board.status)}
                </div>

                {/* Description */}
                {board.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {board.description}
                  </p>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-1.5 mt-auto">
                  {board.ageLevels.map((lvl) => (
                    <Badge
                      key={lvl}
                      variant="outline"
                      className={cn("text-[10px] px-1.5 py-0 font-medium", getAgeLevelColor(lvl))}
                    >
                      {lvl}
                    </Badge>
                  ))}

                  {board.difficulty && (
                    <span className={cn("text-[11px] font-semibold ml-auto", getDifficultyColor(board.difficulty))}>
                      {board.difficulty}
                    </span>
                  )}
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {board.timeOfYear && (
                      <span className="truncate max-w-[130px]">{board.timeOfYear}</span>
                    )}
                    {board.availability && (
                      <>
                        {board.timeOfYear && <span>·</span>}
                        <span>{board.availability}</span>
                      </>
                    )}
                  </div>

                  <span className="text-[11px] font-medium text-primary shrink-0">
                    {board.wordCount} {board.wordCount === 1 ? "word" : "words"}
                  </span>
                </div>

                {isSelected && (
                  <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
