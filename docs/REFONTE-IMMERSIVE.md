# Konsent — diagnostic « refonte immersive » et aperçu isolé

Rédigé le 20 novembre 2026, branche `feat/site-immersif`. Étapes 0 à 2 de la
feuille de route. Rien n'est intégré dans les vraies pages.

## Suite donnée

L'aperçu a été validé et intégré le même jour dans les vraies pages ; le
dossier d'aperçu a été retiré. Les composants vivent dans
`components/immersive/` :

| Fichier | Rôle |
|---|---|
| `SceneOutils.tsx` | scène fixe et défilement des outils (accueil) |
| `Mur.tsx` | mur en perspective des bandes de titre |
| `immersive.css` | styles, préfixe `imm-`, jetons de `globals.css` uniquement |
| `captures/` et `captures.ts` | captures réelles et script qui les régénère |

Pages touchées : accueil ; menu et pied de page (toutes les pages) ; mur sur
Fonctionnalités, Surveillance, Comparatif, Agence, Glossaire, Guides, Cookies.
Laissées telles quelles : outils, formulaires, contact, pages légales, et les
pages générées depuis la base (règles, traceurs, fiches).

Le reste de ce document est le diagnostic d'origine.

## Faut-il toucher au site ?

Peu. Le site est propre, cohérent et déjà animé : son premier écran montre
une démonstration d'audit qui joue en boucle, à côté du formulaire. Une
refonte serait une erreur. Ce qui lui manque, c'est de **montrer le produit** :
le site entier ne contient aucune image. Quinze outils existent et on n'en
voit jamais un seul écran avant de cliquer.

## État de départ

| Point | Constat |
|---|---|
| Dépôt | propre, branche `main` |
| Types | aucune erreur |
| Lint | 0 erreur, 11 avertissements (déjà présents) |
| Tests (`npm run check`) | 906 contrôles passés, 0 échec, contrastes 60/60 |
| Thème par défaut | clair, déjà en place ; interrupteur clair / sombre / système |
| Images dans le site | aucune (ni capture, ni photo, ni logo client) |
| Langues | français seul, pas de système de traduction |
| Bandeau cookies, chat | aucun (le site ne dépose aucun traceur, c'est voulu) |
| Règles du dépôt | pas de `CLAUDE.md` ni `AGENTS.md` ; les règles sont dans les tests (CSP stricte, aucune ressource tierce, accessibilité RGAA) |

## Les cinq demandes, une par une

| Demande | Verdict | Pourquoi |
|---|---|---|
| 1. Mur en perspective | **Oui sur les pages intérieures, non sur l'accueil** | Sur l'accueil, la colonne de droite est prise par la démonstration d'audit, qui prouve plus qu'un mur ; la retirer supprimerait du contenu, et poser le mur derrière rendrait illisible le bouton de pause de l'animation. En revanche beaucoup de pages intérieures (une vingtaine de fichiers utilisent cette bande) s'ouvrent sur une bande de titre marine dont la moitié droite est vide : le mur y a sa place. |
| 2. Cartes avec preuves | **Non** | Konsent est un produit : pas de réalisations, pas de clients cités, pas de résultats mesurés chez un tiers. Rien à mettre dans ces cartes sans inventer. |
| 3. Scène fixe | **Oui, c'est le meilleur apport** | Les six outils mis en avant sur l'accueil : la capture de l'outil reste à l'écran pendant que la liste défile. Mêmes textes et mêmes liens que les cartes actuelles. |
| 4. Défilement | **Oui, à un seul endroit** | Sous la scène, les neuf autres outils en deux rangées. La section annonce « 15 outils » et n'en montrait que six ; elle les montre maintenant tous. |
| 5. Pied de page | **Oui** | Ouverture sur le contact en très grand (adresse, téléphone, lien Contact, tous déjà sur le site), puis le pied de page actuel sans rien retirer, puis « Konsent » en filigrane. |

## La matière : ce qui est vrai, ce qui manque

- **Captures** : il n'en existait aucune. J'en ai produit 25, toutes des
  photographies des vraies pages du site (les 15 outils, le référentiel, les
  traceurs, les cookies, le glossaire, les tarifs…), prises sur le code de la
  branche `main`. Rien n'est retouché. Le script est dans
  `captures/capturer.mjs`. Poids total : moins d'1 Mo.
- **Limite honnête du mur** : ces écrans sont surtout des pages blanches avec
  du texte et des formulaires. Le mur est donc plus sobre et plus uniforme
  que celui de kayzen-lyon.com, fait de sites clients très différents.
- **Preuves chiffrées** : les seuls chiffres du site sont ceux du produit
  (139 règles, destinataires décrits, cookies documentés). Ils sont déjà dans
  le premier écran et y restent. Aucun autre chiffre n'a été ajouté.
- **Rapport d'audit** : c'est l'écran le plus parlant du produit, et il
  n'apparaît nulle part dans l'aperçu. Le montrer supposerait d'auditer un
  vrai site tiers et de l'afficher ; je ne l'ai pas fait sans accord.

## Ce que contient l'aperçu

Accueil (`page.tsx`, copie de `app/page.tsx`, mêmes textes) :

1. Premier écran inchangé, sans la lueur en dégradé du fond.
2. Outils : scène fixe (6 outils), bouton « Voir les 15 outils gratuits »,
   puis défilement (9 outils).
3. Cartes sans halo au survol, citation sans flou à l'apparition.
4. Ouverture du pied de page et filigrane.

Page intérieure : la vraie page « Fonctionnalités », rendue telle quelle,
avec le mur sur sa bande de titre.

## Ce qui contredit la règle « aucun dégradé, halo ni verre » dans le site actuel

À trancher avant l'intégration. L'aperçu les neutralise quand c'était
possible sans toucher aux vrais fichiers :

| Élément actuel | Dans l'aperçu |
|---|---|
| Lueur en dégradé derrière le premier écran (`hero-glow`) | retirée |
| Halo qui suit la souris sur les cartes (`SpotlightCard`) | retiré |
| Flou à l'apparition de la citation | retiré |
| Menu légèrement translucide et flouté (effet verre) | neutralisé |
| Barre de lecture en dégradé terracotta → doré | couleur unie |
| Ombre colorée diffuse au survol du bouton principal | **laissée** (vrai composant) |
| Trait flou dans l'animation du premier écran | **laissé** (vrai composant) |
| Fond flouté derrière les fenêtres (recherche, carte de contact) | **laissé** |

Le quadrillage des bandes marine est écrit avec la syntaxe « dégradé » mais
dessine des traits nets : je le considère conforme.

## Défaut trouvé dans le site actuel (non corrigé)

En thème sombre, le bandeau final de l'accueil (« Vous saurez en moins d'une
minute. ») devient presque blanc avec un texte blanc : il est illisible.
Cause : la classe `bg-ink-2` désigne une couleur de texte qui s'inverse en
sombre. Confirmé sur le site en ligne : fond mesuré `rgb(243, 246, 251)`,
texte `rgb(255, 255, 255)`.

## Vérifié

- Types, lint et tests après ajout de l'aperçu : identiques à l'état de départ.
- Build de production complet : réussi. Servi en local, les deux adresses de
  l'aperçu répondent **404**, l'aperçu n'est pas dans le plan du site, les
  vraies pages répondent 200.
- Regardé sur captures d'écran, en clair et en sombre, à 1440 px et à 375 px :
  premier écran, scène fixe (début et milieu), défilement, ouverture du pied
  de page, bas de page, page intérieure avec le mur.
- Aucun débordement horizontal à 375 px, aucune erreur dans la console,
  accents corrects, titre principal avec de vraies espaces.
- La scène reste bien fixée et l'outil affiché suit le défilement.
- À 375 px : la scène fixe laisse place à une carte par outil avec sa
  capture ; le mur est masqué.

## Pas vérifié

- Le mouvement lui-même (mur, défilement) : contrôlé sur images fixes, pas
  observé en continu. Le navigateur intégré a cessé de produire des captures
  fiables en cours de session.
- La pause du mur, la pause du défilement au survol, la navigation au clavier.
- Le réglage « animations réduites » et le contraste renforcé.
- Safari, Firefox, un vrai téléphone.
- Performance (Lighthouse) et lecteur d'écran.
- Tests de bout en bout Playwright du dépôt (`npm run test:e2e`) : non lancés.

## Limites connues de l'aperçu

- Le filigrane et les retouches du menu sont posés par une feuille de style
  propre à l'aperçu ; à l'intégration ils iront dans les vrais composants.
- L'ouverture « contact » est placée à la fin du contenu, juste avant le pied
  de page ; à l'intégration elle fera partie du pied de page.
- Les captures restent claires en thème sombre.
- L'outil en cours est signalé par un filet et la couleur de son titre, pas
  par un estompage des autres : estomper du texte l'aurait fait passer sous
  le contraste exigé par le site.
- Le serveur de développement répond parfois 404 ou 500 juste après une
  modification de fichier ; recharger suffit. Déjà le cas avant mes ajouts.

## Décisions attendues

1. D'accord avec le diagnostic (pas de mur sur l'accueil, pas de cartes de preuves) ?
2. Retirer du site réel les dégradés, halos et flous listés plus haut ?
3. Montrer un vrai rapport d'audit, et si oui celui de quel site ?
4. Corriger le bandeau final illisible en thème sombre ?
