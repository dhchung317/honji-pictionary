import {
  PointerEvent as ReactPointerEvent,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { Point, Stroke } from "./drawingTypes";

const MAX_UNDOS = 3;

interface UseDrawingCanvasOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  backgroundColor: string;
}

export function useDrawingCanvas({
  canvasRef,
  width,
  height,
  strokeColor,
  strokeWidth,
  backgroundColor,
}: UseDrawingCanvasOptions) {
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const strokesRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);

  const undoCountRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);

  // Initialize the canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctxRef.current = ctx;

    clearCanvas();
  }, [canvasRef, width, height, backgroundColor]);

  // Convert screen coordinates into internal canvas coordinates.
  const getCanvasPosition = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current;

      if (!canvas) {
        return { x: 0, y: 0 };
      }

      const rect = canvas.getBoundingClientRect();

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    },
    [canvasRef],
  );

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    if (!canvas || !ctx) return;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawStroke(stroke: Stroke) {
    const ctx = ctxRef.current;

    if (!ctx || stroke.points.length === 0) return;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;

    ctx.beginPath();

    const firstPoint = stroke.points[0];

    ctx.moveTo(firstPoint.x, firstPoint.y);

    for (const point of stroke.points.slice(1)) {
      ctx.lineTo(point.x, point.y);
    }

    ctx.stroke();
  }

  function redrawCanvas() {
    clearCanvas();

    for (const stroke of strokesRef.current) {
      drawStroke(stroke);
    }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    if (!canvas || !ctx) return;

    canvas.setPointerCapture(event.pointerId);

    const point = getCanvasPosition(event);

    const stroke: Stroke = {
      color: strokeColor,
      width: strokeWidth,
      points: [point],
    };

    activeStrokeRef.current = stroke;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const ctx = ctxRef.current;
    const stroke = activeStrokeRef.current;

    if (!ctx || !stroke) return;

    // For mouse/pen input, make sure the pointer is actually

    // still pressed before continuing the stroke.
    if (event.pointerType !== "touch" && event.buttons === 0) {
      handlePointerEnd(event);

      return;
    }

    const point = getCanvasPosition(event);

    stroke.points.push(point);

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const stroke = activeStrokeRef.current;

    if (!stroke) return;

    strokesRef.current.push(stroke);
    activeStrokeRef.current = null;

    // A new stroke starts a fresh undo sequence.
    undoCountRef.current = 0;

    setCanUndo(true);

    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const undo = () => {
    if (undoCountRef.current >= MAX_UNDOS) return;
    if (strokesRef.current.length === 0) return;

    strokesRef.current.pop();
    undoCountRef.current += 1;

    redrawCanvas();

    setCanUndo(
      strokesRef.current.length > 0 && undoCountRef.current < MAX_UNDOS,
    );
  };

  const clear = () => {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    undoCountRef.current = 0;

    clearCanvas();
    setCanUndo(false);
  };

  return {
    clear,
    undo,
    canUndo,

    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
  };
}
