import {
  useNavigate,
  // useNavigate,
  useParams,
} from "react-router-dom";
import {
  getRoom,
  startRound,
  // updateRoomStatus,
} from "../lib/roomsApi";
import { useEffect, useState } from "react";
import { getPlayersByRoom} from "../lib/playersApi";
import { useCountdown } from "../hooks/useCountdown";
import { Room } from "../../shared/room";
import { Player } from "../../shared/player";

function HostRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room| null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [playersCount, setPlayersCount] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const { isExpired } = useCountdown(room?.roundEndAt ?? null);

  const isLobby = room?.status === "LOBBY";
  const isDrawing = room?.status === "DRAWING";
  const isScoring = room?.status === "SCORING";
  const isDone = room?.status === "DONE";

  useEffect(() => {
    if (isDone) {
      navigate(`/room/${roomId}/results`);
    }
  }, [isDone]);

  // Poll room for phase changes
  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    const loadRoom = async () => {
      const r = await getRoom(roomId);
      if (cancelled) return;
      if (!r) {
        setError("Room not found.");
        setRoom(null);
      } else {
        setError(null);
        setRoom(r);
      }
      setLoading(false);
    };

    loadRoom();
    const interval = setInterval(loadRoom, 3000);
    if (isExpired) clearInterval(interval);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomId, isExpired]);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    const load = async () => {
      const players = await getPlayersByRoom(roomId);
      console.log("players", players, roomId);
      if (!cancelled) {
        setPlayersCount(players.length);
        setPlayers(players);
      }
    };

    load();
    const interval = setInterval(load, 3000); // poll every 3s
    if (isExpired) clearInterval(interval);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomId, isExpired]);

  const handleStartRound = async () => {
    if (!roomId) return;
    setIsUpdating(true);
    try {
      // later we can compute a real end time here
      const updated = await startRound(roomId);
      if (updated) setRoom(updated);
    } finally {
      setIsUpdating(false);
    }
  };

  // const handleViewResults = () => {
  //   if (!roomId) return;
  //   navigate(`/room/${roomId}/results`);
  // };

  if (!roomId) {
    return <p>Missing room id.</p>;
  }

  if (loading) {
    return <p>Loading room…</p>;
  }

  if (error || !room) {
    return <p>{error ?? "Room not found."}</p>;
  }

  // const baseUrl = window.location.origin;
  // const joinUrl = `${baseUrl}/join/${room.id}`;

  return (
    <div className="card">
      <h2>Host Room</h2>
      <h2>Room Code: {room.id}</h2>

      <section style={{ marginBottom: "1rem" }}>
        <h3>Players joined</h3>
        <p>{playersCount} player(s) in this room.</p>
        {players.map((p) => {
          return <div>{p.name}</div>;
        })}
      </section>

      {isLobby ? (
        <section>
          <p>Once everyone has joined, start the round.</p>
          <details>
            <summary>Show prompt (dev)</summary>
            <p>{room.prompt}</p>
          </details>
          <button onClick={handleStartRound} disabled={isUpdating}>
            {isUpdating ? "Starting…" : "Start round"}
          </button>
        </section>
      ) : null}

      {/* DRAWING view */}
      {isDrawing && (
        <section style={{ marginTop: "1rem" }}>
          <h3>Drawing in progress</h3>
          <p>Prompt:</p>
          <p>
            <strong>{room.prompt}</strong>
          </p>
          {/* later: show countdown using room.roundEndAt */}
          <p>(Timer UI coming from roundEndAt.)</p>
        </section>
      )}

      {/* SCORING view */}
      {isScoring && (
        <section style={{ marginTop: "1rem" }}>
          <h3>Scoring…</h3>
          <p>The drawing phase has ended. The backend/AI would score now.</p>
          {/* <button onClick={handleViewResults}>View provisional results</button> */}
        </section>
      )}

      {/* DONE view */}
      {isDone && (
        <section style={{ marginTop: "1rem" }}>
          <h3>Round finished</h3>
          {/* <button onClick={handleViewResults}>View results</button> */}
        </section>
      )}
    </div>
  );
}

export default HostRoom;
