# Serveur MCP Konsent

Rend l'audit RGPD appelable par un agent : une agence pilote son portefeuille
depuis son assistant, un DPO externalisé prépare un contrôle, un développeur
bloque une mise en production sur une régression de conformité.

## Installation

```bash
cd mcp
npm install
npm run build
```

## Déclaration

Dans la configuration MCP de votre client (Claude Desktop, Claude Code, ou
tout autre hôte compatible) :

```json
{
  "mcpServers": {
    "konsent": {
      "command": "node",
      "args": ["/chemin/absolu/vers/konsent/mcp/dist/index.js"],
      "env": {
        "KONSENT_API_URL": "https://konsent-zeta.vercel.app"
      }
    }
  }
}
```

`KONSENT_API_URL` permet de pointer vers une instance auto-hébergée. Par
défaut, le serveur interroge l'instance publique.

## Outils exposés

| Outil | Ce qu'il fait |
|---|---|
| `konsent_scan_url` | Audite un site : score, écarts, destinataires, couverture |
| `konsent_list_findings` | Liste les écarts, filtrables par gravité |
| `konsent_list_vendors` | Destinataires, sociétés mères et juridictions |
| `konsent_transfer_analysis` | Transferts hors EEE, regroupés par juridiction |
| `konsent_scan_portfolio` | Audite jusqu'à huit domaines, triés par score croissant |
| `konsent_check_regression` | Compare à une référence et liste les régressions |

## Ressources

- `konsent://rulepack` — le référentiel de règles complet
- `konsent://regwatch` — la veille réglementaire

## Deux garanties de conception

**L'avertissement n'est pas désactivable.** Toute réponse d'outil passe par
une fonction unique qui injecte le champ `disclaimer`. Un agent qui relaie un
constat relaie sa portée en même temps — un constat technique automatisé
n'est ni une consultation juridique ni une certification.

**La couverture est toujours renvoyée.** Le champ `coverage.notEvaluated`
liste les règles que le mode d'analyse n'a pas pu vérifier. Un agent ne doit
jamais les présenter comme satisfaites : c'est la différence entre un audit
honnête et un faux sentiment de sécurité.

## Exemples d'usage

> « Scanne les huit domaines de mon client Dupont et dis-moi lesquels ont
> régressé. »

> « Quels traceurs de exemple.fr envoient des données hors d'Europe, et sous
> quelle juridiction ? »

> « Prépare la liste des écarts critiques de exemple.fr avec leur référence
> normative, pour un courriel au dirigeant. »
