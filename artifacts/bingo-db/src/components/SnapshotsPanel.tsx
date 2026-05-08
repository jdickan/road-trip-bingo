import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Camera, RotateCcw, Trash2, Loader2, DatabaseZap, Download } from "lucide-react";
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
        <h2 className="text-3xl md:text-4xl [font-family:'Instrument_Serif',Georgia,serif] italic text-foreground leading-tight flex items-center gap-3">
          <DatabaseZap className="h-6 w-6 shrink-0 text-muted-foreground/50" />
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
          <Input
            placeholder="Give this snapshot a name (optional)…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createMutation.mutate(); }}
            className="flex-1 rounded-none"
          />
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="gap-1.5 shrink-0 rounded-none"
          >
            {createMutation.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Camera className="h-3.5 w-3.5" />}
            Save Snapshot
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3 max-w-[65ch]">
          Restore replaces <strong className="text-foreground font-medium">all</strong> word data — this cannot be undone unless you save another snapshot first.
        </p>
      </div>

      {/* ── Snapshot count eyebrow ── */}
      <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground py-5">
        Saved · {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""}
      </p>

      {/* ── Loading skeletons ── */}
      {isLoading && (
        <div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-6 md:gap-10 py-6 border-b border-border animate-pulse">
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-48 bg-muted/50 rounded-sm" />
                <div className="h-2.5 w-72 bg-muted/40 rounded-sm" />
              </div>
              <div className="h-7 w-24 bg-muted/40 rounded-sm shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && snapshots.length === 0 && (
        <div className="text-sm text-muted-foreground py-8 text-center border border-border bg-muted/10">
          No snapshots yet. Save one above to get started.
        </div>
      )}

      {/* ── Snapshot list ── */}
      {snapshots.length > 0 && (
        <div className="border border-border divide-y divide-border">
          {snapshots.map((s) => {
            const isRestoring = restoreMutation.isPending && restoreMutation.variables === s.id;
            const isDeleting = deleteMutation.isPending && deleteMutation.variables === s.id;
            const isConfirming = confirmRestoreId === s.id;

            return (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors",
                  isConfirming
                    ? "border-l-2 border-l-destructive/50 bg-destructive/5"
                    : "hover:bg-muted/20"
                )}
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-medium truncate text-foreground">{s.label}</p>
                  <p className="font-mono text-[10.5px] text-muted-foreground mt-0.5">
                    {formatDate(s.createdAt)} · {s.wordCount} words · {formatBytes(s.sizeBytes)}
                  </p>
                </div>

                {/* Actions */}
                {isConfirming ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10.5px] tracking-[0.04em] uppercase text-destructive">Replace all data?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 px-3 text-xs rounded-none"
                      disabled={isRestoring}
                      onClick={() => restoreMutation.mutate(s.id)}
                    >
                      {isRestoring ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes, restore"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs rounded-none"
                      onClick={() => setConfirmRestoreId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs gap-1 rounded-none"
                      onClick={() => setConfirmRestoreId(s.id)}
                      title="Restore this snapshot"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Restore
                    </Button>
                    <a
                      href={`${API_BASE}/snapshots/${s.id}/download`}
                      download
                      title="Download SQL dump"
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={isDeleting}
                      onClick={() => deleteMutation.mutate(s.id)}
                      title="Delete snapshot"
                    >
                      {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
