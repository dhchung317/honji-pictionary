import { useState, type FormEvent } from "react";
import { useGameEntry } from "../hooks/useGameEntry";
import styles from "./Home.module.css";

function Home() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const { busy, error, hostGame, joinRoom } = useGameEntry();
  const handleJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void joinRoom(name, code);
  };
  return (
    <main className={styles.page}>
      <div className={styles.sparkBlue} aria-hidden="true" />
      <div className={styles.diamondRed} aria-hidden="true" />
      <div className={styles.sparkGreen} aria-hidden="true" />
      <section className={styles.card} aria-labelledby="home-title">
        <header className={styles.hero}>
          <span className={styles.eyebrow}>The drawing party game</span>
          <img className={styles.logo} src="/honji-2.png" alt="Honji" width="1600" height="900" />
          <h1 className={styles.title} id="home-title">Big ideas.<br /><span>Questionable drawings.</span></h1>
          <p className={styles.description}>One prompt. Everybody draws.<br />Let the best sketch win.</p>
        </header>
        <div className={styles.entry}>
          <button className={styles.hostButton} type="button" onClick={() => void hostGame()} disabled={busy !== null}>
            {busy === "HOST" ? "Creating your game…" : "Host a new game"}<span aria-hidden="true">↗</span>
          </button>
          <p className={styles.hostHint}>Hosting? No name needed. Just bring your friends.</p>
          <div className={styles.divider}><span>Or join a room</span></div>
          <form className={styles.joinForm} onSubmit={handleJoin}>
            <div className={styles.nameField}>
              <label htmlFor="player-name">Your name</label>
              <input id="player-name" name="playerName" placeholder="Your drawing alter ego" value={name} onChange={event => setName(event.target.value)} maxLength={15} required autoComplete="nickname" disabled={busy !== null} />
            </div>
            <div className={styles.codeField}>
              <label htmlFor="room-code">Room code</label>
              <input id="room-code" name="roomCode" className={styles.codeInput} placeholder="ABCD" value={code} onChange={event => setCode(event.target.value.toUpperCase())} maxLength={4} minLength={4} required autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={busy !== null} />
            </div>
            <button className={styles.joinButton} type="submit" disabled={busy !== null}>{busy === "JOIN" ? "Joining…" : "Join room"}<span aria-hidden="true">→</span></button>
          </form>
          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>
        <footer className={styles.gameFacts}><span>Up to <strong>10</strong> players</span><span><strong>3</strong>-minute rounds</span><span>AI picks the winner</span></footer>
      </section>
      <p className={styles.footer}>A little competition. A lot of bad art.</p>
    </main>
  );
}
export default Home;
