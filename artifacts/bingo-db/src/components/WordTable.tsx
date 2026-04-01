import { useState } from "react";
import { 
  Word, 
  ListWordsParams, 
  useListWords, 
  useCreateWord, 
  useDeleteWord, 
  getListWordsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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

export default function WordTable({ filters, scrollRef, onScroll }: WordTableProps) {
  const [page, setPage] = useState(0);
  const limit = filters.limit || 100;
  const offset = page * limit;
  
  const queryParams = { ...filters, limit, offset };
  const { data, isLoading } = useListWords(queryParams, {
    query: { queryKey: getListWordsQueryKey(queryParams), keepPreviousData: true }
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
        }
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
        }
      }
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card border rounded-md shadow-sm">
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[60px] font-semibold text-xs tracking-wider uppercase">Emoji</TableHead>
              <TableHead className="w-[180px] font-semibold text-xs tracking-wider uppercase">Word</TableHead>
              <TableHead className="w-[150px] font-semibold text-xs tracking-wider uppercase">Spanish</TableHead>
              <TableHead className="w-[130px] font-semibold text-xs tracking-wider uppercase">Region</TableHead>
              <TableHead className="w-[140px] font-semibold text-xs tracking-wider uppercase">Surroundings</TableHead>
              <TableHead className="w-[100px] font-semibold text-xs tracking-wider uppercase">Day/Night</TableHead>
              <TableHead className="w-[90px] font-semibold text-xs tracking-wider uppercase">Age</TableHead>
              <TableHead className="w-[100px] font-semibold text-xs tracking-wider uppercase">Findability</TableHead>
              <TableHead className="w-[130px] font-semibold text-xs tracking-wider uppercase">Season</TableHead>
              <TableHead className="w-[180px] font-semibold text-xs tracking-wider uppercase">Boards</TableHead>
              <TableHead className="min-w-[140px] font-semibold text-xs tracking-wider uppercase">Notes</TableHead>
              <TableHead className="w-[50px]"></TableHead>
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
            {/* Add row */}
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
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {data && data.total > limit && (
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
          <div className="text-xs text-muted-foreground">
            Showing {offset + 1} to {Math.min(offset + limit, data.total)} of {data.total} words
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8" 
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ArrowLeft className="h-3 w-3 mr-1" /> Prev
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8" 
              onClick={() => setPage(p => p + 1)}
              disabled={offset + limit >= data.total}
            >
              Next <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
