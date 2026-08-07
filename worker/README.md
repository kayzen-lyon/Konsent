# Worker d'analyse en navigateur

Ce worker exécute le **protocole complet en trois phases** décrit dans le PRD
(§5.1), que l'application déployée en serverless ne peut pas exécuter :
Vercel ne convient pas à un navigateur headless de longue durée.

| | Application (Vercel) | Ce worker |
|---|---|---|
| Moteur | statique, sans navigateur | Chromium piloté par Playwright |
| Phases | A partielle (document servi) | A / B / C complètes |
| Règles couvertes | celles marquées `engine: "static"` | l'ensemble du référentiel |
| Cookies déposés par JavaScript | non observables | observés |
| Comportement après refus | non observable | observé |

## Les trois phases

- **Phase A — avant consentement.** Contexte navigateur neuf, aucun cookie.
  Chargement, attente du réseau, défilement passif, **aucune interaction avec
  le bandeau**. Tout traceur non exempté présent ici pose une question au
  regard de l'article 82.
- **Phase B — après refus.** Contexte neuf, résolution du chemin de refus,
  comptage des clics nécessaires, clic, navigation interne. Tout traceur
  encore présent traduit un refus non respecté.
- **Phase C — après acceptation.** Contexte neuf, clic sur l'acceptation
  globale. Sert d'inventaire exhaustif pour la politique cookies.

## Installation

```bash
cd worker
npm install
npx playwright install --with-deps chromium
```

## Utilisation

```bash
node --experimental-strip-types src/index.ts https://exemple.fr
```

Le worker écrit sur la sortie standard un objet JSON contenant les trois
instantanés et la résolution du bandeau.

## Faire évaluer l'observation

Ce JSON alimente le même évaluateur que le moteur statique. Il suffit de le
transmettre à l'application :

```bash
node --experimental-strip-types src/index.ts https://exemple.fr \
  | curl -s -X POST https://konsent-zeta.vercel.app/api/ingest \
      -H 'Content-Type: application/json' --data-binary @- \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
      const j=JSON.parse(d);
      console.log(j.scan.score+'/100 ('+j.scan.grade+')');
      for (const f of j.findings) console.log(' ',f.severity,f.ruleId,f.title);
    })"
```

L'application ne fait tourner aucun navigateur : elle applique le
référentiel à ce que le worker a observé. Cette séparation permet
d'exécuter le worker là où c'est possible — poste de développement,
conteneur, intégration continue — sans contrainte d'hébergement.

## Ce que le protocole complet apporte

Le mode statique laisse 49 règles non évaluées. Le protocole en trois phases
ramène ce nombre à 34, en couvrant notamment :

- le dépôt effectif de cookies par JavaScript (KZC-DEPOT-001 à 003) ;
- le comportement après refus (KZC-REFUS-001, 002, 006) ;
- la symétrie réelle du bandeau, clics à l'appui (KZC-BANNER-002, 003) ;
- le stockage alternatif (KZC-STORAGE-001, 003) ;
- l'empreinte du terminal, y compris maintenue après refus (KZC-FP-001 à 008).

Les 34 règles restantes supposent une vérification manuelle ou la phase D de
persistance du refus, non implémentée. Elles restent déclarées comme non
évaluées — jamais comptées comme satisfaites.

## Éthique du crawl

Le worker se présente sous le user-agent `KonsentBot/1.0`, ne tente aucune
authentification, ne contourne aucun pare-feu applicatif ni CAPTCHA, et
n'effectue aucune écriture sur le site analysé. Voir la page `/bot` du site.

## Limite honnête

Lorsque le bandeau n'est pas résolu, le worker renvoie
`bannerResolution: "UNRESOLVED"`. Le rapport le signale explicitement plutôt
que de produire un faux négatif silencieux.
