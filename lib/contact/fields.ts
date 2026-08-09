/**
 * Noms des champs du formulaire, partagés entre le navigateur et le serveur.
 *
 * Volontairement isolés de `antispam.ts`, qui importe `node:crypto` pour
 * signer le jeton d'horodatage. Sans cette séparation, le composant client
 * entraînait tout le module de signature dans le paquet du navigateur — ce
 * que webpack refuse, et à juste titre : la logique de vérification n'a rien
 * à faire côté client, où elle serait lisible et contournable.
 */

/**
 * Champ leurre.
 *
 * Le nom est plausible à dessein : un robot évite les champs nommés
 * « honeypot » mais remplit volontiers ce qui ressemble à un champ
 * d'entreprise. Il n'a en revanche aucun rapport avec les champs réellement
 * demandés, pour qu'un gestionnaire de mots de passe ne le remplisse pas
 * automatiquement — cause n°1 de faux positifs sur un pot de miel.
 */
export const HONEYPOT_FIELD = "societe_secondaire";

/** Champ portant le jeton d'horodatage signé. */
export const TIMESTAMP_FIELD = "envoi_prepare";
