import reactLogo from "../assets/react.svg";
import viteLogo from "/vite.svg";
import "../App.css";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

function Join() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

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
    <>
      <div>
        <img src={viteLogo} className="logo" alt="Vite logo" />
        <img src={reactLogo} className="logo react" alt="React logo" />
      </div>
      <h1>Join Room</h1>
      <div className="card">
        <section style={{ marginBottom: "1rem", display: 'flex', flexDirection: 'column' }}>
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
          <button style={{display: 'block', marginTop: '18px'}} onClick={handleJoin}>
            Join
          </button>
        </section>
      </div>
    </>
  );
}

export default Join;
