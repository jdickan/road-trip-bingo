import { useState } from "react";
import { useSuggestWords, useCreateWord, getListWordsQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Plus, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function SuggestWordsModal() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const suggestMutation = useSuggestWords();
  const createMutation = useCreateWord();
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set());

  const handleSuggest = (e: React.FormEvent) => {
    e.preventDefault();
    setAddedWords(new Set());
    suggestMutation.mutate({ data: { theme: theme || undefined, count: 10 } });
  };

  const handleAddWord = (word: string, rationale: string) => {
    createMutation.mutate({
      data: { word, notes: rationale }
    }, {
      onSuccess: () => {
        setAddedWords(prev => new Set(prev).add(word));
        queryClient.invalidateQueries({ queryKey: ["/api/words"] });
        queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
        toast({ title: "Word added", description: `"${word}" has been added to the database.` });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="h-9 gap-2" data-testid="btn-suggest-dialog">
          <Sparkles className="h-4 w-4 text-primary" />
          Suggest Words
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>AI Word Suggestions</DialogTitle>
          <DialogDescription>
            Generate new bingo words based on a theme, or get random suggestions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSuggest} className="flex gap-2 mt-2">
          <div className="flex-1">
            <Label htmlFor="theme" className="sr-only">Theme (Optional)</Label>
            <Input 
              id="theme"
              placeholder="e.g. Desert highway, Fast food signs, 90s music..." 
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={suggestMutation.isPending} data-testid="btn-generate-suggestions">
            {suggestMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate
          </Button>
        </form>

        <div className="flex-1 min-h-[300px] mt-4 border border-border overflow-hidden flex flex-col">
          {suggestMutation.isPending ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
              <p>Brainstorming clever road trip items...</p>
            </div>
          ) : suggestMutation.data?.suggestions && suggestMutation.data.suggestions.length > 0 ? (
            <ScrollArea className="flex-1">
              <div className="divide-y divide-border">
                {suggestMutation.data.suggestions.map((s, i) => {
                  const isAdded = addedWords.has(s.word);
                  return (
                    <div key={i} className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div>
                        <h4 className="font-mono text-sm font-semibold text-foreground">{s.word}</h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.rationale}</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant={isAdded ? "secondary" : "outline"}
                        disabled={isAdded || createMutation.isPending}
                        onClick={() => handleAddWord(s.word, s.rationale)}
                        className="shrink-0 rounded-none"
                        data-testid={`btn-add-suggestion-${i}`}
                      >
                        {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4 mr-1" />}
                        {isAdded ? "Added" : "Add"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center text-sm">
              Enter a theme and click Generate to see suggestions.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
