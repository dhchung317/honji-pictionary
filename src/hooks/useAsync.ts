import { DependencyList, useEffect, useState } from "react";

type UseAsyncOptions = {
  /** Polling interval in milliseconds. Omit or use 0 to run only on effect setup. */
  intervalMs?: number;
};

/**
 * Runs an async query on mount and whenever `deps` change, with optional polling.
 *
 * Polling skips a tick while a request from the same effect is still pending.
 * Cleanup stops polling and ignores late results; it does not abort the request.
 * The last successful data is retained during refreshes and after failures.
 *
 * @template T The query's resolved value type.
 * @param fn Query to execute. Include every reactive value it reads in `deps`.
 * @param deps React effect dependencies. Changes restart the query and polling.
 * Changes to `fn` or `options` alone do not restart the effect.
 * @param options Optional polling configuration; use a positive `intervalMs`.
 * @returns Query state: `data` is initially null; `error` holds the latest failure
 * and clears on success. `loading` starts true and becomes false after the first
 * settled request; subsequent refreshes do not reset it to true.
 *
 * @example
 * const { data, loading, error } = useAsync(
 *   () => getRoom(roomId),
 *   [roomId],
 *   { intervalMs: 3000 },
 * );
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: DependencyList,
  options: UseAsyncOptions = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    let inFlight = false;
    const run = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const result = await fn();

        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
        }
      } finally {
        inFlight = false;
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    const interval = options.intervalMs
      ? setInterval(run, options.intervalMs)
      : null;

    return () => {
      cancelled = true;

      if (interval) {
        clearInterval(interval);
      }
    };
  }, deps);

  return { data, loading, error };
}
