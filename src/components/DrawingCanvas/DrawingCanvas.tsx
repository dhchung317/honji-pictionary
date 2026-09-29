import { forwardRef, useImperativeHandle, useRef } from "react";

import { useDrawingCanvas } from "./useDrawingCanvas";
import styles from "./DrawingCanvas.module.css";

export interface DrawingCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
  clear: () => void;
  undo: () => void;
}

interface DrawingCanvasProps {
  resolutionWidth?: number;
  resolutionHeight?: number;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  (
    {
      resolutionWidth: width = 600,
      resolutionHeight: height = 600,
      strokeColor = "#000000",
      strokeWidth = 4,
      backgroundColor = "#ffffff",
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const {
      clear,
      undo,
      handlePointerDown,
      handlePointerMove,
      handlePointerEnd,
    } = useDrawingCanvas({
      canvasRef,
      width,
      height,
      strokeColor,
      strokeWidth,
      backgroundColor,
    });

    useImperativeHandle(
      ref,
      () => ({
        getCanvas: () => canvasRef.current,
        clear,
        undo,
      }),
      [clear, undo],
    );

    return (
      <div className={styles.container}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          width={width}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
        />
      </div>
    );
  },
);

DrawingCanvas.displayName = "DrawingCanvas";

export default DrawingCanvas;
