import { useNavigate, useParams } from "react-router-dom";
import { getRoom, startRound } from "../lib/roomsApi";
import { useEffect, useState } from "react";
import { getPlayersByRoom } from "../lib/playersApi";
// import { useCountdown } from "../hooks/useCountdown";
import { Player } from "../../shared/player";
import { RoomState } from "../../shared/roomstate";
import { getViewerRole } from "../lib/viewer";

function HostRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [playersCount, setPlayersCount] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  // const { isExpired } = useCountdown(room?.roundEndAt ?? null);

  const room = roomState?.room ?? null;
  const round = roomState?.round ?? null;

  const isLobby = room?.status === "LOBBY";
  const isDrawing = round?.status === "DRAWING";
  const isScoring = round?.status === "SCORING";
  const isDone = round?.status === "DONE";

  useEffect(() => {
    if (isDone) {
      navigate(`/room/${roomId}/results`);
    }
  }, [isDone, roomId, navigate]);

  // Poll room for phase changes
  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    const loadRoom = async () => {
      const state = await getRoom(roomId);

      if (cancelled) return;
      if (!state) {
        setError("Room not found.");
        setRoomState(null);
      } else {
        setError(null);
        setRoomState(state);
      }
      setLoading(false);
    };

    loadRoom();
    const interval = setInterval(loadRoom, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    const load = async () => {
      const players = await getPlayersByRoom(roomId);
      if (!cancelled) {
        setPlayersCount(players.length);
        setPlayers(players);
      }
    };

    load();
    const interval = setInterval(load, 3000); // poll every 3s
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomId]);

  useEffect(() => {
  if (!roomId || !room || !round) return;

  const role = getViewerRole(room);

  if (round.status === "DONE") {
    if (role === "PLAYER") {
      navigate(`/room/${roomId}/playerresults`, {
        replace: true,
      });
    } else {
      navigate(`/room/${roomId}/results`, {
        replace: true,
      });
    }
  }
}, [roomId, room, round?.status, navigate]);

  const handleStartRound = async () => {
    if (!roomId) return;

    setIsUpdating(true);

    try {
      await startRound(roomId);

      const updatedState = await getRoom(roomId);
      setRoomState(updatedState);
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



  return (
    <div className="card">
      <h2>Host Room</h2>
      <h2>Room Code: {room.id}</h2>

      <section style={{ marginBottom: "1rem" }}>
        <h3>Players joined</h3>
        <p>{playersCount} player(s) in this room.</p>
        {players.map((p) => {
          return <div key={p.id}>{p.name}</div>;
        })}
      </section>

      {isLobby ? (
        <section>
          <p>Once everyone has joined, start the round.</p>
          {/* <details>
            <summary>Show prompt (dev)</summary>
            <p>{room.currentPrompt}</p>
          </details> */}
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
            <strong>{round.prompt}</strong>
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
