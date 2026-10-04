import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Camera, RotateCcw, Trash2, Loader2, DatabaseZap, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { customFetch } from "@workspace/api-client-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

interface SnapshotMeta {
  id: string;
  label: string;
  createdAt: string;
  wordCount: number;
  sizeBytes: number;
}

async function fetchSnapshots(): Promise<{ snapshots: SnapshotMeta[] }> {
  return customFetch<{ snapshots: SnapshotMeta[] }>(`${API_BASE}/snapshots`);
}

async function createSnapshot(label: string): Promise<{ snapshot: SnapshotMeta }> {
  return customFetch<{ snapshot: SnapshotMeta }>(`${API_BASE}/snapshots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
}

async function restoreSnapshot(id: string): Promise<void> {
  await customFetch<void>(`${API_BASE}/snapshots/${id}/restore`, { method: "POST" });
}

async function deleteSnapshot(id: string): Promise<void> {
  await customFetch<void>(`${API_BASE}/snapshots/${id}`, { method: "DELETE" });
}

async function downloadSnapshot(id: string, label: string): Promise<void> {
  const blob = await customFetch<Blob>(`${API_BASE}/snapshots/${id}/download`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${label.replace(/[^a-z0-9_-]/gi, "_")}.sql`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
  const [restoreDialogId, setRestoreDialogId] = useState<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
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
    onError: () => toast({ title: "Couldn't save snapshot", variant: "destructive" }),
  });

  const restoreMutation = useMutation({
    mutationFn: restoreSnapshot,
    onSuccess: () => {
      qc.invalidateQueries();
      setRestoreDialogId(null);
      toast({ title: "Words restored", description: "Word data and saved board links were restored. Board settings were not changed." });
    },
    onError: (error) => toast({
      title: "Couldn't restore snapshot",
      description: error instanceof Error ? error.message : "Restore failed. No partial restore was applied.",
      variant: "destructive",
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSnapshot,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["snapshots"] });
      toast({ title: "Snapshot deleted" });
    },
    onError: () => toast({ title: "Couldn't delete snapshot", variant: "destructive" }),
  });

  const snapshots = data?.snapshots ?? [];

  return (
    <div className="max-w-5xl mx-auto pb-16">

      {/* ── Page header ── */}
      <div className="border-b border-border py-8">
        <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground mb-2">
          Snapshots · Point-in-time backups
        </p>
        <h2 className="text-3xl md:text-4xl font-editorial italic text-foreground leading-tight flex items-center gap-3">
          <DatabaseZap className="h-6 w-6 shrink-0 text-muted-foreground/50" />
          Database Snapshots
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-[65ch] leading-relaxed">
          Save a private, persistent copy of all words and their board links. Restoring a snapshot does not revert board names or settings.
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
      {isError && (
        <div className="text-sm text-muted-foreground py-8 text-center border border-border">
          Couldn&apos;t load snapshots. Your backups have not been deleted.
          <button className="ml-2 underline" onClick={() => void refetch()}>Retry</button>
        </div>
      )}
      {!isLoading && !isError && snapshots.length === 0 && (
        <div className="text-sm text-muted-foreground py-8 text-center border border-border bg-muted/10">
          No snapshots yet. Save one above to get started.
        </div>
      )}

      {/* ── Restore confirmation dialog ── */}
      {(() => {
        const target = snapshots.find(s => s.id === restoreDialogId);
        return (
          <AlertDialog open={restoreDialogId !== null} onOpenChange={(open) => { if (!open) setRestoreDialogId(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restore snapshot?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2">
                    <p>
                      This will replace <strong className="text-foreground font-medium">all</strong> current words and their saved board links. Board names and settings will not be reverted.
                      This action cannot be undone unless you save another snapshot first.
                    </p>
                    <p>If a referenced board no longer exists or the backup cannot be imported, the restore will fail without applying a partial restore.</p>
                    {target && (
                      <p className="font-mono text-xs text-muted-foreground">
                        Snapshot: <span className="text-foreground">{target.label}</span> · {target.wordCount} words · {formatDate(target.createdAt)}
                      </p>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={restoreMutation.isPending}>Cancel</AlertDialogCancel>
                <button
                  className="inline-flex items-center gap-1.5 justify-center text-sm font-medium h-10 px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  disabled={restoreMutation.isPending}
                  onClick={() => { if (restoreDialogId) restoreMutation.mutate(restoreDialogId); }}
                >
                  {restoreMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  Restore snapshot
                </button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      })()}

      {/* ── Snapshot list ── */}
      {snapshots.length > 0 && (
        <div className="border border-border divide-y divide-border">
          {snapshots.map((s) => {
            const isDeleting = deleteMutation.isPending && deleteMutation.variables === s.id;

            return (
              <div
                key={s.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/20"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-medium truncate text-foreground">{s.label}</p>
                  <p className="font-mono text-[10.5px] text-muted-foreground mt-0.5">
                    {formatDate(s.createdAt)} · {s.wordCount} words · {formatBytes(s.sizeBytes)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    className="flex items-center gap-1.5 text-xs text-foreground border border-border px-3 py-1.5 hover:bg-muted/40 transition-colors duration-150"
                    onClick={() => setRestoreDialogId(s.id)}
                    title="Restore this snapshot"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    title="Download SQL dump"
                    onClick={() => downloadSnapshot(s.id, s.label).catch(() =>
                      toast({ title: "Couldn't download snapshot", variant: "destructive" })
                    )}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
