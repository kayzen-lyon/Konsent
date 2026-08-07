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
instantanés et la résolution du bandeau. Ce JSON est destiné à alimenter le
même évaluateur que le moteur statique (`lib/engine/evaluate.ts`).

## Éthique du crawl

Le worker se présente sous le user-agent `KonsentBot/1.0`, ne tente aucune
authentification, ne contourne aucun pare-feu applicatif ni CAPTCHA, et
n'effectue aucune écriture sur le site analysé. Voir la page `/bot` du site.

## Limite honnête

Lorsque le bandeau n'est pas résolu, le worker renvoie
`bannerResolution: "UNRESOLVED"`. Le rapport le signale explicitement plutôt
que de produire un faux négatif silencieux.
