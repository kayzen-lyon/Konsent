"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Magnet — adapté de React Bits (David Haz, licence MIT + Commons Clause).
 * https://github.com/DavidHDev/react-bits
 *
 * L'élément s'attire vers le pointeur qui s'en approche. Adaptations :
 * inactif sur écran tactile et sous mouvement réduit (les deux sont lus sur
 * `matchMedia`), et l'écouteur global n'est posé qu'une fois monté.
 */
export default function Magnet({
  children,
  padding = 60,
  magnetStrength = 3,
  className = "",
}: {
  children: ReactNode;
  padding?: number;
  magnetStrength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    const onMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const { left, top, width, height } = ref.current.getBoundingClientRect();
      const cx = left + width / 2;
      const cy = top + height / 2;
      if (Math.abs(cx - e.clientX) < width / 2 + padding && Math.abs(cy - e.clientY) < height / 2 + padding) {
        setActive(true);
        setPos({ x: (e.clientX - cx) / magnetStrength, y: (e.clientY - cy) / magnetStrength });
      } else if (active) {
        setActive(false);
        setPos({ x: 0, y: 0 });
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [padding, magnetStrength, active]);

  return (
    <div ref={ref} className={className} style={{ position: "relative", display: "inline-block" }}>
      <div
        style={{
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
          transition: active ? "transform 0.3s ease-out" : "transform 0.5s ease-in-out",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
