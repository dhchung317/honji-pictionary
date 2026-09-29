import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DrawingCanvas, {
  DrawingCanvasHandle,
} from "../components/DrawingCanvas/DrawingCanvas";
import { GameErrorPage } from "../components/GameError";
import { GameLoading } from "../components/GameLoading/GameLoading";
import { useAsync } from "../hooks/useAsync";
import { getRoom } from "../lib/roomsApi";
import { upload } from "@vercel/blob/client";
import { useAsyncAction } from "../hooks/useAsyncAction";
import { updatePlayerAvatar } from "../lib/playersApi";

import styles from "./PlayerLobby.module.css";

function PlayerLobby() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [hasAvatar, setHasAvatar] = useState(false);

  const avatarCanvasRef = useRef<DrawingCanvasHandle | null>(null);

  const {
    run: submitAvatar,
    loading: isSubmittingAvatar,
    error: avatarError,
  } = useAsyncAction(async () => {
    if (!roomId) {
      throw new Error("Missing room id.");
    }

    const playerId = localStorage.getItem(`playerId:${roomId}`);

    if (!playerId) {
      throw new Error("Player id not found.");
    }

    const canvas = avatarCanvasRef.current?.getCanvas();

    if (!canvas) {
      throw new Error("Canvas not ready.");
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Could not capture avatar."));
        }
      }, "image/png");
    });

    const { url } = await upload(
      `room/${roomId}/players/${playerId}/avatar.png`,
      blob,
      {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
        clientPayload: JSON.stringify({
          roomId,
          playerId,
          type: "avatar",
        }),
      },
    );

    await updatePlayerAvatar(playerId, url);

    setHasAvatar(true);
  });

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

  const isDrawing = round?.status === "DRAWING";

  /* ---------- Start round navigation ---------- */

  useEffect(() => {
    if (!roomId || !isDrawing) return;

    navigate(`/room/${roomId}`, {
      replace: true,
    });
  }, [roomId, isDrawing, navigate]);

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

  return (
    <main className={styles.page}>
      <div className={styles.lobby}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>You're in!</h1>

            <p className={styles.roomId}>
              Room <strong>{room.id}</strong>
            </p>
          </div>

          <p className={styles.waiting}>Waiting for the host to start...</p>
        </header>

        <section className={styles.avatarSection}>
          <div className={styles.avatarHeading}>
            <h2>Draw your avatar</h2>

            <p>Draw yourself while you wait for the game to start.</p>
          </div>

          <div className={styles.canvasContainer}>
            <DrawingCanvas
              ref={avatarCanvasRef}
              resolutionWidth={500}
              resolutionHeight={500}
              strokeColor="#000000"
              strokeWidth={4}
            />
          </div>

          <div className={styles.actions}>
            <button
              className={styles.submitButton}
              type="button"
              onClick={submitAvatar}
              disabled={isSubmittingAvatar}
            >
              {isSubmittingAvatar
                ? "Saving..."
                : hasAvatar
                  ? "Update avatar"
                  : "Use as my avatar"}
            </button>

            <button
              className={styles.clearButton}
              type="button"
              onClick={() => avatarCanvasRef.current?.clear()}
            >
              Clear
            </button>
          </div>
          {avatarError && <p className={styles.error}>{avatarError.message}</p>}
        </section>
      </div>
    </main>
  );
}

export default PlayerLobby;
