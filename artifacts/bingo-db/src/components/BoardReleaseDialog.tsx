import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, Check, History, RefreshCw, Send } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ReleaseWord {
  id: number; word: string; spanish: string | null; emoji: string | null;
  age: string | null; findability: string | null; seasons: string[];
  dayNight: string[]; regions: string[]; surroundings: string[];
}
interface ReleaseContent {
  schemaVersion: 1;
  board: { id: number; name: string; description: string | null; ageLevels: string[];
    difficulty: string | null; timeOfYear: string | null; wordCount: number };
  words: ReleaseWord[];
}
interface ReleasePreview extends ReleaseContent { checksum: string; validationError: string | null }
interface BoardRelease {
  id: number; version: number; sourceReleaseId: number | null; checksum: string;
  createdAt: string; payload: ReleaseContent;
}
interface ReleaseHistory { releases: BoardRelease[]; currentVersion: number | null }

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function BoardReleaseDialog({ boardId, boardName }: { boardId: number; boardName: string }) {
  const [open, setOpen] = useState(false);
  const [confirmWithdrawal, setConfirmWithdrawal] = useState(false);
  const client = useQueryClient();
  const { toast } = useToast();
  const preview = useQuery({
    queryKey: ["board-release-preview", boardId],
    queryFn: () => customFetch<ReleasePreview>(`${API_BASE}/release/boards/${boardId}/preview`),
    enabled: open,
  });
  const history = useQuery({
    queryKey: ["board-release-history", boardId],
    queryFn: () => customFetch<ReleaseHistory>(`${API_BASE}/release/boards/${boardId}/history`),
    enabled: open,
  });

  async function submitRelease(checksum: string, sourceReleaseId?: number) {
    return customFetch<BoardRelease>(`${API_BASE}/release/boards/${boardId}/publish`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checksum, sourceReleaseId }),
    });
  }
  const publish = useMutation({
    mutationFn: ({ checksum, sourceReleaseId }: { checksum: string; sourceReleaseId?: number }) =>
      submitRelease(checksum, sourceReleaseId),
    onSuccess: async (_release, args) => {
      setConfirmWithdrawal(false);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["board-release-preview", boardId] }),
        client.invalidateQueries({ queryKey: ["board-release-history", boardId] }),
      ]);
      toast({ title: args.sourceReleaseId ? "Previous release restored as a new version" : "Content release approved" });
    },
    onError: (error) => toast({ title: "Release not approved", description: error instanceof Error ? error.message : "Refresh the preview and try again.", variant: "destructive" }),
  });
  const withdraw = useMutation({
    mutationFn: () => customFetch<void>(`${API_BASE}/release/boards/${boardId}/withdraw`, { method: "POST" }),
    onSuccess: async () => {
      setConfirmWithdrawal(false);
      await client.invalidateQueries({ queryKey: ["board-release-history", boardId] });
      toast({ title: "Board withdrawn from new downloads", description: "Already downloaded copies remain playable." });
    },
    onError: (error) => toast({ title: "Couldn't withdraw board", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setConfirmWithdrawal(false); }}>
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Manage approved releases for ${boardName}`}
          className="inline-flex items-center gap-1.5 border border-border px-2 py-1 text-[10px] font-mono uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          <History className="h-3 w-3" /> Releases
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Approved content releases</DialogTitle>
          <DialogDescription>
            Editing the master board does not change approved releases. Publish requires an explicit approval.
          </DialogDescription>
        </DialogHeader>

        <section aria-label="Current release preview" className="space-y-3 rounded-sm border border-border p-4">
          {preview.isLoading ? <p className="text-sm text-muted-foreground">Loading draft preview…</p> : null}
          {preview.isError ? <p role="alert" className="text-sm text-destructive">Could not load the preview. Refresh and try again.</p> : null}
          {preview.data ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-editorial text-xl italic">{preview.data.board.name}</h3>
                  <p className="text-xs text-muted-foreground">{preview.data.board.wordCount} words · release schema {preview.data.schemaVersion}</p>
                </div>
                <button type="button" onClick={() => { void preview.refetch(); void history.refetch(); }}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <RefreshCw className="h-3 w-3" /> Refresh preview
                </button>
              </div>
              <p className="break-all font-mono text-[10px] text-muted-foreground">Checksum: {preview.data.checksum}</p>
              <div className="flex flex-wrap gap-1.5" aria-label="Sample words">
                {preview.data.words.slice(0, 8).map(word => (
                  <span key={word.id} className="rounded-sm border border-border px-2 py-1 text-xs">{word.emoji} {word.word}</span>
                ))}
              </div>
              {preview.data.validationError ? (
                <p role="alert" className="text-sm text-destructive">{preview.data.validationError}</p>
              ) : (
                <button type="button" onClick={() => publish.mutate({ checksum: preview.data!.checksum })}
                  disabled={publish.isPending || preview.isFetching}
                  className="inline-flex items-center gap-2 border border-foreground bg-foreground px-3 py-2 text-xs text-background disabled:opacity-50">
                  <Check className="h-3.5 w-3.5" />
                  {publish.isPending ? "Publishing…" : "Approve this preview"}
                </button>
              )}
            </>
          ) : null}
        </section>

        <section aria-label="Release history" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Release history</h3>
            <span className="text-xs text-muted-foreground">
              {history.data?.currentVersion ? `Current version ${history.data.currentVersion}` : "Not currently approved"}
            </span>
          </div>
          {history.isLoading ? <p className="text-sm text-muted-foreground">Loading history…</p> : null}
          {history.isError ? <p role="alert" className="text-sm text-destructive">Could not load release history.</p> : null}
          {history.data?.releases.map(release => (
            <article key={release.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-3">
              <div className="min-w-0">
                <p className="text-sm">Version {release.version}
                  {history.data?.currentVersion === release.version ? " · current" : ""}
                  {release.sourceReleaseId ? ` · restored from release ${release.sourceReleaseId}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dateFormatter.format(new Date(release.createdAt))} · {release.payload.board.wordCount} words
                </p>
              </div>
              {history.data?.currentVersion !== release.version ? (
                <button type="button" disabled={publish.isPending}
                  onClick={() => publish.mutate({ checksum: release.checksum, sourceReleaseId: release.id })}
                  className="inline-flex items-center gap-1.5 border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">
                  <ArchiveRestore className="h-3.5 w-3.5" /> Restore as new version
                </button>
              ) : null}
            </article>
          ))}
          {confirmWithdrawal ? (
            <div role="group" aria-label="Confirm withdrawal" className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
              <p className="text-sm text-muted-foreground">Stop new discovery and downloads? Cached copies remain playable.</p>
              <button type="button" disabled={withdraw.isPending} onClick={() => withdraw.mutate()}
                className="border border-destructive px-3 py-1.5 text-xs text-destructive">
                {withdraw.isPending ? "Withdrawing…" : "Confirm withdrawal"}
              </button>
              <button type="button" onClick={() => setConfirmWithdrawal(false)}
                className="px-3 py-1.5 text-xs text-muted-foreground">Cancel</button>
            </div>
          ) : history.data?.currentVersion ? (
            <button type="button" onClick={() => setConfirmWithdrawal(true)}
              className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive">
              <Send className="h-3.5 w-3.5" /> Withdraw from new downloads
            </button>
          ) : null}
          {!history.isLoading && !history.isError && history.data?.releases.length === 0
            ? <p className="text-sm text-muted-foreground">No approved releases yet.</p> : null}
        </section>
      </DialogContent>
    </Dialog>
  );
}
