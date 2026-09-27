import { useNavigate } from "react-router-dom";

import { useAsyncAction } from "../hooks/useAsyncAction";
import { createRoom } from "../lib/roomsApi";

import styles from "./Home.module.css";

function Home() {
  const navigate = useNavigate();

  const {
    run: hostGame,
    loading: isCreating,
    error,
  } = useAsyncAction(async () => {
    const room = await createRoom();

    navigate(`/host/${room.id}`);
  });

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Honji Pictionary</h1>

          <p className={styles.description}>
            Draw, guess, and see who comes out on top.
          </p>
        </header>

        <div className={styles.actions}>
          <button
            className={styles.hostButton}
            onClick={hostGame}
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Host Game"}
          </button>

          <button
            className={styles.joinButton}
            onClick={() => navigate("/join")}
            disabled={isCreating}
          >
            Join Game
          </button>
        </div>

        {error && <p className={styles.error}>{error.message}</p>}
      </section>
    </main>
  );
}

export default Home;
