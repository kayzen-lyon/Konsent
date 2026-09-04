"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

/**
 * Socle des animations React Bits.
 *
 * `LazyMotion` ne charge que le sous-ensemble `domAnimation` de la
 * bibliothèque `motion` (une quinzaine de kilo-octets compressés) ; les
 * composants utilisent `m.*` plutôt que `motion.*`, ce qui interdit de
 * charger le paquet complet par inadvertance.
 *
 * `reducedMotion="user"` : dès que le système demande un mouvement réduit,
 * chaque animation est remplacée par un changement d'état instantané. Le
 * critère RGAA 13.8 est ainsi respecté au même endroit que la règle CSS
 * `prefers-reduced-motion` de globals.css.
 *
 * Tout est exécuté et servi depuis ce domaine : aucune requête tierce.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
