import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, X, Plus, Pencil, Trash2, Ban, ArrowUpRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "./EmptyState";

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

function plateNumber(n: number): string {
  return String(n).padStart(2, "0");
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
    placeholderData: keepPreviousData,
  });

  const { toast } = useToast();

  const patchMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Board> }) => patchBoard(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boards"] }),
    onError: () => toast({ title: "Couldn't update board", description: "Try again in a moment.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBoard(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boards"] });
      setConfirmDeleteId(null);
      toast({ title: "Board deleted" });
    },
    onError: () => toast({ title: "Couldn't delete board", description: "Try again in a moment.", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: createBoard,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boards"] });
      setNewBoard({ open: false, name: "", description: "", status: "active" });
      toast({ title: "Board created" });
    },
    onError: () => toast({ title: "Couldn't create board", description: "Try again in a moment.", variant: "destructive" }),
  });

  useEffect(() => {
    if (newBoard.open) {
      setTimeout(() => newBoardNameRef.current?.focus(), 50);
    }
  }, [newBoard.open]);

  async function handleImportBoards(rows: Record<string, unknown>[]) {
    const boardRows = rows.filter(r => typeof r.name === "string" && String(r.name).trim());
    if (boardRows.length === 0) {
      toast({ title: "No boards found", description: "Each entry needs a 'name' field.", variant: "destructive" });
      return;
    }
    const results = await Promise.allSettled(
      boardRows.map(row => createBoard({
        name: String(row.name).trim(),
        description: typeof row.description === "string" ? row.description : undefined,
        status: (["active", "draft", "concept"] as string[]).includes(String(row.status))
          ? (row.status as Board["status"])
          : "draft",
      }))
    );
    qc.invalidateQueries({ queryKey: ["boards"] });
    const done = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;
    if (failed === 0) toast({ title: `${done} board${done === 1 ? "" : "s"} imported` });
    else toast({ title: `${done} of ${boardRows.length} boards imported`, description: `${failed} failed`, variant: "destructive" });
  }

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

  function cancelEdit() { setEditingId(null); }

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

  return (
    <div className="max-w-5xl mx-auto pb-16">

      {/* ── Filter bar ── */}
      <div className="flex items-stretch border-b border-border mb-0">
        {/* Borderless search — bottom hairline only */}
        <div className="relative flex items-center py-3 pr-6 border-r border-border shrink-0">
          <Search className="h-3.5 w-3.5 text-muted-foreground mr-2.5 shrink-0" />
          <input
            type="text"
            placeholder="Search boards"
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-none w-44"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="ml-2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Status chips — mono uppercase, separated by hairlines */}
        <div className="flex items-stretch divide-x divide-border">
          {(["all", "active", "draft", "concept"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-5 py-3 font-mono text-[10.5px] tracking-[0.18em] uppercase transition-colors duration-150",
                statusFilter === s
                  ? "text-foreground relative after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-px after:bg-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s}
              <span className="ml-1.5 opacity-50 tabular-nums">{activeCounts[s]}</span>
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-4 pl-6">
          {selectedBoard && (
            <button
              onClick={() => onSelectBoard(null)}
              className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
          <button
            onClick={() => setNewBoard((p) => ({ ...p, open: !p.open }))}
            className="flex items-center gap-1.5 text-xs text-foreground border border-border px-3 py-1.5 hover:bg-muted/40 transition-colors duration-150"
          >
            <Plus className="h-3.5 w-3.5" />
            New board
          </button>
        </div>
      </div>

      {/* ── Loading skeletons — only when no cached data is available ── */}
      {isLoading && !data && (
        <div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-6 md:gap-10 py-8 border-b border-border animate-pulse">
              <div className="w-10 md:w-16 shrink-0 flex justify-end pt-1">
                <div className="h-10 w-10 bg-muted/50 rounded-sm" />
              </div>
              <div className="flex-1 space-y-2.5">
                <div className="h-2.5 w-16 bg-muted/50 rounded-sm" />
                <div className="h-7 w-72 bg-muted/50 rounded-sm" />
                <div className="h-3 w-96 bg-muted/50 rounded-sm" />
                <div className="h-2.5 w-48 bg-muted/40 rounded-sm mt-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Offline banner — shown when server is down but previous data is visible ── */}
      {isError && data && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border border-border/50 text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500/70 shrink-0" />
          <span className="font-mono text-[10.5px] tracking-wide">Server offline — showing last known data</span>
        </div>
      )}

      {/* ── Error (no cached data) ── */}
      {isError && !data && (
        <div className="py-24 text-center">
          <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground mb-2">Error</p>
          <p className="text-sm text-muted-foreground">Failed to load boards.</p>
        </div>
      )}

      {/* ── New board inline form ── */}
      {newBoard.open && (
        <div className="flex items-start gap-6 md:gap-10 py-8 border-b border-border">
          <div className="w-10 md:w-16 shrink-0 flex justify-end pt-2">
            <span className="text-3xl md:text-4xl font-editorial italic select-none text-muted-foreground/30 leading-none">
              +
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground">New board</p>
            <input
              ref={newBoardNameRef}
              type="text"
              placeholder="Board name"
              className="bg-transparent border-0 border-b border-border text-2xl font-editorial italic text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-foreground transition-colors py-1 w-full"
              value={newBoard.name}
              onChange={(e) => setNewBoard((p) => ({ ...p, name: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") submitNewBoard(); if (e.key === "Escape") setNewBoard((p) => ({ ...p, open: false })); }}
            />
            <input
              type="text"
              placeholder="Description (optional)"
              className="bg-transparent border-0 border-b border-border/50 text-sm text-muted-foreground placeholder:text-muted-foreground/50 outline-none focus:border-border transition-colors py-1 w-full"
              value={newBoard.description}
              onChange={(e) => setNewBoard((p) => ({ ...p, description: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") submitNewBoard(); if (e.key === "Escape") setNewBoard((p) => ({ ...p, open: false })); }}
            />
            <div className="flex items-center gap-5 mt-1">
              {STATUS_CYCLE.map((s) => (
                <button
                  key={s}
                  onClick={() => setNewBoard((p) => ({ ...p, status: s }))}
                  className={cn(
                    "font-mono text-[10.5px] tracking-[0.18em] uppercase transition-colors",
                    newBoard.status === s ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-1">
              <button
                onClick={submitNewBoard}
                disabled={!newBoard.name.trim() || createMutation.isPending}
                className="text-xs text-foreground border border-border px-3 py-1.5 hover:bg-muted/40 transition-colors disabled:opacity-40"
              >
                {createMutation.isPending ? "Saving…" : "Create board"}
              </button>
              <button
                onClick={() => setNewBoard((p) => ({ ...p, open: false, name: "", description: "" }))}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {data && !isLoading && filtered.length === 0 && (
        search || statusFilter !== "all" ? (
          /* Compact — filters returned nothing */
          <div className="py-24 text-center">
            <p className="font-editorial italic text-2xl text-muted-foreground mb-3">No boards match.</p>
            <button
              onClick={() => { setSearch(""); setStatusFilter("all"); }}
              className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 hover:bg-muted/40 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* Full — truly empty database */
          <EmptyState
            icon="🗺️"
            headline="No boards yet"
            body="Create your first bingo board or import board definitions from a JSON file."
            onJsonImport={handleImportBoards}
            jsonLabel="board"
          >
            <button
              onClick={() => setNewBoard((p) => ({ ...p, open: true }))}
              className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] uppercase border border-border px-4 py-2 hover:bg-muted/40 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Create first board
            </button>
          </EmptyState>
        )
      )}

      {/* ── Board rows ── */}
      {data && filtered.map((board, index) => {
        const isSelected = selectedBoard === board.name;
        const isEditing = editingId === board.id;
        const isConfirmingDelete = confirmDeleteId === board.id;

        return (
          <div
            key={board.id}
            className={cn(
              "group relative flex items-start gap-6 md:gap-10 py-8 border-b border-border transition-colors duration-200",
              !isEditing && "hover:bg-muted/40"
            )}
            data-testid={`board-card-${board.id}`}
          >
            {/* Left rail: serif plate number */}
            <div className="w-10 md:w-16 shrink-0 flex justify-end pt-5">
              <span
                className={cn(
                  "text-3xl md:text-4xl font-editorial italic select-none tabular-nums leading-none transition-colors duration-200",
                  isSelected
                    ? "text-foreground/70"
                    : board.status === "concept"
                      ? "text-muted-foreground/30 line-through decoration-1"
                      : "text-muted-foreground/30 group-hover:text-muted-foreground/50"
                )}
              >
                {plateNumber(board.wordCount)}
              </span>
            </div>

            {/* Main column */}
            <div className="flex-1 min-w-0">
              {/* Eyebrow: status + selected indicator */}
              <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground mb-2">
                {board.status}
                {isSelected && <span className="ml-3 text-foreground/70">· selected</span>}
              </p>

              {/* Title — editing vs. display */}
              {isEditing ? (
                <input
                  autoFocus
                  type="text"
                  value={editState.name}
                  onChange={(e) => setEditState((p) => ({ ...p, name: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.stopPropagation(); saveEdit(board); }
                    if (e.key === "Escape") { e.stopPropagation(); cancelEdit(); }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent border-0 border-b border-foreground text-2xl md:text-3xl font-editorial italic text-foreground outline-none py-1 w-full"
                />
              ) : (
                <button
                  onClick={() => onSelectBoard(isSelected ? null : board.name)}
                  className={cn(
                    "text-left text-2xl md:text-3xl font-editorial italic leading-tight transition-all duration-200 text-foreground block",
                    isSelected
                      ? "underline decoration-1 underline-offset-4"
                      : "group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4"
                  )}
                >
                  {board.name}
                </button>
              )}

              {/* Description */}
              {isEditing ? (
                <input
                  type="text"
                  value={editState.description}
                  placeholder="Description (optional)"
                  onChange={(e) => setEditState((p) => ({ ...p, description: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.stopPropagation(); saveEdit(board); }
                    if (e.key === "Escape") { e.stopPropagation(); cancelEdit(); }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent border-0 border-b border-border/50 text-sm text-muted-foreground placeholder:text-muted-foreground/50 outline-none py-1 w-full mt-2"
                />
              ) : board.description ? (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                  {board.description}
                </p>
              ) : null}

              {/* Meta strip: middot-separated, mono */}
              {!isEditing && (
                <p className="flex flex-wrap items-center mt-3 font-mono text-xs text-muted-foreground gap-0">
                  <span className="tabular-nums">{board.wordCount}&thinsp;{board.wordCount === 1 ? "word" : "words"}</span>
                  {board.ageLevels.length > 0 && (
                    <><span className="mx-2">·</span><span>{board.ageLevels.join(", ")}</span></>
                  )}
                  {board.difficulty && (
                    <><span className="mx-2">·</span><span>{board.difficulty}</span></>
                  )}
                  {board.timeOfYear && (
                    <><span className="mx-2">·</span><span>{board.timeOfYear}</span></>
                  )}
                  {board.availability && (
                    <><span className="mx-2">·</span><span>{board.availability}</span></>
                  )}
                </p>
              )}

              {/* Edit save / cancel */}
              {isEditing && (
                <div className="flex items-center gap-4 mt-4" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => { e.stopPropagation(); saveEdit(board); }}
                    disabled={patchMutation.isPending}
                    className="text-xs text-foreground border border-border px-3 py-1.5 hover:bg-muted/40 transition-colors disabled:opacity-40"
                  >
                    Save
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Delete confirmation */}
              {isConfirmingDelete && (
                <div className="flex items-center gap-4 mt-4" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-muted-foreground">Delete "{board.name}"?</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(board.id); }}
                    disabled={deleteMutation.isPending}
                    className="text-xs text-foreground border border-border px-3 py-1.5 hover:bg-muted hover:text-destructive hover:border-destructive/40 transition-colors disabled:opacity-40"
                  >
                    {deleteMutation.isPending ? "Deleting…" : "Confirm delete"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Right rail: ghost icon buttons + arrow */}
            {!isEditing && !isConfirmingDelete && (
              <div className="shrink-0 flex items-center gap-0.5 pt-1">
                <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    title="Edit board"
                    onClick={(e) => { e.stopPropagation(); startEdit(board); }}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    title={board.status === "concept" ? "Enable board" : "Disable board"}
                    onClick={(e) => {
                      e.stopPropagation();
                      patchMutation.mutate({ id: board.id, patch: { status: board.status === "concept" ? "active" : "concept" } });
                    }}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </button>
                  <button
                    title="Delete board"
                    onClick={(e) => confirmDelete(board.id, e)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => onSelectBoard(isSelected ? null : board.name)}
                  title="Filter words to this board"
                  className="p-1.5 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
