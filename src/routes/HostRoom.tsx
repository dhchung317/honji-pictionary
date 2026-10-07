import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { GameErrorPage } from "../components/GameError";

import { useAsync } from "../hooks/useAsync";
import { useCountdown } from "../hooks/useCountdown";
import { useAsyncAction } from "../hooks/useAsyncAction";

import { getPlayersByRoom } from "../lib/playersApi";
import { getRoom, startRound } from "../lib/roomsApi";
import { getViewerRole } from "../lib/viewer";
import { GameLoading } from "../components/GameLoading/GameLoading";

import styles from "./HostRoom.module.css";
import { HostLobbyView } from "./views/HostLobbyView";
import { HostDrawingView } from "./views/HostDrawingView";
import { PhaseMessageView } from "./views/PhaseMessageView";
import { getRoomView } from "../lib/roomView";

function HostRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

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
  const { secondsLeft: startSeconds } = useCountdown(
    room?.status === "LOBBY" ? (room.autoStartAt ?? null) : null,
  );
  const automaticAttempt = useRef<string | null>(null);
  const [autoStartError, setAutoStartError] = useState<string | null>(null);
  useEffect(() => {
    if (room?.closed || room?.status !== "LOBBY" || !room.autoStartAt) {
      automaticAttempt.current = null;
      setAutoStartError(null);
      return;
    }
    const deadline = room.autoStartAt;
    const timeout = setTimeout(
      () => {
        if (automaticAttempt.current === deadline) return;
        automaticAttempt.current = deadline;
        setIsWaitingForRound(true);
        void startRound(room.id, {
          lobbyVersion: room.lobbyVersion ?? 0,
        }).catch((error) => {
          setIsWaitingForRound(false);
          setAutoStartError(
            error instanceof Error
              ? error.message
              : "Automatic start failed. Use Start Round to retry.",
          );
        });
      },
      Math.max(0, Date.parse(deadline) - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [
    room?.closed,
    room?.status,
    room?.autoStartAt,
    room?.lobbyVersion,
    room?.id,
  ]);

  const view = getRoomView(roomState);
  const isDone = view === "DONE";
  const { secondsLeft } = useCountdown(
    view === "DRAWING" ? (round?.roundEndAt ?? null) : null,
  );
  const { data: roster, error: playersError } = useAsync(
    () => getPlayersByRoom(roomId!),
    [roomId],
    { intervalMs: 3000 },
  );
  const players = roster ?? [];

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
    if (view !== "LOBBY" && view !== "LOADING") {
      setIsWaitingForRound(false);
    }
  }, [view]);

  /* ---------- Results navigation ---------- */

  useEffect(() => {
    if (!roomId || !room || !isDone) return;

    const role = getViewerRole(room);

    if (role === "PLAYER") {
      navigate(`/room/${roomId}/playerresults?round=${round?.id ?? ""}`, {
        replace: true,
      });
    } else {
      navigate(`/room/${roomId}/results`, { replace: true });
    }
  }, [roomId, room, isDone, round?.id, navigate]);

  /* ---------- Page states ---------- */

  if (!roomId) {
    return <GameErrorPage type="MISSING_ROOM_ID" />;
  }

  if (roomLoading) {
    return <GameLoading message="Loading room..." />;
  }

  if (roomError && (!room || roomError.message === "ROOM_NOT_FOUND")) {
    return <GameErrorPage type={roomError.message} />;
  }

  if (!room) {
    return <GameErrorPage type="ROOM_NOT_FOUND" />;
  }

  if (view === "CLOSED")
    return <PhaseMessageView message="The host has closed this room." />;
  if (isWaitingForRound && view === "LOBBY")
    return <GameLoading message="Starting round..." />;

  let content;
  switch (view) {
    case "LOBBY":
      content = (
        <HostLobbyView
          room={room}
          players={players}
          startSeconds={startSeconds}
          autoStartError={autoStartError}
          isStarting={isStarting}
          startError={startError}
          handleStartRound={handleStartRound}
        />
      );
      break;
    case "STARTING":
      content = <GameLoading inline message="Starting round…" />;
      break;
    case "DRAWING":
      content = round ? (
        <HostDrawingView
          round={round}
          players={players}
          secondsLeft={secondsLeft}
        />
      ) : (
        <GameLoading inline message="Loading round…" />
      );
      break;
    case "SCORING_FAILED":
      content = (
        <PhaseMessageView
          message="Scoring is unavailable. Your drawings are saved."
          action={
            <>
              <button onClick={handleStartRound} disabled={isStarting}>
                Retry scoring
              </button>
              {startError && <p role="alert">{startError.message}</p>}
            </>
          }
        />
      );
      break;
    case "SCORING":
      content = (
        <GameLoading
          inline
          message="Everyone’s drawings are in. Calculating the results."
        />
      );
      break;
    default:
      content = <GameLoading inline message="Opening results…" />;
  }
  return (
    <main className={styles.page}>
      {(roomError || playersError) && (
        <p role="status">Connection interrupted. Reconnecting…</p>
      )}
      <div className={styles.room}>
        <section className={styles.stage}>{content}</section>
      </div>
    </main>
  );
}
export default HostRoom;
