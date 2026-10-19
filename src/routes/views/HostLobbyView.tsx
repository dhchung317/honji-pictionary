import type { Player } from "../../../shared/player";
import type { Room } from "../../../shared/room";
import { PlayerAvatar } from "../../components/PlayerAvatar/PlayerAvatar";
import styles from "../HostRoom.module.css";

type Props = {
  room: Room;
  players: Player[];
  startSeconds: number | null;
  autoStartError: string | null;
  isStarting: boolean;
  startError: Error | null;
  handleStartRound: () => unknown;
};
export function HostLobbyView({
  room,
  players,
  startSeconds,
  autoStartError,
  isStarting,
  startError,
  handleStartRound,
}: Props) {
  const baseUrl = window.location.hostname;
  return (
    <>
      <div className={styles.lobbyPlayers}>
        {players.map((player, index) => (
          <div
            key={player.id}
            className={`${styles.lobbyPlayer} ${
              styles[`playerSlot${index + 1}`] ?? ""
            }`}
          >
            <PlayerAvatar player={player} />
            <span className={styles.playerName}>{player.name}</span>
            <span className={styles.readyStatus}>
              {player.ready ? "Ready ✓" : "Not ready"}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.lobbyCenter}>
        <div className={styles.logoSpace}>
          <img width={"100%"} src={"/honji.png"} alt="Honji" />
        </div>

        <h2 className={styles.stageTitle}>
          {room.autoStartAt
            ? `Starting in ${Math.max(1, startSeconds ?? 5)}…`
            : "Waiting for players"}
        </h2>
      </div>

      <div className={styles.lobbyActions}>
        <p className={styles.playerCount}>
          {players.length} {players.length === 1 ? "player" : "players"} joined
        </p>
        <p className={styles.readyCount}>
          {players.filter((player) => player.ready).length} / {players.length}{" "}
          ready
        </p>
        {autoStartError && (
          <p role="alert" className={styles.error}>
            {autoStartError} Use Start Round to retry.
          </p>
        )}
        <div className={styles.joinInstructions}>
          <p className={styles.stageMessage}>
            Enter{" "}
            <strong className={styles.joinRoomCode}>{room.id}</strong>
          </p>
          <p className={styles.stageMessage}>
            at <strong className={styles.joinUrl}>{baseUrl}</strong> to play.
          </p>
        </div>
        <button
          className={styles.startButton}
          onClick={handleStartRound}
          disabled={
            isStarting ||
            players.length === 0 ||
            Boolean(room.autoStartAt && !autoStartError)
          }
        >
          {isStarting ? "Starting…" : "Start Round"}
        </button>

        {startError && <p className={styles.error}>{startError.message}</p>}
      </div>
    </>
  );
}
