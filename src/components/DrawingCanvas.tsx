import React, {
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";

export interface DrawingCanvasHandle {
  getImageDataUrl: () => string | null;
  clear: () => void;
}

interface DrawingCanvasProps {
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  (
    {
      width = 300,
      height = 300,
      strokeColor = "#000000",
      strokeWidth = 4,
      backgroundColor = "#ffffff",
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const drawingRef = useRef(false);
    const [isReady, setIsReady] = useState(false);

    // Setup canvas context once
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Match the attributes directly
      canvas.width = width;
      canvas.height = height;

      // Fill background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;

      ctxRef.current = ctx;
      setIsReady(true);
    }, [width, height, strokeColor, strokeWidth, backgroundColor]);

    // Expose methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        getImageDataUrl: () => {
          const canvas = canvasRef.current;
          if (!canvas) return null;
          return canvas.toDataURL("image/png");
        },
        clear: () => {
          const ctx = ctxRef.current;
          if (!ctx) return;
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = strokeColor;
          ctx.lineWidth = strokeWidth;
        },
      }),
      [backgroundColor, strokeColor, strokeWidth, width, height]
    );

    const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isReady) return;
      const ctx = ctxRef.current;
      if (!ctx) return;

      const pos = getCanvasPos(e);
      drawingRef.current = true;

      // capture pointer so moves outside still draw
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current || !isReady) return;
      const ctx = ctxRef.current;
      if (!ctx) return;

      const pos = getCanvasPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const endDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          border: "1px solid #ccc",
          touchAction: "none", // important for touch devices
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrawing}
        onPointerLeave={endDrawing}
      />
    );
  }
);

export default DrawingCanvas;
