import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="max-w-2xl space-y-8 py-2">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <DatabaseZap className="h-4 w-4 text-primary" />
          Database Snapshots
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Save a named point-in-time copy of all word data. Restore any snapshot to
          revert the database exactly to that state.
        </p>
      </div>

      {/* Create new snapshot */}
      <div className="p-4 rounded-lg border bg-card space-y-3">
        <Label className="text-sm font-medium">Save current state</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Give this snapshot a name (optional)…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createMutation.mutate(); }}
            className="flex-1"
          />
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="gap-1.5 shrink-0"
          >
            {createMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Camera className="h-4 w-4" />}
            Save Snapshot
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Snapshots are stored on the server. Restore replaces <strong>all</strong> word data — this cannot be undone unless you save another snapshot first.
        </p>
      </div>

      {/* Snapshot list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Saved snapshots ({snapshots.length})
        </p>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {!isLoading && snapshots.length === 0 && (
          <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg bg-muted/20">
            No snapshots yet. Save one above to get started.
          </div>
        )}

        {snapshots.map((s) => {
          const isRestoring = restoreMutation.isPending && restoreMutation.variables === s.id;
          const isDeleting = deleteMutation.isPending && deleteMutation.variables === s.id;
          const isConfirming = confirmRestoreId === s.id;

          return (
            <div
              key={s.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg border bg-card transition-colors",
                isConfirming && "border-orange-400 bg-orange-50 dark:bg-orange-950/30"
              )}
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(s.createdAt)} · {s.wordCount} words · {formatBytes(s.sizeBytes)}
                </p>
              </div>

              {/* Actions */}
              {isConfirming ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-orange-700 dark:text-orange-400 font-medium">Replace all data?</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 px-3 text-xs"
                    disabled={isRestoring}
                    onClick={() => restoreMutation.mutate(s.id)}
                  >
                    {isRestoring ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes, restore"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-3 text-xs"
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
                    className="h-7 px-2.5 text-xs gap-1"
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
    </div>
  );
}
