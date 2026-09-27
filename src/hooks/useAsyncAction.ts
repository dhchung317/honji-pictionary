import { useState } from "react";

export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const run = async (...args: TArgs) => {
    try {
      setLoading(true);
      setError(null);

      return await action(...args);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Something went wrong");

      setError(error);
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  return {
    run,
    loading,
    error,
  };
}
