"use client";

import { m, useReducedMotion, type Transition } from "motion/react";
import { createElement, useEffect, useMemo, useRef, useState } from "react";

/**
 * BlurText — adapté de React Bits (David Haz, licence MIT + Commons Clause).
 * https://github.com/DavidHDev/react-bits
 *
 * Révélation mot à mot, du flou au net. Adaptations pour Konsent :
 * - rendu dans l'élément de titre voulu (`as`), pas dans un <p> imposé ;
 * - le texte complet est porté par `aria-label` et les fragments sont
 *   masqués aux lecteurs d'écran, qui liraient sinon un mot par nœud ;
 * - `highlight` souligne une portion du texte avec la classe maison ;
 * - sous mouvement réduit, le texte est rendu tel quel, sans transition.
 */
type BlurTextProps = {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  /** Sous-chaîne du texte à souligner. */
  highlight?: string;
  highlightClassName?: string;
  delay?: number;
  direction?: "top" | "bottom";
  threshold?: number;
  stepDuration?: number;
};

export default function BlurText({
  text,
  as = "p",
  className = "",
  highlight,
  highlightClassName = "underline-flame",
  delay = 90,
  direction = "top",
  threshold = 0.1,
  stepDuration = 0.3,
}: BlurTextProps) {
  const reduced = useReducedMotion();
  const words = useMemo(() => text.split(" "), [text]);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  const highlighted = useMemo(() => {
    if (!highlight) return new Set<number>();
    const start = text.indexOf(highlight);
    if (start < 0) return new Set<number>();
    const end = start + highlight.length;
    const set = new Set<number>();
    let cursor = 0;
    words.forEach((w, i) => {
      const wStart = cursor;
      const wEnd = cursor + w.length;
      if (wStart >= start && wEnd <= end) set.add(i);
      cursor = wEnd + 1;
    });
    return set;
  }, [text, highlight, words]);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  const from = direction === "top" ? { filter: "blur(10px)", opacity: 0, y: -24 } : { filter: "blur(10px)", opacity: 0, y: 24 };
  const to = {
    filter: ["blur(10px)", "blur(4px)", "blur(0px)"],
    opacity: [0, 0.6, 1],
    y: [direction === "top" ? -24 : 24, direction === "top" ? 4 : -4, 0],
  };

  if (reduced) {
    return createElement(
      as,
      { className },
      words.map((w, i) => (
        <span key={i} className={highlighted.has(i) ? highlightClassName : undefined}>
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      )),
    );
  }

  return createElement(
    as,
    { ref, className, "aria-label": text },
    words.map((w, i) => {
      const transition: Transition = {
        duration: stepDuration * 2,
        times: [0, 0.5, 1],
        delay: (i * delay) / 1000,
        ease: "easeOut",
      };
      return (
        <m.span
          key={i}
          aria-hidden="true"
          initial={from}
          animate={inView ? to : from}
          transition={transition}
          className={highlighted.has(i) ? highlightClassName : undefined}
          style={{ display: "inline-block", willChange: "transform, filter, opacity" }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </m.span>
      );
    }),
  );
}
