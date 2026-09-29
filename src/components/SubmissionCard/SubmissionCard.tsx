import { Submission } from "../../../shared/submission";
import { PlayerScore } from "../../../shared/roundscore";

import { GameScore } from "../GameScore/GameScore";

import styles from "./SubmissionCard.module.css";

interface SubmissionCardProps {
  submission: Submission;
  result?: PlayerScore;
  variant?: "default" | "host";
}

export function SubmissionCard({
  submission,
  result,
  variant = "default",
}: SubmissionCardProps) {
  const isWinner = result?.rank === 1;

  const className = [
    styles.submissionCard,
    isWinner ? styles.winnerCard : "",
    variant === "host" ? styles.hostCard : "",
  ]
    .filter(Boolean)
    .join(" ");

  const scoreHeight = variant === "host" ? 24 : 32;

  return (
    <article className={className}>
      <div className={styles.submissionHeader}>
        <span>{submission.playerName}</span>

        {result && <span className={styles.rank}>#{result.rank}</span>}
      </div>

      <div className={styles.imageContainer}>
        <img
          className={styles.submissionImage}
          src={submission.imageUrl}
          alt={`Submission from ${submission.playerName}`}
        />

        {result && (
          <div className={styles.scoreBadge}>
            <GameScore score={result.score} height={scoreHeight} />
          </div>
        )}
      </div>

      {result?.note && (
        <div className={styles.submissionDetails}>
          <p className={styles.note}>{result.note}</p>
        </div>
      )}
    </article>
  );
}
