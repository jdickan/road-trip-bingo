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
          queryClient.invalidateQueries({ queryKey: ["/api/words"] });
          queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
          const hitCap = data.updated >= 50;
          toast({
            title: data.updated === 0 ? "Nothing to fill" : "Autofill complete",
            description: data.updated === 0
              ? "All selected fields already have values."
              : hitCap
                ? `Updated ${data.updated} words (batch limit reached — run again for more).`
                : `Updated ${data.updated} words.`,
          });
          if (data.updated > 0) {
            onComplete?.(data.results as Array<{ id: number }>, Array.from(selectedFields));
          }
          setOpen(false);
        },
        onError: () => {
          toast({
            title: "Autofill Failed",
            description: "There was an error autofilling words. Please try again.",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.18em] uppercase text-foreground border border-border px-3 py-2 hover:bg-muted/40 transition-colors"
          data-testid="btn-autofill-panel"
        >
          <Wand2 className="h-3.5 w-3.5 text-blue-500" />
          AI Autofill
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm leading-none mb-1">Batch Autofill Missing Data</h4>
            <p className="text-xs text-muted-foreground">AI will fill in empty tags for up to 50 words at a time. If there are more incomplete words, just run it again.</p>
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
                Processing...
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
