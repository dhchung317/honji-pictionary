import styles from "../Results.module.css";
type Props = {
  replay: () => unknown;
  home: () => unknown;
  replayBusy: boolean;
  homeBusy: boolean;
  replayError: Error | null;
  homeError: Error | null;
};
export function HostReplayActions({
  replay,
  home,
  replayBusy,
  homeBusy,
  replayError,
  homeError,
}: Props) {
  return (
    <div className={styles.replayActions}>
      <button
        type="button"
        onClick={() => void replay()}
        disabled={replayBusy || homeBusy}
      >
        {replayBusy ? "Opening lobby…" : "Play another round"}
      </button>
      <button
        type="button"
        onClick={() => void home()}
        disabled={replayBusy || homeBusy}
      >
        {homeBusy ? "Closing room…" : "Back to home"}
      </button>
      {(replayError || homeError) && (
        <p role="alert">{(replayError || homeError)?.message}</p>
      )}
    </div>
  );
}
