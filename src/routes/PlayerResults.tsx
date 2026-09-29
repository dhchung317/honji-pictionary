import { useParams } from "react-router-dom";

import { GameErrorPage } from "../components/GameError";
import { SubmissionCard } from "../components/SubmissionCard/SubmissionCard";

import { getRoom } from "../lib/roomsApi";
import { getRoundScore } from "../lib/roundScoreApi";
import { getSubmissionsByRoom } from "../lib/submissionsApi";
import { getRankedSubmissions } from "../lib/rankedSubmissions";

import { useAsync } from "../hooks/useAsync";

import { dummyRoundScore, dummySubmissions } from "../testData/playerResults";
import { GameLoading } from "../components/GameLoading/GameLoading";

import styles from "./PlayerResults.module.css";

const USE_DUMMY_DATA = false;

function PlayerResults() {
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
          <p>Room {roomId}</p>
          <p>No submissions yet.</p>
        </section>
      </main>
    );
  }

  const winner = data[0];

  return (
    <main className={styles.page}>
      <div className={styles.results}>
        <header className={styles.header}>
          <h1 className={styles.title}>Results</h1>

          <p className={styles.roomId}>
            Room <strong>{roomId}</strong>
          </p>
        </header>

        <div className={styles.resultsLayout}>
          <section className={styles.winnerSection}>
            <SubmissionCard
              submission={winner.submission}
              result={winner.result}
            />
          </section>

          <section className={styles.submissionsSection}>
            {/* Desktop */}
            <div className={styles.desktopSubmissions}>
              {data.slice(1).map(({ submission, result }) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  result={result}
                />
              ))}
            </div>

            {/* Mobile */}
            <div className={styles.mobileSubmissions}>
              {data.map(({ submission, result }) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  result={result}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default PlayerResults;
