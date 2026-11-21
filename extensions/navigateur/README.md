# Konsent — audit RGPD (extension navigateur)

Extension Chrome, Edge et Firefox (Manifest V3) qui ouvre, en un clic, l'audit
RGPD et cookies [Konsent](https://konsent.kayzen-lyon.com) de la page affichée.

Éditeur : KAYZEN (Tarek BELHADJ EI). Licence MIT.

## Ce que fait l'extension

- Lit l'adresse de l'onglet actif, uniquement lorsque vous ouvrez le popup.
- Refuse les pages qui ne sont pas en `http` ou `https` (pages internes du
  navigateur, fichiers locaux…).
- Propose trois liens, qui ouvrent un nouvel onglet sur Konsent :
  - « Auditer cette page » : `/scan?url=<domaine et chemin>` ;
  - « Synthèse dirigeant » : `/scan/synthese?url=<domaine et chemin>` ;
  - « Outils » : `/outils`.

Les paramètres de requête (`?…`) et le fragment (`#…`) de l'adresse sont
retirés avant l'envoi : ils contiennent parfois des jetons ou des identifiants.

## Permissions

| Permission  | Pourquoi |
| ----------- | -------- |
| `activeTab` | Lire l'adresse de l'onglet affiché, au moment du clic sur l'icône, et seulement de celui-là. |

Aucune autre permission, aucun accès permanent aux sites (`host_permissions`),
aucun script injecté dans les pages (`content_scripts`), aucune ressource
externe chargée par le popup.

## Politique de données

L'extension ne collecte, ne stocke et ne transmet aucune donnée. Elle ne
contient ni mesure d'audience, ni télémétrie, ni rapport d'erreur. La seule
information qui quitte votre navigateur est l'adresse de la page (domaine et
chemin), lorsque **vous** cliquez sur un lien : elle est alors placée dans
l'adresse de la page Konsent ouverte, comme si vous l'aviez saisie vous-même.

## Installation en mode développeur

Téléchargez l'archive sur
<https://konsent.kayzen-lyon.com/integrations/extensions> et décompressez-la.

### Chrome / Edge

1. Ouvrez `chrome://extensions` (ou `edge://extensions`).
2. Activez le **mode développeur**.
3. Cliquez sur **Charger l'extension non empaquetée** et choisissez le dossier
   décompressé (celui qui contient `manifest.json`).

Chrome peut signaler la clé `browser_specific_settings` comme inconnue : elle
ne sert qu'à Firefox et est sans effet ailleurs.

### Firefox

1. Ouvrez `about:debugging#/runtime/this-firefox`.
2. Cliquez sur **Charger un module complémentaire temporaire…** et choisissez
   le fichier `manifest.json`.

Un module temporaire est retiré à la fermeture de Firefox. La publication sur
les boutiques officielles (Chrome Web Store, Microsoft Edge Add-ons,
addons.mozilla.org) est à venir.

## Fichiers

- `manifest.json` — déclaration de l'extension.
- `popup.html`, `popup.css`, `popup.js` — l'interface, sans script en ligne
  (CSP Manifest V3).
- `icons/` — icônes 16, 32, 48 et 128 px, générées depuis `public/icons/icon-512.png` par
  `npm run build:extensions`.
