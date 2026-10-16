import type { RefObject } from "react";
import DrawingCanvas, {
  type DrawingCanvasHandle,
} from "../../components/DrawingCanvas/DrawingCanvas";
import type { Round } from "../../../shared/round";
import styles from "../JoinRoom.module.css";
export function PlayerDrawingView({
  round,
  canvasRef,
  isSubmitting,
  submitDrawing,
}: {
  round: Round;
  canvasRef: RefObject<DrawingCanvasHandle>;
  isSubmitting: boolean;
  submitDrawing: () => unknown;
}) {
  return (
    <section>
      <p className={styles.prompt}>{round?.prompt}</p>

      <div className={styles.canvasContainer}>
        <DrawingCanvas
          ref={canvasRef}
          resolutionWidth={500}
          resolutionHeight={500}
          strokeColor="#000000"
          strokeWidth={6}
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.canvasButton}
          onClick={() => canvasRef.current?.undo()}
        >
          Undo
        </button>

        <button
          type="button"
          className={styles.canvasButton}
          onClick={() => canvasRef.current?.clear()}
        >
          Clear
        </button>

        <button
          type="button"
          className={styles.submitButton}
          disabled={isSubmitting}
          onClick={submitDrawing}
        >
          {isSubmitting ? "Submitting…" : "Submit"}
        </button>
      </div>
    </section>
  );
}
