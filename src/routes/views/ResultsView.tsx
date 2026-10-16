import type { ReactNode } from "react";
import { SubmissionCard } from "../../components/SubmissionCard/SubmissionCard";
import { getRankedSubmissions } from "../../lib/rankedSubmissions";
import hostStyles from "../Results.module.css";
import playerStyles from "../PlayerResults.module.css";
export function ResultsView({
  data,
  actions,
  host = false,
}: {
  data: ReturnType<typeof getRankedSubmissions>;
  actions: ReactNode;
  host?: boolean;
}) {
  const styles = host ? hostStyles : playerStyles;
  if (!data.length)
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>
          <h1>Results</h1>
          <p>No submissions this round.</p>
          {actions}
        </section>
      </main>
    );
  const [winner, ...others] = host ? data.slice(0, 3) : data;
  return (
    <main className={styles.page}>
      <div className={styles.results}>
        {actions}
        <div className={styles.resultsLayout}>
          <section className={styles.winnerSection}>
            <SubmissionCard
              submission={winner.submission}
              result={winner.result}
              variant={host ? "host" : undefined}
            />
          </section>
          <section
            className={styles.submissionsSection}
            tabIndex={host ? undefined : 0}
            aria-label="Other players’ results"
          >
            <div
              className={
                host
                  ? hostStyles.submissionsGrid
                  : playerStyles.desktopSubmissions
              }
            >
              {others.map(({ submission, result }) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  result={result}
                  variant={host ? "host" : undefined}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
