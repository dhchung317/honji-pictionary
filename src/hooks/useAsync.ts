import { DependencyList, useEffect, useState } from "react";

type UseAsyncOptions = {
  intervalMs?: number;
};

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

    const run = async () => {
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
