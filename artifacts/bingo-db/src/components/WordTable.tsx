import { useState } from "react";
import {
  Word,
  ListWordsParams,
  useListWords,
  useCreateWord,
  useDeleteWord,
  getListWordsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CellEditor } from "./CellEditor";
import { REGIONS, SURROUNDINGS, AGES, FINDABILITY, SEASONS, BOARDS, DAY_NIGHT } from "@/lib/constants";

interface WordTableProps {
  filters: ListWordsParams;
  /** Pixels from top where the sticky column header should land (to clear any fixed overlay bar). */
  stickyTop?: number;
  /** Word ID → set of field names recently changed by AI autofill. Drives green dot indicators. */
  aiChanges?: Record<number, Set<string>>;
}

export default function WordTable({ filters, stickyTop = 0, aiChanges }: WordTableProps) {
  const [page, setPage] = useState(0);
  const limit = filters.limit || 100;
  const offset = page * limit;

  const queryParams = { ...filters, limit, offset };
  const { data, isLoading } = useListWords(queryParams, {
    query: { queryKey: getListWordsQueryKey(queryParams), keepPreviousData: true },
  });

  const createMutation = useCreateWord();
  const deleteMutation = useDeleteWord();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newWord, setNewWord] = useState("");

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    createMutation.mutate(
      { data: { word: newWord.trim() } },
      {
        onSuccess: () => {
          setNewWord("");
          queryClient.invalidateQueries({ queryKey: ["/api/words"] });
          queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
          toast({ title: "Word added" });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/words"] });
          queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
          toast({ title: "Word deleted" });
        },
      }
    );
  };

  return (
    <div className="border border-border">
      <Table>
        <TableHeader
          className="bg-background z-10"
          style={{ position: "sticky", top: stickyTop }}
        >
          <TableRow className="border-b border-border hover:bg-transparent">
            <TableHead className="w-[52px] font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground font-normal">Emoji</TableHead>
            <TableHead className="w-[160px] font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground font-normal">Word</TableHead>
            <TableHead className="w-[140px] font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground font-normal">Spanish</TableHead>
            <TableHead className="w-[100px] font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground font-normal">Region</TableHead>
            <TableHead className="w-[150px] font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground font-normal">Surroundings</TableHead>
            <TableHead className="w-[96px] font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground font-normal">Day/Night</TableHead>
            <TableHead className="w-[78px] font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground font-normal">Age</TableHead>
            <TableHead className="w-[100px] font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground font-normal">Findability</TableHead>
            <TableHead className="w-[128px] font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground font-normal">Season</TableHead>
            <TableHead className="w-[155px] font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground font-normal">Boards</TableHead>
            <TableHead className="min-w-[120px] font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground font-normal">Notes</TableHead>
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>

        <TableBody className="text-sm">
          {isLoading && !data ? (
            <TableRow>
              <TableCell colSpan={12} className="h-24 text-center">
                <div className="flex items-center justify-center text-muted-foreground gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="font-mono text-xs tracking-wide">Loading words…</span>
                </div>
              </TableCell>
            </TableRow>
          ) : data?.words.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="h-24 text-center">
                <p className="font-mono text-xs text-muted-foreground tracking-wide">No words found.</p>
              </TableCell>
            </TableRow>
          ) : (
            data?.words.map((word: Word) => {
              const changed = aiChanges?.[word.id];
              return (
                <TableRow key={word.id} className="group border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <TableCell className="p-1 align-top text-center">
                    <CellEditor word={word} field="emoji" type="text" placeholder="🚗" className="text-center text-lg font-normal" />
                  </TableCell>
                  <TableCell className="p-1 align-top font-medium">
                    <CellEditor word={word} field="word" type="text" />
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <CellEditor word={word} field="spanish" type="text" placeholder="Traducción…" />
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <CellEditor word={word} field="regions" type="multi-select" badgeType="region" options={REGIONS} aiChanged={changed?.has("regions")} />
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <CellEditor word={word} field="surroundings" type="multi-select" badgeType="surroundings" options={SURROUNDINGS} aiChanged={changed?.has("surroundings")} />
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <CellEditor word={word} field="dayNight" type="multi-select" badgeType="dayNight" options={DAY_NIGHT} aiChanged={changed?.has("dayNight")} />
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <CellEditor word={word} field="age" type="single-select" badgeType="age" options={AGES} aiChanged={changed?.has("age")} />
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <CellEditor word={word} field="findability" type="single-select" badgeType="findability" options={FINDABILITY} aiChanged={changed?.has("findability")} />
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <CellEditor word={word} field="seasons" type="multi-select" badgeType="season" options={SEASONS} aiChanged={changed?.has("seasons")} />
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <CellEditor word={word} field="boards" type="multi-select" badgeType="board" options={BOARDS} aiChanged={changed?.has("boards")} />
                  </TableCell>
                  <TableCell className="p-1 align-top">
                    <CellEditor word={word} field="notes" type="text" />
                  </TableCell>
                  <TableCell className="p-1 align-top text-right">
                    <button
                      className="h-7 w-7 inline-flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(word.id)}
                      data-testid={`btn-delete-word-${word.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })
          )}

          {/* Quick-add row */}
          <TableRow className="hover:bg-muted/10 border-none">
            <TableCell colSpan={12} className="p-2">
              <form onSubmit={handleAddWord} className="flex items-center gap-2">
                <Plus className="h-3.5 w-3.5 text-muted-foreground/40 ml-2 shrink-0" />
                <Input
                  placeholder="Quick add new word…"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  className="h-7 text-xs border-transparent bg-transparent hover:border-border/50 focus:bg-background focus-visible:ring-0 focus-visible:border-border flex-1 max-w-[260px] rounded-none font-mono placeholder:text-muted-foreground/30"
                  data-testid="input-quick-add"
                />
                {newWord.trim() && (
                  <button
                    type="submit"
                    className="h-7 px-3 text-xs font-mono border border-border hover:bg-muted/40 transition-colors disabled:opacity-40"
                    disabled={createMutation.isPending}
                    data-testid="btn-submit-quick-add"
                  >
                    {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                  </button>
                )}
              </form>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {/* Pagination */}
      {data && data.total > limit && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border">
          <span className="font-mono text-[10.5px] tracking-[0.04em] text-muted-foreground tabular-nums">
            {offset + 1}–{Math.min(offset + limit, data.total)} of {data.total}
          </span>
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-1 font-mono text-[10.5px] tracking-[0.04em] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ArrowLeft className="h-3 w-3" /> Prev
            </button>
            <button
              className="flex items-center gap-1 font-mono text-[10.5px] tracking-[0.04em] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
              onClick={() => setPage((p) => p + 1)}
              disabled={offset + limit >= data.total}
            >
              Next <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
