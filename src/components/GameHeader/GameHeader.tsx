import { Link, useMatch } from "react-router-dom";
import styles from "./GameHeader.module.css";

export function GameHeader() {
  const host = useMatch("/host/:roomId/*");
  const player = useMatch("/room/:roomId/*");
  const roomId = host?.params.roomId ?? player?.params.roomId;
  if (!roomId) return null;
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.brand} aria-label="Honji home"><img src="/honji-wordmark.svg" alt="Honji" width="1040" height="425" /></Link>
      <div className={styles.room} aria-label={`Room ${roomId}`}><span className={styles.label}>Room</span><strong className={styles.code}>{roomId}</strong></div>

    </header>
  );
}
