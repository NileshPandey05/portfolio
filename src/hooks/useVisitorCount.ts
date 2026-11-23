import { useCallback, useEffect, useState } from "react";

const SESSION_KEY = "portfolio_visit_counted";
const STORAGE_KEY = "portfolio_local_visits";

interface CounterApiV2Response {
  data?: {
    up_count?: number;
  };
}

function getCounterConfig() {
  try {
    const workspace = process.env.BUN_PUBLIC_COUNTER_WORKSPACE?.trim();
    const name = process.env.BUN_PUBLIC_COUNTER_NAME?.trim() || "portfolio";
    return { workspace, name };
  } catch {
    return { workspace: undefined, name: "portfolio" };
  }
}

function getLocalVisitCount(increment: boolean): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const current = raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
    if (!increment) return Math.max(1, current);
    const next = current + 1;
    window.localStorage.setItem(STORAGE_KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}

/**
 * Tracks unique session visits. Uses CounterAPI v2 when
 * `BUN_PUBLIC_COUNTER_WORKSPACE` is configured, and falls back gracefully
 * to session-deduplicated local tracking so the UI always works cleanly.
 */
export function useVisitorCount() {
  const [count, setCount] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchCount = useCallback(async (forceReadOnly = false) => {
    const alreadyCounted = window.sessionStorage.getItem(SESSION_KEY) === "1";
    const shouldIncrement = !alreadyCounted && !forceReadOnly;
    const { workspace, name } = getCounterConfig();

    if (!workspace) {
      const localCount = getLocalVisitCount(shouldIncrement);
      if (shouldIncrement) {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      }
      setCount(localCount);
      return;
    }

    setIsRefreshing(true);
    try {
      const endpoint = shouldIncrement
        ? `https://api.counterapi.dev/v2/${encodeURIComponent(workspace)}/${encodeURIComponent(name)}/up`
        : `https://api.counterapi.dev/v2/${encodeURIComponent(workspace)}/${encodeURIComponent(name)}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = (await res.json()) as CounterApiV2Response;
      const remoteCount = json.data?.up_count;
      if (typeof remoteCount === "number") {
        if (shouldIncrement) {
          window.sessionStorage.setItem(SESSION_KEY, "1");
        }
        setCount(remoteCount);
        return;
      }
      throw new Error("Missing count");
    } catch {
      const localCount = getLocalVisitCount(shouldIncrement);
      if (shouldIncrement) {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      }
      setCount(localCount);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchCount(false);
  }, [fetchCount]);

  return {
    count,
    isRefreshing,
    refresh: () => fetchCount(true),
  };
}
