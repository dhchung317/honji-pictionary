import reactLogo from "../assets/react.svg";
import viteLogo from "/vite.svg";
import "../App.css";
import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import DrawingCanvas, {
  DrawingCanvasHandle,
} from "../components/DrawingCanvas";
import { createSubmission } from "../lib/submissionsApi";

function JoinRoom() {
  const { roomId } = useParams();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<DrawingCanvasHandle | null>(null);

  useEffect(() => {
    const savedName = window.localStorage.getItem("playerName");
    if (savedName) {
      setName(savedName);
    }
  }, []);

  const handleSubmitDrawing = async () => {
    if (!roomId) return;
    if (!name.trim()) {
      setError("Please save your name before submitting.");
      return;
    }
    if (!canvasRef.current) return;

    const dataUrl = canvasRef.current.getImageDataUrl();
    if (!dataUrl) {
      setError("Could not capture drawing.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await createSubmission({
        roomId,
        playerName: name.trim(),
        imageDataUrl: dataUrl,
      });
      setHasSubmitted(true);
    } catch (e) {
      setError("Failed to submit drawing. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const prompt = "Draw a dragon eating ramen"; // later: fetch from room

  if (!roomId) {
    return <p>Missing room id.</p>;
  }
  return (
    <>
      <div>
        <img src={viteLogo} className="logo" alt="Vite logo" />
        <img src={reactLogo} className="logo react" alt="React logo" />
      </div>
      <h1>Join Room</h1>
      <div className="card">
        <section style={{ marginBottom: "1rem" }}>
          <h3>{`Hello ${name}`}</h3>
        </section>

        {/* If they haven't saved a name yet, nudge them */}
        {!name.trim() && (
          <p style={{ color: "gray" }}>Save a name to start drawing.</p>
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
    </>
  );
}

export default JoinRoom;
