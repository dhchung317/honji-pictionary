import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { registerPlayer } from "../lib/playersApi";

const PLAYER_ID_KEY = "drawBattle.playerId";

function Join() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    const savedName = window.localStorage.getItem("playerName");
    if (savedName) {
      setName(savedName);
    }
  }, []);

  const handleJoin = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setNameError("Enter a name!");
    // TODO: handling for invalid/non existent codes
    if (!code) return;

    window.localStorage.setItem("playerName", trimmed);
    const existingId = window.localStorage.getItem(PLAYER_ID_KEY);
    const player = await registerPlayer(code, trimmed);
    if (!existingId) {
      window.localStorage.setItem(PLAYER_ID_KEY, player.id);
    }
    setName(trimmed);
    navigate(code);
  };

  return (
    <div className="card">
      <h1>Join Room</h1>
      <div>
        <section
          style={{
            marginBottom: "1rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3>Name</h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />
          {nameError && !name ? (
            <p style={{ color: "red" }}>{nameError}</p>
          ) : null}
          <h3>Room</h3>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter your room code"
          />
          <button
            style={{ display: "block", marginTop: "18px" }}
            onClick={handleJoin}
          >
            Join
          </button>
        </section>
      </div>
    </div>
  );
}

export default Join;
