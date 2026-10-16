import { sessionHeaders } from "../lib/session";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DrawingCanvasHandle } from "../components/DrawingCanvas/DrawingCanvas";
import { GameErrorPage } from "../components/GameError";
import { GameLoading } from "../components/GameLoading/GameLoading";
import { useAsync } from "../hooks/useAsync";
import { useCountdown } from "../hooks/useCountdown";
import { getPlayersByRoom, setPlayerReady } from "../lib/playersApi";
import { getRoom } from "../lib/roomsApi";
import { upload } from "@vercel/blob/client";
import { useAsyncAction } from "../hooks/useAsyncAction";
import { updatePlayerAvatar } from "../lib/playersApi";

import styles from "./PlayerLobby.module.css";
import { PlayerAvatarView } from "./views/PlayerAvatarView";
import { PhaseMessageView } from "./views/PhaseMessageView";

function PlayerLobby() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [hasAvatar, setHasAvatar] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const expectedReady = useRef<boolean | null>(null);

  const avatarCanvasRef = useRef<DrawingCanvasHandle | null>(null);

  const {
    run: submitAvatar,
    loading: isSubmittingAvatar,
    error: avatarError,
  } = useAsyncAction(async () => {
    if (!roomId) {
      throw new Error("Missing room id.");
    }

    const playerId = sessionStorage.getItem(`playerId:${roomId}`);

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
        headers: sessionHeaders(roomId, "PLAYER"),
        handleUploadUrl: "/api/blob-upload",
        clientPayload: JSON.stringify({
          roomId,
          playerId,
          type: "avatar",
        }),
      },
    );

    await updatePlayerAvatar(roomId, playerId, url);

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

      const state = await getRoom(roomId);
      const players = await getPlayersByRoom(roomId);
      return { ...state, players };
    },
    [roomId],
    { intervalMs: 3000 },
  );

  const room = roomState?.room ?? null;
  const roomStatus = room?.status;
  const { secondsLeft: startSeconds } = useCountdown(
    roomStatus === "LOBBY" ? (room?.autoStartAt ?? null) : null,
  );
  useEffect(() => {
    const me = roomState?.players.find(
      (player) => player.id === sessionStorage.getItem(`playerId:${roomId}`),
    );
    const observed = me?.ready === true;
    if (expectedReady.current !== null && expectedReady.current !== observed)
      return;
    expectedReady.current = null;
    setIsReady(observed);
  }, [roomState, roomId]);
  const {
    run: toggleReady,
    loading: readyBusy,
    error: readyError,
  } = useAsyncAction(async () => {
    if (!roomId || !room) return;
    const reply = await setPlayerReady(
      roomId,
      !isReady,
      room.lobbyVersion ?? 0,
    );
    expectedReady.current = reply.ready;
    setIsReady(reply.ready);
  });

  /* ---------- Keep the lobby limited to waiting rooms ---------- */

  useEffect(() => {
    if (!roomId || !roomStatus || room?.closed || roomStatus === "LOBBY")
      return;

    const destination =
      roomStatus === "DONE"
        ? `/room/${roomId}/playerresults`
        : `/room/${roomId}`;

    navigate(destination, { replace: true });
  }, [roomId, roomStatus, room?.closed, navigate]);

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

  if (room.closed)
    return <PhaseMessageView message="The host has closed this room." />;

  // Avoid mounting the avatar canvas while the navigation effect runs.
  if (room.status !== "LOBBY") {
    return <GameLoading message="Opening your game..." />;
  }

  return (
    <main className={styles.page}>
      {roomError && (
        <p role="status">
          Connection interrupted. Reconnecting… Your drawing is still here.
        </p>
      )}
      <PlayerAvatarView
        room={room}
        startSeconds={startSeconds}
        avatarCanvasRef={avatarCanvasRef}
        submitAvatar={submitAvatar}
        toggleReady={toggleReady}
        isSubmittingAvatar={isSubmittingAvatar}
        hasAvatar={hasAvatar}
        readyBusy={readyBusy}
        isReady={isReady}
        readyError={readyError}
        avatarError={avatarError}
      />
    </main>
  );
}

export default PlayerLobby;
