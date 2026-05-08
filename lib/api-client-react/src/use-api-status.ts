import { useState, useEffect, useRef } from "react";
import { onFetchStatus } from "./custom-fetch";

export type ApiStatus = "online" | "offline" | "recovering";

/**
 * Tracks whether the API server is reachable.
 *
 * - "online"    — all clear, no recent failures
 * - "offline"   — consecutive failures detected; the server may be restarting
 * - "recovering"— a success came in after being offline; will auto-clear shortly
 *
 * The banner should be shown when status is "offline" or "recovering".
 *
 * Thresholds:
 * - Needs 2 consecutive failures from an "online" state before going "offline"
 *   (avoids flashing on transient single errors).
 * - A single failure while "recovering" immediately flips back to "offline"
 *   (prevents briefly showing "Connected" while errors are still coming in).
 */
export function useApiStatus(): ApiStatus {
  const [status, setStatus] = useState<ApiStatus>("online");
  const statusRef = useRef<ApiStatus>("online");

  useEffect(() => {
    let failureCount = 0;
    let recoveringTimer: ReturnType<typeof setTimeout> | null = null;

    function clearRecoveringTimer() {
      if (recoveringTimer) {
        clearTimeout(recoveringTimer);
        recoveringTimer = null;
      }
    }

    function applyStatus(next: ApiStatus) {
      statusRef.current = next;
      setStatus(next);
    }

    const unsubscribe = onFetchStatus((event) => {
      if (event === "error") {
        clearRecoveringTimer();
        failureCount += 1;
        const currentStatus = statusRef.current;
        if (currentStatus === "recovering") {
          applyStatus("offline");
        } else if (currentStatus === "online" && failureCount >= 2) {
          applyStatus("offline");
        }
      } else {
        failureCount = 0;
        if (statusRef.current === "offline") {
          applyStatus("recovering");
          recoveringTimer = setTimeout(() => {
            applyStatus("online");
            recoveringTimer = null;
          }, 2000);
        } else if (statusRef.current !== "recovering") {
          applyStatus("online");
        }
      }
    });

    return () => {
      unsubscribe();
      clearRecoveringTimer();
    };
  }, []);

  return status;
}
