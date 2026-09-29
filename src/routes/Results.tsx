import { useNavigate, useParams } from "react-router-dom";

import { GameErrorPage } from "../components/GameError";
import { SubmissionCard } from "../components/SubmissionCard/SubmissionCard";

import { useAsync } from "../hooks/useAsync";

import { getRoundScore } from "../lib/roundScoreApi";
import { getRoom, nextRound, quit } from "../lib/roomsApi";
import { getSubmissionsByRoom } from "../lib/submissionsApi";
import { getRankedSubmissions } from "../lib/rankedSubmissions";
import { dummyRoundScore, dummySubmissions } from "../testData/playerResults";

import styles from "./Results.module.css";
import { GameLoading } from "../components/GameLoading/GameLoading";

const USE_DUMMY_DATA = false;

function Results() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();

  const { data, loading, error } = useAsync(async () => {
    if (USE_DUMMY_DATA) {
      return getRankedSubmissions(dummySubmissions, dummyRoundScore.results);
    }

    if (!roomId) {
      throw new Error("Missing room id");
    }

    const roomState = await getRoom(roomId);

    if (!roomState.round) {
      throw new Error("NO_CURRENT_ROUND");
    }

    const [submissions, roundScore] = await Promise.all([
      getSubmissionsByRoom(roomId),
      getRoundScore(roomId, roomState.round.id),
    ]);

    return getRankedSubmissions(submissions, roundScore.results);
  }, [roomId]);

  const handleNextRound = async () => {
    if (!roomId) return;

    await nextRound(roomId);
  };

  const handleQuit = async () => {
    if (!roomId) return;

    await quit(roomId);
    navigate("/");
  };

  if (loading) {
    return <GameLoading message="Loading results..." />;
  }

  if (error) {
    return <GameErrorPage type={error.message} />;
  }

  if (!data) {
    return null;
  }

  if (data.length === 0) {
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

  const winner = data[0];
  const remainingSubmissions = data.slice(1);

  return (
    <main className={styles.page}>
      <div className={styles.results}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <h1 className={styles.title}>Results</h1>

            <p className={styles.roomId}>
              Room <strong>{roomId}</strong>
            </p>
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

        <div className={styles.resultsLayout}>
          <section className={styles.winnerSection}>
            <SubmissionCard
              submission={winner.submission}
              result={winner.result}
              variant="host"
            />
          </section>

          <section className={styles.submissionsSection}>
            <div className={styles.submissionsGrid}>
              {remainingSubmissions.map(({ submission, result }) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  result={result}
                  variant="host"
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default Results;
