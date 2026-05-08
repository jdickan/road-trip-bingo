import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Camera, RotateCcw, Trash2, Loader2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

interface SnapshotMeta {
  id: string;
  label: string;
  createdAt: string;
  wordCount: number;
  sizeBytes: number;
}

async function fetchSnapshots(): Promise<{ snapshots: SnapshotMeta[] }> {
  const r = await fetch(`${API_BASE}/snapshots`);
  if (!r.ok) throw new Error("Failed to fetch snapshots");
  return r.json();
}

async function createSnapshot(label: string): Promise<{ snapshot: SnapshotMeta }> {
  const r = await fetch(`${API_BASE}/snapshots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
  if (!r.ok) throw new Error("Failed to create snapshot");
  return r.json();
}

async function restoreSnapshot(id: string): Promise<void> {
  const r = await fetch(`${API_BASE}/snapshots/${id}/restore`, { method: "POST" });
  if (!r.ok) throw new Error("Failed to restore snapshot");
}

async function deleteSnapshot(id: string): Promise<void> {
  const r = await fetch(`${API_BASE}/snapshots/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Failed to delete snapshot");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function SnapshotsPanel() {
  const [newLabel, setNewLabel] = useState("");
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["snapshots"],
    queryFn: fetchSnapshots,
  });

  const createMutation = useMutation({
    mutationFn: () => createSnapshot(newLabel.trim() || new Date().toLocaleString()),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["snapshots"] });
      setNewLabel("");
      toast({ title: "Snapshot saved", description: `"${res.snapshot.label}" — ${res.snapshot.wordCount} words` });
    },
    onError: () => toast({ title: "Snapshot failed", variant: "destructive" }),
  });

  const restoreMutation = useMutation({
    mutationFn: restoreSnapshot,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/words"] });
      qc.invalidateQueries({ queryKey: ["/api/words/stats"] });
      setConfirmRestoreId(null);
      toast({ title: "Database restored", description: "All word data has been replaced." });
    },
    onError: () => toast({ title: "Restore failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSnapshot,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["snapshots"] });
      toast({ title: "Snapshot deleted" });
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const snapshots = data?.snapshots ?? [];

  return (
    <div className="max-w-5xl mx-auto pb-16">

      {/* ── Page header ── */}
      <div className="border-b border-border py-8">
        <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground mb-2">
          Snapshots · Point-in-time backups
        </p>
        <h2 className="text-3xl md:text-4xl [font-family:'Instrument_Serif',Georgia,serif] italic text-foreground leading-tight">
          Database Snapshots
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-[65ch] leading-relaxed">
          Save a named copy of all word data. Restore any snapshot to revert the database exactly to that state.
        </p>
      </div>

      {/* ── Create snapshot ── */}
      <div className="border-b border-border py-8">
        <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground mb-5">
          Save current state
        </p>
        <div className="flex items-end gap-4 max-w-xl">
          <input
            type="text"
            placeholder="Give this snapshot a name (optional)…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createMutation.mutate(); }}
            className="flex-1 bg-transparent border-b border-border font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none py-2 focus:border-foreground transition-colors"
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="flex items-center gap-1.5 text-xs text-foreground border border-border px-4 py-2 hover:bg-muted/40 transition-colors shrink-0 disabled:opacity-40"
          >
            {createMutation.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Camera className="h-3.5 w-3.5" />}
            Save Snapshot
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3 max-w-[65ch]">
          Restore replaces <strong className="text-foreground font-medium">all</strong> word data — this cannot be undone unless you save another snapshot first.
        </p>
      </div>

      {/* ── Snapshot count eyebrow ── */}
      <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground py-5">
        Saved · {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""}
      </p>

      {/* ── Loading ── */}
      {isLoading && (
        <div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-6 md:gap-10 py-6 border-b border-border animate-pulse">
              <div className="w-10 md:w-16 shrink-0 flex justify-end pt-1">
                <div className="h-9 w-9 bg-muted/50 rounded-sm" />
              </div>
              <div className="flex-1 space-y-2.5">
                <div className="h-2 w-14 bg-muted/50 rounded-sm" />
                <div className="h-5 w-56 bg-muted/50 rounded-sm" />
                <div className="h-2 w-72 bg-muted/40 rounded-sm mt-3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && snapshots.length === 0 && (
        <div className="py-32 text-center">
          <p className="text-3xl [font-family:'Instrument_Serif',Georgia,serif] italic text-muted-foreground mb-3">
            No snapshots yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Save the current state above to create your first snapshot.
          </p>
        </div>
      )}

      {/* ── Snapshot rows ── */}
      {snapshots.map((s, index) => {
        const isRestoring = restoreMutation.isPending && restoreMutation.variables === s.id;
        const isDeleting = deleteMutation.isPending && deleteMutation.variables === s.id;
        const isConfirming = confirmRestoreId === s.id;

        return (
          <div
            key={s.id}
            className={cn(
              "group relative flex items-start gap-6 md:gap-10 py-6 border-b border-border transition-colors duration-200",
              !isConfirming && "hover:bg-muted/40",
              isConfirming && "bg-amber-50/50 dark:bg-amber-950/20"
            )}
          >
            {/* Plate number */}
            <div className="w-10 md:w-16 shrink-0 flex justify-end pt-1">
              <span className="text-3xl md:text-4xl [font-family:'Instrument_Serif',Georgia,serif] italic select-none tabular-nums leading-none text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors duration-200">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground mb-1.5">
                Snapshot
              </p>
              <p className="text-xl md:text-2xl [font-family:'Instrument_Serif',Georgia,serif] italic text-foreground leading-tight">
                {s.label}
              </p>
              <p className="font-mono text-xs text-muted-foreground mt-2 tabular-nums">
                {formatDate(s.createdAt)} · {s.wordCount} words · {formatBytes(s.sizeBytes)}
              </p>

              {/* Restore confirmation inline */}
              {isConfirming && (
                <div className="flex items-center gap-4 mt-4">
                  <span className="text-xs text-muted-foreground">Replace all current word data with this snapshot?</span>
                  <button
                    onClick={() => restoreMutation.mutate(s.id)}
                    disabled={isRestoring}
                    className="text-xs text-foreground border border-border px-3 py-1.5 hover:bg-muted hover:text-destructive hover:border-destructive/40 transition-colors disabled:opacity-40"
                  >
                    {isRestoring ? "Restoring…" : "Yes, restore"}
                  </button>
                  <button
                    onClick={() => setConfirmRestoreId(null)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Action buttons — hover-reveal */}
            {!isConfirming && (
              <div className="shrink-0 flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => setConfirmRestoreId(s.id)}
                  title="Restore this snapshot"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border px-2.5 py-1.5 hover:text-foreground hover:border-foreground/40 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restore
                </button>
                <a
                  href={`${API_BASE}/snapshots/${s.id}/download`}
                  download
                  title="Download SQL dump"
                >
                  <button
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </a>
                <button
                  disabled={isDeleting}
                  onClick={() => deleteMutation.mutate(s.id)}
                  title="Delete snapshot"
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                >
                  {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
