import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Search, X, LayoutGrid, CheckCircle2, FileText, Lightbulb,
  Plus, Pencil, Trash2, ChevronDown, Save, Ban
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

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

async function patchBoard(id: number, patch: Partial<Board>): Promise<Board> {
  const r = await fetch(`${API_BASE}/boards/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error("Failed to update board");
  return r.json();
}

async function createBoard(data: { name: string; description?: string; status?: Board["status"] }): Promise<Board> {
  const r = await fetch(`${API_BASE}/boards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error("Failed to create board");
  return r.json();
}

async function deleteBoard(id: number): Promise<void> {
  const r = await fetch(`${API_BASE}/boards/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Failed to delete board");
}

const STATUS_CYCLE: Board["status"][] = ["active", "draft", "concept"];

function nextStatus(current: Board["status"]): Board["status"] {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

function getStatusBadge(status: Board["status"], compact = false) {
  const cls = compact ? "text-[10px] px-1.5 py-0" : "";
  switch (status) {
    case "active":
      return (
        <Badge className={cn("bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 font-medium flex items-center gap-1", cls)}>
          <CheckCircle2 className="h-3 w-3" />
          Active
        </Badge>
      );
    case "draft":
      return (
        <Badge className={cn("bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 font-medium flex items-center gap-1", cls)}>
          <FileText className="h-3 w-3" />
          Draft
        </Badge>
      );
    case "concept":
      return (
        <Badge className={cn("bg-sky-100 text-sky-800 border-sky-100 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800 font-medium flex items-center gap-1", cls)}>
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

interface EditState {
  name: string;
  description: string;
}

interface NewBoardState {
  open: boolean;
  name: string;
  description: string;
  status: Board["status"];
}

export default function BoardsPanel({ onSelectBoard, selectedBoard }: BoardsPanelProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: "", description: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [newBoard, setNewBoard] = useState<NewBoardState>({ open: false, name: "", description: "", status: "active" });
  const newBoardNameRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery<BoardsResponse>({
    queryKey: ["boards"],
    queryFn: fetchBoards,
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Board> }) => patchBoard(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boards"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBoard(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boards"] });
      setConfirmDeleteId(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: createBoard,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boards"] });
      setNewBoard({ open: false, name: "", description: "", status: "active" });
    },
  });

  useEffect(() => {
    if (newBoard.open) {
      setTimeout(() => newBoardNameRef.current?.focus(), 50);
    }
  }, [newBoard.open]);

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

  function startEdit(board: Board) {
    setEditingId(board.id);
    setEditState({ name: board.name, description: board.description ?? "" });
    setConfirmDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function saveEdit(board: Board) {
    const name = editState.name.trim();
    if (!name) return;
    patchMutation.mutate({ id: board.id, patch: { name, description: editState.description || null } as Partial<Board> });
    setEditingId(null);
  }

  function cycleStatus(board: Board, e: React.MouseEvent) {
    e.stopPropagation();
    patchMutation.mutate({ id: board.id, patch: { status: nextStatus(board.status) } });
  }

  function confirmDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDeleteId(id);
    setEditingId(null);
  }

  function submitNewBoard() {
    const name = newBoard.name.trim();
    if (!name) return;
    createMutation.mutate({ name, description: newBoard.description || undefined, status: newBoard.status });
  }

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

        <div className="flex items-center gap-2 ml-auto">
          {selectedBoard && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onSelectBoard(null)}
            >
              <X className="h-3 w-3 mr-1" />
              Clear filter
            </Button>
          )}
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setNewBoard((p) => ({ ...p, open: !p.open }))}
          >
            <Plus className="h-3.5 w-3.5" />
            New Board
          </Button>
        </div>
      </div>

      {/* New Board inline form */}
      {newBoard.open && (
        <div className="border border-primary/40 rounded-lg bg-card p-4 flex flex-col gap-3 shadow-sm">
          <h3 className="text-sm font-semibold">New Board</h3>
          <div className="flex flex-wrap gap-3">
            <Input
              ref={newBoardNameRef}
              placeholder="Board name…"
              className="h-8 text-sm flex-1 min-w-[180px]"
              value={newBoard.name}
              onChange={(e) => setNewBoard((p) => ({ ...p, name: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") submitNewBoard(); if (e.key === "Escape") setNewBoard((p) => ({ ...p, open: false })); }}
            />
            <Input
              placeholder="Description (optional)…"
              className="h-8 text-sm flex-1 min-w-[200px]"
              value={newBoard.description}
              onChange={(e) => setNewBoard((p) => ({ ...p, description: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") submitNewBoard(); if (e.key === "Escape") setNewBoard((p) => ({ ...p, open: false })); }}
            />
            {/* Status picker */}
            <div className="flex items-center gap-1.5">
              {STATUS_CYCLE.map((s) => (
                <button
                  key={s}
                  onClick={() => setNewBoard((p) => ({ ...p, status: s }))}
                  className={cn(
                    "text-[11px] px-2 py-1 rounded border font-medium transition-colors",
                    newBoard.status === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-foreground/30"
                  )}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={submitNewBoard}
              disabled={!newBoard.name.trim() || createMutation.isPending}
            >
              <Save className="h-3 w-3" />
              {createMutation.isPending ? "Saving…" : "Create Board"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setNewBoard((p) => ({ ...p, open: false, name: "", description: "" }))}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

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
            const isEditing = editingId === board.id;
            const isConfirmingDelete = confirmDeleteId === board.id;

            return (
              <div
                key={board.id}
                onClick={() => !isEditing && onSelectBoard(isSelected ? null : board.name)}
                className={cn(
                  "group relative flex flex-col gap-2.5 rounded-lg border bg-card p-4 transition-all duration-150",
                  isEditing
                    ? "border-primary ring-1 ring-primary shadow-sm cursor-default"
                    : isSelected
                      ? "border-primary ring-1 ring-primary shadow-sm cursor-pointer"
                      : "border-border hover:border-primary/40 hover:shadow-sm cursor-pointer"
                )}
                data-testid={`board-card-${board.id}`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  {isEditing ? (
                    <Input
                      autoFocus
                      value={editState.name}
                      onChange={(e) => setEditState((p) => ({ ...p, name: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.stopPropagation(); saveEdit(board); }
                        if (e.key === "Escape") { e.stopPropagation(); cancelEdit(); }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 text-sm font-semibold flex-1 px-2"
                    />
                  ) : (
                    <h3 className="font-semibold text-sm leading-snug flex-1">{board.name}</h3>
                  )}

                  {/* Status badge — clickable to cycle */}
                  <button
                    title={`Status: ${board.status} — click to cycle`}
                    onClick={(e) => { e.stopPropagation(); cycleStatus(board, e); }}
                    className="shrink-0 hover:scale-105 transition-transform"
                  >
                    {getStatusBadge(board.status, true)}
                  </button>
                </div>

                {/* Description */}
                {isEditing ? (
                  <Input
                    value={editState.description}
                    placeholder="Description (optional)…"
                    onChange={(e) => setEditState((p) => ({ ...p, description: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.stopPropagation(); saveEdit(board); }
                      if (e.key === "Escape") { e.stopPropagation(); cancelEdit(); }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 text-xs px-2"
                  />
                ) : board.description ? (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {board.description}
                  </p>
                ) : null}

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
                    {board.timeOfYear && <span className="truncate max-w-[130px]">{board.timeOfYear}</span>}
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

                {/* Confirm delete bar */}
                {isConfirmingDelete && (
                  <div className="flex items-center gap-2 pt-2 border-t border-destructive/30" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-destructive flex-1">Delete "{board.name}"?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-6 text-[11px] px-2"
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(board.id); }}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? "Deleting…" : "Delete"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[11px] px-2"
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {/* Action buttons — visible on hover or when editing */}
                <div
                  className={cn(
                    "absolute bottom-3 right-3 flex items-center gap-1 transition-opacity",
                    isEditing || isConfirmingDelete ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        className="h-6 text-[11px] px-2 gap-1"
                        onClick={(e) => { e.stopPropagation(); saveEdit(board); }}
                        disabled={patchMutation.isPending}
                      >
                        <Save className="h-3 w-3" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[11px] px-2"
                        onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <button
                        title="Edit board"
                        onClick={(e) => { e.stopPropagation(); startEdit(board); }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Disable board (set to concept)"
                        onClick={(e) => { e.stopPropagation(); patchMutation.mutate({ id: board.id, patch: { status: "concept" } }); }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-amber-600 transition-colors"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Delete board"
                        onClick={(e) => confirmDelete(board.id, e)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {isSelected && !isEditing && (
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
