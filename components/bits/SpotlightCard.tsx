"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * SpotlightCard — adapté de React Bits (David Haz, licence MIT + Commons Clause).
 * https://github.com/DavidHDev/react-bits
 *
 * Halo qui suit le pointeur sur la carte. Aucune dépendance : deux états
 * React et un dégradé radial. Adapté au thème clair Kayzen (surface blanche,
 * bordure `line`, halo terracotta à faible opacité) ; le halo sert aussi
 * d'indicateur de focus quand la carte contient un lien.
 */
export default function SpotlightCard({
  children,
  className = "",
  as: Tag = "div",
  spotlightColor = "rgba(183, 72, 49, 0.14)",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "li";
  spotlightColor?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const track = (e: React.MouseEvent<HTMLElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      onMouseMove={track}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      onFocus={() => setOpacity(1)}
      onBlur={() => setOpacity(0)}
      className={`relative overflow-hidden ${className}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-in-out"
        style={{
          opacity,
          background: `radial-gradient(360px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 70%)`,
        }}
      />
      <span className="relative block">{children}</span>
    </Tag>
  );
}
