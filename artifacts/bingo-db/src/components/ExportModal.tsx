import { useState } from "react";
import { useExportWords, ExportWordsParams } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExportModal({ filters }: { filters: ExportWordsParams }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const exportParams = {
    region: filters.region,
    surroundings: filters.surroundings,
    age: filters.age,
    findability: filters.findability,
    season: filters.season,
    board: filters.board,
  };

  const { data, isLoading, refetch, isFetching } = useExportWords(exportParams, { 
    query: { enabled: open } 
  });

  const handleCopy = () => {
    if (data) {
      navigator.clipboard.writeText(JSON.stringify(data.words, null, 2));
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (data) {
      const blob = new Blob([JSON.stringify(data.words, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bingo-words-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2" data-testid="btn-export-dialog">
          <Download className="h-4 w-4" />
          Export JSON
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Exporting {data?.total !== undefined ? data.total : "..."} words based on current filters.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-[300px] border rounded-md bg-zinc-950 text-zinc-50 overflow-hidden relative">
          {(isLoading || isFetching) ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-1/2 bg-zinc-800" />
              <Skeleton className="h-4 w-3/4 bg-zinc-800" />
              <Skeleton className="h-4 w-2/3 bg-zinc-800" />
            </div>
          ) : (
            <ScrollArea className="h-full w-full">
              <pre className="p-4 text-xs font-mono">
                {JSON.stringify(data?.words, null, 2)}
              </pre>
            </ScrollArea>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleCopy} disabled={!data || isLoading} data-testid="btn-copy-export">
            {copied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Copied" : "Copy to Clipboard"}
          </Button>
          <Button onClick={handleDownload} disabled={!data || isLoading} data-testid="btn-download-export">
            <Download className="mr-2 h-4 w-4" />
            Download .json file
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
