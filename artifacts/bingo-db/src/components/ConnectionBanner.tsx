import { useApiStatus } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Loader2, WifiOff, Wifi } from "lucide-react";

export default function ConnectionBanner() {
  const status = useApiStatus();

  if (status === "online") return null;

  const isRecovering = status === "recovering";

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-300",
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
        </>
      )}
    </div>
  );
}
