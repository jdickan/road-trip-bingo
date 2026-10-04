import { useState } from "react";
import { useAutofillWords } from "@workspace/api-client-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const FIELDS = [
  { id: "regions", label: "Regions" },
  { id: "surroundings", label: "Surroundings" },
  { id: "dayNight", label: "Day/Night" },
  { id: "age", label: "Age" },
  { id: "findability", label: "Findability" },
  { id: "seasons", label: "Seasons" },
  { id: "boards", label: "Boards" },
];

interface AutofillPanelProps {
  onComplete?: (results: Array<{ id: number }>, fields: string[]) => void;
}

export default function AutofillPanel({ onComplete }: AutofillPanelProps) {
  const [open, setOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(["age", "findability", "boards", "surroundings", "regions", "seasons", "dayNight"]));
  
  const autofillMutation = useAutofillWords();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleToggleField = (id: string, checked: boolean) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleAutofill = () => {
    if (selectedFields.size === 0) return;
    
    autofillMutation.mutate(
      { data: { fields: Array.from(selectedFields) } },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries();
          const hitCap = data.updated >= 50;
          toast({
            title: data.updated === 0 ? "Nothing to fill" : "Autofill complete",
            description: data.updated === 0
              ? "No changes were applied. Fields may already be filled, words may have changed during processing, or AI may not have returned usable values."
              : hitCap
                ? `Updated ${data.updated} words (batch limit reached — run again for more).`
                : `Updated ${data.updated} words. Existing values and words edited during processing were left unchanged.`,
          });
          if (data.updated > 0) {
            onComplete?.(data.results as Array<{ id: number }>, Array.from(selectedFields));
          }
          setOpen(false);
        },
        onError: () => {
          toast({
            title: "Couldn't autofill words",
            description: "Autofill could not be confirmed. Refresh before trying again. Failed batches do not leave partial changes.",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 text-xs text-foreground border border-border px-3 py-1.5 hover:bg-muted/40 transition-colors duration-150" data-testid="btn-autofill-panel">
          <Wand2 className="h-3.5 w-3.5" />
          AI Autofill
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm leading-none mb-1">Batch Autofill Missing Data</h4>
            <p className="text-xs text-muted-foreground">Fills only empty tags on up to 50 active words across the whole database, not just your current filters. Existing values and words in Trash are never overwritten.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {FIELDS.map(f => (
              <div key={f.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`field-${f.id}`} 
                  checked={selectedFields.has(f.id)}
                  onCheckedChange={(checked) => handleToggleField(f.id, checked as boolean)}
                />
                <Label htmlFor={`field-${f.id}`} className="text-xs font-normal cursor-pointer">
                  {f.label}
                </Label>
              </div>
            ))}
          </div>

          <Button 
            className="w-full" 
            onClick={handleAutofill} 
            disabled={selectedFields.size === 0 || autofillMutation.isPending}
            data-testid="btn-execute-autofill"
          >
            {autofillMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>Autofill All Incomplete</>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
