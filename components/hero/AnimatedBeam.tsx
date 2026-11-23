"use client";

import { m } from "motion/react";
import { type RefObject, useEffect, useId, useState } from "react";

/**
 * Faisceau lumineux entre deux éléments.
 *
 * Adapté de « Animated Beam » (Magic UI, dillionverma, licence MIT), depuis
 * https://21st.dev/@dillionverma/components/animated-beam. Adaptations : courbe
 * de Bézier, deux passages puis arrêt (RGAA 13.8 : pas de boucle), trait
 * immobile si le visiteur limite les animations.
 */
export function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  color,
  active,
  still,
  delay = 0,
}: {
  containerRef: RefObject<HTMLElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  color: string;
  active: boolean;
  still: boolean;
  delay?: number;
}) {
  const id = useId();
  const [geo, setGeo] = useState({ d: "", w: 0, h: 0, x1: 0, x2: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      const from = fromRef.current?.getBoundingClientRect();
      const to = toRef.current?.getBoundingClientRect();
      if (!from || !to) return;
      const box = container.getBoundingClientRect();
      // Du bord droit du départ au bord gauche de l'arrivée.
      const x1 = from.right - box.left;
      const y1 = from.top - box.top + from.height / 2;
      const x2 = to.left - box.left;
      const y2 = to.top - box.top + to.height / 2;
      const mid = (x1 + x2) / 2;
      setGeo({
        d: `M ${x1},${y1} C ${mid},${y1} ${mid},${y2} ${x2},${y2}`,
        w: box.width,
        h: box.height,
        x1,
        x2,
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(container);
    update();
    return () => observer.disconnect();
  }, [containerRef, fromRef, toRef]);

  const span = geo.x2 - geo.x1;
  return (
    <svg
      aria-hidden="true"
      fill="none"
      width={geo.w}
      height={geo.h}
      viewBox={`0 0 ${geo.w} ${geo.h}`}
      className="pointer-events-none absolute left-0 top-0"
    >
      <path
        d={geo.d}
        stroke={active ? color : "var(--color-line-2)"}
        strokeOpacity={0.55}
        strokeWidth="2"
        strokeDasharray={active ? undefined : "2 6"}
        strokeLinecap="round"
      />
      {active && !still && geo.w > 0 ? (
        <>
          <path d={geo.d} stroke={`url(#${id})`} strokeWidth="4" strokeLinecap="round" />
          <defs>
            <m.linearGradient
              id={id}
              gradientUnits="userSpaceOnUse"
              y1="0"
              y2="0"
              initial={{ x1: geo.x1 - span * 0.4, x2: geo.x1 }}
              animate={{ x1: geo.x2, x2: geo.x2 + span * 0.4 }}
              transition={{ duration: 1.4, delay, ease: [0.16, 1, 0.3, 1], repeat: 1 }}
            >
              <stop stopColor={color} stopOpacity="0" />
              <stop offset="50%" stopColor={color} />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </m.linearGradient>
          </defs>
        </>
      ) : null}
    </svg>
  );
}
