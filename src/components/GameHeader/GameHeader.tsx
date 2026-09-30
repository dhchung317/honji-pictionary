import { Link, useMatch, useNavigate } from "react-router-dom";
import { useRef } from "react";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { quit } from "../../lib/roomsApi";
import styles from "./GameHeader.module.css";

export function GameHeader() {
  const host = useMatch("/host/:roomId/*");
  const player = useMatch("/room/:roomId/*");
  const results = useMatch("/room/:roomId/results");
  const roomId = host?.params.roomId ?? player?.params.roomId;
  const navigate = useNavigate();
  const quitting = useRef(false);
  const { run: leave, loading, error } = useAsyncAction(async () => {
    if (!roomId || quitting.current) return;
    quitting.current = true;
    try {
      await quit(roomId);
      navigate("/");
    } finally {
      quitting.current = false;
    }
  });
  if (!roomId) return null;
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.brand} aria-label="Honji home"><img src="/honji-wordmark.svg" alt="Honji" width="1040" height="425" /></Link>
      <div className={styles.room} aria-label={`Room ${roomId}`}><span className={styles.label}>Room</span><strong className={styles.code}>{roomId}</strong></div>
      {results && <div className={styles.actions}>
        <button onClick={leave} disabled={loading}>{loading ? "Leaving…" : "Quit"}</button>
        {error && <p role="alert" className={styles.error}>{error.message}</p>}
      </div>}
    </header>
  );
}
