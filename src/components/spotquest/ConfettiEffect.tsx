"use client";

import { useEffect } from "react";

interface ConfettiEffectProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function ConfettiEffect({ canvasRef }: ConfettiEffectProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [canvasRef]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[110] pointer-events-none"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
