import { useNavigate, useParams } from "react-router-dom";
import { getRoom, updateRoomStatus, type Room } from "../lib/roomApi";

import reactLogo from "../assets/react.svg";
import viteLogo from "/vite.svg";
import "../App.css";
import { useEffect, useState } from "react";

function HostRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!roomId) return;

    const load = async () => {
      setLoading(true);
      const r = await getRoom(roomId);
      if (!r) {
        setError("Room not found.");
      } else {
        setRoom(r);
        setError(null);
      }
      setLoading(false);
    };

    load();
  }, [roomId]);

  const handleStartRound = async () => {
    if (!roomId) return;
    setIsUpdating(true);
    try {
      // later we can compute a real end time here
      const updated = await updateRoomStatus(roomId, "DRAWING");
      if (updated) setRoom(updated);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewResults = () => {
    if (!roomId) return;
    navigate(`/room/${roomId}/results`);
  };

  if (!roomId) {
    return <p>Missing room id.</p>;
  }

  if (loading) {
    return <p>Loading room…</p>;
  }

  if (error || !room) {
    return <p>{error ?? "Room not found."}</p>;
  }

  const baseUrl = window.location.origin;
  const joinUrl = `${baseUrl}/join/${room.id}`;

  return (
    <>
      <div>
        <img src={viteLogo} className="logo" alt="Vite logo" />
        <img src={reactLogo} className="logo react" alt="React logo" />
      </div>
      <h2>Host Room: {room.id}</h2>

      {/* LOBBY PHASE */}
      {room.status === "LOBBY" && (
        <>
          <section style={{ marginBottom: "1rem" }}>
            <h3>Lobby</h3>
            <p>
              Share this link with players. Once everyone has joined, start the
              round.
            </p>
            <code>{joinUrl}</code>
          </section>

          <section style={{ marginBottom: "1rem" }}>
            <h3>Prompt</h3>
            <p>
              The prompt is <strong>hidden from players</strong> until you start
              the round.
            </p>
            {/* You can show it to yourself here or keep it hidden; 
                I'm showing it to host only: */}
            <details>
              <summary>Show prompt (host only)</summary>
              <p>{room.prompt}</p>
            </details>
          </section>

          <button onClick={handleStartRound} disabled={isUpdating}>
            {isUpdating ? "Starting…" : "Start round"}
          </button>
        </>
      )}

      {/* DRAWING PHASE */}
      {room.status === "DRAWING" && (
        <>
          <section style={{ marginBottom: "1rem" }}>
            <h3>Drawing in progress</h3>
            <p>Players are drawing based on this prompt:</p>
            <p>
              <strong>{room.prompt}</strong>
            </p>
          </section>

          <section style={{ marginBottom: "1rem" }}>
            <h3>Have players join</h3>
            <p>
              New players can still join and submit until you end the round.
            </p>
            <code>{joinUrl}</code>
          </section>

          <section style={{ marginBottom: "1rem" }}>
            <h3>Next actions (coming soon)</h3>
            <ul>
              <li>End round & lock submissions</li>
              <li>Score round with AI</li>
              <li>View final results</li>
            </ul>
          </section>

          <button onClick={handleViewResults}>View results (dev)</button>
        </>
      )}

      {/* other phases reserved for later */}
      {room.status === "SCORING" && (
        <section>
          <h3>Scoring round…</h3>
          <p>AI is evaluating drawings. (Mock coming soon.)</p>
        </section>
      )}

      {room.status === "DONE" && (
        <section>
          <h3>Round finished</h3>
          <button onClick={handleViewResults}>View results</button>
        </section>
      )}
    </>
  );
}

export default HostRoom;
