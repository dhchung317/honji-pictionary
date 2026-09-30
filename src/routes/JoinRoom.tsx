import { sessionHeaders } from "../lib/session";
import { upload } from "@vercel/blob/client";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import DrawingCanvas, {
  DrawingCanvasHandle,
} from "../components/DrawingCanvas/DrawingCanvas";
import { GameErrorPage } from "../components/GameError";
import { createSubmission } from "../lib/submissionsApi";
import { getRoom } from "../lib/roomsApi";
import { getViewerRole } from "../lib/viewer";
import { useCountdown } from "../hooks/useCountdown";
import { useAsync } from "../hooks/useAsync";
import { useAsyncAction } from "../hooks/useAsyncAction";

import styles from "./JoinRoom.module.css";
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

  const isDrawing = round?.status === "DRAWING";
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

    if (round.status !== "DRAWING") {
      throw new Error("You can only submit while the round is in progress.");
    }

    if (!canvasRef.current) {
      throw new Error("Canvas not ready.");
    }

    const playerId = localStorage.getItem(`playerId:${roomId}`);

    if (!playerId) {
      throw new Error("Player id not found.");
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvasRef.current!.getCanvas()?.toBlob((blob) => {
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

    setHasSubmitted(true);
  });

  // Auto-submit when timer expires
  useEffect(() => {
    if (!isDrawing) return;
    if (!isExpired) return;
    if (hasSubmitted || isSubmitting) return;
    if (autoSubmittedRef.current) return;

    autoSubmittedRef.current = true;
    submitDrawing();
  }, [isDrawing, isExpired, hasSubmitted, isSubmitting]);

  // Navigate to results when round finishes
  useEffect(() => {
    if (!roomId || !room || !isDone) return;

    const role = getViewerRole(room);

    if (role === "PLAYER") {
      navigate(`/room/${roomId}/playerresults`, {
        replace: true,
      });
    } else {
      navigate(`/room/${roomId}/results`, {
        replace: true,
      });
    }
  }, [isDone, room, roomId, navigate]);

  // Restore player name
  useEffect(() => {
    if (!roomId) return;

    const savedName = localStorage.getItem(`playerName:${roomId}`);

    if (savedName) {
      setName(savedName);
    }
  }, [roomId]);

  // Reset submission state for a new round
  useEffect(() => {
    autoSubmittedRef.current = false;
    setHasSubmitted(false);
  }, [round?.id]);

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

  return (
    <main className={styles.page}>
      {roomError && <p role="status">Connection interrupted. Reconnecting… Your drawing is still here.</p>}
      <div className={styles.game}>
        <header className={styles.header}>
          {secondsLeft !== null && isDrawing && !hasSubmitted && (
            <span className={styles.timer}>{formatSeconds(secondsLeft)}</span>
          )}
        </header>

        {name.trim() && !hasSubmitted && (
          <section>
            <p className={styles.prompt}>{round?.prompt}</p>

            <div className={styles.canvasContainer}>
              <DrawingCanvas
                ref={canvasRef}
                resolutionWidth={500}
                resolutionHeight={500}
                strokeColor="#000000"
                strokeWidth={6}
              />
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.canvasButton}
                onClick={() => canvasRef.current?.undo()}
              >
                Undo
              </button>

              <button
                type="button"
                className={styles.canvasButton}
                onClick={() => canvasRef.current?.clear()}
              >
                Clear
              </button>

              <button
                type="button"
                className={styles.submitButton}
                disabled={isSubmitting || !isDrawing}
                onClick={submitDrawing}
              >
                Submit
              </button>
            </div>
          </section>
        )}

        {round?.status === "SCORING_FAILED" && <p role="status">Scoring is unavailable. Your drawing is saved. Waiting for the host to retry.</p>}

        {hasSubmitted && round?.status !== "SCORING_FAILED" && (
          <GameLoading inline message="Waiting for the host to score the round…" />
        )}

        {submissionError && (
          <div className={styles.error}>{submissionError.message}</div>
        )}
      </div>
    </main>
  );
}

export default JoinRoom;
