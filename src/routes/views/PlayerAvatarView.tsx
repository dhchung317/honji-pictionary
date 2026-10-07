import type { RefObject } from "react";
import DrawingCanvas, {
  type DrawingCanvasHandle,
} from "../../components/DrawingCanvas/DrawingCanvas";
import type { Room } from "../../../shared/room";
import styles from "../PlayerLobby.module.css";
type Props = {
  room: Room;
  startSeconds: number | null;
  avatarCanvasRef: RefObject<DrawingCanvasHandle>;
  submitAvatar: () => unknown;
  toggleReady: () => unknown;
  isSubmittingAvatar: boolean;
  hasAvatar: boolean;
  isStarting: boolean;
  readyBusy: boolean;
  isReady: boolean;
  readyError: Error | null;
  avatarError: Error | null;
};
export function PlayerAvatarView({
  room,
  startSeconds,
  avatarCanvasRef,
  submitAvatar,
  toggleReady,
  isSubmittingAvatar,
  hasAvatar,
  isStarting,
  readyBusy,
  isReady,
  readyError,
  avatarError,
}: Props) {
  return (
    <div className={styles.lobby}>
      <section className={styles.avatarSection}>
        <div className={styles.avatarHeading}>
          <p className={styles.waiting}>
            {isStarting
              ? "Starting round…"
              : room.autoStartAt
              ? `Everyone’s ready! Starting in ${Math.max(1, startSeconds ?? 5)}…`
              : "The round starts five seconds after everyone is ready."}
          </p>
          <h2>Draw your avatar</h2>

          <p>Draw yourself while you wait for the game to start.</p>
        </div>

        <div className={styles.canvasContainer}>
          <DrawingCanvas
            ref={avatarCanvasRef}
            resolutionWidth={500}
            resolutionHeight={500}
            strokeColor="#000000"
            strokeWidth={8}
          />
          <div className={styles.actionsBox}>
            <div className={styles.actions}>
              <button
                className={styles.submitButton}
                type="button"
                onClick={submitAvatar}
                disabled={isStarting || isSubmittingAvatar}
              >
                {isSubmittingAvatar
                  ? "Saving..."
                  : hasAvatar
                    ? "Update"
                    : "Submit"}
              </button>

              <button
                className={styles.clearButton}
                type="button"
                onClick={() => avatarCanvasRef.current?.clear()}
              >
                Clear
              </button>
            </div>
            <button
              className={styles.readyButton}
              type="button"
              aria-pressed={isReady}
              onClick={() => void toggleReady()}
              disabled={isStarting || readyBusy || isSubmittingAvatar}
            >
              {isStarting
                ? "Starting…"
                : readyBusy
                  ? "Updating…"
                  : isReady ? "Unready" : "Ready"}
            </button>
          </div>
        </div>

        {readyError && (
          <p className={styles.error} role="alert">
            {readyError.message}
          </p>
        )}
        {avatarError && <p className={styles.error}>{avatarError.message}</p>}
      </section>
    </div>
  );
}
