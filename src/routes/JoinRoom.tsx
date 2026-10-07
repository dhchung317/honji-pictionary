import { sessionHeaders } from "../lib/session";
import { upload } from "@vercel/blob/client";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { DrawingCanvasHandle } from "../components/DrawingCanvas/DrawingCanvas";
import { GameErrorPage } from "../components/GameError";
import { createSubmission } from "../lib/submissionsApi";
import { getRoom } from "../lib/roomsApi";
import { getViewerRole } from "../lib/viewer";
import { useCountdown } from "../hooks/useCountdown";
import { useAsync } from "../hooks/useAsync";
import { useAsyncAction } from "../hooks/useAsyncAction";

import styles from "./JoinRoom.module.css";
import { PlayerDrawingView } from "./views/PlayerDrawingView";
import { PhaseMessageView } from "./views/PhaseMessageView";
import { getRoomView } from "../lib/roomView";
import { GameLoading } from "../components/GameLoading/GameLoading";

const formatSeconds = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;

  return `${m}:${s.toString().padStart(2, "0")}`;
};

function JoinRoom() {
  const navigate = useNavigate();
  const { roomId } = useParams();

  const canvasRef = useRef<DrawingCanvasHandle | null>(null);
  const autoSubmittedRef = useRef(false);
  const submissionInFlightRef = useRef(false);

  const [name, setName] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Load + poll room state
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

  const view = getRoomView(roomState);
  const isDrawing = view === "DRAWING" && round?.status === "DRAWING";
  const isDone = round?.status === "DONE";

  const { secondsLeft, isExpired } = useCountdown(round?.roundEndAt ?? null);

  // Submit drawing
  const {
    run: submitDrawing,
    loading: isSubmitting,
    error: submissionError,
  } = useAsyncAction(async () => {
    if (!roomId) {
      throw new Error("Missing room id.");
    }

    if (!round) {
      throw new Error("Round not loaded yet.");
    }

    if (sessionStorage.getItem(`submittedRound:${roomId}`) === round.id) {
      setHasSubmitted(true);
      return;
    }
    if (submissionInFlightRef.current) return;

    if (round.status !== "DRAWING") {
      throw new Error("You can only submit while the round is in progress.");
    }

    if (!canvasRef.current) {
      throw new Error("Canvas not ready.");
    }

    const playerId = sessionStorage.getItem(`playerId:${roomId}`);

    if (!playerId) {
      throw new Error("Player id not found.");
    }

    const canvas = canvasRef.current.getCanvas();
    if (!canvas) throw new Error("Canvas not ready.");

    submissionInFlightRef.current = true;
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Could not capture drawing."));
          }
        }, "image/png");
      });

      const { url } = await upload(
        `room/${roomId}/round/${round.id}/players/${playerId}.png`,
        blob,
        {
          access: "public",
          headers: sessionHeaders(roomId, "PLAYER"),
          handleUploadUrl: "/api/blob-upload",
          clientPayload: JSON.stringify({
            roomId,
            roundId: round.id,
            playerId,
          }),
        },
      );

      await createSubmission({
        roomId,
        playerId,
        playerName: name.trim() || "Player",
        imageUrl: url,
      });

      sessionStorage.setItem(`submittedRound:${roomId}`, round.id);
      setHasSubmitted(true);
    } finally {
      submissionInFlightRef.current = false;
    }
  });

  // Auto-submit when timer expires
  useEffect(() => {
    if (!isDrawing) return;
    if (!isExpired) return;
    if (hasSubmitted || isSubmitting) return;
    if (autoSubmittedRef.current) return;

    autoSubmittedRef.current = true;
    submitDrawing();
  }, [isDrawing, isExpired, hasSubmitted, isSubmitting, submitDrawing]);

  // Navigate to results when round finishes
  useEffect(() => {
    if (!roomId || !room || !isDone) return;

    const role = getViewerRole(room);

    if (role === "PLAYER") {
      navigate(`/room/${roomId}/playerresults?round=${round?.id ?? ""}`, {
        replace: true,
      });
    } else {
      navigate(`/room/${roomId}/results`, {
        replace: true,
      });
    }
  }, [isDone, room, roomId, round?.id, navigate]);

  useEffect(() => {
    if (roomId && view === "LOBBY")
      navigate(`/room/${roomId}/lobby`, { replace: true });
  }, [roomId, view, navigate]);

  // Restore player name
  useEffect(() => {
    if (!roomId) return;

    const savedName = sessionStorage.getItem(`playerName:${roomId}`);

    if (savedName) {
      setName(savedName);
    }
  }, [roomId]);

  // Reset submission state for a new round
  useEffect(() => {
    autoSubmittedRef.current = false;
    setHasSubmitted(
      Boolean(
        roomId &&
        round?.id &&
        sessionStorage.getItem(`submittedRound:${roomId}`) === round.id,
      ),
    );
  }, [roomId, round?.id]);

  // Page states
  if (!roomId) {
    return <GameErrorPage type="MISSING_ROOM_ID" />;
  }

  if (roomLoading) {
    return <GameLoading message="Loading your canvas..." />;
  }

  if (roomError && (!room || roomError.message === "ROOM_NOT_FOUND")) {
    return <GameErrorPage type={roomError.message} />;
  }

  if (!room) {
    return <GameErrorPage type="ROOM_NOT_FOUND" />;
  }

  if (view === "CLOSED")
    return <PhaseMessageView message="The host has closed this room." />;
  if (view === "LOBBY" || view === "DONE")
    return <GameLoading message="Opening your game…" />;
  if (view === "DRAWING" && (!round || !name.trim()))
    return <GameLoading message="Loading your canvas…" />;

  let content;
  switch (view) {
    case "STARTING":
      content = <GameLoading inline message="Starting round…" />;
      break;
    case "DRAWING":
      content = hasSubmitted ? (
        <GameLoading
          inline
          message={
            round?.frozenPlayerIds.length === 1
              ? "Drawing submitted. Preparing scoring…"
              : "Drawing submitted. Waiting for the other players…"
          }
        />
      ) : (
        <PlayerDrawingView
          key={round!.id}
          round={round!}
          canvasRef={canvasRef}
          isSubmitting={isSubmitting}
          submitDrawing={submitDrawing}
        />
      );
      break;
    case "SCORING":
      content = (
        <GameLoading
          inline
          message={
            hasSubmitted
              ? "Drawing submitted. Scoring the drawings…"
              : "Drawing time is over. Scoring the drawings…"
          }
        />
      );
      break;
    case "SCORING_FAILED":
      content = (
        <PhaseMessageView message="Scoring is unavailable. Waiting for the host to retry." />
      );
      break;
    default:
      content = <GameLoading inline message="Opening your game…" />;
  }

  return (
    <main className={styles.page}>
      {roomError && (
        <p role="status">
          Connection interrupted. Reconnecting… Your drawing is still here.
        </p>
      )}
      <div className={styles.game}>
        <header className={styles.header}>
          {secondsLeft !== null && isDrawing && !hasSubmitted && (
            <span className={styles.timer}>{formatSeconds(secondsLeft)}</span>
          )}
        </header>
        {content}

        {submissionError && (
          <div className={styles.error} role="alert">
            {submissionError.message}
          </div>
        )}
      </div>
    </main>
  );
}

export default JoinRoom;
