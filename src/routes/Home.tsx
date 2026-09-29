import { useNavigate } from "react-router-dom";

import { useAsyncAction } from "../hooks/useAsyncAction";
import { createRoom } from "../lib/roomsApi";

import logo from "../assets/honji.png";

import styles from "./Home.module.css";
import { GameLoading } from "../components/GameLoading/GameLoading";

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

  if (isCreating) {
    return <GameLoading message="Creating your game..." />;
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div>
            <img width="100%" src={logo} />
          </div>
          <div style={{ marginTop: -50 }}>
            <h2 className={styles.title}>PICTIONARY</h2>
            <p className={styles.description}>
              Draw and see who comes out on top
            </p>
          </div>
        </div>

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
