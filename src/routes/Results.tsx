import { useNavigate, useParams } from "react-router-dom";

import { Submission } from "../../shared/submission";

import { GameErrorPage } from "../components/GameError";

import { useAsync } from "../hooks/useAsync";

import { getRoundScore } from "../lib/roundScoreApi";
import { getRoom, nextRound, quit } from "../lib/roomsApi";
import { getSubmissionsByRoom } from "../lib/submissionsApi";

import styles from "./Results.module.css";

function Results() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();

  if (!roomId) {
    throw new Error("Missing room id");
  }

  const { data, loading, error } = useAsync(async () => {
    const roomState = await getRoom(roomId);

    if (!roomState.round) {
      throw new Error("No current round");
    }

    const submissions = await getSubmissionsByRoom(roomId);
    const roundScore = await getRoundScore(roomId, roomState.round.id);

    const rankedSubmissions = [...roundScore.results]
      .sort((a, b) => a.rank - b.rank)
      .map((result) =>
        submissions.find(
          (submission) => submission.playerId === result.playerId,
        ),
      )
      .filter(
        (submission): submission is Submission => submission !== undefined,
      );

    return {
      roundScore,
      submissions: rankedSubmissions,
    };
  }, [roomId]);

  const handleNextRound = async () => {
    await nextRound(roomId);
  };

  const handleQuit = async () => {
    await quit(roomId);
    navigate("/");
  };

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

          <p className={styles.roomId}>Room {roomId}</p>

          <p>No submissions yet.</p>

          <div className={styles.actions}>
            <button className={styles.nextButton} onClick={handleNextRound}>
              Next Round
            </button>

            <button className={styles.quitButton} onClick={handleQuit}>
              Quit
            </button>
          </div>
        </section>
      </main>
    );
  }

  const winner = submissions[0];

  return (
    <main className={styles.page}>
      <div className={styles.results}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <h1 className={styles.title}>Results</h1>

            <p className={styles.roomId}>Room {roomId}</p>
          </div>

          <div className={styles.actions}>
            <button className={styles.nextButton} onClick={handleNextRound}>
              Next Round
            </button>

            <button className={styles.quitButton} onClick={handleQuit}>
              Quit
            </button>
          </div>
        </header>

        <section className={styles.winnerSection}>
          <h2 className={styles.sectionTitle}>Winner</h2>

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
          <h2 className={styles.sectionTitle}>All submissions</h2>

          <div className={styles.submissionsGrid}>
            {submissions.map((submission) => {
              const result = roundScore.results.find(
                (result) => result.playerId === submission.playerId,
              );

              return (
                <article key={submission.id} className={styles.submissionCard}>
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
                          <p className={styles.note}>{result.note}</p>
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

export default Results;
