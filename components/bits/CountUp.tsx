"use client";

import { useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useRef } from "react";

/**
 * CountUp — adapté de React Bits (David Haz, licence MIT + Commons Clause).
 * https://github.com/DavidHDev/react-bits
 *
 * Compteur qui monte jusqu'à sa valeur quand il entre dans la fenêtre.
 * Adaptations pour Konsent :
 * - la valeur finale est rendue côté serveur : un robot d'indexation ou un
 *   navigateur sans JavaScript lit le vrai chiffre, jamais une case vide ;
 * - format français (espace fine insécable comme séparateur de milliers) ;
 * - sous mouvement réduit, le chiffre s'affiche directement.
 */
export default function CountUp({
  to,
  from = 0,
  duration = 1.6,
  delay = 0,
  className = "",
}: {
  to: number;
  from?: number;
  /** Durée approximative, en secondes. */
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const motionValue = useMotionValue(from);
  const spring = useSpring(motionValue, {
    damping: 20 + 40 * (1 / duration),
    stiffness: 100 * (1 / duration),
  });
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });

  const format = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

  useEffect(() => {
    if (reduced || !ref.current) return;
    ref.current.textContent = format(from);
  }, [from, reduced]);

  useEffect(() => {
    if (reduced || !inView) return;
    const id = setTimeout(() => motionValue.set(to), delay * 1000);
    return () => clearTimeout(id);
  }, [inView, reduced, motionValue, to, delay]);

  useEffect(() => {
    if (reduced) return;
    return spring.on("change", (latest) => {
      if (ref.current) ref.current.textContent = format(latest);
    });
  }, [spring, reduced]);

  return (
    <span ref={ref} className={className}>
      {format(to)}
    </span>
  );
}
