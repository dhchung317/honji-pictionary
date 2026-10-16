import type { Player } from "../../../shared/player";
import type { Round } from "../../../shared/round";
import { PlayerAvatar } from "../../components/PlayerAvatar/PlayerAvatar";
import styles from "../HostRoom.module.css";

export function HostDrawingView({
  round,
  players,
  secondsLeft,
}: {
  round: Round;
  players: Player[];
  secondsLeft: number | null;
}) {
  return (
    <div className={styles.roundContent}>
      <div className={styles.roundHeading}>
        <p className={styles.promptLabel}>Draw</p>
        {secondsLeft !== null && (
          <div
            className={styles.timer}
            role="timer"
            aria-label="Drawing time remaining"
          >
            <span className={styles.timerLabel}>Time left</span>
            <span>
              {Math.floor(secondsLeft / 60)}:
              {String(secondsLeft % 60).padStart(2, "0")}
            </span>
          </div>
        )}
      </div>
      <p className={styles.prompt}>{round.prompt}</p>

      <div className={styles.roundPlayers}>
        {players.map((player) => (
          <div key={player.id} className={styles.roundPlayer}>
            <div className={styles.roundAvatar}>
              <PlayerAvatar player={player} />
            </div>

            <div className={styles.roundPlayerDetails}>
              <span className={styles.playerName}>{player.name}</span>
              <span className={styles.playerStatus}>Drawing</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
