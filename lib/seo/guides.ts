import { TRACKERS, getTrackerBySlug } from "../trackers/db";
import type { TrackerEntity } from "../trackers/types";
import { COOKIES } from "./cookies";

/**
 * Guides de blocage, un par service.
 *
 * Requête visée : « bloquer Hotjar avant consentement », « supprimer Google
 * Fonts RGPD ». Intention transactionnelle claire, et le lecteur qui atterrit
 * ici est exactement celui à qui l'audit s'adresse.
 *
 * Les extraits de code sont dérivés de la catégorie du service : ce sont de
 * vraies solutions, pas du remplissage.
 */

export interface Snippet {
  label: string;
  language: string;
  code: string;
  note?: string;
}

export interface Guide {
  slug: string;
  tracker: TrackerEntity;
  title: string;
  metaDescription: string;
  /** Pourquoi ce service pose question, en langage dirigeant. */
  why: readonly string[];
  /** Étapes de correction, ordonnées. */
  steps: readonly string[];
  snippets: readonly Snippet[];
  /** Identifiants de règles du référentiel que ce service peut déclencher. */
  relatedRules: readonly string[];
}

const CONSENT_MODE_SNIPPET: Snippet = {
  label: "État de consentement par défaut, avant tout script Google",
  language: "html",
  code: `<!-- À placer AVANT le chargement de gtag.js ou du conteneur GTM -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 2000
  });
</script>`,
  note: "Les quatre premiers signaux doivent être « denied ». Sans cet appel préalable, les outils Google partent du principe que le consentement est acquis.",
};

const CONSENT_UPDATE_SNIPPET: Snippet = {
  label: "Mise à jour au moment du choix de l'utilisateur",
  language: "javascript",
  code: `// À appeler quand le visiteur valide son choix dans votre bandeau.
function appliquerChoix(accepte) {
  gtag('consent', 'update', {
    ad_storage: accepte ? 'granted' : 'denied',
    ad_user_data: accepte ? 'granted' : 'denied',
    ad_personalization: accepte ? 'granted' : 'denied',
    analytics_storage: accepte ? 'granted' : 'denied'
  });
}`,
};

const BLOCK_SCRIPT_SNIPPET = (domain: string): Snippet => ({
  label: "Neutraliser le script tant que le consentement n'est pas donné",
  language: "html",
  code: `<!-- Le navigateur n'exécute pas un script de type "text/plain". -->
<script type="text/plain" data-categorie="marketing"
        src="https://${domain}/…"></script>

<script>
  // Appelé uniquement après acceptation de la catégorie concernée.
  function activerCategorie(categorie) {
    document
      .querySelectorAll('script[type="text/plain"][data-categorie="' + categorie + '"]')
      .forEach(function (balise) {
        var actif = document.createElement('script');
        for (var i = 0; i < balise.attributes.length; i++) {
          var a = balise.attributes[i];
          if (a.name !== 'type' && a.name !== 'data-categorie') {
            actif.setAttribute(a.name, a.value);
          }
        }
        actif.text = balise.text;
        balise.parentNode.replaceChild(actif, balise);
      });
  }
</script>`,
  note: "Technique universelle, indépendante de toute plateforme de consentement : le script existe dans la page mais n'est jamais exécuté avant l'accord.",
});

const FACADE_SNIPPET = (label: string): Snippet => ({
  label: `Facade de clic pour ${label}`,
  language: "html",
  code: `<!-- Rien n'est chargé tant que le visiteur n'a pas cliqué. -->
<div class="facade" data-src="URL_DE_L_IFRAME">
  <img src="/img/apercu.jpg" alt="Aperçu du contenu" loading="lazy">
  <button type="button">Afficher le contenu</button>
  <p>En affichant ce contenu, vous acceptez le dépôt de traceurs par le
     fournisseur. <a href="/politique-cookies">En savoir plus</a>.</p>
</div>

<script>
  document.querySelectorAll('.facade button').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      var bloc = bouton.closest('.facade');
      var cadre = document.createElement('iframe');
      cadre.src = bloc.dataset.src;
      cadre.loading = 'lazy';
      cadre.setAttribute('allowfullscreen', '');
      bloc.replaceWith(cadre);
    });
  });
</script>`,
  note: "L'image d'aperçu doit être hébergée sur votre domaine : une vignette chargée depuis le fournisseur transmet déjà l'adresse IP du visiteur.",
});

const SELF_HOST_FONTS_SNIPPET: Snippet = {
  label: "Auto-héberger les polices",
  language: "css",
  code: `/* 1. Télécharger les fichiers .woff2 et les placer dans /fonts
   2. Supprimer tout <link> vers fonts.googleapis.com
   3. Déclarer les polices localement : */

@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}`,
  note: "Correction rapide, sans effet de bord, et qui améliore en général le temps de chargement : plus aucune connexion vers un serveur tiers.",
};

function buildGuide(tracker: TrackerEntity): Guide {
  const cats = tracker.categories;
  const domain = tracker.domains[0] ?? tracker.slug;
  const has = (c: string) => cats.includes(c as TrackerEntity["categories"][number]);

  const snippets: Snippet[] = [];
  const steps: string[] = [];
  const relatedRules: string[] = [];

  const isGoogle = tracker.entity.includes("Google") || tracker.ultimateParent?.includes("Alphabet");

  if (has("fonts") || (has("cdn") && tracker.adequacy !== "EEA")) {
    snippets.push(SELF_HOST_FONTS_SNIPPET);
    steps.push(
      "Télécharger les fichiers servis par ce tiers et les héberger sur votre propre domaine.",
      "Supprimer toute référence au domaine tiers dans vos gabarits et vos feuilles de style.",
      "Vérifier avec l'onglet réseau de votre navigateur qu'aucune requête ne part plus vers ce domaine.",
    );
    relatedRules.push("KZC-DEPOT-009", "KZC-TRANSFER-001");
  }

  if (has("video") || has("maps")) {
    snippets.push(FACADE_SNIPPET(tracker.name));
    steps.push(
      "Remplacer l'intégration directe par une facade : une image d'aperçu et un bouton.",
      "Ne charger le contenu du fournisseur qu'après un clic explicite du visiteur.",
      has("maps")
        ? "Pour un simple plan d'accès, une image statique accompagnée d'un lien suffit et supprime définitivement la question."
        : "Informer le visiteur, au moment du clic, que l'affichage entraînera le dépôt de traceurs.",
    );
    relatedRules.push("KZC-DEPOT-008");
  }

  if (isGoogle && (has("advertising") || has("analytics") || has("tag_manager"))) {
    snippets.push(CONSENT_MODE_SNIPPET, CONSENT_UPDATE_SNIPPET);
    steps.push(
      "Déclarer un état de consentement par défaut « denied » AVANT tout script Google.",
      "Émettre une mise à jour du consentement au moment où le visiteur valide son choix.",
      "Vérifier que les signaux ad_user_data et ad_personalization sont bien transmis.",
    );
    relatedRules.push("KZC-CMV2-001", "KZC-CMV2-002", "KZC-CMV2-003");
  }

  if (has("session_replay")) {
    steps.push(
      "Conditionner strictement le chargement de l'outil au consentement : l'enregistrement de session ne bénéficie d'aucune exemption.",
      "Activer le masquage des champs de formulaire dans la configuration de l'outil.",
      "Exclure explicitement les pages traitant de données sensibles ou de paiement.",
    );
    relatedRules.push("KZC-DEPOT-011", "KZC-SPECIAL-003");
  }

  if (has("chat")) {
    snippets.push({
      label: "Charger le widget au clic plutôt qu'au chargement",
      language: "html",
      code: `<button type="button" id="ouvrir-chat">Discuter avec nous</button>

<script>
  document.getElementById('ouvrir-chat').addEventListener('click', function () {
    if (window.__chatCharge) return;
    window.__chatCharge = true;
    var s = document.createElement('script');
    s.src = 'https://${domain}/…';
    s.async = true;
    document.head.appendChild(s);
  }, { once: true });
</script>`,
      note: "Le service reste disponible pour qui en a besoin, sans être imposé à tous les visiteurs. Le confort d'usage est intact.",
    });
    steps.push(
      "Remplacer le chargement automatique par un bouton « Discuter avec nous ».",
      "Ne charger le script du fournisseur qu'au premier clic.",
    );
    relatedRules.push("KZC-DEPOT-012");
  }

  if (has("captcha")) {
    steps.push(
      "Ne charger le service que sur les pages comportant réellement un formulaire.",
      "Envisager une alternative européenne ou auto-hébergée pour les formulaires courants.",
    );
    relatedRules.push("KZC-DEPOT-010");
  }

  if (has("advertising") || has("social") || has("rtb")) {
    snippets.push(BLOCK_SCRIPT_SNIPPET(domain));
    steps.push(
      "Neutraliser la balise tant que le consentement publicitaire n'est pas donné.",
      "Vérifier qu'aucune requête ne part vers ce domaine au premier chargement de la page.",
      "Contrôler qu'après un refus, plus aucune requête n'est émise — c'est le manquement le plus lourd.",
    );
    relatedRules.push("KZC-DEPOT-004", "KZC-DEPOT-005", "KZC-REFUS-001");
  }

  if (has("analytics") && !isGoogle && !tracker.exemptEligible) {
    snippets.push(BLOCK_SCRIPT_SNIPPET(domain));
    steps.push(
      "Conditionner le chargement de l'outil au consentement.",
      "Ou basculer vers une solution de mesure configurable en mode exempté.",
    );
    relatedRules.push("KZC-DEPOT-002");
  }

  if (steps.length === 0) {
    steps.push(
      "Vérifier si ce service est réellement nécessaire au fonctionnement demandé par votre visiteur.",
      "S'il ne l'est pas, conditionner son chargement au consentement.",
      "Le déclarer dans votre politique de gestion des cookies avec sa finalité et sa durée.",
    );
    snippets.push(BLOCK_SCRIPT_SNIPPET(domain));
  }

  if (tracker.adequacy !== "EEA") {
    steps.push(
      "Documenter le transfert hors Espace économique européen : garanties applicables et analyse d'impact.",
    );
    relatedRules.push("KZC-TRANSFER-001");
  }

  const why: string[] = [tracker.purposeFr, tracker.riskNotesFr];
  if (tracker.exemptEligible) {
    why.push(
      "Ce service peut, selon sa configuration réelle, relever du strictement nécessaire ou d'une exemption. La vérification reste à faire au cas par cas : c'est l'usage qui décide, pas la catégorie.",
    );
  }

  return {
    slug: `bloquer-${tracker.slug}`,
    tracker,
    title: `Bloquer ${tracker.name} avant consentement`,
    metaDescription: `${tracker.name} se charge souvent avant que vos visiteurs aient pu répondre au bandeau. Voici pourquoi c'est un écart, et comment le corriger — avec le code.`,
    why,
    steps,
    snippets,
    relatedRules: [...new Set(relatedRules)],
  };
}

export const GUIDES: readonly Guide[] = TRACKERS.filter(
  // Les plateformes de consentement ne se « bloquent » pas : elles sont le
  // mécanisme même du choix. Un guide de blocage n'aurait aucun sens.
  (t) => !t.categories.includes("cmp"),
)
  .map(buildGuide)
  .sort((a, b) => a.tracker.name.localeCompare(b.tracker.name, "fr"));

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function cookiesOfGuide(guide: Guide) {
  return COOKIES.filter((c) => c.vendorSlug === guide.tracker.slug);
}

export { getTrackerBySlug };
