import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { createRoom } from "../lib/roomsApi";

function HostNewGame() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("Draw a dragon eating ramen");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!prompt.trim()) {
      setError("Prompt cannot be empty.");
      return;
    }
    setError(null);
    setIsCreating(true);
    try {
      const room = await createRoom(prompt.trim());
      navigate(`/host/${room.id}`);
    } catch (e:unknown) {

      setError((e as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="card">
      <h1>Host New Game</h1>
      <div>
        <label>
          Prompt
          <br />
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            style={{ width: "100%", maxWidth: 400 }}
          />
        </label>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button onClick={handleCreate} disabled={isCreating}>
          {isCreating ? "Creating..." : "Create Game"}
        </button>
      </div>
    </div>
  );
}

export default HostNewGame;
