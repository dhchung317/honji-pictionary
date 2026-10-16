import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Player } from "../../shared/player";

import { GameErrorPage } from "../components/GameError";

import { useAsync } from "../hooks/useAsync";
import { useCountdown } from "../hooks/useCountdown";
import { useAsyncAction } from "../hooks/useAsyncAction";

import { getPlayersByRoom } from "../lib/playersApi";
import { getRoom, startRound } from "../lib/roomsApi";
import { getViewerRole } from "../lib/viewer";
import { GameLoading } from "../components/GameLoading/GameLoading";

import styles from "./HostRoom.module.css";
import { PlayerAvatar } from "../components/PlayerAvatar/PlayerAvatar";

function HostRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [players, setPlayers] = useState<Player[]>([]);
  const [isWaitingForRound, setIsWaitingForRound] = useState(false);

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
  const { secondsLeft: startSeconds } = useCountdown(room?.status === "LOBBY" ? room.autoStartAt ?? null : null);
  const automaticAttempt = useRef<string | null>(null);
  const [autoStartError, setAutoStartError] = useState<string | null>(null);
  useEffect(() => {
    if (room?.status !== "LOBBY" || !room.autoStartAt) {
      automaticAttempt.current = null;
      setAutoStartError(null);
      return;
    }
    const deadline = room.autoStartAt;
    const timeout = setTimeout(() => {
      if (automaticAttempt.current === deadline) return;
      automaticAttempt.current = deadline;
      setIsWaitingForRound(true);
      void startRound(room.id, { lobbyVersion: room.lobbyVersion ?? 0 }).catch(error => {
        setIsWaitingForRound(false);
        setAutoStartError(error instanceof Error ? error.message : "Automatic start failed. Use Start Round to retry.");
      });
    }, Math.max(0, Date.parse(deadline) - Date.now()));
    return () => clearTimeout(timeout);
  }, [room?.status, room?.autoStartAt, room?.lobbyVersion, room?.id]);

  const isLobby = room?.status === "LOBBY";
  const isDrawing = round?.status === "DRAWING";
  const isScoring = round?.status === "SCORING";
  const isDone = room?.status === "DONE" && round?.status === "DONE";
  const { secondsLeft } = useCountdown(isDrawing ? round?.roundEndAt ?? null : null);

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

    setIsWaitingForRound(room?.status !== "SCORING_FAILED");

    try {
      await startRound(roomId);
    } catch (error) {
      setIsWaitingForRound(false);
      throw error;
    }
  });

  useEffect(() => {
    if (isDrawing) {
      setIsWaitingForRound(false);
    }
  }, [isDrawing]);

  /* ---------- Results navigation ---------- */

  useEffect(() => {
    if (!roomId || !room || !isDone) return;

    const role = getViewerRole(room);

    if (role === "PLAYER") {
      navigate(`/room/${roomId}/playerresults?round=${round?.id ?? ""}`, { replace: true });
    } else {
      navigate(`/room/${roomId}/results`, { replace: true });
    }
  }, [roomId, room, isDone, navigate]);

  /* ---------- Page states ---------- */

  if (!roomId) {
    return <GameErrorPage type="MISSING_ROOM_ID" />;
  }

  if (roomLoading) {
    return <GameLoading message="Loading room..." />;
  }

  if (roomError) {
    return <GameErrorPage type={roomError.message} />;
  }

  if (!room) {
    return <GameErrorPage type="ROOM_NOT_FOUND" />;
  }

  if (isWaitingForRound) {
    return <GameLoading message="Starting round..." />;
  }

  const baseUrl = window.location.hostname;

  return (
    <main className={styles.page}>
      <div className={styles.room}>
        <section className={styles.stage}>
          {isLobby && (
            <>
              <div className={styles.lobbyPlayers}>
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    className={`${styles.lobbyPlayer} ${
                      styles[`playerSlot${index + 1}`] ?? ""
                    }`}
                  >
                    <PlayerAvatar player={player} />
                    <span className={styles.playerName}>{player.name}</span>
                    <span className={styles.readyStatus}>{player.ready ? "Ready ✓" : "Not ready"}</span>
                  </div>
                ))}
              </div>

              <div className={styles.lobbyCenter}>
                <div className={styles.logoSpace}>
                  <img width={"100%"} src={"/honji.png"} alt="Honji" />
                </div>

                <h2 className={styles.stageTitle}>{room.autoStartAt ? `Starting in ${Math.max(1, startSeconds ?? 5)}…` : "Waiting for players"}</h2>


              </div>

              <div className={styles.lobbyActions}>
                <p className={styles.playerCount}>
                  {players.length} {players.length === 1 ? "player" : "players"}{" "}
                  joined
                </p>
                <p className={styles.readyCount}>{players.filter(player => player.ready).length} / {players.length} ready</p>
                {autoStartError && <p role="alert" className={styles.error}>{autoStartError} Use Start Round to retry.</p>}
                <div style={{ fontSize: "1.25rem" }}>
                  <p className={styles.stageMessage}>
                    Enter{" "}
                    <strong style={{ fontSize: "1.5rem" }}>{room.id}</strong>
                  </p>
                  <p className={styles.stageMessage}>
                    at{" "}
                    <strong style={{ fontSize: "1.25rem" }}>
                      {baseUrl}
                    </strong>{" "}
                    to play.
                  </p>
                </div>
                <button
                  className={styles.startButton}
                  onClick={handleStartRound}
                  disabled={isStarting || players.length === 0 || Boolean(room.autoStartAt && !autoStartError)}
                >
                  {isStarting ? "Starting…" : "Start Round"}
                </button>

                {startError && (
                  <p className={styles.error}>{startError.message}</p>
                )}
              </div>
            </>
          )}

          {isDrawing && (
            <div className={styles.roundContent}>
              <div className={styles.roundHeading}>
                <p className={styles.promptLabel}>Draw</p>
                {secondsLeft !== null && (
                  <div className={styles.timer} role="timer" aria-label="Drawing time remaining">
                    <span className={styles.timerLabel}>Time left</span>
                    <span>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</span>
                  </div>
                )}
              </div>
              <p className={styles.prompt}>{round.prompt}</p>

              <div className={styles.roundPlayers}>
                {players.map((player) => (
                  <div key={player.id} className={styles.roundPlayer}>
                    <div className={styles.roundAvatar}>
                      <PlayerAvatar player={player} />
                    </div>

                    <div className={styles.roundPlayerDetails}>
                      <span className={styles.playerName}>{player.name}</span>
                      <span className={styles.playerStatus}>Drawing</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {round?.status === "SCORING_FAILED" && (
            <div className={styles.roundContent}>
              <p>Scoring is unavailable. Your drawings are saved.</p>
              <button onClick={handleStartRound} disabled={isStarting}>Retry scoring</button>
              {startError && <p role="alert">{startError.message}</p>}
            </div>
          )}

          {isScoring && (
            <div className={styles.roundContent}>
              <GameLoading inline message="Everyone's drawings are in. Calculating the results." />
            </div>
          )}

          {isDone && (
            <div className={styles.roundContent}>
              <h2 className={styles.stageTitle}>Round finished</h2>
              <p className={styles.stageMessage}>Loading results…</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default HostRoom;
