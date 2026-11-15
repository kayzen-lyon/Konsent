=== Konsent — conformité RGPD ===
Contributors: kayzen
Tags: rgpd, gdpr, cookies, consentement, conformité
Requires at least: 5.8
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.0.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Le score de conformité RGPD et cookies de votre site, dans le tableau de bord WordPress.

== Description ==

Konsent ajoute un widget « Konsent — conformité RGPD » au tableau de bord de l'administration. Il affiche le score sur 100, la note et le nombre d'écarts relevés par l'analyse automatisée Konsent (https://konsent.kayzen-lyon.com), avec un lien vers le rapport complet.

* Visible des seuls administrateurs (capacité `manage_options`).
* Aucun traceur, aucun cookie, aucun script ajouté aux pages publiques du site.
* Résultat mis en cache 12 heures (1 heure en cas d'échec).
* Aucune clé d'API ni compte requis.

Le score est le résultat d'une analyse technique, automatisée et indicative. Il ne vaut ni certificat de conformité, ni consultation juridique.

Éditeur : KAYZEN (Tarek BELHADJ EI), Lyon.

== Service externe ==

Pour calculer le score, l'extension appelle l'API publique de Konsent, éditée par KAYZEN :

* Adresse appelée : `https://konsent.kayzen-lyon.com/api/scan?url=<domaine de votre site>`
* Quand : à l'affichage du tableau de bord par un administrateur, au plus une fois toutes les 12 heures.
* Données transmises : le domaine et le chemin de votre installation WordPress (ceux de `home_url()`), ainsi que l'adresse IP du serveur qui émet la requête. Aucune donnée d'utilisateur ou de visiteur.
* Conditions d'utilisation : https://konsent.kayzen-lyon.com/cgu
* Politique de confidentialité : https://konsent.kayzen-lyon.com/confidentialite

L'analyse visite les pages publiques de votre site, comme le ferait un visiteur.

== Installation ==

1. Téléchargez `konsent-wordpress.zip` sur https://konsent.kayzen-lyon.com/integrations/extensions.
2. Dans l'administration : Extensions → Ajouter → Téléverser une extension, choisissez l'archive, puis Installer maintenant.
3. Activez l'extension. Le widget apparaît dans le Tableau de bord.

== Frequently Asked Questions ==

= Le widget affiche une erreur =

Un site accessible uniquement en local, protégé par un mot de passe ou très lent ne peut pas être analysé depuis Internet. L'analyse est réessayée au bout d'une heure.

= L'extension ralentit-elle mon site ? =

Non. Rien n'est exécuté sur les pages publiques. L'appel n'a lieu que dans le tableau de bord, et son résultat est mis en cache.

= Que supprime la désinstallation ? =

Le score mis en cache (transient `konsent_score`). L'extension ne crée aucune autre donnée.

== Changelog ==

= 1.0.0 =
* Première version : widget de tableau de bord, cache de 12 heures.
