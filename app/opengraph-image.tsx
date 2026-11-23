import { ImageResponse } from "next/og";
import { ogEmblemSrc } from "@/lib/seo/og";

/**
 * Image de partage (Open Graph, Twitter), rendue au build.
 *
 * Générée ici plutôt que déposée en PNG : elle suit les jetons du système
 * Kayzen Web (marine, terracotta) et reste synchronisée avec le texte du
 * site. Aucune police externe : la police par défaut du moteur suffit pour
 * une image de 1200 × 630.
 */
export const alt = "Konsent — l'audit RGPD que votre bandeau ne fait pas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
          background: "#1f3b61",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ogEmblemSrc()} width={75} height={60} alt="" />
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>KONSENT</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 720 }}>
            <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2 }}>
              Votre bandeau gère le consentement.
            </div>
            <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2, color: "#ffb399" }}>
              Il ne vérifie pas ce qui passe derrière.
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ogEmblemSrc()} width={299} height={240} alt="" />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 26, color: "rgba(255,255,255,0.7)" }}>
            Audit RGPD, cookies et traceurs — indépendant de toute CMP
          </div>
          <div
            style={{
              display: "flex",
              padding: "14px 30px",
              borderRadius: 9999,
              flexShrink: 0,
              whiteSpace: "nowrap",
              background: "#b74831",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            konsent.kayzen-lyon.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
