import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getSubmissionsByRoom, Submission } from "../lib/submissionsApi";

function Results() {
  const { roomId } = useParams<{ roomId: string }>();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    const fetchSubmissions = async () => {
      setLoading(true);
      const subs = await getSubmissionsByRoom(roomId);
      setSubmissions(subs);
      setLoading(false);
    };

    fetchSubmissions();
  }, [roomId]);

  if (!roomId) {
    return <p>Missing room id.</p>;
  }

  if (loading) {
    return <p>Loading submissions…</p>;
  }

  if (submissions.length === 0) {
    return (
      <div style={{ padding: "1rem" }}>
        <h2>Results for Room: {roomId}</h2>
        <p>No submissions yet.</p>
      </div>
    );
  }

  const sorted = [...submissions].sort((a, b) => {
    if (typeof a.rank === "number" && typeof b.rank === "number") {
      return a.rank - b.rank; // rank 1 is best
    }
    if (typeof a.score === "number" && typeof b.score === "number") {
      return b.score - a.score; // higher score first
    }
    return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
  });

  const winner = sorted[0];

  return (
    <div className="card">
      <h1>Results</h1>

      <div style={{ padding: "1rem" }}>
        <h2>Results for Room: {roomId}</h2>

        <section style={{ marginBottom: "1rem" }}>
          <h3>Winner</h3>
          <p>
            🏆 <strong>{winner.playerName}</strong>
            {typeof winner.score === "number" && (
              <> — score: {winner.score.toFixed(2)}</>
            )}
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
              src={winner.imageDataUrl}
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
            {sorted.map((s) => (
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
                {typeof s.rank === "number" && (
                  <div style={{ fontSize: "0.9rem", marginBottom: "0.25rem" }}>
                    Rank: {s.rank}
                    {typeof s.score === "number" && (
                      <> — {s.score.toFixed(2)}</>
                    )}
                  </div>
                )}
                <img
                  src={s.imageDataUrl}
                  alt={`Submission from ${s.playerName}`}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Results;
