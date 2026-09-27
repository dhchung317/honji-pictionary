import { upload } from "@vercel/blob/client";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import DrawingCanvas, {
  DrawingCanvasHandle,
} from "../components/DrawingCanvas";
import { createSubmission } from "../lib/submissionsApi";
import { getRoom } from "../lib/roomsApi";
import { useCountdown } from "../hooks/useCountdown";
import { RoomState } from "../../shared/roomstate";

const formatSeconds = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

function JoinRoom() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const autoSubmittedRef = useRef(false);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<DrawingCanvasHandle | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);

  const room = roomState?.room ?? null;
  const round = roomState?.round ?? null;

  const { secondsLeft, isExpired } = useCountdown(round?.roundEndAt ?? null);

  const prompt = round?.prompt;

  const isLobby = room?.status === "LOBBY";
  const isDrawing = round?.status === "DRAWING";
  // const isScoring = round?.status === "SCORING";
  const isDone = round?.status === "DONE";

  useEffect(() => {
    if (!room) return;
    if (!isDrawing) return;
    if (!isExpired) return;
    if (hasSubmitted || isSubmitting) return;
    if (autoSubmittedRef.current) return;

    autoSubmittedRef.current = true;
    submitDrawing();
  }, [room, isExpired, hasSubmitted, isSubmitting]);

  useEffect(() => {
    if (isDone) {
      navigate(`/room/${roomId}/playerresults`);
    }
  }, [isDone, navigate, roomId]);

  useEffect(() => {
    const savedName = window.localStorage.getItem(`playerName:${roomId}`);
    if (savedName) {
      setName(savedName);
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    const loadRoom = async () => {
      try {
        const state = await getRoom(roomId);
        if (cancelled) return;

        if (!state) {
          setRoomError("Room not found.");
          setRoomState(null);
        } else {
          setRoomError(null);
          setRoomState(state);
        }
      } finally {
        if (!cancelled) setRoomLoading(false);
      }
    };

    loadRoom();
    const interval = setInterval(loadRoom, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomId]);

  useEffect(() => {
    autoSubmittedRef.current = false;
    setHasSubmitted(false);
  }, [round?.id]);

  const submitDrawing = async () => {
    if (!roomId) {
      setError("Missing room id.");
      return;
    }
    if (!room) {
      setError("Room not loaded yet.");
      return;
    }
    if (!round) {
      setError("Round not loaded yet.");
      return;
    }

    const trimmedName = name.trim() || "Player";
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
            "image/png",
          );
      });

      const roundId = round.id;

      const { url } = await upload(
        `room/${roomId}/round/${roundId}/players/${playerId}.png`,
        blob,
        {
          access: "public",
          handleUploadUrl: "/api/blob-upload",
          clientPayload: JSON.stringify({
            roomId,
            roundId,
            playerId,
          }),
        },
      );
      await createSubmission({
        roomId,
        playerId,
        playerName: trimmedName,
        imageUrl: url,
      });
      setHasSubmitted(true);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to submit drawing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitDrawing = async () => {
    if (!round) {
      setError("Round not loaded yet.");
      return;
    }

    if (round.status !== "DRAWING") {
      setError("You can only submit while the round is in progress.");
      return;
    }

    await submitDrawing();
  };

  if (!roomId) return <p>Missing room id.</p>;
  if (roomLoading) return <div>Loading room…</div>;
  if (roomError) return <div>{roomError}</div>;
  if (!room) return <div>Room not found.</div>;
  if (isLobby) return <div>Waiting for host to start...</div>;

  return (
    <div className="card">
      <h1>Join Room</h1>
      <div>
        <section style={{ marginBottom: "1rem" }}>
          <h3>{`Hello ${name}`}</h3>
        </section>
        {secondsLeft !== null && isDrawing && !hasSubmitted && (
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
