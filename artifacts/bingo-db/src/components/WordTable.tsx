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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CellEditor } from "./CellEditor";
import { REGIONS, SURROUNDINGS, AGES, FINDABILITY, SEASONS, BOARDS, DAY_NIGHT } from "@/lib/constants";

interface WordTableProps {
  filters: ListWordsParams;
  scrollRef?: React.Ref<HTMLDivElement>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

// Shared grid definition: tag columns only (no emoji/word/spanish)
// Region | Surroundings | Day/Night | Age | Findability | Season | Boards | Notes | Actions
const TAG_GRID = "90px 150px 96px 78px 100px 128px 155px 1fr 32px";

export default function WordTable({ filters, scrollRef, onScroll }: WordTableProps) {
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
    <div className="flex flex-col h-full overflow-hidden bg-card border rounded-md shadow-sm">
      {/* Sticky tag column header */}
      <div
        className="shrink-0 bg-muted/50 border-b px-3 py-1.5"
        style={{ display: "grid", gridTemplateColumns: TAG_GRID, columnGap: "4px" }}
      >
        {["Region", "Surroundings", "Day/Night", "Age", "Findability", "Season", "Boards", "Notes", ""].map((h) => (
          <div key={h} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {h}
          </div>
        ))}
      </div>

      {/* Scrollable list */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-auto">
        {isLoading && !data ? (
          <div className="h-24 flex items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading words...
          </div>
        ) : data?.words.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
            No words found. Try adjusting your filters or adding a new word.
          </div>
        ) : (
          data?.words.map((word: Word) => <WordRow key={word.id} word={word} onDelete={handleDelete} />)
        )}

        {/* Add row */}
        <div className="border-t bg-muted/10 hover:bg-muted/20 px-3 py-2">
          <form onSubmit={handleAddWord} className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Quick add new word..."
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              className="h-8 border-dashed bg-transparent focus:bg-background flex-1 max-w-xs"
              data-testid="input-quick-add"
            />
            {newWord.trim() && (
              <Button
                type="submit"
                size="sm"
                className="h-8 px-3"
                disabled={createMutation.isPending}
                data-testid="btn-submit-quick-add"
              >
                {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : "Save"}
              </Button>
            )}
          </form>
        </div>
      </div>

      {/* Pagination footer */}
      {data && data.total > limit && (
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 shrink-0">
          <div className="text-xs text-muted-foreground">
            Showing {offset + 1}–{Math.min(offset + limit, data.total)} of {data.total}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              <ArrowLeft className="h-3 w-3 mr-1" /> Prev
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setPage((p) => p + 1)} disabled={offset + limit >= data.total}>
              Next <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function WordRow({ word, onDelete }: { word: Word; onDelete: (id: number) => void }) {
  return (
    <div className="group border-b last:border-b-0 hover:bg-muted/20 transition-colors">
      {/* ── Line 1: Identity — emoji · word · spanish ── */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-0.5">
        {/* Emoji */}
        <div className="shrink-0 w-8 text-center">
          <CellEditor word={word} field="emoji" type="text" placeholder="🚗" className="text-center text-base font-normal" />
        </div>
        {/* English word */}
        <div className="font-semibold text-sm min-w-0">
          <CellEditor word={word} field="word" type="text" />
        </div>
        {/* Separator */}
        <span className="text-muted-foreground/50 text-sm shrink-0">·</span>
        {/* Spanish */}
        <div className="text-sm text-muted-foreground min-w-0 flex-1">
          <CellEditor word={word} field="spanish" type="text" placeholder="Traducción..." />
        </div>
        {/* Delete — appears on hover */}
        <button
          onClick={() => onDelete(word.id)}
          className="shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
          data-testid={`btn-delete-word-${word.id}`}
          title="Delete word"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Line 2: Tag columns — aligned to sticky header ── */}
      <div
        className="px-3 pb-2 pt-0.5"
        style={{ display: "grid", gridTemplateColumns: TAG_GRID, columnGap: "4px" }}
      >
        {/* Region */}
        <div className="min-w-0">
          <CellEditor word={word} field="regions" type="multi-select" badgeType="region" options={REGIONS} />
        </div>
        {/* Surroundings */}
        <div className="min-w-0">
          <CellEditor word={word} field="surroundings" type="multi-select" badgeType="surroundings" options={SURROUNDINGS} />
        </div>
        {/* Day/Night */}
        <div className="min-w-0">
          <CellEditor word={word} field="dayNight" type="multi-select" badgeType="dayNight" options={DAY_NIGHT} />
        </div>
        {/* Age */}
        <div className="min-w-0">
          <CellEditor word={word} field="age" type="single-select" badgeType="age" options={AGES} />
        </div>
        {/* Findability */}
        <div className="min-w-0">
          <CellEditor word={word} field="findability" type="single-select" badgeType="findability" options={FINDABILITY} />
        </div>
        {/* Season */}
        <div className="min-w-0">
          <CellEditor word={word} field="seasons" type="multi-select" badgeType="season" options={SEASONS} />
        </div>
        {/* Boards */}
        <div className="min-w-0">
          <CellEditor word={word} field="boards" type="multi-select" badgeType="board" options={BOARDS} />
        </div>
        {/* Notes */}
        <div className="min-w-0">
          <CellEditor word={word} field="notes" type="text" />
        </div>
        {/* Spacer for delete column */}
        <div />
      </div>
    </div>
  );
}
