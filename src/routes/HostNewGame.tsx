import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { createRoom } from "../lib/roomsApi";

function HostNewGame() {
  const navigate = useNavigate();

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    setIsCreating(true);
    try {
      const room = await createRoom();
      navigate(`/host/${room.id}`);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="card">
      <h1>Host New Game</h1>
      <div>
        {error && <p style={{ color: "red" }}>{error}</p>}

        <button onClick={handleCreate} disabled={isCreating}>
          {isCreating ? "Creating..." : "Create Game"}
        </button>
      </div>
    </div>
  );
}

export default HostNewGame;
