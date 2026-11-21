"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { VIGNETTES } from "./captures";

/**
 * Mur d'écrans en perspective, coupé net en biais.
 *
 * Fait des vraies captures des pages de Konsent (vignettes de 480 px).
 * Purement décoratif, donc masqué aux technologies d'assistance, et monté au
 * repos du navigateur : le titre de la page reste l'élément le plus lourd du
 * premier affichage. Le mouvement est en CSS seul ; il se coupe avec
 * « réduire les animations » (système ou pied de page) et par le bouton de
 * pause (RGAA 13.8 : un mouvement de plus de 5 s doit pouvoir être arrêté).
 */
const COLUMNS = 5;
const SIZE = Math.ceil(VIGNETTES.length / COLUMNS);
const CHUNKS = Array.from({ length: COLUMNS }, (_, i) => VIGNETTES.slice(i * SIZE, i * SIZE + SIZE));

export function Mur() {
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // Sous 900 px le mur est masqué : ne pas le monter évite de télécharger
    // ses vignettes pour rien.
    if (!window.matchMedia("(min-width: 901px)").matches) return;
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setReady(true));
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setReady(true), 200);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className={paused ? "imm-mur imm-mur--pause" : "imm-mur"}>
      {ready ? (
        <div className="imm-mur-scene" aria-hidden="true">
          <div className="imm-mur-grille">
            {CHUNKS.map((col, i) => (
              <div key={i} className="imm-mur-col">
                {/* Chaque colonne est répétée pour couvrir toute la hauteur. */}
                {[...col, ...col].map((img, j) => (
                  <Image key={j} src={img} alt="" width={480} height={270} unoptimized loading="eager" />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <button type="button" className="imm-mur-bouton" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
        {paused ? "Relancer le mur" : "Mettre le mur en pause"}
      </button>
    </div>
  );
}
