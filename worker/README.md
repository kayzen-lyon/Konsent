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

## Deux façons de l'exécuter

### Service — c'est ce mode qui ferme le jalon P0

```bash
KONSENT_WORKER_SECRET="$(openssl rand -base64 32)" npm run serve
```

Le worker écoute sur `:8080` et expose deux points d'entrée :

| | |
|---|---|
| `POST /scan` | Corps `{"url":"https://exemple.fr"}`, en-tête `Authorization: Bearer <secret>`. Renvoie l'observation en trois phases. |
| `GET /health` | Disponibilité et nombre d'analyses en cours. |

L'application appelle ce service dès que `KONSENT_WORKER_URL` et
`KONSENT_WORKER_SECRET` sont posées de son côté. Sans elles — ou si le
worker ne répond pas — elle retombe sur le moteur statique **et l'écrit dans
le rapport**. Un rapport dégradé qui se présenterait comme complet
compterait 76 règles jamais regardées comme satisfaites.

Trois garde-fous, non décoratifs :

- **Sans secret, aucune analyse.** Un worker ouvert serait un scanner gratuit
  pour n'importe qui, sous notre user-agent et donc sous notre responsabilité.
  Le jeton est comparé à durée constante.
- **Adresses non routables refusées** (`localhost`, `10./172.16-31./192.168.`,
  `169.254.169.254`, `.internal`…). Ce contrôle existe aussi côté application ;
  le dupliquer ici est délibéré, car le worker ne doit pas dépendre de la
  vigilance de son appelant. `npm run check` confronte les deux et échoue
  s'ils divergent.
- **Concurrence plafonnée** (`KONSENT_WORKER_CONCURRENCY`, 3 par défaut) : au
  delà, le worker répond 503 plutôt que d'emporter les analyses en cours.

### Ligne de commande — pour déboguer une observation

```bash
node --experimental-strip-types src/index.ts https://exemple.fr
```

Le worker écrit sur la sortie standard un objet JSON contenant les trois
instantanés et la résolution du bandeau. Ce JSON alimente le même évaluateur
que le moteur statique, et reste transmissible à la main :

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

## Conteneur

```bash
docker build -t konsent-worker .
docker run --rm -p 8080:8080 -e KONSENT_WORKER_SECRET=… konsent-worker
```

Le mode ligne de commande reste accessible en surchargeant la commande :

```bash
docker run --rm konsent-worker node --experimental-strip-types src/index.ts https://exemple.fr
```

## Ce que le protocole complet apporte

Mesuré sur un site chargeant des traceurs publicitaires : le mode statique
décide **43 règles sur 139**, le protocole en trois phases **78**. L'écart
n'est pas cosmétique — il porte notamment :

- le dépôt effectif de cookies par JavaScript (KZC-DEPOT-001 à 003) ;
- le comportement après refus (KZC-REFUS-001, 002, 006) ;
- la symétrie réelle du bandeau, clics à l'appui (KZC-BANNER-002, 003) ;
- le stockage alternatif (KZC-STORAGE-001, 003) ;
- l'empreinte du terminal, y compris maintenue après refus (KZC-FP-001 à 008).

Les règles restantes supposent une vérification manuelle, une base de données
externe, ou la phase de persistance du refus dans le temps — non implémentée.
Elles restent déclarées comme non évaluées, jamais comptées comme satisfaites.

## Un changement de moteur n'est pas une régression

La surveillance compare un jeton de référence à une analyse ultérieure. Une
référence prise en navigateur puis comparée en mode statique ferait
disparaître 76 règles d'un bloc, que le différentiel annoncerait en « écarts
corrigés » ; dans l'autre sens, il enverrait une alerte nominative pour des
traceurs présents depuis toujours.

Le jeton porte donc son moteur, et le différentiel **refuse de conclure**
quand les deux ne concordent pas : aucune régression comptée, aucune alerte
envoyée, et la raison affichée. Une fausse alerte coûte plus cher qu'une
alerte manquée quand on vend un verdict.

## Éthique du crawl

Le worker se présente sous le user-agent `KonsentBot/1.0`, ne tente aucune
authentification, ne contourne aucun pare-feu applicatif ni CAPTCHA, et
n'effectue aucune écriture sur le site analysé. Voir la page `/bot` du site.

## Limite honnête

Lorsque le bandeau n'est pas résolu, le worker renvoie
`bannerResolution: "UNRESOLVED"`. Le rapport le signale explicitement plutôt
que de produire un faux négatif silencieux.
