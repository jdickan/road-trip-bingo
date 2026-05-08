import { useState, useRef } from "react";
import { useCreateWord } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ListPlus, X, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function parseWords(raw: string): string[] {
  return raw
    .split(/[\n,\t]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0)
    .filter((w, i, arr) => arr.indexOf(w) === i);
}

type WordStatus = "pending" | "adding" | "done" | "error";

interface WordEntry {
  word: string;
  status: WordStatus;
}

export default function BulkAddModal() {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [entries, setEntries] = useState<WordEntry[]>([]);
  const [phase, setPhase] = useState<"input" | "review" | "done">("input");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreateWord();

  const preview = parseWords(raw);

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) {
      setRaw("");
      setEntries([]);
      setPhase("input");
    }
  }

  function goToReview() {
    setEntries(preview.map((word) => ({ word, status: "pending" })));
    setPhase("review");
  }

  function removeEntry(word: string) {
    setEntries((e) => e.filter((x) => x.word !== word));
  }

  async function addAll() {
    let added = 0;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.status !== "pending") continue;
      setEntries((prev) =>
        prev.map((e) => (e.word === entry.word ? { ...e, status: "adding" } : e))
      );
      await new Promise<void>((resolve) => {
        createMutation.mutate(
          { data: { word: entry.word } },
          {
            onSuccess: () => {
              setEntries((prev) =>
                prev.map((e) => (e.word === entry.word ? { ...e, status: "done" } : e))
              );
              added++;
              resolve();
            },
            onError: () => {
              setEntries((prev) =>
                prev.map((e) => (e.word === entry.word ? { ...e, status: "error" } : e))
              );
              resolve();
            },
          }
        );
      });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/words"] });
    queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
    toast({ title: `${added} word${added === 1 ? "" : "s"} added` });
    setPhase("done");
  }

  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const doneCount = entries.filter((e) => e.status === "done").length;
  const isAdding = entries.some((e) => e.status === "adding");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-1.5 text-xs text-foreground border border-border px-3 py-1.5 hover:bg-muted/40 transition-colors duration-150"
          data-testid="btn-bulk-add"
          title="Bulk add words"
        >
          <ListPlus className="h-3.5 w-3.5" />
          Bulk Add
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-lg flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="font-editorial italic text-2xl font-normal">Bulk Add Words</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Separate words with commas, tabs, or new lines.
          </p>
        </DialogHeader>

        {phase === "input" && (
          <div className="flex flex-col gap-4 p-6">
            <textarea
              ref={textareaRef}
              className="w-full h-44 resize-none rounded-none border border-border bg-muted/20 px-3 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/30 transition-colors"
              placeholder={"Hot air balloon\nRest stop, Cow, Train\nBillboard"}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-muted-foreground/50">
                {preview.length > 0 ? `${preview.length} word${preview.length === 1 ? "" : "s"} detected` : "Start typing…"}
              </span>
              <Button
                onClick={goToReview}
                disabled={preview.length === 0}
                className="rounded-none"
              >
                Review &amp; Add
              </Button>
            </div>
          </div>
        )}

        {(phase === "review" || phase === "done") && (
          <div className="flex flex-col gap-0">
            {/* Word chips */}
            <div className="px-6 pt-5 pb-4 flex flex-wrap gap-2 max-h-64 overflow-y-auto">
              {entries.map((entry) => (
                <div
                  key={entry.word}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 font-mono text-xs border transition-all duration-300",
                    entry.status === "pending" && "border-border text-foreground bg-transparent",
                    entry.status === "adding" && "border-primary/50 text-primary bg-primary/5 animate-pulse",
                    entry.status === "done" && "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5",
                    entry.status === "error" && "border-destructive/40 text-destructive bg-destructive/5"
                  )}
                >
                  {entry.status === "done" && <Check className="h-3 w-3 shrink-0" />}
                  {entry.status === "adding" && <Loader2 className="h-3 w-3 shrink-0 animate-spin" />}
                  {entry.status === "error" && <X className="h-3 w-3 shrink-0" />}
                  <span>{entry.word}</span>
                  {entry.status === "pending" && (
                    <button
                      onClick={() => removeEntry(entry.word)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4 flex items-center justify-between gap-4">
              {phase === "done" ? (
                <>
                  <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-emerald-600 dark:text-emerald-400">
                    {doneCount} added
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" className="rounded-none" onClick={() => { setPhase("input"); setRaw(""); setEntries([]); }}>
                      Add more
                    </Button>
                    <Button className="rounded-none" onClick={() => handleOpenChange(false)}>
                      Done
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-muted-foreground/50">
                    {pendingCount} to add
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" className="rounded-none" onClick={() => { setPhase("input"); }}>
                      ← Edit
                    </Button>
                    <Button
                      className="rounded-none"
                      onClick={addAll}
                      disabled={isAdding || pendingCount === 0}
                    >
                      {isAdding ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
                      Add {pendingCount} word{pendingCount === 1 ? "" : "s"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
