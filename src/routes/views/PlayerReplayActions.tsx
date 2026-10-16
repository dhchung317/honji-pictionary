import styles from "../PlayerResults.module.css";
type Props = {
  replay: () => void;
  leave: () => void;
  replayBusy: boolean;
  leaveBusy: boolean;
  replaying: boolean;
  replayDisabled: boolean;
  error: Error | null;
  connectionError: Error | null;
  closed: boolean;
  missedRound: boolean;
};
export function PlayerReplayActions({
  replay,
  leave,
  replayBusy,
  leaveBusy,
  replaying,
  replayDisabled,
  error,
  connectionError,
  closed,
  missedRound,
}: Props) {
  return (
    <div className={styles.replayActions}>
      <button type="button" onClick={replay} disabled={replayDisabled}>
        {replaying
          ? "Waiting for the host…"
          : replayBusy
            ? "Joining…"
            : "Play again"}
      </button>
      <button type="button" onClick={leave} disabled={replayBusy || leaveBusy}>
        {leaveBusy ? "Leaving…" : "Leave room"}
      </button>
      {error && <p role="alert">{error.message}</p>}
      {connectionError && (
        <p role="status">
          Connection interrupted. Reconnecting… Room status may be out of date.
        </p>
      )}
      {closed ? (
        <p role="status">The host has closed this room.</p>
      ) : (
        missedRound && (
          <p role="status">
            This round has started without you. Return home to join a future
            lobby.
          </p>
        )
      )}
    </div>
  );
}
