# Konsent

**Audit automatisé RGPD, cookies et traceurs — auditeur indépendant de toute plateforme de consentement.**

Édité par KAYZEN (Tarek BELHADJ, entrepreneur individuel) — identité de référence : `EDITOR` dans `lib/disclaimer.ts`.

---

## La thèse

Le contrôle de conformité cookies est **déterministe**. On peut établir par
simple observation qu'un traceur s'est déposé avant consentement, sans le
moindre modèle de langage. Konsent industrialise ce constat.

Positionnement : **on vend le verdict, pas la solution.** Konsent n'édite ni
ne revend de bandeau cookies — il audite les vôtres, y compris ceux des
éditeurs qui ne peuvent structurellement pas s'auditer eux-mêmes.

## Ce que fait ce dépôt aujourd'hui

| Module | État |
|---|---|
| **M01 — Moteur de scan** | Worker navigateur trois phases branché sur `/scan` et `/api/scan`, repli statique déclaré |
| **M02 — Référentiel** | 139 règles versionnées, publiques, avec référence normative et statut « Digital Omnibus » |
| **M03 — Base des destinataires** | 69 entités décrites en français, exposées sur `/api/vendors` |
| **M04 — Moteur de risque** | Score 0–100 avec plafonds durs, notes A–F, exposition théorique encadrée |
| **M08 — Doc Factory** | 15 documents sur 23, dont les registres de l'article 30(2), des violations, des demandes de droits et des consentements |
| **M09 — Archive de preuve** | ZIP signé Ed25519, empreintes SHA-256, vérifiable hors ligne |
| **M10 — Surveillance** | Moteur de diff, jeton de référence infalsifiable, alerte nominative |
| **M11 — Devis** | Calculé depuis les constats, mutualisation et coefficient de pile |
| **M12 — Reg Watch** | Veille rattachée aux règles, statut en vigueur / projet / retiré |
| **M13 — Serveur MCP** | 28 outils, 5 ressources, 5 prompts métier portant les garde-fous |
| **M14 — Couche agence** | Portefeuille multi-domaines, marque blanche par URL, sous-comptes clients cloisonnés |
| **API** | 11 points d'entrée publics, décrits en OpenAPI 3.1 sur `/api/openapi.json` ; clés, portées, quotas et journal d'appels |
| **SEO programmatique** | 322 pages générées depuis la base |
| **Juridictions** | FR et UE qualifiées ; QC, CA, CH, US_CA indicatives, marquées comme telles |
| **Comptes** | Connexion par lien à usage unique, jetons stockés en empreinte seule |
| **Facturation** | Stripe branché, souscription fermée tant qu'une promesse d'offre n'est pas tenue |

### Ce qui attend une variable d'environnement

L'analyse à la demande ne conserve **aucun** résultat, conformément à la
politique de confidentialité. Trois fonctions supposent une configuration, et
restent inertes sans elle — le produit le dit à l'écran plutôt que d'échouer
en silence :

| Fonction | Variables | Sans elles |
|---|---|---|
| Protocole en trois phases | `KONSENT_WORKER_URL`, `KONSENT_WORKER_SECRET` | 48 règles décidées au lieu de 70 au plus, et le rapport le dit |
| Surveillance planifiée, comptes, sous-comptes agence | `DATABASE_URL` (Neon, posée par l'intégration Vercel), `CRON_SECRET` | Analyse sans trace, comptes et portefeuille persistant désactivés |
| Alertes et liens de connexion | `RESEND_API_KEY`, `KONSENT_MAIL_FROM` | Aucun message ne part |
| Souscription en ligne | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` | Paiement fermé |

Voir [`.env.example`](.env.example). Aucune clé n'entre dans le dépôt.

### Vérifier une archive de preuve

```bash
unzip konsent-preuve-*.zip -d preuve && cd preuve
sha256sum -c SHA256SUMS
base64 -d SHA256SUMS.sig > sig.bin
openssl pkeyutl -verify -pubin -inkey public-key.pem -rawin -in SHA256SUMS -sigfile sig.bin
```

En production, définissez `KONSENT_SIGNING_KEY` (clé Ed25519 PKCS#8 PEM
encodée en base64). Sans elle, une clé éphémère est générée et le manifeste
indique explicitement que l'archive n'a aucune valeur d'opposabilité.

## Les deux moteurs

Une analyse passe par le **protocole en trois phases** — avant consentement,
après refus, après acceptation — exécuté par Chromium sous Playwright dans
[`worker/`](worker/README.md). Vercel ne convient pas à un navigateur de
longue durée : l'application appelle donc le worker, qui observe, et applique
elle-même le référentiel à ce qu'il rapporte. Ce chemin décide **jusqu'à 70
des 139 règles** : 48 statiques, 17 lues dans l'écart entre les phases, et 5
sur la chaîne TCF quand le site utilise une CMP compatible IAB (65 sinon).

Quand le worker n'est pas déployé, ne répond pas, ou sature, l'application
retombe sur le **moteur statique** : document servi, en-têtes HTTP, chaînes
DNS, pages légales, sans exécuter la moindre ligne de JavaScript. Ce chemin
décide **48 règles**, moins celles de contenu documentaire quand la politique
n'est rendue que par JavaScript.

**La dégradation est écrite dans le rapport**, avec sa cause, avant le score.
C'est le point sensible : un rapport statique présenté comme complet
compterait 76 règles jamais regardées comme satisfaites — précisément le
défaut que ce produit reproche au marché.

Les règles non décidées sont reportées en « non évalué », jamais comptées
comme satisfaites. Celles qui relèvent d'un détecteur statique non encore
écrit sont déclarées dans [`lib/engine/coverage.ts`](lib/engine/coverage.ts) ;
`npm run check` refuse toute règle statique qui n'y figurerait pas sans avoir
de détecteur.

### Le cloisonnement agence se teste par ce qu'il laisse passer

Une agence qui verrait le portefeuille d'une autre, ou un client qui verrait
ses concurrents dans la même agence, est une violation à notifier au titre de
l'article 33 — commise par un produit vendu pour prévenir cela.

La décision d'accès est donc **pure**, isolée de toute base et de tout cadre
web dans [`lib/agency/tenancy.ts`](lib/agency/tenancy.ts), et
`scripts/test-tenancy.mjs` l'attaque plutôt que de l'illustrer : frère à
frère, enfant vers parent, agence vers agence, ressource orpheline, liste
d'enfants falsifiée.

Trois décisions valent d'être connues :

- **Le plan seul ne fait pas l'autorité.** Un sous-compte dont le champ `plan`
  porterait « agence » — héritage, erreur de saisie, écriture directe en base —
  n'est pas une agence : `isAgency` exige aussi l'absence de parent. Sans cela,
  une chaîne de privilèges s'ouvre.
- **La liste d'enfants n'est jamais prise au mot.** Elle vient d'une requête,
  pas d'une preuve : elle est refiltrée sur le parent réel, sinon fournir les
  enfants d'autrui suffirait à les lire.
- **Une ressource sans propriétaire n'est accessible à personne.** Le réflexe
  inverse — « pas de propriétaire, donc pas de restriction » — est la manière
  la plus courante de laisser fuir des données par une ligne mal migrée.

Le cloisonnement s'arrête à un niveau, et c'est la base qui l'impose
([schéma](db/schema.sql), appliqué par `npm run db:schema`) : une règle
applicative se contourne dès qu'une requête est écrite ailleurs.

Le portefeuille en découle mécaniquement : un domaine inscrit à la surveillance
depuis une session connectée appartient à ce compte, et la liste lue est celle
des comptes que `visibleAccountIds` autorise — jamais une requête écrite à la
main. Un domaine inscrit sans session n'appartient à personne et n'apparaît
dans aucun portefeuille, ce qui est le bon défaut : rattacher un domaine à un
compte deviné depuis l'adresse d'alerte donnerait à quiconque connaît un
courriel le moyen de peupler le portefeuille d'autrui.

### L'API se décrit elle-même, et ne peut pas mentir sur ce qu'elle sert

`GET /api/openapi.json` renvoie une description OpenAPI 3.1 **construite depuis
le registre des routes**, jamais saisie à la main. Une spécification tenue à
part dérive toujours du code, et une API qui documente une route disparue —
ou tait une route ajoutée — ment à ses intégrateurs de la même façon qu'un
rapport comptant une règle non vérifiée comme satisfaite.

`npm run check` confronte le registre au système de fichiers **dans les deux
sens** : route servie mais non déclarée, route déclarée mais absente, méthode
annoncée que le fichier n'exporte pas, paramètre déclaré que la route ne lit
pas, paramètre lu mais non documenté. Ce contrôle a servi dès son écriture :
le registre annonçait `?token=` là où `/api/diff` lit `?ref=`.

**Clés, portées, quotas, journal.** Une clé `kzc_…` se présente en en-tête
`Authorization` — jamais en paramètre d'URL, qui se retrouve dans les journaux
serveur, l'historique du navigateur et l'en-tête `Referer` transmis aux tiers.
Seule son empreinte SHA-256 est conservée ; une fuite de la base ne livre
aucune clé utilisable. Chaque clé porte les seules portées qu'on lui donne, un
quota glissant sur 30 jours, et chacun de ses appels est journalisé avec son
motif de refus le cas échéant.

**Les onze routes restent ouvertes sans clé.** Le verdict sans compte ni
e-mail est la promesse produit n°1 : une clé présentée est vérifiée, rattachée
et décomptée ; son absence ne ferme rien. En revanche une clé fausse,
révoquée, hors portée ou hors quota est refusée **même sur une route ouverte**
— sans quoi la révocation ne voudrait rien dire. Décider de fermer une route
est un arbitrage commercial, pas une correction technique, et `/tarifs` le dit
au lieu de vendre un contrôle d'accès qui n'existe pas.

### Trois niveaux de lecture, un seul fond

Le même rapport s'adresse à trois personnes qui n'ont ni le même besoin ni le
même vocabulaire. Le niveau se choisit sur `/scan` et voyage dans l'URL
(`?vue=dirigeant|dpo|developpeur`), de sorte qu'un rapport s'envoie au bon
destinataire dans la bonne vue et que l'impression restitue ce qui était à
l'écran.

| Vue | Ce qu'elle ajoute |
|---|---|
| **Dirigeant** | L'écart, sa gravité, ce que coûte la correction. Ni identifiant de règle, ni article, ni URL. |
| **DPO** | Référence normative complète, statut « Digital Omnibus », preuve brute, limites connues de chaque règle. |
| **Développeur** | Message technique, URLs non tronquées, étapes de correction détaillées. |

**Les trois vues montrent exactement les mêmes écarts, le même score et les
mêmes limites d'analyse.** Seule varie la profondeur de justification — un
niveau qui masquerait un constat fabriquerait trois vérités sur le même site,
et `npm run check` échoue si la liste des constats venait à dépendre du
niveau. Le rapport imprimé porte la vue dans laquelle il a été produit, sans
quoi une vue dirigeant sur papier passerait pour un rapport complet.

### Le faux positif est le risque n°1, et il est testé comme tel

Un constat qui sort à tort décrédibilise l'outil entier — le §20 du PRD le
classe en probabilité élevée et impact fort. Trois contrôles bloquants dans
`npm run check`, par ordre d'importance :

1. **Deux témoins irréprochables ne produisent aucun constat.** Un site sans
   traceur pour le moteur statique ; un site au bandeau symétrique, sans dépôt
   avant consentement et qui respecte le refus, pour le protocole en trois
   phases. Si un constat sort de là, il ne dépend pas de ce qu'il prétend
   observer, et il sortira chez tous les clients.
2. **Chacune des 65 règles décidables a un cas positif et un cas négatif** —
   48 statiques, 17 en navigateur ; les règles TCF ont les leurs dans
   `scripts/test-tcf.mjs`. Le négatif est celui qui compte : il prouve
   qu'on distingue une situation conforme d'une situation voisine en écart. Un
   destinataire américain réellement certifié DPF de celui qui ne l'est pas ;
   un site qui **retire** son cookie publicitaire après refus de celui qui le
   garde ; un sélecteur de langue en stockage local d'un identifiant ; 30
   destinataires de 31 ; trois lectures WebGL de douze.
3. **Tout constat collatéral doit être déclaré.** Un pixel publicitaire
   enfreint réellement cinq règles à la fois ; la cascade est permise à
   condition d'être écrite, et le harnais échoue autant sur une cascade non
   déclarée que sur une déclaration devenue caduque.

Les fixtures du worker partent de sa **sortie brute**, pas d'une observation
déjà construite : le rapprochement d'un cookie avec sa fiche est un endroit au
moins aussi propice à l'erreur que les règles elles-mêmes.

Une règle décidable sans fixture fait échouer la CI. Voir
[`lib/engine/fixtures.ts`](lib/engine/fixtures.ts) et
[`lib/engine/fixtures-phases.ts`](lib/engine/fixtures-phases.ts).

### Une comparaison entre deux moteurs ne conclut pas

La surveillance compare un jeton de référence à une analyse ultérieure. Si
les deux n'ont pas été produits par le même moteur, l'écart vient de nous et
non du site : 76 règles apparaissent ou disparaissent d'un bloc. Le jeton
porte donc son moteur, et le différentiel refuse alors de conclure — aucune
régression comptée, **aucune alerte envoyée**, et la raison affichée. Une
alerte nominative fondée sur un changement de notre outillage serait une
fausse alerte, ce que le garde-fou n°3 interdit.

## Démarrage

```bash
npm install
npm run dev
```

Sonde en ligne de commande, sans passer par l'interface :

```bash
npx tsx scripts/probe.mjs exemple.fr
```

Worker navigateur, en service — c'est lui qui alimente `/scan` :

```bash
cd worker && npm install && KONSENT_WORKER_SECRET=dev npm run serve
```

Puis, côté application, `KONSENT_WORKER_URL=http://127.0.0.1:8080` et
`KONSENT_WORKER_SECRET=dev` dans `.env.local`. Analyse ponctuelle sans
service :

```bash
cd worker && npm run scan https://exemple.fr
```

## Les garde-fous, qui ne sont pas décoratifs

Ces règles protègent directement l'éditeur. Elles sont appliquées sans
exception dans le code :

1. **Jamais « vous êtes en infraction ».** Le produit constate un écart.
   La qualification juridique relève de la CNIL ou d'un juge.
2. **Jamais un plafond légal seul.** Tout montant théorique est affiché avec
   la fourchette réellement observée en procédure simplifiée et le coût de
   correction. Voir `lib/risk/exposure.ts`.
3. **Aucun logo d'autorité, aucune mise en demeure simulée, aucune fausse
   urgence.** La peur doit être vraie ou ne pas être.
4. **Aucun chiffre sans source.** `lib/facts.ts` porte chaque affirmation
   chiffrée avec sa source et sa date de vérification. Les faits non
   vérifiés **ne sont pas affichés** — ils sont listés publiquement sur
   `/sources` en attente de contrôle.
5. **Aucun modèle de langage** dans la production d'un constat ou d'un
   document juridique. Gabarits déterministes uniquement.
6. **L'incertitude est affichée.** Quand une page légale ne livre pas de
   texte exploitable — cas fréquent des sites rendus côté client — le moteur
   s'abstient de conclure plutôt que de produire un faux positif.

## Ce que Konsent obtient sur son propre scanner

**96/100, note A.** Mesuré à chaque poussée par le workflow
`audit-headless.yml`, qui exécute le protocole trois phases avec un vrai
navigateur. Le §14.1 du PRD vise 100/100 : voici l'écart qui reste, et
pourquoi il reste.

`KZC-SEC-003` — notre politique de sécurité de contenu autorise
`'unsafe-inline'` sur les scripts. Next.js injecte des scripts inline pour
l'hydratation ; s'en passer suppose une CSP à nonce, laquelle force le rendu
dynamique de chacune des 322 pages aujourd'hui statiques. Nous avons préféré
un constat modéré assumé et écrit ici à une régression de performance et de
coût sur tout le site.

C'est exactement la conduite que nous recommandons à nos clients : quand un
écart est connu et arbitré, on l'écrit et on le justifie. Ce qui est
inacceptable, c'est de le taire.

## Cohérence

Konsent ne dépose aucun cookie, ne charge aucune ressource externe (ni
police, ni script, ni image), n'utilise aucun outil de mesure tiers. C'est
pourquoi il n'a pas de bandeau. Un outil qui reproche le chargement de
Google Fonts ne peut pas en charger.

## Structure

```
app/            Pages et API (Next.js App Router)
components/     Composants de rendu du rapport
lib/
  rulepack/     Référentiel de règles, par famille
  trackers/     Base de connaissance des destinataires
  engine/       Observation, évaluation, choix du moteur
    orchestrate.ts   Protocole complet ou repli statique, et sa déclaration
    worker-client.ts Appel du worker, échecs typés
  risk/          Score et exposition théorique
  docs/         Gabarits documentaires
  facts.ts      Table des affirmations chiffrées sourcées
worker/         Protocole trois phases (Playwright + Docker), service HTTP
scripts/        Sondes de développement
```

## Avertissement

Konsent est un outil d'analyse technique automatisée. Il ne constitue ni un
audit juridique, ni une consultation juridique, ni une certification de
conformité. Les références réglementaires doivent être vérifiées à leur
source officielle avant toute exploitation commerciale. Le cadre applicable
aux traceurs évolue : la proposition « Digital Omnibus » COM(2025) 837
n'était pas adoptée à la date de rédaction.

La diffusion de modèles de documents juridiques engage la responsabilité de
son éditeur et doit faire l'objet d'une validation par un professionnel du
droit habilité.
