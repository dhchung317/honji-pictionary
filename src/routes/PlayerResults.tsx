import { useParams } from "react-router-dom";

import { GameErrorPage } from "../components/GameError";

import { getRoom } from "../lib/roomsApi";
import { getRoundScore } from "../lib/roundScoreApi";
import { getSubmissionsByRoom } from "../lib/submissionsApi";

import { useAsync } from "../hooks/useAsync";

import { Submission } from "../../shared/submission";

import styles from "./PlayerResults.module.css";

function PlayerResults() {
  const { roomId } = useParams<{ roomId: string }>();

  const { data, loading, error } = useAsync(async () => {
    if (!roomId) {
      throw new Error("Missing room id");
    }

    const roomState = await getRoom(roomId);

    if (!roomState.round) {
      throw new Error("NO_CURRENT_ROUND");
    }

    const submissions = await getSubmissionsByRoom(roomId);
    const roundScore = await getRoundScore(
      roomId,
      roomState.round.id,
    );

    const rankedSubmissions = [...roundScore.results]
      .sort((a, b) => a.rank - b.rank)
      .map((result) =>
        submissions.find(
          (submission) =>
            submission.playerId === result.playerId,
        ),
      )
      .filter(
        (submission): submission is Submission =>
          submission !== undefined,
      );

    return {
      roundScore,
      submissions: rankedSubmissions,
    };
  }, [roomId]);

  if (loading) {
    return <p>Loading submissions…</p>;
  }

  if (error) {
    return <GameErrorPage type={error.message} />;
  }

  if (!data) {
    return null;
  }

  const { roundScore, submissions } = data;

  if (submissions.length === 0) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>
          <h1>Results</h1>
          <h2>Room {roomId}</h2>
          <p>No submissions yet.</p>
        </section>
      </main>
    );
  }

  const winner = submissions[0];

  return (
    <main className={styles.page}>
      <div className={styles.results}>
        <header className={styles.header}>
          <h1 className={styles.title}>Results</h1>

          <p className={styles.roomId}>
            Room {roomId}
          </p>
        </header>

        <section className={styles.winnerSection}>
          <h2 className={styles.sectionTitle}>
            Winner
          </h2>

          <p className={styles.winnerName}>
            🏆 <strong>{winner.playerName}</strong>
          </p>

          <div className={styles.winnerCard}>
            <img
              className={styles.winnerImage}
              src={winner.imageUrl}
              alt={`Winning submission from ${winner.playerName}`}
            />
          </div>
        </section>

        <section className={styles.submissionsSection}>
          <h2 className={styles.sectionTitle}>
            All submissions
          </h2>

          <div className={styles.submissionsGrid}>
            {submissions.map((submission) => {
              const result = roundScore.results.find(
                (result) =>
                  result.playerId === submission.playerId,
              );

              return (
                <article
                  key={submission.id}
                  className={styles.submissionCard}
                >
                  <div className={styles.submissionHeader}>
                    {submission.playerName}
                  </div>

                  <img
                    className={styles.submissionImage}
                    src={submission.imageUrl}
                    alt={`Submission from ${submission.playerName}`}
                  />

                  <div className={styles.submissionDetails}>
                    {result && (
                      <>
                        <div className={styles.score}>
                          Score: {result.score}
                        </div>

                        {result.note && (
                          <p className={styles.note}>
                            {result.note}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

export default PlayerResults;