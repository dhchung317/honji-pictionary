import { useState, type CSSProperties } from "react";
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
  const [imageRatio, setImageRatio] = useState(1);

  const className = [
    styles.submissionCard,
    isWinner ? styles.winnerCard : "",
    variant === "host" ? styles.hostCard : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Keep the host podium and player winner consistent; compact list cards
  // use a smaller badge so more of each drawing remains visible.
  const scoreHeight = variant === "host" || isWinner ? 20 : 16;

  return (
    <article
      className={className}
      style={{ "--image-ratio": imageRatio } as CSSProperties}
    >
      <div className={styles.submissionHeader}>
        <span>{submission.playerName}</span>

        {result && <span className={styles.rank}>#{result.rank}</span>}
      </div>

      <div className={styles.imageContainer}>
        <div className={styles.imageFrame}>
          <img
            className={styles.submissionImage}
            src={submission.imageUrl}
            alt={`Submission from ${submission.playerName}`}
            onLoad={(event) => {
              const image = event.currentTarget;
              if (image.naturalWidth && image.naturalHeight) {
                setImageRatio(image.naturalWidth / image.naturalHeight);
              }
            }}
          />

          {result && (
            <div className={styles.scoreBadge}>
              <GameScore
                score={result.score}
                rank={result.rank}
                height={scoreHeight}
              />
            </div>
          )}
        </div>
      </div>

      {result?.note && (
        <div className={styles.submissionDetails}>
          <p className={styles.note}>{result.note}</p>
        </div>
      )}
    </article>
  );
}
