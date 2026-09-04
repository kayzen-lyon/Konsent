"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";

/**
 * FadeContent — adapté de React Bits (David Haz, licence MIT + Commons Clause).
 * https://github.com/DavidHDev/react-bits
 *
 * Apparition en fondu quand le bloc entre dans la fenêtre. La version
 * React Bits repose sur GSAP et ScrollTrigger ; celle-ci utilise
 * `whileInView` de `motion`, déjà chargé pour les autres composants, ce qui
 * évite une seconde bibliothèque d'animation. Le bloc n'est jamais masqué
 * côté serveur : sans JavaScript, tout est visible.
 */
export default function FadeContent({
  children,
  className = "",
  blur = false,
  duration = 700,
  delay = 0,
  threshold = 0.15,
  y = 16,
}: {
  children: ReactNode;
  className?: string;
  blur?: boolean;
  /** Millisecondes. */
  duration?: number;
  /** Millisecondes. */
  delay?: number;
  threshold?: number;
  /** Décalage vertical de départ, en pixels. */
  y?: number;
}) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y, filter: blur ? "blur(8px)" : "blur(0px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: threshold }}
      transition={{ duration: duration / 1000, delay: delay / 1000, ease: "easeOut" }}
    >
      {children}
    </m.div>
  );
}
