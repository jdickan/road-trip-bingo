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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, ArrowRight, ArrowLeft, Table2, Rows3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CellEditor } from "./CellEditor";
import { REGIONS, SURROUNDINGS, AGES, FINDABILITY, SEASONS, BOARDS, DAY_NIGHT } from "@/lib/constants";

interface WordTableProps {
  filters: ListWordsParams;
  scrollRef?: React.Ref<HTMLDivElement>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

// Shared grid definition for two-line layout tag columns
const TAG_GRID = "90px 150px 96px 78px 100px 128px 155px 1fr 32px";

type Layout = "two-line" | "classic";

function loadLayout(): Layout {
  try {
    const v = localStorage.getItem("bingo-table-layout");
    if (v === "classic" || v === "two-line") return v;
  } catch {}
  return "two-line";
}

export default function WordTable({ filters, scrollRef, onScroll }: WordTableProps) {
  const [page, setPage] = useState(0);
  const [layout, setLayout] = useState<Layout>(loadLayout);
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

  function toggleLayout() {
    setLayout((l) => {
      const next: Layout = l === "two-line" ? "classic" : "two-line";
      try { localStorage.setItem("bingo-table-layout", next); } catch {}
      return next;
    });
  }

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

  const LayoutToggle = (
    <button
      onClick={toggleLayout}
      title={layout === "two-line" ? "Switch to classic single-row table" : "Switch to two-line layout"}
      className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted/60"
    >
      {layout === "two-line" ? (
        <><Table2 className="h-3.5 w-3.5" /> Classic</>
      ) : (
        <><Rows3 className="h-3.5 w-3.5" /> Expanded</>
      )}
    </button>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card border rounded-md shadow-sm">

      {/* ── Two-line layout ── */}
      {layout === "two-line" && (
        <>
          {/* Sticky tag-column header */}
          <div
            className="shrink-0 bg-muted/50 border-b px-3 py-2 flex items-center"
            style={{ display: "grid", gridTemplateColumns: `${TAG_GRID}` }}
          >
            {["Region", "Surroundings", "Day/Night", "Age", "Findability", "Season", "Boards", "Notes"].map((h) => (
              <div key={h} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                {h}
              </div>
            ))}
            {/* Toggle in last grid cell */}
            <div className="flex justify-end">{LayoutToggle}</div>
          </div>

          {/* Scrollable rows */}
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
              data?.words.map((word: Word) => (
                <TwoLineRow key={word.id} word={word} onDelete={handleDelete} />
              ))
            )}

            {/* Add row */}
            <div className="border-t bg-muted/10 hover:bg-muted/20 px-3 py-2.5">
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
                  <Button type="submit" size="sm" className="h-8 px-3" disabled={createMutation.isPending} data-testid="btn-submit-quick-add">
                    {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : "Save"}
                  </Button>
                )}
              </form>
            </div>
          </div>
        </>
      )}

      {/* ── Classic single-row table layout ── */}
      {layout === "classic" && (
        <>
          <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-[52px] font-semibold text-xs tracking-wider uppercase">Emoji</TableHead>
                  <TableHead className="w-[160px] font-semibold text-xs tracking-wider uppercase">Word</TableHead>
                  <TableHead className="w-[140px] font-semibold text-xs tracking-wider uppercase">Spanish</TableHead>
                  <TableHead className="w-[100px] font-semibold text-xs tracking-wider uppercase">Region</TableHead>
                  <TableHead className="w-[150px] font-semibold text-xs tracking-wider uppercase">Surroundings</TableHead>
                  <TableHead className="w-[96px] font-semibold text-xs tracking-wider uppercase">Day/Night</TableHead>
                  <TableHead className="w-[78px] font-semibold text-xs tracking-wider uppercase">Age</TableHead>
                  <TableHead className="w-[100px] font-semibold text-xs tracking-wider uppercase">Findability</TableHead>
                  <TableHead className="w-[128px] font-semibold text-xs tracking-wider uppercase">Season</TableHead>
                  <TableHead className="w-[155px] font-semibold text-xs tracking-wider uppercase">Boards</TableHead>
                  <TableHead className="min-w-[120px] font-semibold text-xs tracking-wider uppercase">Notes</TableHead>
                  <TableHead className="w-[50px] text-right">
                    {LayoutToggle}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-sm">
                {isLoading && !data ? (
                  <TableRow>
                    <TableCell colSpan={12} className="h-24 text-center">
                      <div className="flex items-center justify-center text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading words...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data?.words.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                      No words found. Try adjusting your filters or adding a new word.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.words.map((word: Word) => (
                    <TableRow key={word.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="p-1 align-top text-center">
                        <CellEditor word={word} field="emoji" type="text" placeholder="🚗" className="text-center text-lg font-normal" />
                      </TableCell>
                      <TableCell className="p-1 align-top font-medium">
                        <CellEditor word={word} field="word" type="text" />
                      </TableCell>
                      <TableCell className="p-1 align-top">
                        <CellEditor word={word} field="spanish" type="text" placeholder="Traducción..." />
                      </TableCell>
                      <TableCell className="p-1 align-top">
                        <CellEditor word={word} field="regions" type="multi-select" badgeType="region" options={REGIONS} />
                      </TableCell>
                      <TableCell className="p-1 align-top">
                        <CellEditor word={word} field="surroundings" type="multi-select" badgeType="surroundings" options={SURROUNDINGS} />
                      </TableCell>
                      <TableCell className="p-1 align-top">
                        <CellEditor word={word} field="dayNight" type="multi-select" badgeType="dayNight" options={DAY_NIGHT} />
                      </TableCell>
                      <TableCell className="p-1 align-top">
                        <CellEditor word={word} field="age" type="single-select" badgeType="age" options={AGES} />
                      </TableCell>
                      <TableCell className="p-1 align-top">
                        <CellEditor word={word} field="findability" type="single-select" badgeType="findability" options={FINDABILITY} />
                      </TableCell>
                      <TableCell className="p-1 align-top">
                        <CellEditor word={word} field="seasons" type="multi-select" badgeType="season" options={SEASONS} />
                      </TableCell>
                      <TableCell className="p-1 align-top">
                        <CellEditor word={word} field="boards" type="multi-select" badgeType="board" options={BOARDS} />
                      </TableCell>
                      <TableCell className="p-1 align-top">
                        <CellEditor word={word} field="notes" type="text" />
                      </TableCell>
                      <TableCell className="p-1 align-top text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(word.id)}
                          data-testid={`btn-delete-word-${word.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="bg-muted/10 hover:bg-muted/20">
                  <TableCell colSpan={12} className="p-2">
                    <form onSubmit={handleAddWord} className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-muted-foreground ml-2" />
                      <Input
                        placeholder="Quick add new word..."
                        value={newWord}
                        onChange={(e) => setNewWord(e.target.value)}
                        className="h-8 border-dashed bg-transparent focus:bg-background flex-1 max-w-[300px]"
                        data-testid="input-quick-add"
                      />
                      {newWord.trim() && (
                        <Button type="submit" size="sm" className="h-8 px-3" disabled={createMutation.isPending} data-testid="btn-submit-quick-add">
                          {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : "Save"}
                        </Button>
                      )}
                    </form>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </>
      )}

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

function TwoLineRow({ word, onDelete }: { word: Word; onDelete: (id: number) => void }) {
  return (
    <div
      className="group hover:bg-muted/20 transition-colors"
      style={{ borderTop: "1px solid var(--row-divider)" }}
    >
      {/* ── Line 1: Identity — emoji · word · spanish ── */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
        <div className="shrink-0 w-8 text-center">
          <CellEditor word={word} field="emoji" type="text" placeholder="🚗" className="text-center text-base font-normal" />
        </div>
        <div className="font-semibold text-sm min-w-0">
          <CellEditor word={word} field="word" type="text" />
        </div>
        <span className="text-muted-foreground/40 text-sm shrink-0">·</span>
        <div className="text-sm text-muted-foreground min-w-0 flex-1">
          <CellEditor word={word} field="spanish" type="text" placeholder="Traducción..." />
        </div>
        <button
          onClick={() => onDelete(word.id)}
          className="shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
          data-testid={`btn-delete-word-${word.id}`}
          title="Delete word"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Line 2: Tag columns ── */}
      <div
        className="px-3 pt-0.5 pb-3"
        style={{ display: "grid", gridTemplateColumns: TAG_GRID, columnGap: "4px" }}
      >
        <div className="min-w-0"><CellEditor word={word} field="regions" type="multi-select" badgeType="region" options={REGIONS} /></div>
        <div className="min-w-0"><CellEditor word={word} field="surroundings" type="multi-select" badgeType="surroundings" options={SURROUNDINGS} /></div>
        <div className="min-w-0"><CellEditor word={word} field="dayNight" type="multi-select" badgeType="dayNight" options={DAY_NIGHT} /></div>
        <div className="min-w-0"><CellEditor word={word} field="age" type="single-select" badgeType="age" options={AGES} /></div>
        <div className="min-w-0"><CellEditor word={word} field="findability" type="single-select" badgeType="findability" options={FINDABILITY} /></div>
        <div className="min-w-0"><CellEditor word={word} field="seasons" type="multi-select" badgeType="season" options={SEASONS} /></div>
        <div className="min-w-0"><CellEditor word={word} field="boards" type="multi-select" badgeType="board" options={BOARDS} /></div>
        <div className="min-w-0"><CellEditor word={word} field="notes" type="text" /></div>
        <div />
      </div>
    </div>
  );
}
