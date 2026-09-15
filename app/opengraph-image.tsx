import { ImageResponse } from "next/og";

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
          <svg width="56" height="56" viewBox="0 0 32 32" fill="none">
            <path
              d="M16 3.2 27 7.6v8.2c0 6.4-4.3 11.6-11 14.2-6.7-2.6-11-7.8-11-14.2V7.6L16 3.2Z"
              fill="#b74831"
              opacity="0.35"
            />
            <path
              d="M16 3.2 27 7.6v8.2c0 6.4-4.3 11.6-11 14.2-6.7-2.6-11-7.8-11-14.2V7.6L16 3.2Z"
              stroke="#ffb399"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="m11.4 16.2 3.2 3.3 6-6.4"
              stroke="#ffb399"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>KONSENT</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2.5 }}>
            Votre bandeau gère le consentement.
          </div>
          <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2.5, color: "#ffb399" }}>
            Il ne vérifie pas ce qui passe derrière.
          </div>
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
