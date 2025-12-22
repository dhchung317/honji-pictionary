import { upload } from "@vercel/blob/client";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import DrawingCanvas, {
  DrawingCanvasHandle,
} from "../components/DrawingCanvas";
import { createSubmission } from "../lib/submissionsApi";
import { getRoom } from "../lib/roomsApi";
import { useCountdown } from "../hooks/useCountdown";
import { Room, RoomStatus } from "../../shared/room";

const formatSeconds = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

function JoinRoom() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<DrawingCanvasHandle | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState<RoomStatus>("LOBBY");
  const { secondsLeft, isExpired } = useCountdown(room?.roundEndAt ?? null);
  const [roomLoading, setRoomLoading] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);

  roomLoading && roomError;

  const prompt = "Draw a dragon eating ramen"; // later: fetch from room
  const isLobby = status === "LOBBY";
  const isDrawing = status === "DRAWING";
  // const isScoring = status === "SCORING";
  const isDone = status === "DONE";

  useEffect(() => {
    if (!room) return;
    if (!isDrawing) return; // you already have const isDrawing = room.status === "DRAWING";
    if (!isExpired) return;
    if (hasSubmitted) return;
    if (isSubmitting) return;

    // Auto-submit once when time is up
    submitDrawing();
    // we intentionally DO NOT await submitDrawing here;
    // it's fine to fire-and-forget in this effect.
  }, [room, isDrawing, isExpired, hasSubmitted, isSubmitting]);

  useEffect(() => {
    if (isDone) {
      navigate(`/room/${roomId}/playerresults`);
    }
  });

  useEffect(() => {
    const savedName = window.localStorage.getItem(`playerName:${roomId}`);
    if (savedName) {
      setName(savedName);
    }
  }, []);

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    const loadRoom = async () => {
      const r = await getRoom(roomId);
      if (cancelled) return;
      if (!r) {
        setRoomError("Room not found.");
        setRoom(null);
      } else {
        setRoomError(null);
        setRoom(r);
        setStatus(r.status);
      }
      setRoomLoading(false);
    };

    loadRoom();
    const interval = setInterval(loadRoom, 3000);

    if (isExpired) clearInterval(interval);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomId, isExpired]);

  const submitDrawing = async () => {
    if (!roomId) {
      setError("Missing room id.");
      return;
    }
    if (!room) {
      setError("Room not loaded yet.");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please save your name before submitting.");
      return;
    }
    if (!canvasRef.current) {
      setError("Canvas not ready.");
      return;
    }

    // const dataUrl = canvasRef.current.getImageDataUrl();
    // if (!dataUrl) {
    //   setError("Could not capture drawing.");
    //   return;
    // }
    const playerId = window.localStorage.getItem(`playerId:${roomId}`);
    if (!playerId) {
      setError("player id not found");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvasRef.current
          ?.getCanvas()
          ?.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
            "image/png"
          );
      });

      const round = room.roundId;

      const { url } = await upload(
        `rooms/${roomId}/rounds/${round}/players/${playerId}.png`,
        blob,
        {
          access: "public",
          handleUploadUrl: "/api/blob-upload",
          clientPayload: JSON.stringify({
            roomId,
            round,
            playerId,
          }),
        }
      );
      await createSubmission({
        roomId,
        playerId,
        playerName: trimmedName,
        imageUrl: url,
      });
      setHasSubmitted(true);
    } catch (e) {
      console.error(e);
      setError("Failed to submit drawing. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitDrawing = async () => {
    if (!room) {
      setError("Room not loaded yet.");
      return;
    }
    if (room.status !== "DRAWING") {
      setError("You can only submit while the round is in progress.");
      return;
    }
    await submitDrawing();
  };

  if (!roomId) {
    return <p>Missing room id.</p>;
  }

  if (isLobby) {
    return <div> Waiting for host to start...</div>;
  }

  return (
    <div className="card">
      <h1>Join Room</h1>
      <div>
        <section style={{ marginBottom: "1rem" }}>
          <h3>{`Hello ${name}`}</h3>
        </section>

        {secondsLeft !== null && room?.status === "DRAWING" && (
          <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
            Time remaining: {formatSeconds(secondsLeft)}
          </p>
        )}

        {/* Drawing section */}
        {name.trim() && !hasSubmitted && (
          <section>
            <p>{prompt}</p>

            <DrawingCanvas
              ref={canvasRef}
              width={300}
              height={300}
              strokeColor="#000000"
              strokeWidth={4}
            />

            <div style={{ marginTop: "0.5rem" }}>
              <button onClick={handleSubmitDrawing} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit drawing"}
              </button>
              <button
                type="button"
                style={{ marginLeft: "0.5rem" }}
                onClick={() => canvasRef.current?.clear()}
              >
                Clear
              </button>
            </div>
          </section>
        )}

        {/* After submit */}
        {hasSubmitted && (
          <section style={{ marginTop: "1rem" }}>
            <h3>Submitted!</h3>
            <p>Waiting for the host to score the round…</p>
          </section>
        )}

        {error && <div>{error}</div>}
      </div>
    </div>
  );
}

export default JoinRoom;
