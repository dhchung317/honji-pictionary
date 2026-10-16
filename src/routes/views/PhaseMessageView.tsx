import type { ReactNode } from "react";

export function PhaseMessageView({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <section aria-live="polite">
      <p role="status">{message}</p>
      {action}
    </section>
  );
}
