import { useApiStatus } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Loader2, WifiOff, Wifi, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

export default function ConnectionBanner() {
  const status = useApiStatus();
  const queryClient = useQueryClient();
  const [isRetrying, setIsRetrying] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const statusRef = useRef(status);
  const failureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    statusRef.current = status;
    if (status !== "offline" && showFailure) {
      setShowFailure(false);
      if (failureTimerRef.current) {
        clearTimeout(failureTimerRef.current);
        failureTimerRef.current = null;
      }
    }
  }, [status, showFailure]);

  useEffect(() => {
    return () => {
      if (failureTimerRef.current) clearTimeout(failureTimerRef.current);
    };
  }, []);

  if (status === "online") return null;

  const isRecovering = status === "recovering";

  async function handleRetry() {
    setIsRetrying(true);
    setShowFailure(false);
    if (failureTimerRef.current) {
      clearTimeout(failureTimerRef.current);
      failureTimerRef.current = null;
    }
    try {
      await queryClient.refetchQueries({ type: "active" });
    } finally {
      setIsRetrying(false);
      if (statusRef.current === "offline") {
        setShowFailure(true);
        failureTimerRef.current = setTimeout(() => {
          setShowFailure(false);
          failureTimerRef.current = null;
        }, 2000);
      }
    }
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-300",
        isRecovering
          ? "bg-emerald-600 text-white"
          : "bg-amber-500 text-amber-950",
      )}
      role="status"
      aria-live="polite"
    >
      {isRecovering ? (
        <>
          <Wifi className="h-4 w-4 shrink-0" />
          <span>Connected — loading your data&hellip;</span>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>API server is restarting — your data is safe, please wait&hellip;</span>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className={cn(
              "ml-2 flex items-center gap-1 rounded border border-amber-800/40 bg-amber-600/30 px-2 py-0.5 text-xs font-semibold hover:bg-amber-600/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 disabled:opacity-60",
            )}
            aria-label="Retry connection now"
          >
            <RefreshCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
            {isRetrying ? "Retrying…" : "Retry now"}
          </button>
          {showFailure && (
            <span
              className="ml-1 text-xs font-semibold text-amber-950/80 transition-opacity duration-200"
              role="alert"
            >
              Still unreachable
            </span>
          )}
        </>
      )}
    </div>
  );
}
