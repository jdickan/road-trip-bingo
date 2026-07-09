import { useState, useRef, useEffect, useCallback } from "react";
import { Word, UpdateWordBody, useUpdateWord } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Check, Loader2 } from "lucide-react";
import { TagBadge } from "./TagBadge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved";

interface CellEditorProps {
  word: Word;
  /** "boards" is display-only on Word; edits are saved as boardIds via boardNameToId. */
  field: keyof UpdateWordBody | "boards";
  options?: readonly string[];
  type?: "text" | "single-select" | "multi-select";
  badgeType?: "findability" | "age" | "season" | "region" | "surroundings" | "board" | "dayNight";
  placeholder?: string;
  className?: string;
  /** When true, shows a green dot indicating this field was recently changed by AI autofill. */
  aiChanged?: boolean;
  /** Required when field="boards": maps board names (displayed) to IDs (saved). */
  boardNameToId?: Map<string, number>;
}

export function CellEditor({ word, field, options, type = "text", badgeType, placeholder, className, aiChanged, boardNameToId }: CellEditorProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<any>(word[field as keyof Word]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Draft value for batched multi-select PATCH
  const [draftValue, setDraftValue] = useState<string[]>([]);

  const updateMutation = useUpdateWord();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    setValue(word[field as keyof Word]);
  }, [word, field]);

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  const handleSave = useCallback((newValue: any) => {
    setValue(newValue);
    setSaveState("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    const data: UpdateWordBody =
      field === "boards"
        ? {
            boardIds: (Array.isArray(newValue) ? (newValue as string[]) : [])
              .map((name) => boardNameToId?.get(name))
              .filter((id): id is number => id !== undefined),
          }
        : ({ [field]: newValue } as UpdateWordBody);

    updateMutation.mutate(
      { id: word.id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/words"] });
          queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
          setSaveState("saved");
          saveTimerRef.current = setTimeout(() => setSaveState("idle"), 1500);
        },
        onError: () => {
          setValue(word[field as keyof Word]);
          setSaveState("idle");
          toast({ title: "Couldn't save change", description: "Your edit was reverted.", variant: "destructive" });
        },
      }
    );
  }, [word, field, boardNameToId, updateMutation, queryClient, toast]);

  const handleTextBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value !== word[field as keyof Word]) {
      handleSave(e.target.value);
    }
  };

  const SaveIndicator = saveState === "saving"
    ? <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground/60 shrink-0" />
    : saveState === "saved"
    ? <Check className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
    : null;

  // ── Text input ────────────────────────────────────────────────────────────
  if (type === "text") {
    return (
      <div className="relative flex items-center">
        <Input
          value={value || ""}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleTextBlur}
          onKeyDown={(e) => { if (e.key === "Escape") { setValue(word[field as keyof Word]); (e.target as HTMLInputElement).blur(); } }}
          aria-label={`${String(field)} for ${word.word}`}
          className={cn(
            "h-7 text-xs px-2 py-1 bg-transparent border-transparent hover:border-input focus:bg-background rounded-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0",
            saveState !== "idle" && "pr-6",
            className
          )}
          placeholder={placeholder ?? `Add ${field}…`}
        />
        {SaveIndicator && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
            {SaveIndicator}
          </span>
        )}
      </div>
    );
  }

  // ── Single-select popover ─────────────────────────────────────────────────
  if (type === "single-select") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            aria-label={`Edit ${String(field)} for ${word.word}`}
            aria-haspopup="listbox"
            aria-expanded={open}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); }
              if (e.key === "Escape") setOpen(false);
            }}
            className="relative w-full min-h-[1.75rem] flex items-center p-1 rounded-sm hover:bg-muted/50 cursor-pointer"
          >
            {aiChanged && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-background z-10" />}
            {saveState !== "idle" && !aiChanged && (
              <span className="absolute top-0.5 right-0.5 z-10">{SaveIndicator}</span>
            )}
            <TagBadge type={badgeType as any} value={value} />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[180px] p-0"
          align="start"
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        >
          <div className="flex flex-col py-1" role="listbox" aria-label={`Select ${String(field)}`}>
            <div
              role="option"
              aria-selected={!value}
              tabIndex={0}
              className="px-3 py-1.5 text-sm hover:bg-muted cursor-pointer text-muted-foreground italic"
              onClick={() => { handleSave(null); setOpen(false); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSave(null); setOpen(false); } }}
            >
              Clear value
            </div>
            {options?.map(opt => (
              <div
                key={opt}
                role="option"
                aria-selected={value === opt}
                tabIndex={0}
                className="px-3 py-1.5 text-sm hover:bg-muted cursor-pointer flex items-center justify-between"
                onClick={() => { handleSave(opt); setOpen(false); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSave(opt); setOpen(false); } }}
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

  // ── Multi-select popover (batched PATCH on close) ─────────────────────────
  if (type === "multi-select") {
    const handleMultiSelectOpenChange = (o: boolean) => {
      if (o) {
        setDraftValue(Array.isArray(value) ? [...value] : []);
      } else {
        const current: string[] = Array.isArray(value) ? value : [];
        const hasChanged =
          draftValue.length !== current.length ||
          draftValue.some(v => !current.includes(v));
        if (hasChanged) {
          handleSave(draftValue);
        }
      }
      setOpen(o);
    };

    const handleDraftToggle = (option: string) => {
      setDraftValue(prev => {
        if (option === "All") {
          return prev.includes("All") ? [] : ["All"];
        }
        if (prev.includes(option)) {
          return prev.filter(v => v !== option && v !== "All");
        }
        return [...prev.filter(v => v !== "All"), option];
      });
    };

    return (
      <Popover open={open} onOpenChange={handleMultiSelectOpenChange}>
        <PopoverTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            aria-label={`Edit ${String(field)} for ${word.word}`}
            aria-haspopup="listbox"
            aria-expanded={open}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); }
              if (e.key === "Escape") setOpen(false);
            }}
            className="relative w-full min-h-[1.75rem] flex items-center flex-wrap gap-1 p-1 rounded-sm hover:bg-muted/50 cursor-pointer"
          >
            {aiChanged && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-background z-10" />}
            {saveState !== "idle" && !aiChanged && (
              <span className="absolute top-0.5 right-0.5 z-10">{SaveIndicator}</span>
            )}
            {(!value || value.length === 0) ? (
              <TagBadge type={badgeType as any} value={null} />
            ) : (
              value.map((v: string) => (
                <TagBadge key={v} type={badgeType as any} value={v} />
              ))
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[200px] p-2"
          align="start"
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        >
          <div className="space-y-2">
            <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
              Select {field}
            </h4>
            <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1">
              {options?.map(opt => {
                const isChecked = draftValue.includes(opt);
                return (
                  <div key={opt} className="flex items-center space-x-2 hover:bg-muted/50 p-1 rounded-md">
                    <Checkbox
                      id={`${word.id}-${field}-${opt}`}
                      checked={isChecked}
                      onCheckedChange={() => handleDraftToggle(opt)}
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
