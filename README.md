# Konsent

**Audit automatisé RGPD, cookies et traceurs — auditeur indépendant de toute plateforme de consentement.**

Édité par KAYZEN LYON SASU (SIREN 999 418 346).

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
| **M01 — Moteur de scan** | Moteur statique complet (serverless) + worker navigateur trois phases |
| **M02 — Référentiel** | 96 règles versionnées, publiques, avec référence normative et statut « Digital Omnibus » |
| **M03 — Base des destinataires** | 69 entités décrites en français : entreprise, juridiction effective, implications |
| **M04 — Moteur de risque** | Score 0–100 avec plafonds durs, notes A–F, exposition théorique encadrée |
| **M08 — Doc Factory** | Politique cookies générée depuis le scan, avec champs `[[À COMPLÉTER]]` visibles |
| **API** | `GET /api/scan?url=…`, avertissement non désactivable dans chaque réponse |
| **SEO programmatique** | 179 pages générées depuis la base (règles, traceurs, institutionnel) |

Modules du PRD non encore implémentés : Evidence Vault (M09), Monitoring
(M10), Remediation chiffrée (M11), Reg Watch (M12), serveur MCP (M13),
couche agence (M14).

## Les deux moteurs

L'application déployée exécute le **moteur statique** : elle observe le
document servi, les en-têtes HTTP, les chaînes DNS et les pages légales.
Elle couvre 47 des 96 règles.

Elle **n'exécute aucun JavaScript**. Le dépôt effectif d'un cookie posé par
script, le comportement après refus ou l'ergonomie réelle du bandeau ne sont
pas observables ainsi. Ces règles sont reportées en « non évalué » dans
chaque rapport — **jamais comptées comme satisfaites**.

Le protocole complet en trois phases (avant consentement / après refus /
après acceptation) est fourni dans [`worker/`](worker/README.md) : Chromium
piloté par Playwright, un conteneur éphémère par analyse. Vercel ne convient
pas à un navigateur headless de longue durée — d'où cette séparation.

## Démarrage

```bash
npm install
npm run dev
```

Sonde en ligne de commande, sans passer par l'interface :

```bash
npx tsx scripts/probe.mjs exemple.fr
```

Worker navigateur :

```bash
cd worker && npm install && npm run scan https://exemple.fr
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
  engine/       Observation statique, évaluation, orchestration
  risk/          Score et exposition théorique
  docs/         Gabarits documentaires
  facts.ts      Table des affirmations chiffrées sourcées
worker/         Protocole trois phases (Playwright + Docker)
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
