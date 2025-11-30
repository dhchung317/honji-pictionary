import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

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

  const handleJoin = () => {
    const trimmed = name.trim();
    if (!trimmed) setNameError("Enter a name!");
    window.localStorage.setItem("playerName", trimmed);
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
