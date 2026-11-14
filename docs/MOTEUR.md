# Moteur de règles — documentation développeur

Ce document décrit comment Konsent transforme une observation d'un site en
constats, en score et en note. Il s'adresse à qui doit lire, corriger ou
étendre le référentiel (« rulepack »).

Fichiers concernés :

| Rôle | Fichier |
| --- | --- |
| Type d'une règle, d'un constat, d'une preuve | `lib/rulepack/types.ts` |
| Assemblage du référentiel, familles, piliers | `lib/rulepack/index.ts` |
| Règles, par famille | `lib/rulepack/families/*.ts` |
| Observation (ce que le moteur a vu) | `lib/engine/types.ts` |
| Observation sans navigateur | `lib/engine/static.ts`, `lib/engine/html.ts`, `lib/engine/lexicons.ts` |
| Évaluation statique | `lib/engine/evaluate.ts` |
| Règles statiques non décidables (déclarées) | `lib/engine/coverage.ts` |
| Sortie du worker → observation, comparaison des phases | `lib/engine/headless-adapter.ts` |
| Évaluation trois phases | `lib/engine/evaluate-phases.ts` |
| Assemblage d'un rapport | `lib/engine/scan.ts` (statique), `lib/engine/scan-headless.ts` (navigateur) |
| Choix du moteur et dégradation | `lib/engine/orchestrate.ts`, `lib/engine/worker-client.ts` |
| Score, plafonds, note | `lib/risk/score.ts`, `lib/risk/grade.ts` |
| Score par pilier | `lib/report/pillars.ts` |
| Exposition théorique (montants) | `lib/risk/exposure.ts` |
| Fixtures | `lib/engine/fixtures.ts`, `lib/engine/fixtures-phases.ts` |

Le principe qui gouverne tout le reste : **une règle produit un constat
factuel, jamais une qualification juridique**, et **une règle que le moteur
n'a pas su évaluer n'est jamais comptée comme satisfaite** — elle ressort en
« non évalué » dans le rapport.

---

## 1. Structure d'une règle

Une règle est un objet `Rule` (`lib/rulepack/types.ts`) :

| Champ | Contenu |
| --- | --- |
| `id` | Identifiant stable `KZC-<FAMILLE>-<NNN>`. Ne change jamais : il est stocké dans les rapports, les URL `/regles/[id]` et les exports. Le préfixe doit être celui de `family` (contrôlé). |
| `family` | Une des 14 familles (§2). |
| `severity` | `CRITICAL`, `MAJOR`, `MODERATE`, `MINOR` ou `INFO`. |
| `weight` | Points retirés du score (§5). Plancher par sévérité, contrôlé par `check:rulepack` : CRITICAL ≥ 15, MAJOR ≥ 6, MODERATE ≥ 2, MINOR ≥ 1 ; INFO vaut obligatoirement 0. |
| `phases` | Phases du protocole concernées : `A` (avant toute interaction), `B` (après refus), `C` (après acceptation), `D` (réservée, non implémentée). La première phase sert de phase par défaut du constat. |
| `engine` | `static` (décidable sans navigateur) ou `headless` (exige le worker Playwright et le protocole trois phases). |
| `title` | Intitulé court du constat. |
| `references` | Références normatives précises (article, délibération, point). |
| `omnibusStatus` | Statut prospectif sous le projet « Digital Omnibus » COM(2025) 837 (non adopté). |
| `messageExec` | Message pour le dirigeant : sans jargon, factuel, **non accusatoire** (jamais « vous êtes en infraction »). |
| `messageTech` | Message pour le développeur ou le DPO. Les gabarits `{name}`, `{domain}`, `{ms}`… sont indicatifs. |
| `remediation` | `effort` (`LOW`/`MEDIUM`/`HIGH`), `billable`, `priceHintEur` facultatif (`[min, max]`, alimente l'estimation de `lib/risk/exposure.ts`), `steps`. |
| `falsePositiveNotes` | Facultatif : situations voisines à ne pas confondre. |
| `lastReviewed` | Date de dernière relecture (AAAA-MM-JJ). |

Un **constat** (`Finding`) est l'instanciation d'une règle sur un scan :
`ruleId`, `severity`, `family`, `title` recopiés de la règle, `occurrences`
(nombre d'éléments observés), `evidence` (preuves affichées telles quelles :
`request`, `cookie`, `header`, `dom`, `dns`, `page`, `note`) et `phase`.

Le référentiel refuse de démarrer si deux règles partagent un identifiant
(`lib/rulepack/index.ts`) : un doublon compterait deux fois le même manquement.

## 2. Familles

| Famille | Libellé | Fichier | Effectif |
| --- | --- | --- | --- |
| `DEPOT` | Dépôt avant consentement | `depot.ts` | 14 |
| `REFUS` | Respect du refus | `refus-banner.ts` | 10 |
| `BANNER` | Bandeau et recueil du consentement | `refus-banner.ts` | 22 |
| `EXEMPT` | Mesure d'audience exemptée | `misc.ts` + `completions.ts` | 6 |
| `STORAGE` | Stockage alternatif | `misc.ts` + `completions.ts` | 9 |
| `FP` | Empreinte du terminal | `misc.ts` + `completions.ts` | 8 |
| `CONSENT` | Mécanique et preuve du consentement | `misc.ts` + `completions.ts` | 7 |
| `TRANSFER` | Transferts hors UE | `doc-transfer-sec.ts` + `completions.ts` | 12 |
| `VENDOR` | Destinataires et sous-traitance | `misc.ts` + `completions.ts` | 7 |
| `TCF` | Cadre de transparence publicitaire | `tcf.ts` | 8 |
| `CMV2` | Signaux de consentement Google | `misc.ts` + `completions.ts` | 6 |
| `DOC` | Documents et information | `doc-transfer-sec.ts` + `completions.ts` | 18 |
| `SPECIAL` | Circonstances aggravantes | `misc.ts` + `completions.ts` | 6 |
| `SEC` | Hygiène de sécurité | `doc-transfer-sec.ts` + `completions.ts` | 6 |

Total : 139 règles. Les effectifs sont ceux du PRD §6 et sont **vérifiés** par
`scripts/check-rulepack.mjs` (`EXPECTED_BY_FAMILY`) : ajouter ou retirer une
règle impose de mettre ce tableau à jour, ce qui rend le changement visible en
revue. Les libellés sont dans `FAMILY_LABELS`, l'ordre d'affichage dans
`FAMILY_ORDER`.

## 3. Piliers

Les familles sont la bonne granularité pour le moteur, trop fine pour un
dirigeant. Le rapport les regroupe en quatre piliers (`PILLARS`,
`pillarOfFamily()` dans `lib/rulepack/index.ts`) :

| Pilier | Titre | Familles |
| --- | --- | --- |
| 1 `TRACKING` | Traceurs et dépôt | DEPOT, REFUS, STORAGE, FP |
| 2 `CONSENT_UX` | Recueil du consentement | BANNER, CONSENT, CMV2, TCF, EXEMPT |
| 3 `DOCUMENTS` | Information et documents | DOC |
| 4 `SOVEREIGNTY` | Destinataires et souveraineté | TRANSFER, VENDOR, SEC, SPECIAL |

Une nouvelle famille doit être rattachée à un pilier ; à défaut,
`pillarOfFamily()` la classe dans `TRACKING`.

## 4. Deux moteurs : statique et trois phases

### 4.1 Moteur statique (`engine: "static"`)

Sans navigateur, déployable en serverless. `runStaticScan()`
(`lib/engine/static.ts`) récupère le document servi et produit une
`Observation` (`lib/engine/types.ts`) : ressources référencées et leur mode de
chargement (`script`, `iframe`, `img`, `link`, `form`, `inline`, `connect`),
cookies `Set-Cookie`, détection du bandeau (CMP), pages légales (avec un
indicateur `substantive` : la page a-t-elle livré assez de texte pour que
l'absence d'un lexique signifie quelque chose ?), chaînes CNAME, en-têtes de
sécurité, signaux Consent Mode, thématiques sensibles, formulaires en clair.
L'observation ne contient **aucune interprétation**.

`evaluate(obs)` (`lib/engine/evaluate.ts`) applique les détecteurs, famille
par famille, via un `FindingBuilder` : `b.add(ruleId, evidence, occurrences?)`
n'ajoute rien si la liste de preuves est vide. Il renvoie
`{ findings, notEvaluatedRuleIds }`, où « non évalué » regroupe :

- toutes les règles `headless` non levées (le navigateur n'a pas tourné) ;
- les règles `static` déclarées non décidables dans `lib/engine/coverage.ts`
  (`STATIC_UNDECIDABLE`) ;
- les règles de **contenu** documentaire (`POLICY_CONTENT_RULES`) quand aucune
  politique n'a livré de texte exploitable (page rendue côté client), et
  `KZC-DOC-017` dans le même cas pour les mentions légales.

Une règle `static` doit donc être **soit** référencée par un détecteur dans
`evaluate.ts`, **soit** listée dans `coverage.ts`. `check:rulepack` le vérifie
en lisant les deux fichiers comme du texte : une règle `static` orpheline
serait comptée comme satisfaite, ce qui est interdit.

### 4.2 Protocole en trois phases (`engine: "headless"`)

Le worker navigateur (`worker/`, Playwright) charge le site trois fois et
renvoie un `WorkerOutput` : un instantané par phase (requêtes, cookies,
`localStorage`, techniques d'empreinte comptées, service workers, chaîne TCF)
et une description du bandeau (refus au premier niveau, nombre de clics pour
refuser et pour accepter).

- **A** — avant toute interaction ;
- **B** — après un clic explicite sur le refus ;
- **C** — après acceptation.

`comparePhases()` (`lib/engine/headless-adapter.ts`) rapproche requêtes et
cookies de la base de traceurs et calcule les **écarts** entre phases
(`PhaseComparison` : traceurs soumis à consentement dès A, encore présents en
B, identifiants persistants en stockage local, empreinte avant et après refus,
symétrie du bandeau…). `evaluatePhases()` (`lib/engine/evaluate-phases.ts`)
en tire les constats des règles listées dans `PHASE_RULE_IDS` (15 règles :
DEPOT-001 à 003, REFUS-001/002/006, BANNER-002/003, STORAGE-001/003,
FP-001/002/006/007/008). Ces constats ne se lisent pas dans un instantané :
seulement dans l'écart entre deux moments.

`assembleHeadlessScan()` (`lib/engine/scan-headless.ts`) combine les deux
moteurs : il rejoue l'analyse statique pour le contexte que le worker ne voit
pas (pages légales, en-têtes, DNS), évalue l'observation fusionnée avec
`evaluate()`, puis superpose les constats de phase, **qui priment** pour une
même règle. Sont « non évaluées » les règles ni `static`, ni dans
`PHASE_RULE_IDS`, et non levées.

### 4.3 Orchestration

`runVerdictScan()` (`lib/engine/orchestrate.ts`) tente le protocole complet si
le worker est configuré, et retombe sur le moteur statique sinon. Toute
dégradation est **renvoyée pour affichage** (`degraded.reason`), jamais
journalisée en silence : un rapport statique présenté comme complet compterait
implicitement les règles `headless` comme satisfaites. Les erreurs du site
analysé (`ScanError` : `INVALID_URL`, `UNREACHABLE`, `BLOCKED`, `TIMEOUT`)
remontent telles quelles.

## 5. Score, plafonds et note

`computeScore(findings)` (`lib/risk/score.ts`) :

1. **Pénalité** : pour chaque constat, `weight × (1 + ln(occurrences) / 4)`.
   Rendements décroissants : dix cookies publicitaires sont pires qu'un seul,
   pas dix fois pires (1 occurrence → ×1, 10 → ×1,58, 100 → ×2,15). Les
   règles de poids 0 (INFO) ne comptent pas.
2. **Score brut** : `round(clamp(100 − pénalité, 0, 100))` (`rawScore`).
3. **Plafonds durs** (« plafond de verre ») — un site ne peut pas compenser
   un manquement grave par une accumulation de bonnes pratiques :

   | Condition | Plafond |
   | --- | --- |
   | Au moins un constat CRITICAL de famille DEPOT ou REFUS | 45 |
   | `KZC-BANNER-001` (aucun recueil du consentement alors que des traceurs non exemptés sont présents) | 30 |
   | `KZC-DOC-001` (aucune politique de confidentialité accessible) | 60 |

   Les plafonds s'appliquent successivement ; `cappedBy` indique la raison
   du dernier plafond qui a abaissé le score.
4. **Note** :

   | Score | Note | Libellé |
   | --- | --- | --- |
   | ≥ 90 | A | Écarts résiduels |
   | ≥ 75 | B | Écarts limités |
   | ≥ 60 | C | Écarts significatifs |
   | ≥ 40 | D | Écarts majeurs |
   | ≥ 20 | E | Exposition élevée |
   | < 20 | F | Exposition critique |

Le **score par pilier** (`lib/report/pillars.ts`) applique le même barème aux
seuls constats du pilier, **sans** plafonds : un plafond traduit une gravité
transversale, le rejouer par pilier noircirait des piliers qui n'y sont pour
rien.

L'**exposition théorique** (`lib/risk/exposure.ts`) n'affiche jamais le
plafond légal seul : il est toujours accompagné de la fourchette observée en
procédure simplifiée et d'une estimation du coût de correction (somme des
`priceHintEur` des règles `billable`, mutualisée).

## 6. Ajouter une règle

### 6.1 Liste de contrôle

1. **Choisir la famille et l'identifiant** : prochain numéro libre de la
   famille (`grep -rn 'id: "KZC-SEC-' lib/rulepack/families`).
2. **Écrire la règle** dans le fichier de sa famille — pour les familles à
   deux fichiers, dans le tableau `*_EXTRA_RULES` de `completions.ts`.
   Respecter le plancher de poids de sa sévérité.
3. **Mettre à jour l'effectif** de la famille dans `EXPECTED_BY_FAMILY`
   (`scripts/check-rulepack.mjs`) et, le cas échéant, le PRD §6.
4. **Décider du moteur** :
   - `static` décidable → ajouter le détecteur dans `evaluate.ts` **et** une
     fixture dans `lib/engine/fixtures.ts` (obligatoire, contrôlé) ;
   - `static` non décidable pour l'instant → l'inscrire dans
     `lib/engine/coverage.ts` avec un commentaire qui dit pourquoi ;
   - `headless` évaluée par le worker → détecteur dans `evaluate-phases.ts`,
     identifiant ajouté à `PHASE_RULE_IDS`, fixture dans
     `lib/engine/fixtures-phases.ts` ;
   - `headless` sans détecteur → rien d'autre : elle sera « non évaluée ».
5. Si l'observation ne contient pas l'information nécessaire, l'ajouter
   d'abord à `Observation` (`lib/engine/types.ts`), à l'observateur
   (`static.ts` ou `headless-adapter.ts`) et à `neutralObservation()` — en
   valeur **conforme** : le témoin ne doit rien déclencher.
6. Incrémenter `RULEPACK_VERSION` (`lib/rulepack/types.ts`).
7. Lancer les tests (§6.3).

La page publique `/regles/[id]`, le plan du site et la recherche se
nourrissent du référentiel : rien à ajouter de ce côté.

### 6.2 Exemple : en-tête `X-Content-Type-Options` absent

L'observation porte déjà `headers.xContentTypeOptions`, et le témoin vaut
`"nosniff"` : la règle est décidable sans navigateur.

**Règle** — dans `SEC_EXTRA_RULES` (`lib/rulepack/families/completions.ts`) :

```ts
{
  id: "KZC-SEC-007",
  family: "SEC",
  severity: "MINOR",
  weight: 1,
  phases: ["A"],
  engine: "static",
  title: "En-tête X-Content-Type-Options absent",
  references: ["RGPD, article 32 (sécurité du traitement)"],
  omnibusStatus: "Non spécifiquement visé.",
  messageExec:
    "Votre serveur ne demande pas au navigateur de s'en tenir au type déclaré des fichiers. C'est une protection simple, absente ici.",
  messageTech: "En-tête `X-Content-Type-Options: nosniff` absent de la réponse du document.",
  remediation: {
    effort: "LOW",
    billable: false,
    steps: ["Ajouter `X-Content-Type-Options: nosniff` à toutes les réponses du serveur."],
  },
  lastReviewed: "2026-11-14",
},
```

**Effectif** — `scripts/check-rulepack.mjs` : `SEC: 7`.

**Détecteur** — `lib/engine/evaluate.ts`, bloc « Famille SEC » :

```ts
if (obs.headers.xContentTypeOptions?.toLowerCase() !== "nosniff") {
  b.add("KZC-SEC-007", [
    { kind: "header", label: `X-Content-Type-Options : ${obs.headers.xContentTypeOptions ?? "absent"}` },
  ]);
}
```

**Fixture** — `FIXTURES` (`lib/engine/fixtures.ts`). Le cas négatif par
défaut est le témoin neutre ; on en ajoute un explicite quand il faut prouver
qu'on distingue deux situations voisines (ici, une valeur présente mais
différente de `nosniff`) :

```ts
{
  ruleId: "KZC-SEC-007",
  scenario: "L'en-tête X-Content-Type-Options est absent.",
  positive: (o) => ({ ...o, headers: { ...o.headers, xContentTypeOptions: null } }),
  negative: (o) => ({ ...o, headers: { ...o.headers, xContentTypeOptions: "nosniff" } }),
},
```

Si le scénario déclenche légitimement d'autres règles (un pixel publicitaire
américain enfreint aussi les règles de transfert), les déclarer dans
`alsoExpected` : le harnais échoue sur tout constat non déclaré, et sur toute
déclaration qui ne se vérifie plus.

### 6.3 Tests à lancer

```sh
npm run check:rulepack     # unicité, préfixes, effectifs, décidabilité, poids
npm run test:fixtures      # témoin vierge, positifs, négatifs, couverture (statique et trois phases)
npm run test:jurisdictions # la couche multi-juridiction ne fait disparaître aucune règle
npm run test:report        # rendu du rapport
npm run typecheck
npm run check              # l'ensemble, comme la CI
```

`test:fixtures` contrôle, dans l'ordre : que l'observation neutre ne produit
**aucun** constat (le faux positif systématique est le bug le plus coûteux du
produit), que chaque cas positif lève la règle visée, que chaque cas négatif
ne la lève pas, et que toute règle décidable a sa fixture.
