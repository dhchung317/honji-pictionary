import { useState } from "react";

/**
 * Wraps an async action for explicit execution, such as a button click or submit.
 * Nothing runs automatically; call the returned `run` with the action's arguments.
 *
 * Each call sets `loading` to true and clears the previous error. Failures are
 * captured as an `Error` in state instead of being rethrown. Calls are not queued
 * or deduplicated: prevent overlapping calls in the caller when needed, since one
 * call finishing can set `loading` to false while another is still pending.
 *
 * @template TArgs The tuple of arguments accepted by the action.
 * @template TResult The action's resolved value type.
 * @param action Async operation to execute when `run` is called.
 * @returns `run`, `loading`, and `error`. `run` resolves to the action's result on
 * success or undefined on failure. `loading` is initially false; `error` is
 * initially null and remains set after a failure until the next call.
 *
 * @example
 * const { run: save, loading, error } = useAsyncAction(
 *   (name: string) => savePlayerName(name),
 * );
 * // In a submit handler:
 * await save(name);
 */
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
