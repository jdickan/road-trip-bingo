import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Plus, X, Trash2, ChevronDown, Loader2, ClipboardList } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

type TodoType = "bug" | "word-idea" | "feature" | "task" | "other";
type Priority = "low" | "medium" | "high" | "critical";
type Severity = "minor" | "moderate" | "major" | "critical";
type Status = "open" | "in-progress" | "done" | "wontfix";

interface Todo {
  id: number;
  type: TodoType;
  title: string;
  description: string | null;
  priority: Priority;
  severity: string | null;
  status: Status;
  wordSuggestion: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TodosResponse { todos: Todo[]; total: number; }

const TYPE_META: Record<TodoType, { emoji: string; label: string; color: string }> = {
  bug:        { emoji: "🐛", label: "Bug",       color: "text-red-500" },
  "word-idea":{ emoji: "💡", label: "Word Idea", color: "text-amber-500" },
  feature:    { emoji: "✨", label: "Feature",   color: "text-violet-500" },
  task:       { emoji: "✅", label: "Task",      color: "text-emerald-500" },
  other:      { emoji: "💬", label: "Other",     color: "text-sky-500" },
};

const PRIORITY_META: Record<Priority, { label: string; dot: string; border: string }> = {
  low:      { label: "Low",      dot: "bg-emerald-400/70", border: "border-l-emerald-300/60" },
  medium:   { label: "Medium",   dot: "bg-amber-400/70",   border: "border-l-amber-300/60" },
  high:     { label: "High",     dot: "bg-orange-400/70",  border: "border-l-orange-400/70" },
  critical: { label: "Critical", dot: "bg-red-500/80",     border: "border-l-red-400/80" },
};

const STATUS_CYCLE: Status[] = ["open", "in-progress", "done", "wontfix"];
const STATUS_LABEL: Record<Status, string> = {
  open: "Open",
  "in-progress": "In Progress",
  done: "Done",
  wontfix: "Won't Fix",
};
const STATUS_STYLE: Record<Status, string> = {
  open:         "text-foreground border-border",
  "in-progress":"text-amber-600 border-amber-400/50 dark:text-amber-400",
  done:         "text-emerald-600 border-emerald-400/50 dark:text-emerald-400",
  wontfix:      "text-muted-foreground border-border line-through",
};

function nextStatus(s: Status): Status {
  return STATUS_CYCLE[(STATUS_CYCLE.indexOf(s) + 1) % STATUS_CYCLE.length];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

async function apiFetch(path: string, init?: RequestInit) {
  const r = await fetch(`${API_BASE}${path}`, init);
  if (!r.ok && r.status !== 204) throw new Error(await r.text());
  if (r.status === 204) return null;
  return r.json();
}

type StatusFilter = "all" | Status;

export default function TodoPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [typeFilter, setTypeFilter] = useState<"all" | TodoType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showDone, setShowDone] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<{
    type: TodoType; title: string; description: string;
    priority: Priority; severity: Severity | ""; status: Status;
    wordSuggestion: string; notes: string;
  }>({ type: "task", title: "", description: "", priority: "medium", severity: "", status: "open", wordSuggestion: "", notes: "" });

  const { data, isLoading } = useQuery<TodosResponse>({
    queryKey: ["todos"],
    queryFn: () => apiFetch("/todos"),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => apiFetch("/todos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["todos"] });
      setForm({ type: "task", title: "", description: "", priority: "medium", severity: "", status: "open", wordSuggestion: "", notes: "" });
      setFormOpen(false);
      toast({ title: "Added to to-do list" });
    },
    onError: () => toast({ title: "Couldn't save item", variant: "destructive" }),
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: object }) =>
      apiFetch(`/todos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todos"] }),
    onError: () => toast({ title: "Couldn't update item", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/todos/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["todos"] }); toast({ title: "Removed" }); },
    onError: () => toast({ title: "Couldn't delete item", variant: "destructive" }),
  });

  function submitForm() {
    if (!form.title.trim()) return;
    const body: Record<string, unknown> = {
      type: form.type,
      title: form.title.trim(),
      priority: form.priority,
      status: form.status,
    };
    if (form.description.trim()) body.description = form.description.trim();
    if (form.severity) body.severity = form.severity;
    if (form.wordSuggestion.trim()) body.wordSuggestion = form.wordSuggestion.trim();
    if (form.notes.trim()) body.notes = form.notes.trim();
    createMutation.mutate(body);
  }

  const all = data?.todos ?? [];
  const filtered = all.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (!showDone && (t.status === "done" || t.status === "wontfix")) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  const openCount = all.filter(t => t.status === "open" || t.status === "in-progress").length;
  const doneCount = all.filter(t => t.status === "done" || t.status === "wontfix").length;

  return (
    <div className="max-w-5xl mx-auto pb-16">

      {/* ── Page header ── */}
      <div className="border-b border-border py-8">
        <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground mb-2">
          Feedback · Ideas · Bugs
        </p>
        <h2 className="text-3xl md:text-4xl font-editorial italic text-foreground leading-tight flex items-center gap-3">
          <ClipboardList className="h-6 w-6 shrink-0 text-muted-foreground/50" />
          To-Do Board
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-[65ch] leading-relaxed">
          Found a bug? Got a word idea or feature thought? Drop it here — no format required.
          Even half-baked ideas are welcome.
        </p>
      </div>

      {/* ── Quick-add toggle ── */}
      <div className="border-b border-border py-6">
        {!formOpen ? (
          <button
            onClick={() => setFormOpen(true)}
            className="group flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-border group-hover:border-foreground transition-colors text-muted-foreground group-hover:text-foreground">
              <Plus className="h-4 w-4" />
            </span>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Add something…
            </span>
          </button>
        ) : (
          <div className="space-y-4">
            {/* Type pills */}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TYPE_META) as TodoType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm(p => ({ ...p, type: t }))}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors",
                    form.type === t
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  )}
                >
                  <span>{TYPE_META[t].emoji}</span>
                  {TYPE_META[t].label}
                </button>
              ))}
              <button
                onClick={() => { setFormOpen(false); }}
                className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Title */}
            <input
              autoFocus
              type="text"
              placeholder={
                form.type === "bug" ? "Describe the bug…" :
                form.type === "word-idea" ? "What's the word or idea?" :
                form.type === "feature" ? "Describe the feature…" :
                form.type === "task" ? "What needs doing?" :
                "What's on your mind?"
              }
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) submitForm(); if (e.key === "Escape") setFormOpen(false); }}
              className="w-full bg-transparent border-0 border-b border-foreground text-xl font-editorial italic text-foreground placeholder:text-muted-foreground/50 outline-none py-1"
            />

            {/* Word suggestion — only for word-idea */}
            {form.type === "word-idea" && (
              <input
                type="text"
                placeholder="Suggested word (optional — we can add it directly from here)"
                value={form.wordSuggestion}
                onChange={e => setForm(p => ({ ...p, wordSuggestion: e.target.value }))}
                className="w-full bg-transparent border-0 border-b border-border/50 text-sm text-muted-foreground placeholder:text-muted-foreground/40 outline-none py-1"
              />
            )}

            {/* Description */}
            <textarea
              placeholder="More detail (optional)…"
              rows={2}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full bg-transparent border-0 border-b border-border/50 text-sm text-muted-foreground placeholder:text-muted-foreground/40 outline-none py-1 resize-none"
            />

            {/* Priority + severity row */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">Priority</span>
                <div className="flex gap-1.5">
                  {(["low", "medium", "high", "critical"] as Priority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 text-[10.5px] font-mono border transition-colors",
                        form.priority === p
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground"
                      )}
                    >
                      <span className={cn("inline-block w-1.5 h-1.5 rounded-full", PRIORITY_META[p].dot)} />
                      {PRIORITY_META[p].label}
                    </button>
                  ))}
                </div>
              </div>

              {form.type === "bug" && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">Severity</span>
                  <div className="flex gap-1.5">
                    {(["minor", "moderate", "major", "critical"] as Severity[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setForm(prev => ({ ...prev, severity: prev.severity === s ? "" : s }))}
                        className={cn(
                          "px-2.5 py-1 text-[10.5px] font-mono border transition-colors capitalize",
                          form.severity === s
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-muted-foreground hover:border-foreground"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex items-center gap-4 pt-1">
              <button
                onClick={submitForm}
                disabled={!form.title.trim() || createMutation.isPending}
                className="flex items-center gap-1.5 text-xs text-foreground border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-colors disabled:opacity-40"
              >
                {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {TYPE_META[form.type].emoji} Add {TYPE_META[form.type].label}
              </button>
              <button
                onClick={() => setFormOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-0 border-b border-border">
        {/* Type filter */}
        <div className="flex items-stretch divide-x divide-border border-r border-border">
          <button
            onClick={() => setTypeFilter("all")}
            className={cn(
              "px-4 py-3 font-mono text-[10.5px] tracking-[0.14em] uppercase transition-colors",
              typeFilter === "all" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            All types
          </button>
          {(Object.keys(TYPE_META) as TodoType[]).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? "all" : t)}
              className={cn(
                "px-4 py-3 font-mono text-[10.5px] tracking-[0.14em] uppercase transition-colors flex items-center gap-1.5",
                typeFilter === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-sm">{TYPE_META[t].emoji}</span>
              {TYPE_META[t].label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-4 px-4 py-3">
          {doneCount > 0 && (
            <button
              onClick={() => setShowDone(s => !s)}
              className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDone ? "Hide done" : `Show done (${doneCount})`}
            </button>
          )}
          <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-muted-foreground tabular-nums">
            {openCount} open
          </span>
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="space-y-0">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-4 py-5 border-b border-border animate-pulse border-l-2 border-l-muted/30 pl-4">
              <div className="flex-1 space-y-2">
                <div className="h-3 w-16 bg-muted/50 rounded-sm" />
                <div className="h-5 w-64 bg-muted/40 rounded-sm" />
                <div className="h-3 w-40 bg-muted/30 rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && all.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-5xl mb-5">🗒️</p>
          <p className="font-editorial italic text-2xl text-foreground mb-2">Nothing here yet.</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Spotted a bug? Have a word idea? Use the form above — even a rough note is helpful.
          </p>
        </div>
      )}

      {/* ── No results after filter ── */}
      {!isLoading && all.length > 0 && filtered.length === 0 && (
        <div className="py-12 text-center">
          <p className="font-editorial italic text-xl text-muted-foreground mb-3">No items match.</p>
          <button
            onClick={() => { setTypeFilter("all"); setStatusFilter("all"); setShowDone(true); }}
            className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 hover:bg-muted/40 transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── Item list ── */}
      <div>
        {filtered.map((todo) => {
          const tm = TYPE_META[todo.type];
          const pm = PRIORITY_META[todo.priority as Priority] ?? PRIORITY_META.medium;
          const isDone = todo.status === "done" || todo.status === "wontfix";

          return (
            <div
              key={todo.id}
              className={cn(
                "group relative flex gap-5 py-5 border-b border-border border-l-2 pl-4 transition-colors hover:bg-muted/20",
                pm.border,
                isDone && "opacity-50"
              )}
            >
              {/* Type emoji */}
              <div className="shrink-0 pt-0.5 text-xl select-none" title={tm.label}>
                {tm.emoji}
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                {/* Eyebrow */}
                <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground mb-1 flex flex-wrap items-center gap-2">
                  <span>{tm.label}</span>
                  <span className="opacity-40">·</span>
                  <span className="flex items-center gap-1">
                    <span className={cn("inline-block w-1.5 h-1.5 rounded-full", pm.dot)} />
                    {pm.label}
                  </span>
                  {todo.severity && (
                    <>
                      <span className="opacity-40">·</span>
                      <span className="capitalize">{todo.severity}</span>
                    </>
                  )}
                  <span className="opacity-40">·</span>
                  <span>{formatDate(todo.createdAt)}</span>
                </p>

                {/* Title */}
                <p className={cn(
                  "text-base font-medium text-foreground leading-snug",
                  isDone && "line-through decoration-1"
                )}>
                  {todo.title}
                </p>

                {/* Description */}
                {todo.description && (
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {todo.description}
                  </p>
                )}

                {/* Word suggestion pill */}
                {todo.wordSuggestion && (
                  <p className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-xs font-mono">
                    💡 Suggested word: <span className="font-semibold">{todo.wordSuggestion}</span>
                  </p>
                )}

                {/* Notes */}
                {todo.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    {todo.notes}
                  </p>
                )}

                {/* Status toggle */}
                <div className="mt-3">
                  <button
                    onClick={() => patchMutation.mutate({ id: todo.id, patch: { status: nextStatus(todo.status) } })}
                    className={cn(
                      "font-mono text-[10px] tracking-[0.14em] uppercase border px-2.5 py-1 transition-colors hover:bg-muted/40",
                      STATUS_STYLE[todo.status]
                    )}
                    title="Click to advance status"
                  >
                    {STATUS_LABEL[todo.status]}
                  </button>
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => deleteMutation.mutate(todo.id)}
                disabled={deleteMutation.isPending && deleteMutation.variables === todo.id}
                className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                title="Delete"
              >
                {deleteMutation.isPending && deleteMutation.variables === todo.id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Trash2 className="h-3.5 w-3.5" />
                }
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
