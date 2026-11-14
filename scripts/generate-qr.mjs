/**
 * Génération des QR codes, à la compilation.
 *
 * Pourquoi pas un service en ligne du type `api.qrserver.com` : le site ne
 * charge AUCUNE ressource externe, et c'est un argument produit avant d'être
 * une préférence technique. Un QR code appelé à un tiers ferait fuiter
 * l'adresse IP de chaque visiteur vers ce tiers, sur un site qui reproche
 * exactement cela aux autres. `check-sovereignty.mjs` et notre propre scanner
 * le relèveraient.
 *
 * Pourquoi pas non plus une dépendance d'exécution : `qrcode` est en
 * devDependencies. Le matriciel est calculé ici, une fois, et figé dans un
 * module TypeScript. La production ne dépend que de `next`, `react` et
 * `react-dom`, comme avant.
 *
 * Le tracé fusionne les modules noirs contigus en un seul segment horizontal.
 * Un `<rect>` par module produirait un SVG de plusieurs centaines de nœuds ;
 * la fusion divise la taille par cinq environ, pour un rendu identique.
 */
import { writeFileSync } from "node:fs";
import QRCode from "qrcode";

const EDITOR = {
  tradeName: "KAYZEN",
  director: "Tarek BELHADJ",
  street: "6 rue Pierre Termier",
  postalCode: "69009",
  city: "Lyon",
  phoneE164: "+33487776861",
  email: "contact@kayzen-lyon.fr",
  productSite: "https://konsent.kayzen-lyon.com",
};

/**
 * Carte de visite encodée DANS le QR code (vCard 3.0) : l'appareil photo du
 * téléphone propose « Ajouter le contact » sans rien télécharger ni ouvrir
 * de page. Version volontairement courte : un QR plus dense se lit mal à
 * l'écran. Doit rester cohérente avec lib/contact/vcard.ts.
 */
const vcardText = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  `N:BELHADJ;Tarek;;;`,
  `FN:${EDITOR.director}`,
  `ORG:${EDITOR.tradeName}`,
  `TEL;TYPE=WORK,VOICE:${EDITOR.phoneE164}`,
  `EMAIL;TYPE=WORK:${EDITOR.email}`,
  `ADR;TYPE=WORK:;;${EDITOR.street};${EDITOR.city};;${EDITOR.postalCode};France`,
  `URL:${EDITOR.productSite}`,
  "END:VCARD",
].join(String.fromCharCode(13, 10));

/**
 * Adresse Maps construite depuis l'adresse postale, par l'API d'URL
 * documentée par Google. Aucun identifiant de lieu n'est nécessaire, donc
 * rien n'est deviné.
 */
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${EDITOR.street}, ${EDITOR.postalCode} ${EDITOR.city}`,
)}`;

/**
 * L'adresse d'avis exige un identifiant de lieu Google (`placeid`) que nous
 * n'avons pas. On ne l'invente pas : la cible reste nulle, la carte affiche
 * un emplacement explicitement en attente, et le QR n'est pas généré.
 * Renseigner `KONSENT_GOOGLE_PLACE_ID` suffit à l'activer.
 */
const placeId = process.env.KONSENT_GOOGLE_PLACE_ID ?? null;
/* Sans identifiant de lieu, même repli que la carte de contact de Nexus :
 * la recherche Google de la fiche KAYZEN, qui ouvre ses avis. */
const reviewsUrl = placeId
  ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`
  : "https://www.google.com/search?q=Kayzen+Lyon+6+rue+Pierre+Termier+avis&hl=fr";

const TARGETS = [
  { key: "site", label: "Site Konsent", url: EDITOR.productSite },
  { key: "maps", label: "Nous situer", url: mapsUrl },
  { key: "reviews", label: "Avis Google", url: reviewsUrl },
  { key: "vcard", label: "Carte de visite", url: vcardText },
];

/** Fusionne les modules noirs contigus d'une ligne en segments horizontaux. */
function toPath(matrix) {
  const { size, data } = matrix;
  const parts = [];

  for (let y = 0; y < size; y += 1) {
    let run = 0;
    for (let x = 0; x <= size; x += 1) {
      const dark = x < size && data[y * size + x] === 1;
      if (dark) {
        run += 1;
        continue;
      }
      if (run > 0) {
        parts.push(`M${x - run} ${y}h${run}v1h-${run}z`);
        run = 0;
      }
    }
  }
  return parts.join("");
}

const generated = [];

for (const target of TARGETS) {
  if (!target.url) {
    generated.push({ ...target, size: 0, path: "" });
    console.log(`  · ${target.key} — non généré : aucune adresse fournie`);
    continue;
  }

  // Niveau de correction M : 15 % du code reste lisible s'il est abîmé.
  // C'est le compromis retenu par la spécification pour l'impression, et il
  // laisse la place d'un logo central sans casser la lecture.
  const matrix = QRCode.create(target.url, { errorCorrectionLevel: "M" }).modules;
  const path = toPath(matrix);

  generated.push({ ...target, size: matrix.size, path });
  console.log(`  ✓ ${target.key} — ${matrix.size}×${matrix.size} modules, ${path.length} octets de tracé`);
}

const out = `// Fichier GÉNÉRÉ par \`npm run build:qr\`. Ne pas modifier à la main.
//
// Les tracés ci-dessous sont figés à la compilation : la production ne
// dépend d'aucune bibliothèque de génération, et aucun appel réseau n'est
// émis pour afficher un QR code.
//
// \`size\` vaut 0 lorsqu'aucune adresse n'était disponible. Le composant
// affiche alors un emplacement en attente plutôt qu'un code illisible.

export interface GeneratedQr {
  key: string;
  label: string;
  url: string | null;
  /** Nombre de modules par côté. 0 si non généré. */
  size: number;
  /** Tracé SVG, en coordonnées de modules. */
  path: string;
}

export const QR_CODES: readonly GeneratedQr[] = ${JSON.stringify(generated, null, 2)} as const;

export function getQr(key: string): GeneratedQr | undefined {
  return QR_CODES.find((q) => q.key === key);
}
`;

writeFileSync(new URL("../lib/contact/qr-generated.ts", import.meta.url), out, "utf8");
console.log("\nÉcrit dans lib/contact/qr-generated.ts");
