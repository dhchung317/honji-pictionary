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

  return (
    <div className="card">
      <h1>Results</h1>
      <div>
        <div style={{ padding: "1rem" }}>
          <h2>Results for Room: {roomId}</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            {submissions.map((sub) => (
              <div
                key={sub.id}
                style={{
                  border: "1px solid #ccc",
                  padding: "0.5rem",
                  borderRadius: "4px",
                }}
              >
                <strong>{sub.playerName}</strong>
                <div style={{ marginTop: "0.5rem" }}>
                  <img
                    src={sub.imageDataUrl}
                    alt={`Submission from ${sub.playerName}`}
                    style={{ width: "100%", height: "auto" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Results;
