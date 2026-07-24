"use client";

import { useCallback, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  gravity: number;
  opacity: number;
  shape: "rect" | "circle" | "star";
}

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);

  const fire = useCallback((originX?: number, originY?: number, count = 80) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cx = originX ?? canvas.width / 2;
    const cy = originY ?? canvas.height * 0.4;

    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 10;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 4 + Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        gravity: 0.15,
        opacity: 1,
        shape: (["rect", "circle", "star"] as const)[Math.floor(Math.random() * 3)],
      });
    }

    let frame = 0;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.008;

        if (p.opacity <= 0) continue;
        alive = true;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Star
          const spikes = 5;
          const outerRadius = p.size / 2;
          const innerRadius = outerRadius * 0.4;
          ctx.beginPath();
          for (let s = 0; s < spikes * 2; s++) {
            const radius = s % 2 === 0 ? outerRadius : innerRadius;
            const a = (s * Math.PI) / spikes - Math.PI / 2;
            if (s === 0) ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
            else ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
          }
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      frame++;
      if (alive && frame < 180) {
        animRef.current = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  return { canvasRef, fire, stop };
}
