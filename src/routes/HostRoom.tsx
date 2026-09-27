import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Player } from "../../shared/player";

import { GameErrorPage } from "../components/GameError";

import { useAsync } from "../hooks/useAsync";
import { useAsyncAction } from "../hooks/useAsyncAction";

import { getPlayersByRoom } from "../lib/playersApi";
import { getRoom, startRound } from "../lib/roomsApi";
import { getViewerRole } from "../lib/viewer";

import styles from "./HostRoom.module.css";

function HostRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [players, setPlayers] = useState<Player[]>([]);

  /* ---------- Room state ---------- */

  const {
    data: roomState,
    loading: roomLoading,
    error: roomError,
  } = useAsync(
    async () => {
      if (!roomId) {
        throw new Error("Missing room id");
      }

      return getRoom(roomId);
    },
    [roomId],
    { intervalMs: 3000 },
  );

  const room = roomState?.room ?? null;
  const round = roomState?.round ?? null;

  const isLobby = room?.status === "LOBBY";
  const isDrawing = round?.status === "DRAWING";
  const isScoring = round?.status === "SCORING";
  const isDone = round?.status === "DONE";

  /* ---------- Players ---------- */

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    const loadPlayers = async () => {
      const players = await getPlayersByRoom(roomId);

      if (!cancelled) {
        setPlayers(players);
      }
    };

    loadPlayers();

    const interval = setInterval(loadPlayers, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomId]);

  /* ---------- Start round ---------- */

  const {
    run: handleStartRound,
    loading: isStarting,
    error: startError,
  } = useAsyncAction(async () => {
    if (!roomId) {
      throw new Error("Missing room id");
    }

    await startRound(roomId);
  });

  /* ---------- Results navigation ---------- */

  useEffect(() => {
    if (!roomId || !room || !isDone) return;

    const role = getViewerRole(room);

    if (role === "PLAYER") {
      navigate(`/room/${roomId}/playerresults`, { replace: true });
    } else {
      navigate(`/room/${roomId}/results`, { replace: true });
    }
  }, [roomId, room, isDone, navigate]);

  /* ---------- Page states ---------- */

  if (!roomId) {
    return <p>Missing room id.</p>;
  }

  if (roomLoading) {
    return <p>Loading room…</p>;
  }

  if (roomError) {
    return <GameErrorPage type={roomError.message} />;
  }

  if (!room) {
    return <GameErrorPage type="ROOM_NOT_FOUND" />;
  }

  return (
    <main className={styles.page}>
      <div className={styles.room}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Honji Pictionary</h1>

            <p className={styles.roomCode}>{room.id}</p>
          </div>
        </header>

        <div className={styles.gameArea}>
          <section className={styles.stage}>
            {isLobby && (
              <>
                <h2 className={styles.stageTitle}>Waiting for players</h2>

                <p className={styles.stageMessage}>
                  Share the room code. Once everyone has joined, start the
                  round.
                </p>

                <button
                  className={styles.startButton}
                  onClick={handleStartRound}
                  disabled={isStarting || players.length === 0}
                >
                  {isStarting ? "Starting…" : "Start Round"}
                </button>

                {startError && <p>{startError.message}</p>}
              </>
            )}

            {isDrawing && (
              <>
                <p className={styles.promptLabel}>Draw</p>

                <p className={styles.prompt}>{round.prompt}</p>
              </>
            )}

            {isScoring && (
              <>
                <h2 className={styles.stageTitle}>Scoring…</h2>

                <p className={styles.stageMessage}>
                  Everyone's drawings are in. Calculating the results.
                </p>
              </>
            )}

            {isDone && (
              <>
                <h2 className={styles.stageTitle}>Round finished</h2>

                <p className={styles.stageMessage}>Loading results…</p>
              </>
            )}
          </section>

          <aside className={styles.playersPanel}>
            <header className={styles.playersHeader}>
              <h2 className={styles.playersTitle}>Players</h2>

              <p className={styles.playerCount}>{players.length} joined</p>
            </header>

            <div className={styles.playerList}>
              {players.length === 0 ? (
                <p className={styles.emptyPlayers}>
                  Waiting for someone to join…
                </p>
              ) : (
                players.map((player) => (
                  <div key={player.id} className={styles.player}>
                    <div className={styles.avatar}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>

                    <span className={styles.playerName}>{player.name}</span>

                    {isDrawing && (
                      <span className={styles.playerStatus}>Drawing</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default HostRoom;
