# KONSENT — Product Requirements Document & Roadmap

**Plateforme européenne d'audit automatisé RGPD / cookies / traceurs, avec génération documentaire légale**

| | |
|---|---|
| **Référence** | KZN-2026-KONSENT-01 |
| **Éditeur** | KAYZEN LYON SASU — SIREN 999 418 346 |
| **Auteur** | Tarek Belhadj |
| **Version** | 1.1 — 8 août 2026 |
| **Statut** | Cadrage révisé — après relevé concurrentiel direct et premier jet d'implémentation |
| **Marques sœurs** | Konforme (RGAA/WCAG/EAA) · Nexus (SEO/GEO/AEO/LLMO) |

---

## 0. Résumé exécutif

### 0.1 La thèse produit en cinq lignes

Le contrôle de conformité cookies est **entièrement déterministe** : on peut prouver qu'un traceur s'est déposé avant consentement par simple observation réseau, sans aucun modèle de langage. Le coût marginal d'un scan est donc de l'ordre de **0,004 €** (CPU headless + bande passante), là où la valeur perçue côté dirigeant est de plusieurs milliers d'euros de risque évité. C'est le meilleur ratio coût/valeur perçue de tout l'écosystème SaaS de conformité. Konsent industrialise ce constat : **scan gratuit qui fait peur → rapport qui explique → documents qui rassurent → prestation qui corrige.**

### 0.2 Différence fondamentale avec Axeptio

Axeptio vend **l'outil de consentement** (une CMP). Konsent vend **le verdict sur la conformité**, y compris celle des CMP existantes — dont Axeptio.

| | Axeptio | Konsent |
|---|---|---|
| Nature | CMP (widget de consentement) | Auditeur + générateur documentaire |
| Le scanner ("Shake") est | un tunnel d'acquisition pour vendre la CMP | **le produit lui-même** |
| Conflit d'intérêt | audite ce qu'il vend | **auditeur indépendant de toute CMP** |
| Périmètre | cookies + consentement | cookies + traceurs + transferts + documentaire + registre + AIPD |
| Sortie | bannière configurée | rapport opposable + 24 documents + plan d'action chiffré |
| Modèle | abonnement par volume de pages vues | abonnement + prestation de correction |

**Positionnement stratégique : « Le Bureau Veritas du RGPD web. »** On ne vend pas la solution, on vend le contrôle technique. Cette neutralité est la seule position que ni Axeptio, ni Didomi, ni OneTrust, ni Cookiebot ne peuvent occuper — leur modèle économique le leur interdit structurellement.

### 0.2.1 Relevé concurrentiel direct — axept.io, 8 août 2026

Relevé effectué sur le site public. **À re-vérifier avant toute exploitation commerciale : une page marketing n'est pas un contrat, et l'écart entre ce qui est annoncé et ce qui est livré n'est pas mesurable de l'extérieur.**

**Ce qu'Axeptio propose réellement.** CMP web et CMP mobile (SDK natifs Swift/Kotlin, plus Flutter et React Native, annoncé sous 2 Mo, gestion hors ligne et continuité vers les WebViews) ; **Terms**, un widget de consentement contractuel qui remplace les CGV/CGU statiques par un document interactif avec moteur de recherche et historique de versions ; **Shake**, le scanner de cookies ; A/B testing sur la bannière ; analytics de taux de consentement ; registre de preuves de consentement ; Google Consent Mode v2 et Microsoft UET Consent Mode ; TCF v2.3 IAB Europe **et Canada** ; GPC ; mur de consentement contextuel ; propagation du consentement multi-domaines et pour utilisateurs authentifiés ; multilingue ; 8 plugins CMS (WordPress, Shopify, PrestaShop, Webflow, Drupal, Wix, Bubble, Adobe Commerce) ; 20+ connecteurs MarTech ; API documentée en Swagger ; deux plateformes distinctes, *for Brands* et *for Publishers*.

**Couverture réglementaire affichée** : RGPD, PIPEDA, Loi 25 (Québec), CCPA, nLPD (Suisse), GPC. **C'est plus large que notre V1, qui est purement FR/UE.** Voir §6.15.

**Grille tarifaire**, au volume de pages vues et non à la valeur : 7 € (2 500 PV, annuel), 29 € (5 000 PV), 69 € (100 000 PV), 129 € (500 000 PV), Entreprise sur mesure ; −10 % en annuel. Le scanner est **rationné par plan** : absent en XS, 5 scans/mois en S, 30/mois programmables en M et L, illimité en Entreprise.

**Go-to-market** : Academy (formation gratuite en ligne), annuaire de partenaires intégrateurs et experts, programme d'affiliation, programme revendeur agence à prix dégressif, cas clients chiffrés, blog, newsletter, événements, espace presse. Preuve sociale affichée : 200 000+ sites équipés, 20+ milliards de preuves de consentement, membre GOLD du programme partenaires CMP de Google.

### 0.2.2 Les trois failles exploitables

**Faille 1 — Shake est un mur, pas un outil.** Le formulaire exige **URL + e-mail professionnel + nom de l'entreprise + case à cocher obligatoire** avant de produire quoi que ce soit, et le résultat arrive « en quelques minutes » par e-mail. Le dirigeant qui tape « mon site est-il conforme » un mardi soir veut un chiffre, pas un formulaire de génération de leads. **Konsent affiche le verdict en moins de 40 secondes, sans e-mail, sans compte, sans carte.** C'est le levier d'acquisition le plus fort du plan, et il est gratuit à construire : c'est une décision de produit, pas une prouesse technique.

**Faille 2 — le rapport a une conclusion écrite d'avance.** Shake « génère une configuration de bannière Axeptio prête à l'emploi » et se conclut par « intégrez notre bannière en 2 clics ». Le diagnostic et l'ordonnance sortent du même stylo. Konsent n'a rien à vendre au bout du scan **sauf la correction**, quelle que soit la CMP retenue — et peut donc recommander de garder Axeptio quand Axeptio est bien posé. Cette phrase-là, Axeptio ne peut pas l'écrire.

**Faille 3 — l'audit s'arrête aux cookies.** Shake détecte les cookies, les services, et vérifie le Consent Mode v2. Il ne couvre ni le fingerprinting, ni le CNAME cloaking, ni le tagging server-side, ni les transferts hors UE et leur juridiction effective, ni les pages légales, ni le documentaire. **Le périmètre de Konsent est un sur-ensemble strict du leur.**

**Faille 4, structurelle — le prix est indexé sur le trafic, pas sur le risque.** Une PME de 22 personnes à 3 000 pages vues paie 7 € et n'a aucun accès au scanner ; une même PME exposée aux mêmes sanctions paie donc pour un widget, jamais pour un contrôle. Konsent facture le contrôle et la preuve, indépendamment du trafic. Voir §15.1.

### 0.3 Boucle économique

```
   SEO programmatique (25 000 pages)
              │
              ▼
   SCAN GRATUIT (coût : 0,004 €)
   « 14 traceurs déposés avant votre consentement »
              │
              ├──► Score 34/100 + exposition théorique chiffrée
              │
              ▼
   E-MAIL DE CAPTURE (rapport PDF complet)
              │
              ├──► SaaS 29–249 €/mois (monitoring + documents)
              │
              └──► PRESTATION 890–2 900 € (Kayzen Web corrige)
                        │
                        └──► RÉ-AUDIT → badge de conformité → rétention
```

Le SaaS finance l'acquisition ; la prestation finance la marge. Kayzen Web est le débouché naturel : Konsent est une **machine à qualifier des leads techniques** déguisée en produit.

---

## 1. Contexte réglementaire — la fenêtre de tir

### 1.1 Le cadre applicable au 7 août 2026

| Texte | Portée | Impact produit |
|---|---|---|
| **Art. 82 loi 78-17** (transposition ePrivacy 2002/58/CE) | Base juridique du dépôt/lecture de traceurs | Cœur du rulepack |
| **RGPD art. 4(11), 6, 7, 12–14, 30, 32, 35, 44–49, 83** | Consentement, information, registre, AIPD, transferts, sanctions | Rulepack + générateur documentaire |
| **Lignes directrices CNIL, délib. 2020-091** (version consolidée janv. 2026) | Interprétation contraignante | Référentiel des règles bannière |
| **Recommandation CNIL, délib. 2020-092** | Modalités pratiques | Contrôles UX/dark patterns |
| **Recommandation CNIL janv. 2026 — consentement multi-terminaux** | Consentement unique multi-devices | Module dédié (voir §6.9) |
| **LCEN art. 6-III** | Mentions légales obligatoires | Générateur mentions légales |
| **Code pénal art. 226-16 s.** | Volet pénal (jusqu'à 300 k€ personne morale × 5) | Moteur d'exposition |
| **EU-US Data Privacy Framework** | Adéquation conditionnelle US | Module transferts |
| **CCT 2021 (déc. 2021/914)** | Transferts hors adéquation | Générateur TIA + annexes |

### 1.2 Ce qui bouge — et pourquoi c'est une opportunité, pas un risque

- Le **règlement ePrivacy a été formellement retiré le 11 février 2025** après huit ans de blocage au Conseil. La base juridique reste donc la directive de 2002 transposée à l'article 82.
- La proposition **« Digital Omnibus » du 19 novembre 2025 (COM(2025) 837)** entend rapatrier les règles cookies dans le RGPD via deux nouveaux articles **88a** (structure du consentement, exemption possible pour la mesure d'audience first-party, interdiction de re-solliciter pendant ~6 mois après un refus) et **88b** (signaux de consentement navigateur juridiquement opposables).
- Le texte **n'est pas adopté** : il est en négociation au mi-2026, et le **CEPD/EDPS ont rendu un avis conjoint 2/2026 critique le 11 février 2026**. Les délais annoncés dans la proposition sont de 6 mois (88a) et 24 mois (88b) après entrée en vigueur.

> **Lecture stratégique.** Cette incertitude est un actif commercial. Un dirigeant qui lit « les règles cookies vont changer » ne comprend pas si cela le protège ou l'expose. Konsent doit être **la source qui tranche**, avec un module *Reg Watch* (§4.12) qui affiche, pour chaque règle du rulepack, son statut actuel et son statut projeté sous 88a/88b. Aucun concurrent ne fait ça aujourd'hui. C'est le différenciateur n°1 de la liste du §16.

### 1.3 Les chiffres qui font vendre (sourcés, vérifiables, à ne jamais inventer)

- Bilan CNIL 2025 : **83 sanctions, ~487 M€**, rapport annuel publié le 18 mai 2026.
- **Les cookies et traceurs sont le premier motif de sanction en France** (~35 % des dossiers), devant la sécurité (~25 %) et la prospection (~20 %).
- **32 % des entreprises contrôlées en 2025 étaient des TPE/PME.** C'est LE chiffre qui déclenche l'achat : il détruit le « la CNIL ne s'intéresse pas aux boîtes comme la mienne ».
- La **procédure simplifiée** (créée 2022, plafond 20 000 € par décision) représente ~60 % des affaires et raccourcit les délais à 4–6 mois.
- Depuis janvier 2026, **23 sanctions simplifiées cookies pour 133 750 €**, soit ~5 815 € en moyenne.
- Plus de **40 contrôles en ligne menés en 2024** sur des bandeaux jugés trompeurs, à la suite de plaintes.

**Chaque affirmation chiffrée affichée dans le produit doit porter sa source et sa date de vérification, en base (`facts` table, §12).** C'est à la fois une exigence de loyauté commerciale et un atout : Axeptio n'affiche aucune source.

---

## 2. Marché & ICP

### 2.1 Segmentation

| Segment | Volume FR estimé | Douleur | Prix cible | Canal |
|---|---|---|---|---|
| **A. TPE/PME 5–50 salariés avec site vitrine + GA4 + Meta Pixel** | ~450 000 | Ignore totalement le sujet, découvre par le scan | 29–89 €/mois + 1 490 € correction | SEO + scan viral |
| **B. E-commerce 1–20 M€ CA** | ~35 000 | Sait qu'il est exposé, n'a pas de DPO | 89–249 €/mois + 2 900 € | SEO + partenariats agences |
| **C. Agences web / freelances** | ~28 000 | Doit rassurer ses clients, veut du white-label | 249 €/mois | Programme partenaire, marge revendeur |
| **D. ETI / groupes multi-sites** | ~4 000 | A un DPO qui veut de la preuve automatisée | 690–2 500 €/mois | Outbound, salons DPO |
| **E. Collectivités & secteur public** | ~35 000 | Obligation + faible budget + marchés publics | 490 €/an (offre publique) | Marchés publics, UGAP |
| **F. Cabinets d'avocats / DPO externalisés** | ~2 500 | Veut la preuve technique, pas l'analyse | 390 €/mois multi-clients | Partenariat prescripteur |

**Segment prioritaire V1 : A + C.** A pour le volume et la boucle SEO, C parce qu'une agence apporte 20–80 domaines d'un coup et fait le travail de vente à ta place.

### 2.2 Persona principal — « le dirigeant qui découvre »

> Patrick, 52 ans, dirige une PME de 22 personnes (négoce B2B, 4,5 M€ CA). Son site a été fait par un prestataire en 2021. Il y a un bandeau cookies « parce que le prestataire l'a mis ». Il n'a jamais entendu parler de l'article 82. Il tape « mon site est-il conforme RGPD » un mardi soir.

Ce qu'il doit voir en 40 secondes :
1. Un score rouge, gros, avec un chiffre exact de traceurs illégaux.
2. Les **noms des entreprises** qui reçoivent les données de ses visiteurs (Google, Meta, TikTok…) et **dans quels pays**.
3. Une fourchette d'exposition théorique **calculée sur SON chiffre d'affaires**.
4. Un bouton « Recevoir le rapport complet » (capture e-mail).
5. Un bouton « Faire corriger par un expert » (lead Kayzen Web).

### 2.3 Persona secondaire — « le DPO qui doit prouver »

> Sandrine, DPO mutualisée pour 6 structures. Elle a besoin d'un **historique horodaté** montrant qu'elle a contrôlé, quand, et ce qu'elle a fait corriger. Sa vraie douleur n'est pas de savoir : c'est de **prouver qu'elle savait**.

→ D'où le module *Evidence Bundle* (§4.9) : archive signée, horodatée, HAR + captures + hash, exportable pour un contrôle. **Aucun concurrent grand public ne propose ça.**

---

## 3. Proposition de valeur & « peur maîtrisée »

### 3.1 Le principe : maximiser l'alarme, minimiser le mensonge

L'objectif « peur maximale côté dirigeant » est légitime et atteignable **sans jamais sortir du factuel**. La peur naît de trois leviers, dans cet ordre :

**Levier 1 — La preuve visuelle brute.** Pas un score abstrait : la liste nominative des requêtes sortantes avec horodatage relatif.

```
  T+0,00 s  Chargement de votre page
  T+0,31 s  ⚠ google-analytics.com/g/collect     → cookie _ga déposé (13 mois)
  T+0,48 s  ⚠ connect.facebook.net/signals       → cookie _fbp déposé (90 j)
  T+0,52 s  ⚠ analytics.tiktok.com/api/v2/pixel  → destinataire : ByteDance (CN/SG)
  T+2,10 s  Votre bandeau cookies s'affiche
            ↑ 3 traceurs déposés AVANT que le visiteur ait pu répondre.
```

Ce bloc est **le produit**. Il ne se discute pas, il ne s'interprète pas, il est reproductible. C'est ce qui transforme un scepticisme en panique en 4 secondes.

**Levier 2 — La personnalisation du risque.** « Jusqu'à 20 M€ ou 4 % du CA mondial » ne fait peur à personne parce que c'est abstrait. « **Sur la base de votre CA déclaré de 4,5 M€, l'exposition théorique maximale est de 180 000 € au titre de l'article 83 RGPD, et de 300 000 € au titre de l'article 226-16 du code pénal** » fait peur, parce que c'est son chiffre. On récupère le CA via l'API Recherche d'entreprises (INSEE/INPI) à partir du domaine → SIREN.

**Levier 3 — La comparaison sociale.** « 78 % des sites de votre secteur que nous avons analysés sont mieux notés que le vôtre. » Le classement sectoriel anonymisé est un moteur d'anxiété supérieur au montant. Il se construit gratuitement à partir de la base de scans.

### 3.2 Les garde-fous — non négociables

Cette section n'est pas de la prudence décorative : elle protège directement KAYZEN LYON.

1. **Aucune mise en demeure simulée, aucun courrier imitant la CNIL, aucun logo d'autorité.** L'usurpation d'apparence d'une autorité publique et la reproduction du logo CNIL sont des risques pénaux et de contrefaçon. Interdits absolus dans le produit et dans les e-mails.
2. **Toute somme affichée est étiquetée « exposition théorique maximale, hors barème réel »**, avec rappel que la moyenne observée en procédure simplifiée est ~5 800 €. Afficher uniquement le plafond sans la moyenne serait une pratique commerciale trompeuse au sens de l'art. L121-1 du code de la consommation.
3. **Disclaimer systématique** (§3.3), présent sur : écran de résultat, en-tête et pied de chaque page PDF, chaque document généré, chaque réponse d'API, chaque réponse d'outil MCP.
4. **Aucune affirmation du type « vous êtes en infraction »**. Formulation imposée dans tout le produit : *« Le comportement observé présente un écart avec [référence]. Seule la CNIL ou un juge peut qualifier une infraction. »*
5. **Pas de faux compte à rebours, pas de faux « contrôle CNIL imminent dans votre région »**, pas de fausse pénurie. La peur doit être vraie ou ne pas être.
6. **Droit à la contestation** : chaque constat porte un bouton « contester ce résultat » qui ouvre un ticket. Cela nourrit la qualité du moteur **et** documente la bonne foi de l'éditeur.

### 3.3 Formule de disclaimer (texte canonique, à réutiliser tel quel)

> **Avertissement.** Konsent est un outil d'analyse technique automatisée. Les résultats produits sont **purement indicatifs** et reposent sur l'observation du comportement d'un navigateur automatisé à un instant donné, dans une configuration donnée. Ils **ne constituent ni un audit juridique, ni une consultation juridique, ni une certification de conformité**, et n'engagent pas la responsabilité de KAYZEN LYON SASU quant à l'appréciation qui pourrait être portée par une autorité de contrôle ou une juridiction. Seul un professionnel du droit habilité peut qualifier juridiquement une situation au regard du règlement (UE) 2016/679, de la loi n° 78-17 du 6 janvier 1978 modifiée et des textes applicables. Les montants mentionnés correspondent à des **plafonds légaux théoriques** et non à une prévision de sanction. Les documents générés sont des **modèles à personnaliser et à faire valider** avant toute utilisation.

**Variante courte** (API, MCP, tooltips) :
> Analyse technique automatisée — résultat indicatif, non juridique. Ne constitue pas une consultation ni une certification.

### 3.4 Ce qu'on promet vs ce qu'on ne promet pas

| On promet | On ne promet pas |
|---|---|
| Détecter ce qui se dépose avant consentement | Que la CNIL sera d'accord avec notre lecture |
| Nommer les destinataires et leur juridiction | Une analyse de la licéité de chaque finalité |
| Générer des modèles documentaires conformes aux structures attendues | Des documents utilisables sans relecture |
| Un historique horodaté opposable en interne | Une valeur probatoire devant un juge |
| Un plan d'action priorisé | La conformité automatique |

---

## 4. Architecture fonctionnelle — les 14 modules

| # | Module | Rôle | Phase |
|---|---|---|---|
| M01 | **Scan Engine** | Navigation headless 3 phases, capture réseau/stockage/DOM | P0 |
| M02 | **Rulepack** | Référentiel de ~110 règles versionnées | P0 |
| M03 | **Tracker Intelligence** | Base de connaissance traceurs/éditeurs/juridictions | P0 |
| M04 | **Risk Engine** | Scoring, pondération, exposition théorique | P0 |
| M05 | **Banner Auditor** | Analyse UX/dark patterns du bandeau | P1 |
| M06 | **Transfer Analyzer** | Résolution IP/ASN/juridiction, adéquation, DPF | P1 |
| M07 | **Legal Pages Auditor** | Mentions légales, politique de confidentialité, politique cookies | P1 |
| M08 | **Doc Factory** | Génération de 24 documents légaux | P1 |
| M09 | **Evidence Vault** | Archive horodatée, HAR, captures, hash, export contrôle | P2 |
| M10 | **Monitoring** | Re-scan planifié, diff, alertes de régression | P2 |
| M11 | **Remediation** | Plan d'action, snippets correctifs, devis auto | P2 |
| M12 | **Reg Watch** | Veille réglementaire mappée sur le rulepack | P2 |
| M13 | **MCP Server** | Exposition agentique complète | P3 |
| M14 | **Agency Layer** | White-label, multi-tenant, marge revendeur | P2 |

---

## 5. M01 — Scan Engine : spécification technique

### 5.1 Le protocole en trois phases (le cœur du produit)

Aucun concurrent grand public n'exécute correctement les trois phases. C'est là que se joue la crédibilité technique.

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE A — « PRE-CONSENT »                                    │
│ Contexte navigateur neuf, zéro cookie, zéro storage.         │
│ Chargement, attente networkidle + 6 s, ZÉRO interaction.     │
│ Simulation de scroll passif (test « poursuite de nav »).     │
│ → SNAPSHOT A : cookies, storage, requêtes, TCString, dataLayer│
│ ⇒ Tout traceur non exempté présent ici = manquement art. 82  │
├─────────────────────────────────────────────────────────────┤
│ PHASE B — « REFUS »                                          │
│ Détection du CMP, résolution du chemin de refus,             │
│ mesure du NOMBRE DE CLICS nécessaires pour refuser.          │
│ Clic sur refus / « continuer sans accepter ».                │
│ Attente 6 s + navigation vers 2 pages internes.              │
│ → SNAPSHOT B                                                 │
│ ⇒ Tout traceur ici = refus non respecté (manquement majeur)  │
├─────────────────────────────────────────────────────────────┤
│ PHASE C — « ACCEPTATION »                                    │
│ Contexte neuf. Clic sur acceptation globale.                 │
│ → SNAPSHOT C                                                 │
│ ⇒ Sert d'inventaire exhaustif pour la politique cookies      │
│   et de référence pour le diff A/B/C                         │
├─────────────────────────────────────────────────────────────┤
│ PHASE D — « PERSISTANCE DU REFUS » (V2)                      │
│ Rechargement du contexte B après 24 h simulées (cookie jar   │
│ restauré) → le bandeau se réaffiche-t-il ? (anticipation 88a)│
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Stack d'exécution

- **Playwright** (Chromium) piloté via **CDP brut** pour tout ce que l'API haut niveau ne couvre pas.
- Domaines CDP utilisés : `Network`, `Storage`, `Page`, `DOM`, `CSS`, `Runtime`, `Emulation`, `Security`, `Audits`, `ServiceWorker`, `IndexedDB`, `CacheStorage`, `DOMSnapshot`.
- Instrumentation avant document via `Page.addScriptToEvaluateOnNewDocument` pour hooker les API de fingerprinting **sans les bloquer** (on observe, on n'altère pas).
- Contexte Docker éphémère, un conteneur par scan, réseau sortant loggé, aucun état partagé.
- **Zéro LLM dans le chemin critique.** Un LLM peut être appelé hors chemin critique (rédaction éditoriale d'articles de blog), jamais pour produire un constat.

### 5.3 Ce qui est capturé

| Catégorie | Détail |
|---|---|
| **Cookies** | `Storage.getCookies` sur tous les contextes + parsing des en-têtes `Set-Cookie` (capte les cookies écrasés). Champs : nom, domaine, path, expiry, size, httpOnly, secure, sameSite, partitionKey (CHIPS), source (HTTP vs JS), pile d'appel JS d'origine |
| **Stockage** | localStorage, sessionStorage, IndexedDB (bases + object stores + volumétrie), CacheStorage, Service Workers enregistrés, WebSQL legacy |
| **Réseau** | Toutes les requêtes : URL, méthode, initiator stack, type de ressource, taille, timing, en-têtes de requête et de réponse, statut, redirections, IP distante résolue |
| **Beacons** | `navigator.sendBeacon`, `fetch(keepalive)`, pixels 1×1, WebSocket, EventSource |
| **Fingerprinting** | Appels à `canvas.toDataURL`/`getImageData`, `WebGLRenderingContext.getParameter`, `AudioContext`, `navigator.plugins/mimeTypes/hardwareConcurrency/deviceMemory`, `screen.*`, énumération de polices par mesure, `RTCPeerConnection` (fuite IP locale), Battery API, `navigator.userAgentData.getHighEntropyValues` |
| **DOM/CMP** | Snapshot DOM complet, styles calculés des éléments du bandeau, arbre d'accessibilité, z-index, dimensions, contrastes |
| **Consent APIs** | `__tcfapi` (TCF v2.2), `__gpp`, `__uspapi`, `dataLayer` (Consent Mode v2), `navigator.globalPrivacyControl` |
| **DNS** | Chaîne CNAME de chaque sous-domaine tiers-first-party (détection de *CNAME cloaking*) |
| **Sécurité** | En-têtes CSP, `Referrer-Policy`, `Permissions-Policy`, HSTS, TLS |

### 5.4 Résolution du bandeau — le point technique le plus difficile

Détecter et actionner un bandeau inconnu est le vrai défi d'ingénierie. Stratégie en cascade :

1. **Détection par signature d'API** (fiable à ~85 %) : `window.__tcfapi`, `window.Cookiebot`, `window.axeptioSDK`, `OptanonWrapper`/`window.OneTrust`, `window.Didomi`, `tarteaucitron`, `window.cmp_*`, `window.Complianz`, `window.CookieYes`, `window.Osano`, `window.UC_UI` (Usercentrics), `window.klaro`, `window.Sirdata`, `__cmp` (TCF v1 legacy).
2. **Détection par sélecteur CSS** : base de ~180 sélecteurs connus par CMP, versionnée.
3. **Heuristique générique** (le différenciateur) : recherche d'un conteneur avec `position: fixed|sticky`, `z-index > 1000`, occupant > 4 % du viewport, contenant au moins un lexème du dictionnaire cookies FR/EN/DE/ES/IT/NL/PT, et au moins deux éléments cliquables.
4. **Classification des boutons** par lexique pondéré :
   - ACCEPT : `accepter`, `tout accepter`, `j'accepte`, `ok pour moi`, `continuer`, `autoriser`
   - REJECT : `refuser`, `tout refuser`, `continuer sans accepter`, `je refuse`, `non merci`
   - SETTINGS : `paramétrer`, `personnaliser`, `gérer mes choix`, `en savoir plus`
   - CLOSE : `×`, `fermer`, `dismiss`
5. **Fallback** : `scan.banner_resolution = "UNRESOLVED"` → le rapport le signale honnêtement plutôt que de produire un faux négatif. **Un scan qui admet son incertitude est plus crédible qu'un scan qui invente.**

> **Différenciateur mesurable.** Objectif : taux de résolution ≥ 92 % sur le top 10 000 FR, contre ~70–80 % pour les scanners du marché. On le mesure et on l'affiche publiquement (page « transparence du moteur »).

### 5.5 Modes de scan

| Mode | Pages | Durée | Usage |
|---|---|---|---|
| `quick` | Accueil seule | ~35 s | Scan gratuit public |
| `standard` | 25 pages (BFS depuis l'accueil) | ~6 min | Starter |
| `deep` | 250 pages + sitemap.xml | ~45 min | Pro |
| `full` | Illimité + parcours authentifié + tunnel de commande | 2–8 h | Enterprise |
| `funnel` | Parcours scripté (panier → paiement) | ~10 min | E-commerce |

Variations par mode : desktop + mobile (émulation), 3 géolocalisations (FR, DE, US via proxy sortant), avec et sans Do Not Track, avec et sans Global Privacy Control.

### 5.6 Éthique et légalité du crawl

- Respect de `robots.txt` en mode `deep`/`full` ; en mode `quick` sur une seule page publique demandée par un utilisateur, on se comporte comme un navigateur ordinaire — mais on l'annonce.
- User-Agent identifiable : `Mozilla/5.0 (...) KonsentBot/1.0 (+https://konsent.fr/bot)`.
- Rate limiting : max 1 req/s par domaine tiers, backoff exponentiel.
- Aucune tentative d'authentification non fournie par le client, aucun contournement de WAF, aucun test d'intrusion.
- Page `/bot` publique expliquant le comportement, avec adresse de désinscription.
- **Scan d'un domaine tiers** : autorisé pour le mode `quick` (observation publique, comme le fait tout navigateur), mais **le rapport complet et le monitoring exigent une preuve de propriété** (fichier `.well-known/konsent-verification.txt`, enregistrement DNS TXT, ou balise meta). Cela protège juridiquement et crée un rituel d'engagement.

---

## 6. M02 — Rulepack : le référentiel de ~110 règles

### 6.1 Principes de conception

- **Chaque règle est un objet versionné** portant : identifiant stable, famille, sévérité, référence normative précise (article + délibération + considérant), méthode de détection, message dirigeant, message technique, correctif, statut sous Digital Omnibus, date de dernière vérification.
- **Versionnement sémantique du rulepack** (`rulepack@2026.08.1`). Tout rapport indique la version utilisée → un rapport de janvier reste reproductible et explicable.
- **Séparation stricte constat / qualification.** La règle produit un *constat* factuel. La qualification juridique est toujours présentée comme une hypothèse indicative.
- **Chaque règle est testable** : un fichier de fixtures HTML/JS reproduit le cas positif et le cas négatif dans la CI.

### 6.2 Schéma d'une règle

```yaml
id: KZC-DEPOT-001
family: DEPOT
version: 2026.08.1
severity: CRITICAL          # CRITICAL | MAJOR | MODERATE | MINOR | INFO
weight: 25                  # points retirés du score
phase: [A]                  # phases de scan concernées
title: "Traceur publicitaire déposé avant recueil du consentement"
detection:
  type: cookie_present
  conditions:
    - phase: A
      cookie.category: advertising
      cookie.exempt: false
references:
  - "Article 82, loi n° 78-17 du 6 janvier 1978 modifiée"
  - "CNIL, lignes directrices, délibération n° 2020-091, pt. 22"
  - "RGPD, article 4(11) et article 7"
omnibus_status: "Maintenu — art. 88a §1 du projet COM(2025)837 conserve
                 l'exigence de consentement préalable pour le suivi inter-sites"
message_exec: "Un traceur publicitaire s'est déposé sur le terminal de vos
               visiteurs AVANT qu'ils aient pu donner ou refuser leur accord."
message_tech: "Cookie {name} sur {domain} observé en phase A à T+{ms}ms,
               initiateur : {initiator_stack}"
remediation:
  effort: MEDIUM
  billable: true
  price_hint_eur: [390, 890]
  snippet_ref: "snippets/consent-mode-v2-default-denied.md"
  steps: [...]
evidence_fields: [cookie, request, timing, initiator, screenshot_ref]
false_positive_notes: "Vérifier que le cookie n'est pas déposé par une
                       extension navigateur ou un proxy de test"
last_reviewed: 2026-07-15

### 6.3 Famille DEPOT — dépôt avant consentement (14 règles)

| ID | Sév. | Constat détecté | Référence principale |
|---|---|---|---|
| KZC-DEPOT-001 | CRITICAL | Cookie publicitaire déposé en phase A | Art. 82 · LD 2020-091 pt. 22 |
| KZC-DEPOT-002 | CRITICAL | Cookie de mesure d'audience non exempté déposé en phase A | Art. 82 · Recomm. 2020-092 |
| KZC-DEPOT-003 | CRITICAL | Cookie de réseau social déposé en phase A | Art. 82 |
| KZC-DEPOT-004 | MAJOR | Requête sortante vers un domaine publicitaire en phase A (même sans cookie) | Art. 82 (lecture d'informations : IP, UA) |
| KZC-DEPOT-005 | CRITICAL | Script tiers de tracking chargé en phase A | Art. 82 |
| KZC-DEPOT-006 | MAJOR | Pixel de conversion déclenché en phase A | Art. 82 |
| KZC-DEPOT-007 | CRITICAL | Traceur déposé au scroll sans clic (« poursuite de navigation » assimilée à consentement) | LD 2020-091 pt. 25 |
| KZC-DEPOT-008 | MAJOR | Cookie déposé par iframe tierce (YouTube, Maps, Vimeo) avant consentement | Art. 82 |
| KZC-DEPOT-009 | MAJOR | Google Fonts / CDN tiers chargé en phase A (transmission d'IP) | Art. 82 · LG München 3 O 17493/20 |
| KZC-DEPOT-010 | MAJOR | reCAPTCHA chargé en phase A hors périmètre strictement nécessaire | Art. 82 |
| KZC-DEPOT-011 | CRITICAL | Session replay actif en phase A (Hotjar, Clarity, FullStory, Contentsquare) | Art. 82 · risque données sensibles |
| KZC-DEPOT-012 | MAJOR | Chat/support tiers chargé en phase A | Art. 82 |
| KZC-DEPOT-013 | MODERATE | Preconnect / dns-prefetch vers domaine publicitaire en phase A | Art. 82 (signal faible) |
| KZC-DEPOT-014 | CRITICAL | Tag manager déclenchant des balises marketing sans condition de consentement | Art. 82 · art. 5.2 RGPD |

### 6.4 Famille REFUS — non-respect du refus (10 règles)

| ID | Sév. | Constat détecté | Référence |
|---|---|---|---|
| KZC-REFUS-001 | CRITICAL | Traceur non exempté présent en phase B (après refus explicite) | Art. 82 · RGPD art. 7(3) |
| KZC-REFUS-002 | CRITICAL | Requête vers domaine publicitaire après refus | Art. 82 |
| KZC-REFUS-003 | CRITICAL | Le refus n'est pas persisté : le bandeau se réaffiche à la page suivante | LD 2020-091 · RGPD art. 7(3) |
| KZC-REFUS-004 | MAJOR | Aucun cookie de mémorisation du refus déposé | Recomm. 2020-092 pt. 2.4 |
| KZC-REFUS-005 | MAJOR | Durée de mémorisation du refus < 6 mois | Recomm. 2020-092 (6 mois recommandé) · anticipation art. 88a |
| KZC-REFUS-006 | CRITICAL | Le TCString transmis après refus contient des finalités à `true` | TCF v2.2 · policy IAB |
| KZC-REFUS-007 | MAJOR | Consent Mode reste `granted` après refus | RGPD art. 7 |
| KZC-REFUS-008 | MAJOR | Service Worker persistant survivant au refus | Art. 82 |
| KZC-REFUS-009 | MODERATE | Le refus n'est pas propagé aux sous-domaines | Art. 82 |
| KZC-REFUS-010 | MAJOR | Re-sollicitation du consentement à chaque visite après refus | Anticipation art. 88a §5 (6 mois) |

### 6.5 Famille BANNER — conformité du bandeau (22 règles)

| ID | Sév. | Constat détecté | Référence |
|---|---|---|---|
| KZC-BANNER-001 | CRITICAL | Aucun bandeau détecté alors que des traceurs non exemptés sont présents | Art. 82 |
| KZC-BANNER-002 | CRITICAL | Aucun bouton de refus au premier niveau | LD 2020-091 pt. 32 · délib. sanctions 2021-2024 |
| KZC-BANNER-003 | CRITICAL | Refuser exige plus de clics qu'accepter | Recomm. 2020-092 pt. 2.2 |
| KZC-BANNER-004 | MAJOR | Asymétrie visuelle accepter/refuser : ratio de surface > 1,3 | Recomm. 2020-092 · dark pattern |
| KZC-BANNER-005 | MAJOR | Asymétrie de contraste : delta ratio WCAG > 2,0 entre les deux boutons | Recomm. 2020-092 |
| KZC-BANNER-006 | MAJOR | Bouton refus rendu comme lien texte face à un bouton accepter plein | Recomm. 2020-092 |
| KZC-BANNER-007 | CRITICAL | Case pré-cochée pour une finalité non essentielle | RGPD art. 4(11) · CJUE C-673/17 *Planet49* |
| KZC-BANNER-008 | CRITICAL | Bouton « Tout accepter » sans « Tout refuser » équivalent au niveau 2 | Recomm. 2020-092 |
| KZC-BANNER-009 | MAJOR | Absence de granularité par finalité | RGPD art. 4(11) « spécifique » |
| KZC-BANNER-010 | MAJOR | Finalités non listées ou libellés génériques (« améliorer votre expérience ») | RGPD art. 13 · LD 2020-091 pt. 27 |
| KZC-BANNER-011 | MAJOR | Identité du responsable de traitement absente du bandeau | LD 2020-091 pt. 28 |
| KZC-BANNER-012 | MAJOR | Liste des destinataires/vendors inaccessible depuis le bandeau | LD 2020-091 pt. 29 |
| KZC-BANNER-013 | MAJOR | Aucun lien vers la politique cookies depuis le bandeau | RGPD art. 12 |
| KZC-BANNER-014 | MAJOR | Aucun moyen de retirer son consentement après acceptation | RGPD art. 7(3) |
| KZC-BANNER-015 | MODERATE | Le lien de retrait est enfoui à plus de 2 clics de toute page | RGPD art. 7(3) « aussi simple » |
| KZC-BANNER-016 | MAJOR | Mur de cookies sans alternative ni justification (cookie wall) | LD 2020-091 pt. 12 · analyse au cas par cas |
| KZC-BANNER-017 | MAJOR | Offre « payer ou consentir » sans alternative équitable documentée | Avis CEPD 08/2024 |
| KZC-BANNER-018 | MODERATE | Fermeture par croix (×) assimilée à une acceptation | RGPD art. 4(11) |
| KZC-BANNER-019 | MODERATE | Bandeau bloquant l'accès au contenu sans possibilité de refus visible | Recomm. 2020-092 |
| KZC-BANNER-020 | MINOR | Bandeau non accessible au clavier / focus non piégé correctement | RGAA 4.1 · pont avec Konforme |
| KZC-BANNER-021 | MINOR | Contraste du texte du bandeau < 4,5:1 | WCAG 2.2 AA |
| KZC-BANNER-022 | MODERATE | Bandeau absent en version mobile ou tronqué sous 375 px | Recomm. 2020-092 |

### 6.6 Famille EXEMPT — mesure d'audience exemptée (6 règles)

| ID | Sév. | Constat | Référence |
|---|---|---|---|
| KZC-EXEMPT-001 | INFO | Configuration compatible avec l'exemption CNIL de mesure d'audience détectée | Recomm. CNIL mesure d'audience |
| KZC-EXEMPT-002 | MAJOR | Outil revendiqué exempté mais transmettant les données à un tiers | Exemption conditionnée à l'absence de recoupement |
| KZC-EXEMPT-003 | MAJOR | Durée de vie du cookie de mesure > 13 mois | Recomm. CNIL (13 mois) |
| KZC-EXEMPT-004 | MAJOR | Conservation des données > 25 mois | Recomm. CNIL |
| KZC-EXEMPT-005 | MODERATE | Adresse IP non tronquée dans l'outil de mesure exempté | Condition d'exemption |
| KZC-EXEMPT-006 | INFO | Éligibilité potentielle à l'exemption élargie du projet art. 88a §3 c) | COM(2025)837 — **non applicable à ce jour** |

### 6.7 Famille STORAGE — stockage alternatif (9 règles)

| ID | Sév. | Constat |
|---|---|---|
| KZC-STORAGE-001 | CRITICAL | Identifiant persistant écrit en localStorage en phase A |
| KZC-STORAGE-002 | MAJOR | Base IndexedDB créée par un tiers en phase A |
| KZC-STORAGE-003 | MAJOR | Service Worker enregistré en phase A |
| KZC-STORAGE-004 | MAJOR | CacheStorage utilisée à des fins de persistance d'identifiant |
| KZC-STORAGE-005 | MODERATE | sessionStorage contenant un identifiant de tracking |
| KZC-STORAGE-006 | MAJOR | Cookie first-party posé par un script tiers avec durée > 13 mois |
| KZC-STORAGE-007 | CRITICAL | **CNAME cloaking détecté** : sous-domaine first-party pointant vers un traceur tiers |
| KZC-STORAGE-008 | MAJOR | Tagging server-side non déclaré transmettant vers un tiers |
| KZC-STORAGE-009 | MODERATE | Cookie sans attribut `SameSite` ou `Secure` transmettant un identifiant |

### 6.8 Famille FP — fingerprinting (8 règles)

| ID | Sév. | Constat |
|---|---|---|
| KZC-FP-001 | CRITICAL | Canvas fingerprinting en phase A (`toDataURL`/`getImageData` après tracé) |
| KZC-FP-002 | CRITICAL | WebGL fingerprinting (`UNMASKED_RENDERER_WEBGL`) en phase A |
| KZC-FP-003 | MAJOR | AudioContext fingerprinting en phase A |
| KZC-FP-004 | MAJOR | Énumération de polices par mesure en phase A |
| KZC-FP-005 | MAJOR | Collecte de high-entropy client hints en phase A |
| KZC-FP-006 | MAJOR | `RTCPeerConnection` utilisée pour révéler l'IP locale |
| KZC-FP-007 | MODERATE | Agrégation de ≥ 6 signaux d'entropie par un même script |
| KZC-FP-008 | CRITICAL | Fingerprinting maintenu après refus (contournement) |

### 6.9 Famille CONSENT — mécanique et preuve du consentement (7 règles)

| ID | Sév. | Constat |
|---|---|---|
| KZC-CONSENT-001 | MAJOR | Aucune preuve de consentement conservée côté serveur (pas d'appel d'enregistrement observé) |
| KZC-CONSENT-002 | MAJOR | Consentement non horodaté / non versionné |
| KZC-CONSENT-003 | MODERATE | Aucune possibilité de télécharger la preuve de son propre consentement |
| KZC-CONSENT-004 | MAJOR | Durée de validité du consentement > 13 mois sans re-sollicitation |
| KZC-CONSENT-005 | MODERATE | Consentement multi-terminaux non conforme aux modalités de la recommandation CNIL de janvier 2026 |
| KZC-CONSENT-006 | MAJOR | Signal GPC (`navigator.globalPrivacyControl`) ignoré |
| KZC-CONSENT-007 | INFO | Absence de prise en charge des signaux navigateur (anticipation art. 88b) |

### 6.10 Famille TRANSFER — transferts hors UE (12 règles)

| ID | Sév. | Constat |
|---|---|---|
| KZC-TRANSFER-001 | CRITICAL | Requête en phase A vers une IP localisée hors EEE |
| KZC-TRANSFER-002 | CRITICAL | Destinataire situé dans un pays sans décision d'adéquation |
| KZC-TRANSFER-003 | MAJOR | Destinataire US non listé au Data Privacy Framework |
| KZC-TRANSFER-004 | MAJOR | Certification DPF du destinataire expirée ou retirée |
| KZC-TRANSFER-005 | CRITICAL | Destinataire situé en Chine / Russie / juridiction à accès étatique étendu |
| KZC-TRANSFER-006 | MAJOR | Transfert vers une maison mère US d'un fournisseur affiché comme européen |
| KZC-TRANSFER-007 | MAJOR | Aucune mention du transfert dans la politique de confidentialité |
| KZC-TRANSFER-008 | MAJOR | Aucune information sur les garanties (CCT/BCR) mise à disposition |
| KZC-TRANSFER-009 | MODERATE | ASN du destinataire appartenant à un opérateur hors EEE malgré une IP européenne |
| KZC-TRANSFER-010 | MODERATE | CDN à anycast global sans engagement de localisation |
| KZC-TRANSFER-011 | MAJOR | Données de santé / sensibles potentiellement transmises hors EEE |
| KZC-TRANSFER-012 | INFO | Transfert intra-EEE vers un pays tiers via un sous-traitant ultérieur non déclaré |

### 6.11 Famille VENDOR — destinataires et chaîne de sous-traitance (7 règles)

| ID | Sév. | Constat |
|---|---|---|
| KZC-VENDOR-001 | MAJOR | Destinataire tiers non listé dans la politique cookies |
| KZC-VENDOR-002 | MAJOR | Écart entre les vendors déclarés dans le CMP et les vendors réellement contactés |
| KZC-VENDOR-003 | MAJOR | Sous-traitant ultérieur non déclaré (chaîne de redirection publicitaire) |
| KZC-VENDOR-004 | CRITICAL | Enchère publicitaire en temps réel (RTB) déclenchée en phase A |
| KZC-VENDOR-005 | MAJOR | Cookie syncing détecté entre plateformes publicitaires |
| KZC-VENDOR-006 | MODERATE | Éditeur du traceur inconnu de la base — enrichissement manuel requis |
| KZC-VENDOR-007 | MAJOR | Nombre de destinataires distincts > 30 sans information proportionnée |

### 6.12 Famille TCF & CMV2 — interopérabilité publicitaire (14 règles)

| ID | Sév. | Constat |
|---|---|---|
| KZC-TCF-001 | MAJOR | `__tcfapi` absent alors que des vendors TCF sont sollicités |
| KZC-TCF-002 | MAJOR | TCString invalide ou non décodable |
| KZC-TCF-003 | MAJOR | CMP ID non enregistré auprès de l'IAB Europe |
| KZC-TCF-004 | MODERATE | Version de la GVL obsolète (> 30 jours) |
| KZC-TCF-005 | MAJOR | Vendors contactés absents du TCString |
| KZC-TCF-006 | MAJOR | Intérêt légitime invoqué pour des finalités publicitaires au sens du TCF |
| KZC-TCF-007 | MODERATE | Publisher restrictions non configurées |
| KZC-TCF-008 | MAJOR | TCString émis avant toute action de l'utilisateur |
| KZC-CMV2-001 | CRITICAL | Aucun `consent default` avant le chargement de gtag |
| KZC-CMV2-002 | CRITICAL | `ad_storage` ou `analytics_storage` en `granted` par défaut |
| KZC-CMV2-003 | MAJOR | `ad_user_data` / `ad_personalization` non gérés (obligatoires depuis mars 2024) |
| KZC-CMV2-004 | MAJOR | `wait_for_update` absent ou trop court (< 500 ms) |
| KZC-CMV2-005 | MODERATE | Mode avancé non implémenté (pings sans consentement) |
| KZC-CMV2-006 | MAJOR | `consent update` non émis après action de l'utilisateur |

### 6.13 Famille DOC — documents et information (18 règles)

| ID | Sév. | Constat |
|---|---|---|
| KZC-DOC-001 | CRITICAL | Aucune politique de confidentialité accessible |
| KZC-DOC-002 | CRITICAL | Aucunes mentions légales accessibles |
| KZC-DOC-003 | MAJOR | Aucune politique cookies distincte |
| KZC-DOC-004 | MAJOR | Politique de confidentialité non accessible depuis toutes les pages |
| KZC-DOC-005 | MAJOR | Identité et coordonnées du responsable de traitement manquantes | 
| KZC-DOC-006 | MAJOR | Coordonnées du DPO ou du référent absentes |
| KZC-DOC-007 | MAJOR | Finalités des traitements non énoncées |
| KZC-DOC-008 | MAJOR | Bases légales non indiquées par traitement |
| KZC-DOC-009 | MAJOR | Durées de conservation absentes ou renvoyant à « la durée nécessaire » sans précision |
| KZC-DOC-010 | MAJOR | Catégories de destinataires absentes |
| KZC-DOC-011 | MAJOR | Mention des transferts hors UE absente alors que le scan en détecte |
| KZC-DOC-012 | MAJOR | Droits des personnes non énumérés (accès, rectification, effacement, limitation, opposition, portabilité) |
| KZC-DOC-013 | MAJOR | Droit de réclamation auprès de la CNIL non mentionné |
| KZC-DOC-014 | MODERATE | Modalités d'exercice des droits absentes (canal, délai) |
| KZC-DOC-015 | MODERATE | Politique non datée / non versionnée |
| KZC-DOC-016 | MODERATE | Liste des cookies dans la politique désynchronisée du scan réel |
| KZC-DOC-017 | MAJOR | Hébergeur non identifié dans les mentions légales (LCEN art. 6-III) |
| KZC-DOC-018 | MODERATE | Politique disponible uniquement en français sur un site multilingue |

### 6.14 Famille SPECIAL & SEC — cas aggravants (12 règles)

| ID | Sév. | Constat |
|---|---|---|
| KZC-SPECIAL-001 | CRITICAL | Site à audience mineure (indices lexicaux/sectoriels) avec traceurs publicitaires |
| KZC-SPECIAL-002 | CRITICAL | Site de santé avec traceurs publicitaires en phase A |
| KZC-SPECIAL-003 | CRITICAL | Formulaire de données sensibles avec session replay actif |
| KZC-SPECIAL-004 | MAJOR | Champs de formulaire capturés par un tiers avant soumission (form jacking analytics) |
| KZC-SPECIAL-005 | MAJOR | Données d'URL sensibles transmises en query string à un tiers |
| KZC-SPECIAL-006 | MAJOR | Site de rencontre / opinion politique / syndical avec traceurs tiers |
| KZC-SEC-001 | MODERATE | Absence de HSTS |
| KZC-SEC-002 | MODERATE | Absence de `Referrer-Policy` restrictive (fuite d'URL vers tiers) |
| KZC-SEC-003 | MODERATE | CSP absente ou permissive (`unsafe-inline`) |
| KZC-SEC-004 | MAJOR | Formulaire transmis en clair (HTTP) |
| KZC-SEC-005 | MODERATE | `Permissions-Policy` absente (accès caméra/micro/géoloc non restreint) |
| KZC-SEC-006 | MINOR | Version de CMS/plugin obsolète exposée |

**Total V1 : 139 règles.** *(Le chiffre de 129 annoncé en v1.0 était une erreur d'addition : les tableaux §6.3 à §6.14 totalisent 139. Le rulepack livré en compte 139, un par ligne.)* Objectif V3 : 200+, avec extension mobile (SDK iOS/Android) et applications connectées.

### 6.15 Couche multi-juridiction

Axeptio affiche RGPD, PIPEDA, Loi 25, CCPA, nLPD et GPC (§0.2.1). Une V1 purement FR/UE nous ferme les agences qui ont un client canadien ou suisse, et prive le produit d'un argument que le concurrent utilise sur sa page d'accueil.

La réponse n'est pas d'écrire cinq rulepacks. C'est de reconnaître que **le constat technique est universel et que seule sa qualification change** : « un traceur publicitaire s'est déposé avant toute action de l'utilisateur » est le même fait observé à Lyon, à Montréal et en Californie. Ce qui diffère, c'est la norme qu'on lui oppose et la conséquence.

Chaque règle porte donc une carte de qualifications par juridiction :

```yaml
jurisdictions:
  FR: { applies: true,  basis: "Article 82, loi 78-17", regime: OPT_IN }
  EU: { applies: true,  basis: "Directive 2002/58/CE art. 5(3)", regime: OPT_IN }
  QC: { applies: true,  basis: "Loi 25, art. 8.1", regime: OPT_IN }
  CA: { applies: true,  basis: "LPRPDE/PIPEDA, principe 3", regime: OPT_IN_IMPLIED }
  CH: { applies: true,  basis: "nLPD art. 45c LTC", regime: OPT_OUT }
  US_CA: { applies: false, basis: "CCPA/CPRA §1798.120", regime: OPT_OUT,
           note: "Le dépôt préalable n'est pas en soi un manquement ;
                  le manquement porte sur l'absence de Do Not Sell et
                  sur le non-respect du signal GPC." }
```

Trois conséquences de conception :

1. **Le score est calculé par juridiction sélectionnée.** Un site français scanné en profil californien n'affiche pas le même score, et le rapport le dit explicitement. Afficher un score unique « international » serait une contre-vérité.
2. **Le régime `OPT_OUT` inverse la lecture des phases.** En Californie et en Suisse, la phase A ne produit pas de constat de dépôt ; c'est le non-respect du signal GPC en phase B qui devient central. La famille CONSENT prend le pas sur la famille DEPOT.
3. **`applies: false` n'est jamais silencieux.** La règle apparaît dans le rapport en « hors périmètre pour cette juridiction », avec son motif. Un rapport qui masque ce qu'il n'évalue pas est le défaut que nous reprochons au marché (§5.4).

Périmètre V1 : FR et UE pleinement qualifiés, QC / CA / CH / US_CA en qualification indicative avec avertissement renforcé. **La validation par un juriste de chaque juridiction est un prérequis à toute exploitation commerciale hors France** — au même titre que §21.2 pour les gabarits documentaires.

---

## 7. M03 — Tracker Intelligence

### 7.1 Sources de la base

| Source | Licence | Apport |
|---|---|---|
| DuckDuckGo Tracker Radar | Apache 2.0 | Domaines, entités propriétaires, catégories, prévalence |
| Open Cookie Database | CC-BY-SA | Correspondance nom de cookie → finalité, durée |
| EasyPrivacy / EasyList | GPL/CC-BY-SA | Motifs de domaines et de chemins publicitaires |
| Disconnect Tracker Protection | GPL-3.0 | Catégorisation par entité |
| IAB Europe Global Vendor List | Publique | Vendors TCF, finalités, durées déclarées |
| Data Privacy Framework List | Publique (dataprivacyframework.gov) | Statut de certification des entités US |
| MaxMind GeoLite2 / db-ip | CC-BY-SA | Géolocalisation IP, ASN |
| Registres d'entreprises (INSEE, INPI, OpenCorporates) | Ouvertes | Rattachement capitalistique, siège social |

**Point d'attention licences** : EasyPrivacy et Disconnect sont sous licences copyleft. Elles servent à **alimenter la détection interne** ; les listes elles-mêmes ne sont pas redistribuées. La base enrichie propriétaire (mapping domaine → entité → juridiction → statut DPF → texte de finalité en français) est constituée en propre et constitue un actif défendable.

### 7.2 Schéma d'un traceur

```json
{
  "domain": "connect.facebook.net",
  "entity": "Meta Platforms Ireland Ltd",
  "ultimate_parent": "Meta Platforms Inc. (US)",
  "hq_jurisdiction": "IE",
  "effective_jurisdiction": "US",
  "adequacy": "DPF_CONDITIONAL",
  "dpf_status": { "certified": true, "checked_at": "2026-08-01" },
  "categories": ["advertising", "social", "profiling"],
  "cookies": [
    { "name": "_fbp", "purpose": "Identifiant publicitaire de navigateur",
      "max_lifetime_days": 90, "is_identifier": true }
  ],
  "prevalence_fr": 0.312,
  "exempt_eligible": false,
  "purpose_fr": "Mesure des conversions publicitaires et ciblage sur Facebook et Instagram.",
  "risk_notes_fr": "Recoupement inter-sites à des fins publicitaires ; transfert vers les États-Unis.",
  "alternatives_eu": ["Matomo (auto-hébergé)", "Piano Analytics", "Plausible"],
  "sources": ["tracker-radar@2026.07", "GVL v3 vendor 755", "DPF list 2026-08-01"]
}
```

### 7.3 Le champ qui vend : `purpose_fr` et `risk_notes_fr`

Les scanners concurrents affichent « `_fbp` — advertising ». Konsent affiche : *« Meta Platforms Inc. reçoit l'adresse IP et un identifiant unique de chaque visiteur de votre site, y compris de ceux qui n'ont pas de compte Facebook, et les transfère aux États-Unis. »* La même donnée technique, rédigée pour un dirigeant. **Rédaction humaine une fois, réutilisée à l'infini, zéro coût LLM.**

Objectif V1 : 400 entités couvertes en français (couvre ~96 % des occurrences observées sur le web FR). Objectif V2 : 1 200.

---

## 8. M04 — Risk Engine : scoring et exposition

### 8.1 Score de conformité (0–100)

```
score_brut = 100 − Σ(poids_règle × facteur_occurrence)

facteur_occurrence = 1 + ln(n_occurrences) / 4     (rendements décroissants)

score_final = clamp(score_brut, 0, 100)
```

Plafonnements durs (règle du « plafond de verre ») :
- Au moins une règle **CRITICAL** de la famille DEPOT ou REFUS → **score plafonné à 45**.
- Absence de politique de confidentialité (`KZC-DOC-001`) → **score plafonné à 60**.
- Aucun bandeau + traceurs non exemptés (`KZC-BANNER-001`) → **score plafonné à 30**.

Ces plafonds évitent l'effet pervers d'un site truffé de bonnes pratiques mineures qui compenseraient un manquement grave. **Ils garantissent aussi que la quasi-totalité des sites scannés obtiendra un score alarmant — parce que c'est la réalité du terrain, pas une manipulation.**

### 8.2 Grille de lettres

| Score | Lettre | Libellé | Couleur |
|---|---|---|---|
| 90–100 | A | Écarts résiduels | Vert |
| 75–89 | B | Écarts limités | Vert clair |
| 60–74 | C | Écarts significatifs | Ambre |
| 40–59 | D | Écarts majeurs | Orange |
| 20–39 | E | Exposition élevée | Rouge |
| 0–19 | F | Exposition critique | Rouge sombre |

### 8.3 Moteur d'exposition théorique

```
Entrées : SIREN (via domaine → API Recherche d'entreprises), CA déclaré,
          effectif, secteur, nombre de manquements CRITICAL/MAJOR

Sortie (toujours étiquetée « plafonds théoriques ») :
  • Plafond RGPD art. 83(5)  = max(20 000 000 € ; 4 % × CA mondial)
  • Plafond pénal art. 226-16 = 300 000 € × 5 (personne morale)
  • Fourchette observée      = f(procédure simplifiée : médiane ~5 800 €,
                                 plafond 20 000 € par décision)
  • Coût de remise en conformité estimé (devis Kayzen)
  • Coût de l'inaction sur 24 mois (probabilité de contrôle × exposition)
```

**Affichage obligatoire côté produit — les trois chiffres ensemble :**

```
┌──────────────────────────────────────────────────────────┐
│  EXPOSITION THÉORIQUE MAXIMALE            180 000 €      │
│  (4 % de votre CA — plafond légal art. 83 RGPD)          │
│                                                          │
│  Fourchette réellement observée en 2026    2 000–20 000 €│
│  (procédure simplifiée CNIL, moyenne 5 815 €)            │
│                                                          │
│  Coût estimé de mise en conformité          1 490 €      │
│                                                          │
│  Ces montants sont indicatifs et ne préjugent            │
│  d'aucune décision d'une autorité de contrôle.           │
└──────────────────────────────────────────────────────────┘
```

L'écart entre 180 000 € et 1 490 € **est** l'argument de vente. Il n'a besoin d'aucune exagération.

### 8.4 Indice de probabilité de contrôle (V2, différenciateur fort)

Score 0–100 combinant des signaux publics : secteur figurant dans les priorités annoncées par la CNIL, présence de formulaires de données sensibles, audience estimée, présence sur des annuaires publics, historique de plaintes sectorielles, activité orientée mineurs. **Jamais présenté comme une prédiction** : « indice d'exposition au risque de contrôle », avec méthodologie publiée intégralement. La transparence méthodologique est ce qui distingue un outil sérieux d'un générateur d'angoisse.

---

## 9. M08 — Doc Factory : les 24 documents générés

### 9.1 Principe : le générateur à graphe de dépendances

La faiblesse de tous les générateurs du marché (y compris les modules « politique cookies » d'Axeptio, Cookiebot, Iubenda) : chaque document est un formulaire indépendant, l'utilisateur ressaisit dix fois les mêmes informations et les documents se contredisent.

Konsent introduit un **modèle de données unique de l'organisation** (`org_profile`), alimenté par trois canaux :

```
   Scan technique ──┐
   API entreprise ──┼──►  ORG_PROFILE  ──► 24 documents cohérents entre eux
   Questionnaire  ──┘     (source unique
                           de vérité)
```

Conséquence directe : **les cookies listés dans la politique cookies sont ceux réellement observés par le scan**, et la règle `KZC-DOC-016` (désynchronisation) devient auto-corrigée. Aucun concurrent ne relie le scanner au générateur documentaire de manière bidirectionnelle. C'est le différenciateur produit le plus difficile à copier.

### 9.2 Le catalogue

**Documents publics (site web)**

| # | Document | Base légale | Auto-rempli par |
|---|---|---|---|
| D01 | Politique de confidentialité | RGPD art. 12–14 | Scan + questionnaire |
| D02 | Politique de gestion des cookies | Art. 82 · LD 2020-091 | **Scan (100 %)** |
| D03 | Mentions légales | LCEN art. 6-III | API entreprise (SIREN, RCS, TVA, hébergeur via WHOIS/DNS) |
| D04 | Conditions générales d'utilisation | Contractuel | Questionnaire |
| D05 | Conditions générales de vente (e-commerce) | Code conso. | Questionnaire |
| D06 | Politique de confidentialité — version « facile à lire » | RGPD art. 12(1) langage clair | Réécriture structurée de D01 |
| D07 | Politique cookies multilingue (7 langues) | RGPD art. 12 | Traduction de gabarits pré-traduits |

**Documents internes (registre & gouvernance)**

| # | Document | Base légale |
|---|---|---|
| D08 | Registre des activités de traitement — responsable | RGPD art. 30(1) |
| D09 | Registre des activités de traitement — sous-traitant | RGPD art. 30(2) |
| D10 | Registre des violations de données | RGPD art. 33(5) |
| D11 | Registre des demandes d'exercice de droits | RGPD art. 12(3) |
| D12 | Registre des consentements (spécification technique) | RGPD art. 7(1) |
| D13 | Politique de conservation et de purge des données | RGPD art. 5(1)(e) |
| D14 | Politique de sécurité des systèmes d'information (socle) | RGPD art. 32 |
| D15 | Procédure de gestion des violations (72 h) | RGPD art. 33–34 |
| D16 | Procédure d'exercice des droits + 6 modèles de réponse | RGPD art. 15–22 |

**Documents d'analyse & contractuels**

| # | Document | Base légale |
|---|---|---|
| D17 | Analyse d'impact (AIPD/DPIA) pré-remplie + grille des 9 critères CEPD | RGPD art. 35 |
| D18 | Analyse d'impact des transferts (TIA) | Schrems II · recomm. CEPD 01/2020 |
| D19 | Contrat de sous-traitance (DPA) | RGPD art. 28(3) |
| D20 | Annexes CCT 2021 pré-remplies (modules 1 à 4) | Déc. 2021/914 |
| D21 | Accord de responsabilité conjointe | RGPD art. 26 |
| D22 | Clause de confidentialité pour contrats de travail | RGPD art. 32(4) |
| D23 | Note d'information des salariés + charte informatique | RGPD art. 13 · droit du travail |
| D24 | Lettre de désignation du DPO ou du référent RGPD | RGPD art. 37 |

**Bonus opérationnels (non « documents » mais livrables)**

- D25 — **Plan d'action de mise en conformité** priorisé, chiffré, avec échéances.
- D26 — **Dossier de réponse à un contrôle CNIL** : trame de réponse au questionnaire type + inventaire des pièces à produire.
- D27 — **Attestation d'audit technique** datée, versionnée, avec référence du rulepack et hash de l'archive de preuve.

### 9.3 Contraintes de génération

1. **Aucun LLM.** Gabarits Jinja2/Nunjucks + logique conditionnelle. Un document juridique généré par LLM est un risque de responsabilité inacceptable et un coût variable.
2. **Champs manquants visibles.** Toute variable non renseignée apparaît en surbrillance `[[À COMPLÉTER : nom du sous-traitant]]` — jamais silencieusement remplie. Un document qui invente est pire que pas de document.
3. **Traçabilité par clause.** Chaque paragraphe porte un identifiant `clause_id` et une référence normative, affichés en mode « expert ».
4. **Versionnement.** Chaque document généré est figé, horodaté, hashé. En cas d'évolution du gabarit, l'utilisateur est notifié qu'une nouvelle version est disponible — avec un diff.
5. **Formats de sortie** : PDF (WeasyPrint, charte Konsent), DOCX (python-docx, modifiable par l'avocat du client), HTML (à publier), Markdown, JSON structuré.
6. **Mention de génération** en pied de chaque document : *« Modèle généré par Konsent le [date] à partir du profil [ref]. Document à personnaliser et à faire valider par un professionnel du droit avant publication. »*

### 9.4 Le questionnaire adaptatif

Le questionnaire complet ferait 140 questions — personne ne le remplit. Solution : **arbre de décision qui n'expose que le nécessaire**, alimenté par ce que le scan sait déjà.

- Le scan a détecté un formulaire de contact → question sur la durée de conservation des demandes.
- Le scan a détecté Stripe → branche paiement, avec DPA Stripe pré-identifié.
- Le scan n'a détecté aucun formulaire → 22 questions au lieu de 140.

**Objectif : 8 minutes pour obtenir 12 documents cohérents.** C'est le « waouh » qui justifie l'abonnement Pro.

---

## 10. M09 — Evidence Vault : la preuve opposable

Fonctionnalité absente de tout le marché grand public, et argument massif auprès des DPO.

Chaque scan produit une archive `evidence-{scan_id}.zip` :

```
evidence-a7f3c2/
├── manifest.json           # rulepack version, UA, date UTC, config, hashes
├── report.pdf              # rapport lisible
├── network.har             # capture réseau complète des 3 phases
├── cookies-phase-{a,b,c}.json
├── storage-phase-{a,b,c}.json
├── dom-snapshot-{a,b,c}.html
├── screenshots/            # pleine page + zone bandeau annotée
├── findings.json           # constats structurés avec preuve liée
├── legal-pages/            # copies horodatées des pages légales
└── SHA256SUMS + signature.sig   # signature Ed25519 de KAYZEN LYON
```

**Horodatage.** V1 : signature interne Ed25519 + inscription du hash dans un journal en append-only. V2 : horodatage qualifié eIDAS auprès d'un prestataire de services de confiance (Universign, CertEurope) — vendu en add-on à 9 €/archive ou inclus en Enterprise. **C'est la seule chose du produit qui a une vraie valeur probatoire potentielle, et elle se vend cher.**

---

## 11. M10 à M12 — Monitoring, Remediation, Reg Watch

### 11.1 Monitoring & détection de régression

Le vrai problème des clients n'est pas d'être conforme un jour : c'est qu'un stagiaire ajoute un pixel TikTok trois mois plus tard.

- Re-scan planifié : mensuel (Starter), hebdomadaire (Pro), quotidien (Enterprise).
- **Moteur de diff** entre scans : nouveaux traceurs, nouveaux destinataires, changement de juridiction, régression de score, disparition d'une page légale.
- **Alertes** : e-mail, Slack, webhook, Teams. Message type : *« Un nouveau traceur (TikTok Analytics, ByteDance — Singapour) est apparu sur votre site le 14 septembre. Il se dépose avant consentement. »*
- **Timeline publique du domaine** : graphe du score dans le temps → matériel de reporting pour le DPO et pour l'agence.

### 11.2 Remediation — la couche qui monétise

Pour chaque constat, trois niveaux de sortie :

1. **Explication** — ce qui se passe, pourquoi c'est un écart, ce que ça implique.
2. **Correctif autonome** — snippet prêt à coller, par pile technique détectée (WordPress, Shopify, Next.js, GTM, PrestaShop, Webflow, Drupal, Wix). Exemple : configuration Consent Mode v2 avec `default denied`, blocage conditionnel de GTM, self-hosting de Google Fonts, remplacement d'iframe YouTube par `youtube-nocookie` avec facade de clic.
3. **Prise en charge Kayzen** — bouton « Faire corriger », devis pré-calculé à partir du nombre et du type de constats.

**Calcul automatique du devis** :

```
prix = forfait_base(490 €)
     + Σ(constats CRITICAL × 120 €)
     + Σ(constats MAJOR × 60 €)
     + pack_documentaire(690 € si demandé)
     + pose_CMP(390 €)
     × coefficient_pile (WordPress 1,0 · Shopify 1,2 · custom 1,5)
```

Le devis PDF est généré à la charte KAYZEN, avec IBAN, SIREN et mention de franchise en base de TVA (art. 293 B CGI) — cohérent avec la structure existante.

### 11.3 Reg Watch — le module qui crée la dépendance

Un tableau vivant, une ligne par règle du rulepack :

| Règle | Statut aujourd'hui | Sous Digital Omnibus (projet) | Échéance estimée | Action recommandée |
|---|---|---|---|---|
| KZC-REFUS-005 | Recommandé (6 mois) | **Obligatoire** — art. 88a §5 | 6 mois après entrée en vigueur | Configurer dès maintenant |
| KZC-EXEMPT-006 | Non applicable | Exemption possible mesure d'audience first-party | Incertain — avis CEPD/EDPS 2/2026 critique | Ne rien changer |
| KZC-CONSENT-007 | Non applicable | Signaux navigateur opposables — art. 88b | 24 mois après entrée en vigueur | Veille |

Alimenté par une veille manuelle hebdomadaire (2 h/semaine) sur : CNIL (délibérations, actualités, programme de travail), CEPD (lignes directrices, avis), EUR-Lex (COM(2025) 837 et son parcours législatif), CJUE, Conseil d'État. **Cette veille est aussi le carburant du blog et de la newsletter** — un seul effort, trois usages.

> **Pourquoi c'est le meilleur différenciateur.** Un dirigeant qui a payé pour être conforme veut savoir qu'il le restera. Un DPO qui doit justifier son budget a besoin d'un livrable mensuel. Reg Watch transforme un audit ponctuel en abonnement légitime, sans artifice.

---

## 12. M13 — Serveur MCP

C'est le levier de différenciation le plus fort sur le plan technique, et il est aligné sur ton cœur de compétence. **Konsent devient l'outil de conformité que les agents peuvent appeler.**

### 12.1 Cas d'usage

- Une agence pilote 60 sites clients depuis Claude : *« Scanne tous les domaines du client Dupont, liste ceux qui ont régressé ce mois-ci, prépare les e-mails d'alerte. »*
- Un DPO externalisé : *« Génère le registre art. 30 pour ces 4 structures à partir des profils existants et exporte en DOCX. »*
- Un développeur en CI : *« Avant merge, scanne la preview Vercel et bloque si un constat CRITICAL apparaît. »*

### 12.2 Tools exposés

| Tool | Entrée | Sortie |
|---|---|---|
| `konsent.scan_url` | url, mode, device, geo | scan_id, statut |
| `konsent.get_scan` | scan_id | score, constats, métadonnées |
| `konsent.await_scan` | scan_id, timeout | scan complet (polling encapsulé) |
| `konsent.crawl_site` | domain, max_pages | scan_id agrégé |
| `konsent.list_findings` | scan_id, severity?, family? | constats filtrés |
| `konsent.explain_rule` | rule_id | règle complète + références + statut Omnibus |
| `konsent.list_trackers` | scan_id | traceurs, entités, juridictions |
| `konsent.vendor_lookup` | domain \| entity | fiche Tracker Intelligence |
| `konsent.transfer_analysis` | scan_id | transferts, adéquation, statut DPF |
| `konsent.banner_audit` | scan_id | analyse UX du bandeau, dark patterns |
| `konsent.tcf_decode` | tcstring | finalités, vendors, LI, CMP ID |
| `konsent.consent_mode_audit` | scan_id | état Consent Mode v2 |
| `konsent.legal_pages_check` | domain | présence et complétude des pages légales |
| `konsent.diff_scans` | scan_id_a, scan_id_b | régressions et améliorations |
| `konsent.risk_exposure` | scan_id, siren? | exposition théorique chiffrée |
| `konsent.remediation_plan` | scan_id, stack | plan priorisé + snippets |
| `konsent.generate_quote` | scan_id | devis PDF chiffré |
| `konsent.list_templates` | — | catalogue des 24 documents |
| `konsent.generate_document` | template_id, org_profile_id, format | document (URL signée) |
| `konsent.upsert_org_profile` | champs | org_profile_id |
| `konsent.build_register` | org_profile_id, role | registre art. 30 |
| `konsent.dpia_assist` | org_profile_id, treatment_id | AIPD pré-remplie + grille CEPD |
| `konsent.monitor_add` | domain, frequency, webhook | monitor_id |
| `konsent.monitor_status` | monitor_id | historique et alertes |
| `konsent.evidence_bundle` | scan_id | URL signée de l'archive |
| `konsent.regwatch` | rule_id? \| since? | évolutions réglementaires |
| `konsent.benchmark_sector` | naf_code | distribution des scores du secteur |
| `konsent.export_report` | scan_id, format, branding | PDF / DOCX / JSON / CSV |

### 12.3 Resources

```
konsent://rulepack/{version}
konsent://rules/{rule_id}
konsent://scans/{scan_id}
konsent://scans/{scan_id}/har
konsent://vendors/{domain}
konsent://templates/{template_id}
konsent://orgs/{org_id}/profile
konsent://regwatch/latest
konsent://benchmarks/{naf_code}
```

### 12.4 Prompts

| Prompt | Usage |
|---|---|
| `audit_client_complet` | Scan → analyse → plan d'action → e-mail client, en un tour |
| `preparer_controle_cnil` | Assemble l'evidence bundle, le registre, les documents et la trame de réponse |
| `revue_mensuelle_portefeuille` | Pour une agence : diff de tous les domaines, synthèse par client |
| `onboarding_nouveau_client` | Scan + questionnaire guidé + génération du socle documentaire |
| `qualifier_lead` | Depuis un domaine : score, exposition, devis, e-mail d'approche |

### 12.5 Contraintes MCP

- **Chaque réponse d'outil embarque le disclaimer court** dans un champ `disclaimer`. Non désactivable.
- Authentification par clé API scopée, quotas par plan, journalisation intégrale des appels.
- Les outils de scan sont **asynchrones** (`scan_url` retourne immédiatement, `await_scan` encapsule le polling) pour ne pas bloquer un agent.
- Les outils de génération documentaire refusent de produire si `org_profile` est incomplet à plus de 30 % → renvoient la liste des champs manquants plutôt qu'un document inventé.
- Distribution : serveur MCP distant (HTTP streamable) + paquet npm `@kayzen/konsent-mcp` pour usage local.

---

## 13. API publique

`https://api.konsent.fr/v1`

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/scans` | Lancer un scan |
| GET | `/scans/{id}` | Récupérer un scan |
| GET | `/scans/{id}/findings` | Constats |
| GET | `/scans/{id}/evidence` | Archive de preuve (URL signée) |
| POST | `/crawls` | Crawl multi-pages |
| GET | `/rules` · `/rules/{id}` | Rulepack |
| GET | `/vendors/{domain}` | Tracker Intelligence |
| POST | `/orgs` · `PATCH /orgs/{id}` | Profil organisation |
| POST | `/documents` | Générer un document |
| GET | `/documents/{id}` | Télécharger |
| POST | `/monitors` | Créer une surveillance |
| GET | `/regwatch` | Veille réglementaire |
| GET | `/benchmarks/{naf}` | Benchmark sectoriel |
| POST | `/webhooks` | Abonnement événements |

Événements webhook : `scan.completed`, `scan.failed`, `finding.new`, `score.dropped`, `monitor.regression`, `document.ready`, `regwatch.update`.

**Actions différenciantes** : SDK JS/TS et Python publiés, action GitHub `kayzen/konsent-action` pour bloquer une PR en cas de régression, intégration Vercel (scan automatique de chaque preview deployment) — cohérente avec ton infrastructure existante.

---

## 14. Architecture technique

### 14.1 Stack

| Couche | Choix | Justification |
|---|---|---|
| Front | **Next.js 15 App Router, TypeScript strict, Tailwind v4** | Aligné sur ta stack agence |
| Auth | Better-Auth ou Clerk (EU) | Simplicité, MFA |
| API | Next.js Route Handlers + Hono pour l'API publique | Cohérence + perf |
| Base | **PostgreSQL (Neon)** + Drizzle ORM | Déjà en place |
| Queue | **BullMQ + Redis** (Upstash) ou Postgres `pgmq` | Scans asynchrones |
| Workers scan | **Node + Playwright en conteneur Docker**, sur Scaleway ou Hetzner (Allemagne/France) | Vercel ne convient pas au headless long — argument souveraineté en prime |
| Stockage | **Cloudflare R2** ou Scaleway Object Storage | HAR, screenshots, PDF |
| PDF | **WeasyPrint** (rapports, documents) | Ton outillage habituel |
| DOCX | python-docx | Documents modifiables |
| Analytics | Plausible (auto-hébergé) | Cohérence : un outil RGPD ne peut pas utiliser GA |
| E-mail | Resend | Déjà en place |
| Paiement | Stripe | Standard |
| Observabilité | Sentry + Grafana + Loki | — |

**Point de cohérence non négociable : konsent.fr doit obtenir 100/100 sur son propre scanner, sans bandeau cookies (aucun traceur non exempté), et l'afficher en page d'accueil.** C'est le meilleur argument marketing existant, et Axeptio ne peut structurellement pas s'en prévaloir.

### 14.2 Architecture des workers

```
   API (Vercel, EU)
        │  enqueue
        ▼
   Redis / BullMQ
        │
        ▼
   Pool de workers (Scaleway Paris — instances dédiées)
   ┌──────────────────────────────────────┐
   │ worker-1 .. worker-N                 │
   │  └─ conteneur Docker éphémère/scan   │
   │      ├─ Chromium (Playwright)        │
   │      ├─ proxy sortant loggé          │
   │      └─ résolveur DNS/GeoIP local    │
   └──────────────────────────────────────┘
        │  résultats
        ▼
   Postgres (findings) + R2 (artefacts)
```

Dimensionnement : un worker traite ~1 scan `quick` toutes les 40 s. 4 vCPU / 8 Go = 3 workers concurrents. **Coût marginal par scan `quick` : ~0,004 €.** 100 000 scans gratuits par mois coûtent ~400 € d'infrastructure — parfaitement soutenable comme budget d'acquisition, et supérieur en ROI à n'importe quelle campagne payante.

### 14.3 Modèle de données (extrait)

```
organizations(id, name, siren, naf, ca_declared, hq_country, plan, created_at)
users(id, org_id, email, role, mfa_enabled)
domains(id, org_id, hostname, verified_at, verification_method)
scans(id, domain_id, mode, device, geo, rulepack_version, status,
      score, grade, started_at, finished_at, evidence_hash)
snapshots(id, scan_id, phase, cookies_json, storage_json, dom_ref, screenshot_ref)
requests(id, scan_id, phase, url, etld1, method, type, ts_ms, remote_ip,
         asn, country, initiator_stack, set_cookie_headers)
findings(id, scan_id, rule_id, severity, weight, occurrences,
         evidence_json, status, contested_at)
trackers(domain, entity, parent, jurisdiction, adequacy, dpf_status,
         categories, purpose_fr, risk_notes_fr, updated_at)
rules(id, version, family, severity, weight, refs_json, messages_json,
      omnibus_status, last_reviewed)
org_profiles(id, org_id, answers_json, completeness_pct, updated_at)
documents(id, org_id, template_id, version, format, storage_ref,
          generated_at, content_hash)
monitors(id, domain_id, frequency, channels_json, last_run_at)
alerts(id, monitor_id, type, payload_json, sent_at)
facts(id, claim, value, source_url, source_name, verified_at)  -- §1.3
regwatch(id, rule_id, status, source_url, summary, effective_date)
quotes(id, scan_id, org_id, amount_eur, breakdown_json, pdf_ref, status)
api_keys(id, org_id, scopes, rate_limit, last_used_at)
audit_log(id, actor, action, target, ip, ts)   -- append-only
```

### 14.4 Design system (continuité Konforme / Nexus)

Konforme utilise `#2563eb` (bleu). Nexus est en blanc/neutre. **Konsent prend une identité propre mais familière** :

| Token | Valeur | Usage |
|---|---|---|
| `--k-primary` | `#0F766E` (teal 700) | Marque, CTA principal |
| `--k-primary-dark` | `#134E4A` | Fonds sombres |
| `--k-danger` | `#B91C1C` | Constats critiques |
| `--k-warn` | `#B45309` | Constats majeurs |
| `--k-ok` | `#15803D` | Conforme |
| `--k-ink` | `#0B1220` | Texte |
| `--k-surface` | `#F8FAFC` | Fonds |

Le teal est délibéré : le rouge est réservé aux constats, pas à la marque. Une marque rouge sur un produit qui affiche du rouge partout devient illisible. Le teal évoque l'audit et la neutralité — cohérent avec le positionnement « tiers de confiance ».

Typographie : Inter Variable (UI) + Instrument Serif ou Fraunces (titres éditoriaux, pour trancher avec le SaaS générique). Rapports PDF : Inter + tabulaire pour les données.

Composants signature : la **timeline de dépôt** (§3.1), la **carte des transferts** (globe/planisphère avec flux sortants animés), le **compteur de score animé**, la **grille des destinataires** avec drapeaux et statut d'adéquation.

---

## 15. Modèle économique

### 15.1 Grille tarifaire

| Plan | Prix | Domaines | Pages/scan | Fréquence | Documents | API/MCP |
|---|---|---|---|---|---|---|
| **Scan libre** | 0 € | illimité | 1 | 1/jour/domaine | — | — |
| **Starter** | 29 €/mois | 1 | 25 | mensuelle | 6 | — |
| **Pro** | 89 €/mois | 5 | 250 | hebdomadaire | 24 | ✔ 5 000 appels |
| **Agence** | 249 €/mois | 25 | 250 | hebdomadaire | 24 + white-label | ✔ 25 000 |
| **Enterprise** | dès 690 €/mois | illimité | illimité | quotidienne | 24 + sur-mesure | ✔ illimité + SSO + on-prem |
| **Secteur public** | 490 €/an | 3 | 250 | mensuelle | 24 | — |

Engagement annuel : −20 %. Offre de lancement « fondateurs » : 199 € à vie pour les 100 premiers comptes Pro (fait le bruit initial et finance le développement).

### 15.2 Prestations (marge réelle)

| Prestation | Prix | Marge |
|---|---|---|
| Mise en conformité technique standard | 1 490 € | ~75 % |
| Mise en conformité e-commerce / multi-domaines | 2 900 € | ~70 % |
| Pose + configuration CMP (agnostique) | 890 € | ~80 % |
| Pack documentaire rédigé et personnalisé | 690 € | ~85 % |
| Accompagnement contrôle CNIL | 1 900 € | ~80 % |
| Référent RGPD externalisé | 190 €/mois | récurrent |
| Horodatage qualifié eIDAS | 9 €/archive | ~60 % |
| Formation équipe (½ journée, distanciel) | 690 € | ~90 % |

### 15.3 Projection à 24 mois (hypothèse prudente)

| | M6 | M12 | M18 | M24 |
|---|---|---|---|---|
| Scans gratuits/mois | 3 000 | 18 000 | 45 000 | 90 000 |
| Comptes payants | 25 | 140 | 380 | 750 |
| MRR | 1 400 € | 9 200 € | 27 000 € | 58 000 € |
| Prestations/mois | 2 | 6 | 12 | 20 |
| CA prestations/mois | 3 000 € | 9 500 € | 19 000 € | 32 000 € |
| **CA mensuel total** | **4 400 €** | **18 700 €** | **46 000 €** | **90 000 €** |

Taux de conversion retenu : 0,8 % scan gratuit → payant ; 0,15 % scan gratuit → prestation. Conservateur : le taux réel des outils d'audit à verdict alarmant se situe généralement entre 1 et 3 %.

---

## 16. Les 120 différenciateurs face à Axeptio et au marché

> Classés par famille. Chaque ligne est implémentable et vérifiable. Les mentions « inédit » signalent qu'aucun acteur grand public européen ne le propose à ce jour.

### A. Moteur de scan (1–20)

1. **Protocole en trois phases** (avant consentement / après refus / après acceptation) là où les scanners du marché n'observent qu'un état.
2. **Phase D de persistance du refus** : vérification que le refus survit à une nouvelle visite. *Inédit.*
3. Mesure du **nombre de clics nécessaires pour refuser** vs accepter, chiffrée. *Inédit.*
4. **Timeline millisecondée** des dépôts, affichée comme preuve visuelle.
5. Capture de la **pile d'appel JavaScript** à l'origine de chaque cookie — permet de désigner le script fautif, pas seulement le cookie.
6. Détection du **CNAME cloaking** par résolution de la chaîne DNS. *Inédit sur le marché FR grand public.*
7. Détection du **tagging server-side** non déclaré.
8. Instrumentation de **8 familles de fingerprinting** avec comptage d'entropie agrégée.
9. Détection du fingerprinting **maintenu après refus** (contournement caractérisé).
10. Inventaire complet du **stockage alternatif** : IndexedDB, CacheStorage, Service Workers, WebSQL.
11. Test de la **poursuite de navigation** (scroll) comme consentement implicite.
12. Scan **mobile émulé** distinct du desktop, avec constats propres.
13. Scan **multi-géographies** (FR / DE / US) révélant les comportements différenciés par région.
14. Test avec et sans **Global Privacy Control** et **Do Not Track**.
15. **Mode tunnel e-commerce** : scan du parcours panier → paiement, là où tous les scanners s'arrêtent à l'accueil.
16. **Scan authentifié** (espace client) en Enterprise.
17. **Heuristique générique de détection de bandeau** en fallback des signatures — taux de résolution visé ≥ 92 %, publié et mesuré.
18. **Aveu d'incertitude explicite** quand le bandeau n'est pas résolu, au lieu d'un faux négatif silencieux.
19. Détection des **iframes tierces** (YouTube, Maps, Vimeo, Spotify) et de leurs dépôts propres.
20. Détection du **form jacking analytics** : champs de formulaire lus par un tiers avant soumission.

### B. Référentiel réglementaire (21–35)

21. **Rulepack versionné** (`rulepack@2026.08.1`) rendant chaque rapport reproductible et explicable a posteriori. *Inédit.*
22. **139 règles documentées publiquement**, avec référence normative à l'article et au point de délibération.
23. **Référentiel entièrement ouvert en consultation** sur le site — argument de crédibilité et actif SEO massif.
24. **Statut Digital Omnibus par règle** : ce que dit le droit aujourd'hui, ce que dirait le projet 88a/88b. *Inédit.*
25. Séparation formelle **constat technique / hypothèse juridique** dans toute la chaîne.
26. **Bouton « contester ce constat »** sur chaque ligne, alimentant l'amélioration du moteur.
27. **Fixtures de test par règle** en CI : chaque règle a un cas positif et négatif reproductible.
28. Prise en compte de la **recommandation CNIL de janvier 2026 sur le consentement multi-terminaux**.
29. Contrôle des **durées de vie** (13 mois cookie / 25 mois données) automatisé.
30. Détection de l'éligibilité à l'**exemption de mesure d'audience** avec ses conditions cumulatives.
31. **Score plafonné** en présence d'un manquement grave — évite les scores flatteurs trompeurs.
32. Traitement des **cookie walls** et des offres « payer ou consentir » au regard de l'avis CEPD 08/2024.
33. Règles aggravantes pour les **sites à audience mineure** et les **sites de santé**.
34. Détection des **enchères RTB** déclenchées avant consentement.
35. Contrôle de la **cohérence vendors déclarés / vendors réellement contactés**.

### C. Transferts & souveraineté (36–45)

36. **Résolution IP + ASN + juridiction** pour chaque destinataire, pas seulement le nom de domaine.
37. **Vérification en temps réel du statut Data Privacy Framework** contre la liste officielle. *Inédit en France.*
38. Détection des **certifications DPF expirées ou retirées**.
39. Remontée au **groupe capitalistique ultime** : un fournisseur « européen » filiale d'un groupe US est signalé.
40. **Cartographie visuelle des flux** sortants sur planisphère — le visuel qui fait le plus peur, et il est exact.
41. Détection des juridictions à **accès étatique étendu** (CN, RU) avec note contextuelle.
42. **Suggestion systématique d'alternatives européennes** pour chaque traceur non-EEE (Matomo, Piano, Plausible, Scaleway, OVH). Axeptio n'a aucun intérêt à le faire ; toi si — c'est de la prestation.
43. **Score de souveraineté numérique** distinct du score de conformité. *Inédit.*
44. **Badge « 100 % EEE »** délivrable et vérifiable publiquement.
45. Analyse d'impact des transferts (**TIA**) générée automatiquement pour chaque destinataire hors adéquation.

### D. Documentaire & juridique (46–62)

46. **24 documents générés**, contre 1 à 3 chez les CMP concurrentes.
47. **Modèle de données unique** (`org_profile`) garantissant la cohérence entre tous les documents. *Inédit.*
48. **Politique cookies alimentée directement par le scan** — jamais désynchronisée.
49. **Détection automatique de la désynchronisation** entre politique publiée et réalité observée.
50. **Registre art. 30** généré, en versions responsable et sous-traitant.
51. **AIPD pré-remplie** avec la grille des 9 critères CEPD.
52. **Annexes CCT 2021** pré-remplies par module.
53. **DPA art. 28** générable pour la chaîne de sous-traitance identifiée par le scan.
54. **Mentions légales auto-remplies** depuis le SIREN (API entreprise) et l'hébergeur (WHOIS/DNS).
55. **Version « facile à lire »** de la politique de confidentialité au titre de l'art. 12(1) — pont avec ton expertise accessibilité (Konforme).
56. **Politique cookies en 7 langues** générée simultanément.
57. **Champs manquants affichés en clair** `[[À COMPLÉTER]]` — le générateur n'invente jamais.
58. **Traçabilité par clause** : chaque paragraphe porte son fondement normatif, consultable.
59. **Export DOCX** pour que l'avocat du client puisse amender — les concurrents livrent du PDF fermé.
60. **Notification de mise à jour de gabarit** avec diff, quand la doctrine évolue.
61. **Questionnaire adaptatif** : 22 questions au lieu de 140 selon ce que le scan a déjà établi.
62. **Zéro LLM dans la génération documentaire** — coût nul, sortie déterministe, aucun risque d'hallucination juridique.

### E. Preuve & contrôle (63–70)

63. **Evidence Vault** : archive complète HAR + DOM + captures + hashes. *Inédit sur ce segment.*
64. **Signature Ed25519** et journal append-only des hashes.
65. **Horodatage qualifié eIDAS** en option payante.
66. **Attestation d'audit technique** datée et référencée au rulepack.
67. **Dossier de réponse à un contrôle CNIL** : trame + inventaire des pièces.
68. **Historique horodaté de diligence** — répond au vrai besoin du DPO : prouver qu'il a contrôlé.
69. **Journal d'audit append-only** de toutes les actions du compte.
70. **Export intégral des données du compte** en un clic (le produit applique à lui-même l'art. 20).

### F. Monitoring & régression (71–78)

71. **Moteur de diff entre scans** avec qualification des régressions.
72. **Alerte nominative** : « un pixel TikTok est apparu le 14 septembre ».
73. **Timeline du score** dans le temps, exportable en reporting.
74. **Alertes multi-canal** : e-mail, Slack, Teams, webhook.
75. **Détection de disparition d'une page légale** (un site refait perd souvent ses mentions).
76. **Surveillance des changements de juridiction** d'un fournisseur (rachat, migration).
77. **Alerte Reg Watch** quand une évolution réglementaire impacte une règle déclenchée chez le client.
78. **Rapport mensuel automatique** envoyé au dirigeant, sans connexion nécessaire.

### G. Agence & revendeur (79–88)

79. **White-label complet** : domaine, logo, couleurs, mentions de l'agence.
80. **Rapports PDF à la marque de l'agence**, sans mention Konsent.
81. **Multi-tenant** avec sous-comptes clients et cloisonnement.
82. **Vue portefeuille** : 60 domaines, scores, régressions, sur un écran.
83. **Marge revendeur** : l'agence achète 249 €, revend 79 €/client × 10.
84. **Devis client généré à la marque de l'agence**, avec sa propre grille tarifaire.
85. **Programme d'apporteur d'affaires** : 20 % récurrent sur 12 mois.
86. **Annuaire public d'agences certifiées Konsent** — génère des leads pour eux, du référencement pour toi.
87. **Certification Konsent** (examen en ligne, 290 €) : monétise la formation et crée un réseau captif.
88. **Onboarding en masse** : import CSV de 100 domaines, scan groupé, rapport consolidé.

### H. Développeur, API & agentique (89–100)

89. **Serveur MCP complet, 28 outils.** *Inédit dans le secteur de la conformité européenne.* C'est ton avantage structurel.
90. **Prompts MCP métier** prêts à l'emploi (audit client, préparation de contrôle, revue de portefeuille).
91. **Action GitHub** bloquant une PR sur régression de conformité.
92. **Intégration Vercel** : scan automatique de chaque preview deployment.
93. **SDK TypeScript et Python** publiés et documentés.
94. **Webhooks** sur 7 événements.
95. **Rulepack consultable par API** — les intégrateurs peuvent construire dessus.
96. **Export JSON structuré** de tous les constats, avec preuve liée.
97. **CLI** `npx @kayzen/konsent scan example.com`.
98. **Extension navigateur** pour scanner la page courante en un clic.
99. **Mode CI local** en conteneur, pour les clients qui refusent d'exposer leurs préprods.
100. **Documentation OpenAPI 3.1** complète, avec bac à sable.

### I. Expérience dirigeant & persuasion honnête (101–110)

101. **Résultat en moins de 40 secondes**, sans inscription, sans carte bancaire.
102. **Exposition théorique calculée sur le CA réel** du client via son SIREN.
103. **Affichage simultané du plafond légal et de la fourchette réellement observée** — la crédibilité renforce l'effet, elle ne l'affaiblit pas.
104. **Benchmark sectoriel anonymisé** : « 78 % des sites de votre secteur font mieux ».
105. **Traceurs traduits en langage dirigeant** (`purpose_fr`, `risk_notes_fr`), pas en jargon technique.
106. **Aucun logo d'autorité, aucune mise en demeure simulée** — la peur repose uniquement sur des faits sourcés.
107. **Chaque chiffre affiché porte sa source et sa date de vérification**, stockées en base.
108. **Disclaimer canonique** présent sur tous les canaux, y compris les réponses d'API et MCP.
109. **Trois niveaux de lecture** : dirigeant / DPO / développeur, sur le même rapport.
110. **Rapport PDF conçu pour être transféré** au comité de direction ou à l'expert-comptable — c'est lui qui vend, pas l'écran.

### J. Modèle & mise sur le marché (111–120)

111. **Neutralité vis-à-vis des CMP** : Konsent audite Axeptio, Didomi, OneTrust, Cookiebot sans conflit d'intérêt. Position structurellement inaccessible aux concurrents.
112. **Konsent obtient 100/100 sur son propre scanner, sans bandeau** — preuve par l'exemple.
113. **Infrastructure de scan hébergée en France** (Scaleway), argument de souveraineté vérifiable.
114. **Analytics auto-hébergé** (Plausible), aucun traceur tiers sur le produit.
115. **Tarif secteur public dédié** (490 €/an) ouvrant les marchés des collectivités — segment où tu as déjà une expérience de réponse à appel d'offres.
116. **SEO programmatique** sur 25 000+ pages (§17) : chaque traceur, chaque règle, chaque secteur, chaque ville.
117. **Reg Watch comme produit d'appel éditorial** : une veille hebdomadaire qui alimente blog, newsletter et rétention avec un seul effort.
118. **Prestation de correction intégrée au produit** — la boucle audit → devis → correction → ré-audit → badge est fermée dans un seul outil. Aucune CMP ne peut la fermer.
119. **Cohérence de gamme Kayzen** : Konforme (accessibilité) + Nexus (visibilité) + Konsent (conformité) = une suite pour l'agence, avec vente croisée native et un socle technique mutualisé.
120. **Scan croisé multi-référentiels** : un seul passage de navigateur produit à la fois les constats RGPD, les constats RGAA/WCAG et les constats de performance. **Un seul crawl, trois produits.** C'est le levier d'efficience que ta position multi-produits te donne et que personne d'autre n'a.

---

## 17. Go-to-market

### 17.1 SEO programmatique — l'actif principal

| Gabarit | Volume | Exemple d'URL |
|---|---|---|
| Fiche traceur | 1 200 | `/traceurs/google-analytics-4` |
| Fiche règle | 139 | `/regles/kzc-depot-001-cookie-avant-consentement` |
| Fiche cookie | 3 500 | `/cookies/_fbp` |
| Comparatif CMP | 40 | `/comparatifs/axeptio-vs-didomi` |
| Audit sectoriel | 730 (NAF) | `/secteurs/restauration/conformite-cookies` |
| Audit local | 500 villes | `/lyon/conformite-rgpd-site-web` |
| Guide par CMS | 25 | `/guides/wordpress-cookies-rgpd` |
| Guide par outil | 300 | `/guides/bloquer-hotjar-avant-consentement` |
| Baromètre | 52/an | `/barometre/aout-2026` |
| Glossaire | 200 | `/glossaire/dark-pattern` |

**~6 700 pages en V1, 25 000 en V2.** Toutes générées depuis la base — coût marginal nul. Tu as déjà fait exactement ça sur Nexus : le savoir-faire est acquis.

### 17.2 Le baromètre — la machine à relations presse

Scanner mensuellement le **top 1 000 des sites français** et publier : taux de non-conformité, classements sectoriels, traceurs les plus répandus, évolution. Livrable public, gratuit, chiffré, reproductible.

C'est ce qui a fait la notoriété d'acteurs comme Cookiebot en Europe du Nord. Coût : ~4 €/mois d'infrastructure. Retombées : presse spécialisée, LinkedIn, citations par les cabinets d'avocats et les DPO. **Meilleur ratio effort/notoriété de tout le plan.**

Précaution : publier les **agrégats sectoriels**, et ne nommer des sites individuels qu'avec une méthodologie irréprochable, un droit de réponse et un délai de correction préalable. Le baromètre nommant des entreprises se défend, mais il expose ; commencer par les agrégats.

### 17.3 Séquences de conversion

**Scan gratuit → e-mail** : le rapport complet exige l'e-mail. Objet : *« Votre rapport : 14 traceurs déposés avant consentement sur [domaine] »*.

**Séquence 6 e-mails sur 21 jours** :
1. J+0 — Le rapport PDF complet.
2. J+2 — Les 3 constats les plus graves, expliqués en 300 mots.
3. J+5 — « Où partent les données de vos visiteurs » (carte des transferts).
4. J+9 — Sanctions récentes dans son secteur (sourcées, factuelles).
5. J+14 — Ce qui change avec le Digital Omnibus.
6. J+21 — Offre : correction à 1 490 € ou abonnement à 29 €.

**Partenariats prescripteurs** : experts-comptables (qui voient tous les dirigeants), avocats en droit du numérique, DPO mutualisés, agences web. Le programme certification (§16, n°87) est le véhicule.

---

## 18. Roadmap

### 18.0 État réel au 8 août 2026, et ce qu'il impose

Le plan ci-dessous a été suivi **en largeur** : des lots de P0, P1, P2 et P3 ont été livrés en parallèle, au lieu de fermer un jalon avant d'ouvrir le suivant. Constat chiffré sur le dépôt :

| | Livré | Cible | |
|---|---|---|---|
| Règles du rulepack | 96 | 139 | famille TCF entièrement absente |
| Fiches traceurs | 69 | 400 (V1) | |
| Documents générés | 7 | 27 | |
| Outils MCP | 6 | 28 | |
| Pages SEO | 185 | 6 700 | |
| Signatures CMP | 9 | 15 | |
| CI et fixtures par règle | **0** | 139 | mitigation n°1 du §20, absente |
| Auth · Stripe · dashboard · PDF | **0** | — | `package.json` : `next`, `react`, `react-dom` |

**La conséquence structurelle est simple : aucun jalon après P0 ne peut se fermer, y compris ceux dont les modules sont écrits.** La couche agence est codée mais invendable sans sous-comptes ; le monitoring tourne mais sans facturation ; l'API existe mais sans clés. Tout ce qui a été sauté — comptes, paiement, persistance — n'est pas une phase, c'est **une colonne vertébrale** qui traverse P1, P2 et P3.

Deuxième constat, plus gênant : **le jalon P0 lui-même est dégradé.** La production exécute le moteur statique ; le worker trois phases existe mais n'est pas branché. 49 des 96 règles sortent en « non évalué ». Le produit tient sa promesse d'honnêteté (il ne compte jamais une règle non évaluée comme satisfaite) mais pas sa promesse de verdict.

### 18.0.1 Séquence révisée

L'ordre ci-dessous remplace la lecture P0→P5 pour la suite des travaux. Il est dicté par une règle unique : **ne rien ajouter qui ne serve à fermer un jalon.**

| # | Lot | Ferme |
|---|---|---|
| 1 | Rulepack 96 → 139, famille TCF, décodeur TCString, audit CMv2 | crédibilité P0 |
| 2 | **CI + fixtures par règle** | risque n°1 du §20 |
| 3 | Couche multi-juridiction (§6.15) | parité concurrentielle |
| 4 | Branchement du worker trois phases | **jalon P0** |
| 5 | Base traceurs 69 → 200+ | qualité du rapport |
| 6 | Rapport imprimable, trois niveaux de lecture | P1 |
| 7 | Comptes, vérification de domaine, quotas | **colonne vertébrale** |
| 8 | Stripe | **jalon P1** |
| 9 | Doc Factory 7 → 24 | P2 |
| 10 | Sous-comptes agence cloisonnés | **jalon P2** |
| 11 | MCP 6 → 28, clés API, OpenAPI | **jalon P3** |
| 12 | SEO 185 → 1 500+, baromètre, Academy, annuaire | acquisition |

Les efforts en j·h des tableaux d'origine restent valables pour ce qui n'est pas fait. Ils sont conservés ci-dessous comme référence de chiffrage.

### Phase 0 — Fondation (semaines 1–4) · ~22 j·h

| Lot | Livrable | Effort |
|---|---|---|
| Infra | Repo, CI/CD, Postgres Neon, worker Docker Scaleway | 3 j |
| Scan Engine v1 | Phases A/B/C, capture réseau + cookies + storage | 6 j |
| Détection bandeau | Signatures 15 CMP + heuristique générique | 4 j |
| Rulepack v1 | 45 règles (DEPOT, REFUS, BANNER, DOC) | 4 j |
| Tracker DB v1 | Ingestion Tracker Radar + Open Cookie DB + 150 fiches FR | 3 j |
| Landing + scan public | Page d'accueil, formulaire, résultat, capture e-mail | 2 j |

**Jalon P0 :** un inconnu saisit son domaine et obtient un verdict crédible en 40 s. **C'est le seul jalon qui compte vraiment** — tout le reste en découle.

### Phase 1 — MVP monétisable (semaines 5–12) · ~40 j·h

| Lot | Livrable | Effort |
|---|---|---|
| Auth & comptes | Inscription, vérification de domaine, rôles | 3 j |
| Dashboard | Historique, détail des constats, filtres | 5 j |
| Rapport PDF | WeasyPrint, charte Konsent, 3 niveaux de lecture | 4 j |
| Rulepack v2 | +45 règles (STORAGE, FP, TRANSFER, EXEMPT) | 5 j |
| Transfer Analyzer | GeoIP, ASN, adéquation, DPF, carte | 5 j |
| Banner Auditor | Dark patterns, contrastes, surfaces, comptage de clics | 4 j |
| Doc Factory v1 | `org_profile`, questionnaire adaptatif, 6 documents | 8 j |
| Stripe | Plans, facturation, quotas | 3 j |
| SEO v1 | 1 500 pages programmatiques | 3 j |

**Jalon P1 :** premier euro encaissé.

### Phase 2 — Profondeur & agences (semaines 13–24) · ~55 j·h

| Lot | Effort |
|---|---|
| Crawl multi-pages (25/250) + mode tunnel e-commerce | 6 j |
| Monitoring, diff, alertes multi-canal | 6 j |
| Doc Factory v2 : les 24 documents + DOCX + multilingue | 12 j |
| Evidence Vault + signature + attestation | 5 j |
| Rulepack v3 : 139 règles (TCF, CMV2, VENDOR, SPECIAL, SEC) | 6 j |
| Couche agence : white-label, multi-tenant, portefeuille | 8 j |
| Remediation : snippets par pile, devis automatique | 5 j |
| Reg Watch v1 | 4 j |
| SEO v2 : 6 700 pages + baromètre mensuel | 3 j |

**Jalon P2 :** une agence gère 25 clients et facture avec ta marque.

### Phase 3 — API & MCP (semaines 25–32) · ~30 j·h

| Lot | Effort |
|---|---|
| API publique v1 + OpenAPI + clés + quotas | 8 j |
| Serveur MCP, 28 outils, resources, prompts | 10 j |
| SDK TS + Python | 4 j |
| Action GitHub + intégration Vercel | 4 j |
| CLI + extension navigateur | 4 j |

**Jalon P3 :** Konsent devient un outil appelable par un agent — et le seul de sa catégorie en Europe.

### Phase 4 — Expansion européenne (semaines 33–52) · ~60 j·h

- Rulepacks nationaux : Belgique (APD), Allemagne (TTDSG/DSK), Espagne (AEPD), Italie (Garante), Pays-Bas (AP).
- Interface et documents en 7 langues.
- Scan d'applications mobiles (analyse statique d'APK/IPA + proxy MITM sur émulateur).
- Marketplace de plugins : WordPress, Shopify, PrestaShop, Webflow.
- Horodatage qualifié eIDAS.
- Certification Konsent et annuaire d'agences.

### Phase 5 — Consolidation (an 2)

- Score de souveraineté numérique comme produit autonome.
- **Scan croisé multi-référentiels** : mutualisation du crawl entre Konsent, Konforme et Nexus (§16, n°120) — le chantier technique à plus fort effet de levier de toute la gamme.
- Éventuelle CMP Konsent, uniquement si la demande client le justifie — et en assumant qu'elle affaiblit l'argument de neutralité. **À arbitrer, pas à présumer.**

---

## 19. KPIs

| Catégorie | Indicateur | Cible M12 |
|---|---|---|
| Acquisition | Scans gratuits/mois | 18 000 |
| Acquisition | Pages indexées | 6 700 |
| Qualité moteur | Taux de résolution du bandeau | ≥ 92 % |
| Qualité moteur | Taux de constats contestés | < 1,5 % |
| Qualité moteur | Durée médiane d'un scan `quick` | < 40 s |
| Conversion | Scan → e-mail | ≥ 22 % |
| Conversion | E-mail → payant | ≥ 3,5 % |
| Conversion | Scan → devis prestation | ≥ 0,15 % |
| Rétention | Churn mensuel | < 4 % |
| Rétention | Comptes avec monitoring actif | ≥ 70 % |
| Économie | Coût par scan | < 0,006 € |
| Économie | MRR | 9 200 € |

---

## 20. Risques

| Risque | Prob. | Impact | Mitigation |
|---|---|---|---|
| **Faux positifs décrédibilisants** | Élevée | Fort | Fixtures en CI, bouton de contestation, aveu d'incertitude assumé, revue hebdo des contestations |
| **Adoption du Digital Omnibus invalidant des règles** | Moyenne | Moyen | Rulepack versionné + Reg Watch : l'évolution devient un argument commercial, pas une dette |
| **Accusation de démarchage anxiogène** | Moyenne | Fort | Garde-fous §3.2 appliqués sans exception ; sources affichées ; jamais de plafond sans la moyenne |
| **Contestation par un site scanné** | Moyenne | Moyen | Observation publique uniquement en mode `quick`, bot identifié, page `/bot`, retrait sur demande, vérification de propriété exigée au-delà |
| **Blocage par WAF (Cloudflare, Akamai)** | Élevée | Moyen | Pool d'IP résidentielles européennes, UA identifié, backoff, taux d'échec affiché honnêtement |
| **Coût d'infrastructure du scan gratuit** | Moyenne | Faible | 0,004 €/scan ; plafonds par IP et par domaine ; file d'attente en cas de pic |
| **Copie par Axeptio ou Didomi** | Moyenne | Moyen | Le fossé n'est pas technique mais structurel : ils ne peuvent pas être neutres. Creuser MCP, documentaire et evidence — trois axes hors de leur modèle |
| **Charge de veille réglementaire** | Élevée | Moyen | 2 h/semaine budgétées, mutualisées avec la production éditoriale |
| **Sur-promesse documentaire** | Moyenne | Fort | Mention « modèle à faire valider » sur chaque document, champs manquants visibles, jamais de génération LLM |
| **Dépendance à une seule personne** | Élevée | Fort | Documentation dès P0, fixtures, infrastructure as code ; envisager un partenaire juridique associé pour la validation des gabarits |

---

## 21. Décisions

### 21.0 Tranchées depuis, et actées dans le code

| Décision | Arbitrage retenu | Écart au plan initial |
|---|---|---|
| **Base de données** | Supabase, région `eu-west-3` (Paris) | Le §14.1 disait Neon. Supabase donne l'auth et le RLS dans le même mouvement, et Paris sert l'argument de souveraineté. Écart assumé. |
| **Conservation** | **Opt-in par domaine, propriété vérifiée par TXT DNS ou `.well-known`, purge automatique à 395 jours** | Renforce le §5.6. Sans inscription explicite, l'audit ne laisse aucune trace — le produit applique ce qu'il exige des autres. |
| **Identité visuelle** | Navy `#001629` / orange `#9d4300` | Le §14.4 prévoyait un teal `#0F766E`. Le raisonnement d'origine — « le rouge est réservé aux constats » — tient toujours ; l'orange retenu est proche de `--k-warn` et devra être écarté des constats. **À re-trancher si la confusion se vérifie en test utilisateur.** |
| **Verdict sans e-mail** | Confirmé, et érigé en règle produit | C'est la faille n°1 d'Axeptio (§0.2.2). Toute proposition de fermer le résultat derrière un formulaire est à refuser, quel que soit le gain de leads à court terme. |

### 21.1 Encore à trancher

1. **Nom et domaine.** `Konsent` s'inscrit dans la lignée Konforme mais le terme est très employé dans le secteur — vérifier la disponibilité INPI classes 9, 42 et 45, et les domaines `.fr` / `.eu`. Alternatives cohérentes : `Kontrol`, `Klarté`, `Konform RGPD`, `Traceur.fr`, `Verdikt`.
2. **Validation juridique des 24 gabarits.** Un avocat en droit du numérique doit relire au minimum D01, D02, D03, D08, D17, D19. Budget à prévoir : 2 500–4 000 €. **C'est la dépense la plus rentable du projet** : elle transforme un générateur risqué en actif défendable.
3. **Hébergement des workers.** Scaleway (Paris) est recommandé pour l'argument de souveraineté, même si Hetzner est moins cher.
4. **Périmètre du scan de tiers.** Confirmer la règle : mode `quick` ouvert, tout le reste conditionné à la vérification de propriété.
5. **Baromètre nominatif ou agrégé.** Recommandation : agrégé en V1, nominatif seulement une fois la méthodologie éprouvée et un droit de réponse formalisé.
6. **CMP maison : oui ou non.** Recommandation : non en V1. La neutralité est l'actif central ; la sacrifier pour un revenu marginal serait une erreur stratégique.

---

## 22. Avertissement

**Ce document est un support de cadrage produit. Il ne constitue pas un conseil juridique.** Les références réglementaires qu'il contient (RGPD, loi n° 78-17 modifiée, directive 2002/58/CE, délibérations CNIL n° 2020-091 et 2020-092, recommandation CNIL de janvier 2026, proposition COM(2025) 837 dite « Digital Omnibus », avis conjoint CEPD/EDPS 2/2026) sont citées à titre indicatif et doivent être vérifiées à leur source officielle avant toute exploitation commerciale. Le cadre applicable aux traceurs est en cours d'évolution au niveau européen : la proposition Digital Omnibus n'était pas adoptée à la date de rédaction. La conception, la commercialisation et l'exploitation d'un outil d'audit de conformité, ainsi que la diffusion de modèles de documents juridiques, engagent la responsabilité de son éditeur et doivent faire l'objet d'une validation par un professionnel du droit habilité.

---

*Document préparé pour KAYZEN LYON SASU — 6 rue Pierre Termier, 69009 Lyon — contact@kayzen-lyon.fr*
