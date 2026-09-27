import { useParams } from "react-router-dom";
import { getSubmissionsByRoom } from "../lib/submissionsApi";
import { getRoom } from "../lib/roomsApi";
import { Submission } from "../../shared/submission";
// import { Room } from "../../shared/room";
import { getRoundScore } from "../lib/roundScoreApi";
import { GameErrorPage } from "../components/GameError";
import { useAsync } from "../hooks/useAsync";

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

    const subs = await getSubmissionsByRoom(roomId);
    const roundScore = await getRoundScore(roomId, roomState.round.id);

    const submissions = [...roundScore.results]
      .sort((a, b) => a.rank - b.rank)
      .map((result) => subs.find((s) => s.playerId === result.playerId))
      .filter(
        (submission): submission is Submission => submission !== undefined,
      );

    return {
      roundScore,
      submissions,
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
      <div style={{ padding: "1rem" }}>
        <h2>Results for Room: {roomId}</h2>
        <p>No submissions yet.</p>
      </div>
    );
  }

  const winner = submissions[0];

  return (
    <div className="card">
      <h1>Results</h1>

      <div style={{ padding: "1rem" }}>
        <h2>Results for Room: {roomId}</h2>

        <section style={{ marginBottom: "1rem" }}>
          <h3>Winner</h3>
          <p>
            🏆 <strong>{winner.playerName}</strong>
          </p>
          <div
            style={{
              maxWidth: 400,
              marginTop: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          >
            <img
              src={winner.imageUrl}
              alt={`Winning submission from ${winner.playerName}`}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        </section>

        <section>
          <h3>All submissions</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "1rem",
            }}
          >
            {submissions.map((s) => (
              <div
                key={s.id}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  padding: "0.5rem",
                }}
              >
                <div style={{ marginBottom: "0.25rem" }}>
                  <strong>{s.playerName}</strong>
                </div>

                <img
                  src={s.imageUrl}
                  alt={`Submission from ${s.playerName}`}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />

                {(() => {
                  const result = roundScore?.results.find(
                    (r) => r.playerId === s.playerId,
                  );

                  return (
                    <>
                      <div>{result?.score}</div>
                      <div>{result?.note}</div>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default PlayerResults;
