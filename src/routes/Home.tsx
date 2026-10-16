import { useRef, useState, type FormEvent } from "react";
import { useGameEntry } from "../hooks/useGameEntry";
import { ThemeToggle } from "../components/ThemeToggle/ThemeToggle";
import styles from "./Home.module.css";

function Home() {
  const instructionsRef = useRef<HTMLDialogElement>(null);
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
        <div className={styles.themeControl}>
          <ThemeToggle />
        </div>
        <button
          className={styles.instructionsTab}
          type="button"
          aria-haspopup="dialog"
          aria-controls="game-instructions"
          onClick={() => instructionsRef.current?.showModal()}
        >
          Instructions <span aria-hidden="true">?</span>
        </button>
        <header className={styles.hero}>
          <span className={styles.eyebrow}>The drawing party game</span>
          <img
            className={styles.logo}
            src="/honji-2.png"
            alt="Honji"
            width="1600"
            height="900"
          />
          <h1 className={styles.title} id="home-title">
            Big ideas.
            <br />
            <span>Questionable drawings.</span>
          </h1>
          <p className={styles.description}>
            One prompt. Everybody draws.
            <br />
            Let the best sketch win.
          </p>
        </header>
        <div className={styles.entry}>
          <button
            className={styles.hostButton}
            type="button"
            onClick={() => void hostGame()}
            disabled={busy !== null}
          >
            {busy === "HOST" ? "Creating your game…" : "Host a new game"}
            <span aria-hidden="true">↗</span>
          </button>
          <p className={styles.hostHint}>
            Hosting? No name needed. Just bring your friends.
          </p>
          <div className={styles.divider}>
            <span>Or join a room</span>
          </div>
          <form className={styles.joinForm} onSubmit={handleJoin}>
            <div className={styles.nameField}>
              <label htmlFor="player-name">Your name</label>
              <input
                id="player-name"
                name="playerName"
                placeholder="Your drawing alter ego"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={15}
                required
                autoComplete="nickname"
                disabled={busy !== null}
              />
            </div>
            <div className={styles.codeField}>
              <label htmlFor="room-code">Room code</label>
              <input
                id="room-code"
                name="roomCode"
                className={styles.codeInput}
                placeholder="ABCD"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                maxLength={4}
                minLength={4}
                required
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={busy !== null}
              />
            </div>
            <button
              className={styles.joinButton}
              type="submit"
              disabled={busy !== null}
            >
              {busy === "JOIN" ? "Joining…" : "Join room"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className={styles.gameFacts}>
          <span>
            Up to <strong>10</strong> players
          </span>
          <span>
            <strong>3</strong>-minute rounds
          </span>
          <span>AI picks the winner</span>
        </footer>
      </section>
      <p className={styles.footer}>A little competition. A lot of bad art.</p>
      <dialog
        ref={instructionsRef}
        id="game-instructions"
        className={styles.instructionsModal}
        aria-labelledby="instructions-title"
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          ) {
            event.currentTarget.close();
          }
        }}
      >
        <header className={styles.instructionsHeader}>
          <h2 id="instructions-title">How to play</h2>
          <button
            className={styles.closeInstructions}
            type="button"
            aria-label="Close instructions"
            autoFocus
            onClick={() => instructionsRef.current?.close()}
          >
            ×
          </button>
        </header>
        <p className={styles.instructionsIntro}>
          One shared screen. A phone for every artist. Absolutely no drawing
          talent required.
        </p>
        <aside className={styles.screenTip}>
          <strong>The best setup</strong>
          <p>
            Host on a laptop, desktop, or larger screen so everyone can see the
            prompt, countdown, and results. Players join on their phones to
            draw. Keep the host screen separate from the players’ devices.
          </p>
        </aside>
        <ol className={styles.playSteps}>
          <li>
            <strong>Host a game.</strong>
            <p>
              Choose “Host a new game” and share the four-letter room code. The
              host doesn’t need a player name.
            </p>
          </li>
          <li>
            <strong>Join and make your mark.</strong>
            <p>
              Players open this site, enter a name and the room code, then draw
              and submit an avatar in the lobby.
            </p>
          </li>
          <li>
            <strong>Get everyone ready.</strong>
            <p>
              Players choose “I’m ready” in the avatar lobby. Once everyone is
              ready, a five-second countdown starts. Choose unready to cancel
              it; the host can also start a round manually. Everyone gets the
              same drawing prompt.
            </p>
          </li>
          <li>
            <strong>Draw against the clock.</strong>
            <p>
              You have three minutes to bring the prompt to life. Submit when
              you’re ready; your drawing is submitted automatically when time
              runs out.
            </p>
          </li>
          <li>
            <strong>See who takes the crown.</strong>
            <p>
              AI scores the drawings and picks a winner. Check the rankings and
              feedback on your phone, and enjoy the top drawings together on the
              host screen.
            </p>
          </li>
        </ol>
        <p className={styles.instructionsNote}>
          Up to 10 players. Clear ideas beat perfect art—have fun with it.
        </p>
        <button
          className={styles.gotItButton}
          type="button"
          onClick={() => instructionsRef.current?.close()}
        >
          Got it. Let’s draw!
        </button>
      </dialog>
    </main>
  );
}
export default Home;
