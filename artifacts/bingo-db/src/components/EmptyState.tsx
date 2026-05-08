import { useRef, useState } from "react";
import { Upload, Clipboard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface EmptyStateProps {
  icon?: React.ReactNode;
  headline: string;
  body: string;
  children?: React.ReactNode;
  onJsonImport?: (rows: Record<string, unknown>[]) => Promise<void>;
  jsonLabel?: string;
}

export function EmptyState({
  icon,
  headline,
  body,
  children,
  onJsonImport,
  jsonLabel = "item",
}: EmptyStateProps) {
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  function parseRows(data: unknown): Record<string, unknown>[] | null {
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      if (Array.isArray(d.words)) return d.words as Record<string, unknown>[];
      if (Array.isArray(d.boards)) return d.boards as Record<string, unknown>[];
    }
    return null;
  }

  async function importRows(rows: Record<string, unknown>[]) {
    if (!onJsonImport) return;
    if (rows.length === 0) {
      toast({ title: "No data found", description: "The JSON doesn't contain any items.", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      await onJsonImport(rows);
    } finally {
      setImporting(false);
    }
  }

  async function importFile(file: File) {
    try {
      const text = await file.text();
      const data: unknown = JSON.parse(text);
      const rows = parseRows(data);
      if (!rows) {
        toast({ title: "Invalid format", description: "Expected a JSON array or an object with a 'words'/'boards' key.", variant: "destructive" });
        return;
      }
      await importRows(rows);
    } catch {
      toast({ title: "Import failed", description: "Couldn't parse the file as JSON.", variant: "destructive" });
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      const data: unknown = JSON.parse(text);
      const rows = parseRows(data);
      if (!rows) {
        toast({ title: "Invalid format", description: "Expected a JSON array or an object with a 'words'/'boards' key.", variant: "destructive" });
        return;
      }
      await importRows(rows);
    } catch {
      toast({ title: "Import failed", description: "Couldn't parse clipboard content as JSON.", variant: "destructive" });
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void importFile(file);
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {icon && <div className="mb-5 select-none" aria-hidden="true">{icon}</div>}

      <h2 className="text-3xl font-editorial italic text-foreground mb-2">{headline}</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-8 leading-relaxed">{body}</p>

      {children && (
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          {children}
        </div>
      )}

      {onJsonImport && (
        <div
          className={cn(
            "w-full max-w-md border-2 border-dashed px-6 py-8 transition-colors",
            dragOver ? "border-primary bg-primary/5 cursor-copy" : "border-border/40 hover:border-border/70"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          role="region"
          aria-label={`Drop zone — drag a JSON file to import ${jsonLabel}s`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            aria-label={`Upload ${jsonLabel} JSON file`}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              e.target.value = "";
            }}
          />

          {importing ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="font-mono text-xs tracking-wide">Importing…</span>
            </div>
          ) : (
            <>
              <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground mb-4">
                {dragOver ? `Drop to import ${jsonLabel}s` : `Or import from JSON`}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] uppercase border border-border px-3 py-1.5 hover:bg-muted/40 transition-colors"
                >
                  <Upload className="h-3 w-3" />
                  Upload file
                </button>
                <button
                  onClick={() => void handlePaste()}
                  className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] uppercase border border-border px-3 py-1.5 hover:bg-muted/40 transition-colors"
                >
                  <Clipboard className="h-3 w-3" />
                  Paste JSON
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
