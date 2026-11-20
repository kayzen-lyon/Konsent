"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toolHref, type FreeTool } from "@/lib/tools/catalog";
import { CAPTURES } from "./captures";

/**
 * Outils en scène fixe : la capture de l'outil en cours reste à l'écran
 * pendant que la liste défile à côté.
 *
 * Même contenu que les cartes actuelles de l'accueil : lieu du traitement,
 * titre, question, description, lien d'ouverture. Sous 900 px la scène
 * disparaît et chaque outil porte sa propre capture.
 */
const HOST = "konsent.kayzen-lyon.com";

/** Une capture manquante est une erreur de l'aperçu, pas un cas à masquer. */
function capture(slug: string) {
  const image = CAPTURES[slug];
  if (!image) throw new Error(`Capture manquante : ${slug}`);
  return image;
}

const processing = (tool: FreeTool) =>
  tool.processing === "navigateur" ? "Dans votre navigateur" : "Sur nos serveurs, à Paris";

export function SceneOutils({ tools }: { tools: FreeTool[] }) {
  const [activeSlug, setActiveSlug] = useState(tools[0]?.slug ?? "");
  const listRef = useRef<HTMLOListElement>(null);
  const active = tools.find((t) => t.slug === activeSlug) ?? tools[0];

  /* L'outil actif est celui dont la ligne est la plus proche du milieu de
     l'écran, mesuré à chaque défilement. Le survol et le focus le
     sélectionnent aussi. Le défilement reste natif. */
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const list = listRef.current;
      if (!list) return;
      const bounds = list.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
      const mid = window.innerHeight * 0.5;
      let best = "";
      let bestDistance = Infinity;
      list.querySelectorAll<HTMLElement>("[data-outil]").forEach((el) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDistance) {
          bestDistance = d;
          best = el.dataset.outil ?? "";
        }
      });
      if (best) setActiveSlug(best);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  if (!active) return null;

  return (
    <div className="imm-scene">
      <div className="imm-scene-fixe">
        <div className="imm-cadre">
          <div className="imm-navigateur" aria-hidden="true">
            <i />
            <i />
            <i />
            <span>
              {HOST}
              {toolHref(active)}
            </span>
          </div>
          {/* Les captures sont toutes en place et empilées : en changer est
              immédiat, sans attendre un téléchargement. Seule la capture en
              cours est exposée aux technologies d'assistance. */}
          <div className="imm-scene-pile">
            {tools.map((tool) => {
              const on = tool.slug === active.slug;
              return (
                <Image
                  key={tool.slug}
                  src={capture(tool.slug)}
                  alt={on ? `Capture d'écran de l'outil « ${tool.title} »` : ""}
                  aria-hidden={on ? undefined : true}
                  width={960}
                  height={540}
                  unoptimized
                  loading="lazy"
                  className={on ? "imm-scene-image imm-scene-image--active" : "imm-scene-image"}
                />
              );
            })}
          </div>
        </div>
        <p className="imm-scene-pied">
          <b>{String(tools.indexOf(active) + 1).padStart(2, "0")}</b> /{" "}
          {String(tools.length).padStart(2, "0")} · {active.title}
        </p>
      </div>

      <ol className="imm-scene-liste" ref={listRef}>
        {tools.map((tool) => (
          <li
            key={tool.slug}
            data-outil={tool.slug}
            className={tool.slug === active.slug ? "imm-outil imm-outil--actif" : "imm-outil"}
            onMouseEnter={() => setActiveSlug(tool.slug)}
            onFocus={() => setActiveSlug(tool.slug)}
          >
            <Image
              src={capture(tool.slug)}
              alt=""
              width={960}
              height={540}
              unoptimized
              loading="lazy"
              className="imm-outil-vignette"
            />
            <p className="tech text-[10px] text-muted">{processing(tool)}</p>
            <h3 className="imm-outil-titre">{tool.title}</h3>
            <p className="text-sm italic leading-relaxed text-ink-2/80">« {tool.question} »</p>
            <p className="text-sm leading-relaxed text-muted">{tool.description}</p>
            <Link href={toolHref(tool)} className="font-display inline-flex items-center gap-1.5 text-sm font-bold text-flame">
              Ouvrir l&apos;outil<span className="sr-only"> : {tool.title}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Défilement : deux rangées de captures en sens opposés, sur toute la
 * largeur. Pause au survol et au focus ; sans animation, les rangées se
 * parcourent au doigt ou à la barre de défilement. La seconde copie de
 * chaque rangée ne sert qu'à boucler : elle est inerte.
 */
export function DefileOutils({ tools }: { tools: FreeTool[] }) {
  const half = Math.ceil(tools.length / 2);
  const rows = [tools.slice(0, half), tools.slice(half)];

  const card = (tool: FreeTool, copy: boolean) => (
    <li key={`${tool.slug}-${copy ? "copie" : "original"}`} className="imm-defile-carte" aria-hidden={copy || undefined}>
      <Link href={toolHref(tool)} tabIndex={copy ? -1 : undefined}>
        <Image src={capture(tool.slug)} alt="" width={960} height={540} unoptimized loading="lazy" />
        <span className="imm-defile-corps">
          <span className="tech text-[10px] text-muted">{processing(tool)}</span>
          <span className="imm-defile-nom">{tool.title}</span>
          <span className="font-display text-sm font-bold text-flame">
            Ouvrir l&apos;outil <span aria-hidden="true">→</span>
          </span>
        </span>
      </Link>
    </li>
  );

  return (
    <div className="imm-defile">
      {rows.map((row, i) => (
        <div key={i} className={i % 2 ? "imm-defile-rangee imm-defile-rangee--retour" : "imm-defile-rangee"}>
          <ul className="imm-defile-piste">
            {row.map((tool) => card(tool, false))}
            {row.map((tool) => card(tool, true))}
          </ul>
        </div>
      ))}
    </div>
  );
}
