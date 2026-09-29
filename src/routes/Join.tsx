import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { registerPlayer } from "../lib/playersApi";

import styles from "./Join.module.css";

function Join() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [nameError, setNameError] = useState<string | null>(null);

  const handleJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const roomCode = code.trim().toUpperCase();

    if (!trimmedName) {
      setNameError("Enter a name!");
      return;
    }

    setNameError(null);
    setName(trimmedName);
    setCode(roomCode);

    // TODO: handling for invalid/non-existent codes
    if (!roomCode) {
      return;
    }

    const player = await registerPlayer(roomCode, trimmedName);

    window.localStorage.setItem(`playerId:${roomCode}`, player.id);

    window.localStorage.setItem(`playerName:${roomCode}`, player.name);

    navigate(`/room/${roomCode}/lobby`);
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Join Room</h1>

          <p className={styles.description}>
            Enter your name and room code to join the game.
          </p>
        </header>

        <form className={styles.form} onSubmit={handleJoin}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="player-name">
              Name
            </label>

            <input
              id="player-name"
              className={styles.input}
              value={name}
              onChange={(event) => {
                setName(event.target.value);

                if (nameError) {
                  setNameError(null);
                }
              }}
              placeholder="Enter your name"
              autoComplete="name"
            />

            {nameError && <p className={styles.error}>{nameError}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="room-code">
              Room
            </label>

            <input
              id="room-code"
              className={`${styles.input} ${styles.roomInput}`}
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="ABCD"
              autoCapitalize="characters"
              autoComplete="off"
            />
          </div>

          <button className={styles.joinButton} type="submit">
            Join
          </button>
        </form>
      </section>
    </main>
  );
}

export default Join;
