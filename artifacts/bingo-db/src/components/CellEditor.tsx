import { useState, useRef, useEffect } from "react";
import { Word, UpdateWordBody, useUpdateWord, getListWordsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";
import { TagBadge } from "./TagBadge";

interface CellEditorProps {
  word: Word;
  field: keyof UpdateWordBody;
  options?: readonly string[];
  type?: "text" | "single-select" | "multi-select";
  badgeType?: "findability" | "age" | "season" | "region" | "surroundings" | "board" | "dayNight";
  placeholder?: string;
  className?: string;
}

export function CellEditor({ word, field, options, type = "text", badgeType, placeholder, className }: CellEditorProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<any>(word[field as keyof Word]);
  const updateMutation = useUpdateWord();
  const queryClient = useQueryClient();

  useEffect(() => {
    setValue(word[field as keyof Word]);
  }, [word, field]);

  const handleSave = (newValue: any) => {
    setValue(newValue);
    updateMutation.mutate(
      { id: word.id, data: { [field]: newValue } },
      {
        onSuccess: (updatedWord) => {
          // Update cache immediately without full refetch
          queryClient.setQueryData<any>(getListWordsQueryKey(), (oldData: any) => {
            if (!oldData?.words) return oldData;
            return {
              ...oldData,
              words: oldData.words.map((w: Word) => w.id === updatedWord.id ? updatedWord : w)
            };
          });
          queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
        }
      }
    );
  };

  const handleTextBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value !== word[field as keyof Word]) {
      handleSave(e.target.value);
    }
  };

  const handleMultiSelectToggle = (option: string) => {
    const currentValues = Array.isArray(value) ? [...value] : [];
    
    // "All" logic
    if (option === "All") {
      if (currentValues.includes("All")) {
        handleSave([]);
      } else {
        handleSave(["All"]);
      }
      return;
    }

    let newValues;
    if (currentValues.includes(option)) {
      newValues = currentValues.filter(v => v !== option && v !== "All");
    } else {
      newValues = [...currentValues.filter(v => v !== "All"), option];
    }
    handleSave(newValues);
  };

  // Render text input inline
  if (type === "text") {
    return (
      <Input
        value={value || ""}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleTextBlur}
        className={`h-7 text-xs px-2 py-1 bg-transparent border-transparent hover:border-input focus:bg-background rounded-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0${className ? ` ${className}` : ""}`}
        placeholder={placeholder ?? `Add ${field}...`}
      />
    );
  }

  // Render single-select as a popover with options
  if (type === "single-select") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="w-full min-h-[1.75rem] flex items-center p-1 rounded-sm hover:bg-muted/50 cursor-pointer">
            <TagBadge type={badgeType as any} value={value} />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[180px] p-0" align="start">
          <div className="flex flex-col py-1">
            <div 
              className="px-3 py-1.5 text-sm hover:bg-muted cursor-pointer text-muted-foreground italic"
              onClick={() => { handleSave(null); setOpen(false); }}
            >
              Clear value
            </div>
            {options?.map(opt => (
              <div 
                key={opt}
                className="px-3 py-1.5 text-sm hover:bg-muted cursor-pointer flex items-center justify-between"
                onClick={() => { handleSave(opt); setOpen(false); }}
              >
                <TagBadge type={badgeType as any} value={opt} />
                {value === opt && <Check className="h-3 w-3" />}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Render multi-select as a popover with checkboxes
  if (type === "multi-select") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="w-full min-h-[1.75rem] flex items-center flex-wrap gap-1 p-1 rounded-sm hover:bg-muted/50 cursor-pointer">
            {(!value || value.length === 0) ? (
              <TagBadge type={badgeType as any} value={null} />
            ) : (
              value.map((v: string) => (
                <TagBadge key={v} type={badgeType as any} value={v} />
              ))
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-2" align="start">
          <div className="space-y-2">
            <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
              Select {field}
            </h4>
            <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1">
              {options?.map(opt => {
                const isChecked = Array.isArray(value) && value.includes(opt);
                return (
                  <div key={opt} className="flex items-center space-x-2 hover:bg-muted/50 p-1 rounded-md">
                    <Checkbox 
                      id={`${word.id}-${field}-${opt}`} 
                      checked={isChecked}
                      onCheckedChange={() => handleMultiSelectToggle(opt)}
                    />
                    <Label 
                      htmlFor={`${word.id}-${field}-${opt}`} 
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      <TagBadge type={badgeType as any} value={opt} />
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return null;
}
