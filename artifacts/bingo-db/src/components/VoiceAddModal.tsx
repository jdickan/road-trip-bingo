import { useState, useRef, useEffect, useCallback } from "react";
import { useCreateWord } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mic, MicOff, Check, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: number;
  word: string;
  status: "adding" | "done" | "error";
  ts: number;
}

let logSeq = 0;

interface ISpeechRecognitionAlternative {
  transcript: string;
}

interface ISpeechRecognitionResult {
  isFinal: boolean;
  [i: number]: ISpeechRecognitionAlternative;
}

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: ISpeechRecognitionResult[];
}

interface ISpeechRecognitionErrorEvent {
  error: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: ISpeechRecognitionEvent) => void) | null;
  onerror: ((e: ISpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface ISpeechRecognitionConstructor {
  new(): ISpeechRecognition;
}

const SR: ISpeechRecognitionConstructor | null = typeof window !== "undefined"
  ? ((window as unknown as Record<string, unknown>)["SpeechRecognition"] as ISpeechRecognitionConstructor
      || (window as unknown as Record<string, unknown>)["webkitSpeechRecognition"] as ISpeechRecognitionConstructor
      || null)
  : null;

export default function VoiceAddModal() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [srError, setSrError] = useState<string | null>(null);
  const [totalAdded, setTotalAdded] = useState(0);

  const recogRef = useRef<ISpeechRecognition | null>(null);
  const listeningRef = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreateWord();

  const addWord = useCallback((word: string) => {
    const id = ++logSeq;
    setLog((prev): LogEntry[] => [{ id, word, status: "adding" as const, ts: Date.now() }, ...prev].slice(0, 40));

    createMutation.mutate(
      { data: { word } },
      {
        onSuccess: () => {
          setLog((prev): LogEntry[] => prev.map((e) => e.id === id ? { ...e, status: "done" as const } : e));
          setTotalAdded((n) => n + 1);
          queryClient.invalidateQueries({ queryKey: ["/api/words"] });
          queryClient.invalidateQueries({ queryKey: ["/api/words/stats"] });
        },
        onError: () => {
          setLog((prev): LogEntry[] => prev.map((e) => e.id === id ? { ...e, status: "error" as const } : e));
        },
      }
    );
  }, [createMutation, queryClient]);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    setListening(false);
    recogRef.current?.stop();
    recogRef.current = null;
  }, []);

  const startListening = useCallback(() => {
    if (!SR) {
      setSrError("Your browser doesn't support speech recognition. Try Chrome.");
      return;
    }
    setSrError(null);
    listeningRef.current = true;
    setListening(true);

    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = false;
    recog.lang = "en-US";
    recogRef.current = recog;

    recog.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const transcript = e.results[i][0].transcript.trim();
          if (transcript) addWord(transcript);
        }
      }
    };

    recog.onerror = (e) => {
      if (e.error === "no-speech") return;
      if (e.error === "aborted") return;
      setSrError(`Mic error: ${e.error}`);
      stopListening();
    };

    recog.onend = () => {
      if (listeningRef.current) {
        try { recog.start(); } catch { /* already starting */ }
      }
    };

    recog.start();
  }, [addWord, stopListening]);

  function toggleListening() {
    if (listening) stopListening();
    else startListening();
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) {
      stopListening();
      setLog([]);
      setTotalAdded(0);
      setSrError(null);
    }
  }

  useEffect(() => {
    return () => { stopListening(); };
  }, [stopListening]);

  const supported = !!SR;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-1.5 text-xs text-foreground border border-border px-3 py-1.5 hover:bg-muted/40 transition-colors duration-150"
          data-testid="btn-voice-add"
          title="Voice add words"
        >
          <Mic className="h-3.5 w-3.5" />
          Voice Add
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-sm flex flex-col gap-0 p-0 overflow-hidden select-none">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="font-editorial italic text-2xl font-normal">Voice Add</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Say a word or phrase — it auto-adds immediately.
          </p>
        </DialogHeader>

        {/* Big mic button area */}
        <div className="flex flex-col items-center justify-center py-10 gap-6">
          <div className="relative">
            {/* Pulse rings when listening */}
            {listening && (
              <>
                <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <span className="absolute inset-[-8px] rounded-full bg-primary/10 animate-ping [animation-delay:150ms]" />
              </>
            )}
            <button
              onClick={toggleListening}
              disabled={!supported}
              className={cn(
                "relative z-10 flex items-center justify-center rounded-full w-24 h-24 transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50",
                listening
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105"
                  : "bg-muted text-muted-foreground hover:bg-muted/60 hover:scale-105",
                !supported && "opacity-40 pointer-events-none"
              )}
              aria-label={listening ? "Pause listening" : "Start listening"}
            >
              {listening ? (
                <MicOff className="h-10 w-10" />
              ) : (
                <Mic className="h-10 w-10" />
              )}
            </button>
          </div>

          <div className="text-center">
            <p className={cn(
              "font-mono text-[11px] tracking-[0.2em] uppercase transition-colors",
              listening ? "text-primary" : "text-muted-foreground/50"
            )}>
              {listening ? "Listening — tap to pause" : "Tap to start"}
            </p>
            {totalAdded > 0 && (
              <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-emerald-600 dark:text-emerald-400 mt-1">
                {totalAdded} word{totalAdded === 1 ? "" : "s"} added this session
              </p>
            )}
          </div>

          {srError && (
            <div className="flex items-center gap-2 px-4 py-2 border border-destructive/30 bg-destructive/5 text-destructive text-xs mx-6 rounded-none">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {srError}
            </div>
          )}

          {!supported && (
            <p className="text-xs text-muted-foreground text-center px-6">
              Speech recognition isn't available in this browser. Try Chrome on Android or desktop.
            </p>
          )}
        </div>

        {/* Activity log */}
        {log.length > 0 && (
          <div className="border-t border-border">
            <div
              ref={logRef}
              className="divide-y divide-border/50 max-h-52 overflow-y-auto"
            >
              {log.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3 transition-colors",
                    entry.status === "adding" && "bg-primary/5",
                    entry.status === "done" && "bg-transparent",
                    entry.status === "error" && "bg-destructive/5"
                  )}
                >
                  <span className={cn(
                    "shrink-0 flex items-center justify-center w-5 h-5 rounded-full transition-all",
                    entry.status === "adding" && "bg-primary/20 text-primary animate-pulse",
                    entry.status === "done" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                    entry.status === "error" && "bg-destructive/15 text-destructive"
                  )}>
                    {entry.status === "done" && <Check className="h-3 w-3" />}
                    {entry.status === "error" && <X className="h-3 w-3" />}
                    {entry.status === "adding" && <Mic className="h-2.5 w-2.5" />}
                  </span>
                  <span className={cn(
                    "font-editorial italic text-lg leading-tight flex-1",
                    entry.status === "done" && "text-foreground",
                    entry.status === "adding" && "text-primary",
                    entry.status === "error" && "text-destructive"
                  )}>
                    {entry.word}
                  </span>
                  <span className="font-mono text-[9px] text-muted-foreground/30 shrink-0">
                    {new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
