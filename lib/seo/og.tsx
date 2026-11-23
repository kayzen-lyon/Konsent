import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getTool } from "@/lib/tools/catalog";

/**
 * Images de partage des outils gratuits (Open Graph, Twitter).
 *
 * Une seule mise en page, déclinée par outil : le titre et la question à
 * laquelle il répond. Charte Kayzen (marine, terracotta) et police par
 * défaut du moteur, comme l'image racine : rien n'est téléchargé au rendu.
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/**
 * Emblème Konsent, variante pour fond marine (399 × 320), embarqué en data
 * URL : le moteur de rendu ne fait aucune requête.
 *
 * Lu À LA DEMANDE, jamais au chargement du module. Une page dynamique charge
 * les modules `opengraph-image` pour calculer ses métadonnées (alt, taille) ;
 * une lecture de fichier au niveau du module y faisait échouer le rendu de
 * /contact, /scan et /connexion en production, où le PNG n'était pas embarqué
 * dans la fonction. Le fichier est en outre déclaré dans
 * `outputFileTracingIncludes` (next.config.ts).
 */
let emblemSrc: string | undefined;
export function ogEmblemSrc(): string {
  emblemSrc ??= `data:image/png;base64,${readFileSync(
    join(process.cwd(), "lib/seo/og-embleme.png"),
  ).toString("base64")}`;
  return emblemSrc;
}

const NAVY = "#132944";
const TERRACOTTA = "#B7481F";
const SOFT = "#ffb399";

export interface OgTool {
  title: string;
  question: string;
}

/**
 * L'analyse en lot n'est pas au catalogue des outils libres (elle relance
 * des audits serveur) mais reste gratuite et sans inscription : sa fiche
 * de partage et ses données structurées partent de ces textes.
 */
export const BULK_SCAN_TOOL = {
  slug: "analyse-en-lot",
  title: "Analyse en lot",
  question: "Comment auditer plusieurs sites d'un coup ?",
  description:
    "Analysez jusqu'à 20 sites d'un coup : note, score, écarts critiques, destinataires hors EEE, dans un tableau triable exportable en CSV ou JSON. Rien n'est conservé côté serveur.",
  href: "/analyse-en-lot",
  processing: "serveur",
} as const;

function resolve(tool: string | OgTool): OgTool {
  if (typeof tool !== "string") return tool;
  const found = getTool(tool);
  if (!found) throw new Error(`Outil inconnu pour l'image de partage : ${tool}`);
  return found;
}

/** Texte alternatif de l'image d'un outil. */
export function toolOgAlt(tool: string | OgTool): string {
  const t = resolve(tool);
  return `${t.title} — outil gratuit Konsent. ${t.question}`;
}

/** Image de partage d'un outil, par son identifiant du catalogue ou ses textes. */
export function toolOgImage(tool: string | OgTool): ImageResponse {
  const t = resolve(tool);
  const titleSize = t.title.length > 42 ? 58 : 68;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: NAVY,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ogEmblemSrc()} width={70} height={56} alt="" />
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>KONSENT</div>
          <div
            style={{
              display: "flex",
              marginLeft: 12,
              padding: "8px 18px",
              borderRadius: 9999,
              border: `2px solid ${SOFT}`,
              color: SOFT,
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            Outil gratuit
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: -2.5,
            }}
          >
            {t.title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 36,
              lineHeight: 1.25,
              color: SOFT,
              maxWidth: 1000,
            }}
          >
            {t.question}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.72)" }}>
            Konsent · outil gratuit, sans inscription
          </div>
          <div
            style={{
              display: "flex",
              padding: "14px 30px",
              borderRadius: 9999,
              background: TERRACOTTA,
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            konsent.kayzen-lyon.com
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
