# Konsent — 150 améliorations

Feuille de route issue de la revue du 14 novembre 2026. Légende :

- **✅** fait (vague 1 : branche `ameliorations-150` ; vague 2 : `ameliorations-vague-2`)
- **⏳** prochaine vague : conçu, pas encore codé
- **🔒** demande une décision ou un accès (compte tiers, budget, contenu à fournir)

## 1. Nouvelles fonctionnalités (40)

1. ✅ **Comparateur de deux sites** (`/comparer`) : deux audits en parallèle, côte à côte, gagnant, écarts communs et propres.
2. ✅ **Générateur de bandeau cookies conforme CNIL** (`/outils/generateur-bandeau`) : aperçu en direct, code autonome à copier.
3. ✅ **Auto-évaluation RGPD** (`/auto-evaluation`) : ce que le scanner ne voit pas, score par thème, plan d'action.
4. ✅ **Badge Konsent intégrable** (`/badge`, `/api/badge`) : SVG du score, recalculé chaque jour.
5. ✅ **Recherche globale** (`/recherche`) sur règles, traceurs, cookies, guides, glossaire, outils et pages.
6. ✅ **Palette de commandes** Ctrl+K / ⌘K / « / » avec actions rapides.
7. ✅ **Partage du rapport** (feuille de partage du système, ou copie du lien).
8. ✅ **Export JSON du rapport** en un clic.
9. ✅ **Raccourcis « Comparer à un autre site » et « Obtenir le badge »** depuis chaque rapport.
10. ✅ **Application installable** (manifeste, raccourcis vers les outils).
11. ✅ Historique des audits dans l'espace client, avec courbe d'évolution du score et tableau de données.
12. ⏳ Rapport PDF généré côté serveur (mise en page dédiée, en-tête Kayzen, sommaire).
13. ⏳ Rapport en marque blanche pour les agences (logo, couleurs, coordonnées).
14. ✅ Analyse en lot (`/analyse-en-lot`) : jusqu'à 20 adresses, tableau triable, export CSV et JSON.
15. ⏳ Export CSV du portefeuille agence.
16. ⏳ Alertes par webhook (Slack, Teams, URL personnalisée) en plus de l'e-mail.
17. ⏳ Lien de rapport public partageable, figé et horodaté (avec durée de vie).
18. ⏳ Plan d'action interactif : cocher les corrections faites, relancer l'audit ciblé.
19. ⏳ Mode « avant / après » : comparer deux audits d'un même site dans le temps.
20. ✅ Vérificateur d'archive de preuve dans le navigateur (déjà au catalogue, à livrer).
21. ✅ Générateur de politique de confidentialité guidé (formulaire → document).
22. ✅ Générateur de mentions légales (formulaire → document, comme pour ce site).
23. ⏳ Générateur de registre des traitements à partir de l'auto-évaluation.
24. ✅ Vérificateur d'en-têtes de sécurité seul (CSP, HSTS, Referrer-Policy…).
25. ✅ Testeur de cookie : coller un nom de cookie, obtenir sa fiche et sa durée légale.
26. ✅ Calculateur de durée de conservation (13 mois / 25 mois / 6 mois selon le cas).
27. ✅ Modèles de réponse aux demandes d'exercice de droits (accès, effacement…).
28. ⏳ Simulateur de procédure CNIL (étapes, délais, montants observés).
29. ⏳ Extension navigateur « Konsent » : audit de la page ouverte en un clic.
30. ⏳ Intégration WordPress (extension qui affiche le score dans l'administration).
31. ⏳ Action GitHub documentée pour bloquer un déploiement qui régresse.
32. ✅ Flux RSS de la veille réglementaire.
33. ⏳ Lettre d'information mensuelle de la veille (double opt-in, sans traceur).
34. ✅ Page « Statut du service » (disponibilité du scanner et du worker).
35. 🔒 Connexion avec Google / Microsoft (comptes tiers à configurer).
36. 🔒 Paiement annuel avec remise (tarifs Stripe à créer).
37. 🔒 Programme de parrainage pour les agences (règles commerciales à fixer).
38. 🔒 Assistant conversationnel IA sur le référentiel (choix du fournisseur et du budget).
39. 🔒 Traduction anglaise complète du site (contenus juridiques à faire relire).
40. 🔒 Études de cas clients publiées (contenu réel et accord des clients).

## 2. Rapport d'audit (20)

41. ✅ Sommaire collant avec ancres (Synthèse, Preuve, Constats, Destinataires, Exposition, Limites).
42. ✅ Ancres stables sur chaque partie du rapport, pour les liens directs.
43. ✅ Mise en évidence de la partie visée quand on arrive par une ancre.
44. ✅ Barre d'actions du rapport (partager, JSON, comparer, badge), masquée à l'impression.
45. ✅ Filtre des constats par gravité et par pilier.
46. ✅ Recherche dans les constats.
47. ✅ Résumé exécutif en trois phrases en tête du rapport.
48. ⏳ Graphique des destinataires par pays (carte simplifiée en SVG).
49. ✅ Frise visuelle des trois phases (avant choix / refus / acceptation).
50. ⏳ Estimation du temps de correction par constat.
51. ✅ Bouton « Copier le correctif » sur chaque extrait de code.
52. ✅ Lien « Signaler un faux positif » sur chaque constat.
53. ✅ Score par pilier en jauges secondaires.
54. ⏳ Comparaison avec la moyenne du secteur (une fois les données agrégées).
55. ⏳ Mode présentation (plein écran, une diapositive par pilier).
56. ⏳ Version courte imprimable sur une page pour un dirigeant.
57. ⏳ QR code du rapport dans l'en-tête imprimé.
58. ✅ Lien de relance de l'analyse avec horodatage de la précédente.
59. ⏳ Notes de l'utilisateur sur chaque constat (espace client).
60. ⏳ Envoi du rapport par e-mail depuis l'espace client.

## 3. Design et expérience (30)

61. ✅ Section « Comment ça marche » en trois étapes sur l'accueil.
62. ✅ Bandeau « Audite les sites équipés de toutes les CMP ».
63. ✅ Grille des outils gratuits sur l'accueil, avec le lieu de traitement de chacun.
64. ✅ Lueur terracotta et dorée derrière le héros.
65. ✅ Barre de progression de lecture en haut de page (CSS seul).
66. ✅ Apparition douce des blocs au défilement (CSS seul, coupée en mouvement réduit).
67. ✅ Cartes qui se soulèvent au survol et au focus.
68. ✅ Couleur de sélection du texte aux couleurs de la marque.
69. ✅ Titres équilibrés et paragraphes sans mot orphelin (`text-wrap`).
70. ✅ Barre de défilement aux couleurs du thème.
71. ✅ Page 404 utile : formulaire d'audit et liens suggérés.
72. ✅ Page d'erreur avec référence d'incident et bouton « Réessayer ».
73. ✅ Fil d'Ariane sur les fiches règles, traceurs, cookies, glossaire et guides.
74. ✅ FAQ enrichie (comparateur, auto-évaluation).
75. ✅ Menu « Outils » déroulant dans l'en-tête.
76. ⏳ Illustrations SVG maison pour chaque pilier.
77. ⏳ Animation du score (compteur) dans le rapport.
78. ⏳ Mode compact du rapport pour les longues listes.
79. ✅ Thème à fort contraste en plus de clair et sombre.
80. ✅ Réglage de taille de texte dans le pied de page.
81. ⏳ États de chargement squelettes sur toutes les pages serveur lentes.
82. ⏳ Notifications « toast » pour les actions (copie, envoi).
83. ⏳ Page tarifs avec comparatif détaillé des offres en tableau.
84. ⏳ Bascule mensuel / annuel sur la page tarifs.
85. ⏳ Témoignages vérifiés (🔒 contenu réel nécessaire).
86. ✅ Page « À propos » : l'équipe KAYZEN, la méthode, l'indépendance.
87. ✅ Page « Presse » avec kit média (logos SVG, chiffres clés).
88. ⏳ Images Open Graph dédiées pour chaque outil.
89. ✅ Favicon adaptatif clair / sombre.
90. ⏳ Transitions entre pages (View Transitions) là où le navigateur les gère.

## 4. Accessibilité (15)

91. ✅ Palette de commandes conforme au motif combobox ARIA.
92. ✅ Fil d'Ariane avec `aria-current="page"`.
93. ✅ Sommaire du rapport en `<nav>` nommée.
94. ✅ Messages de statut annoncés (copie, partage, résultats de recherche).
95. ✅ Étapes de l'auto-évaluation en `fieldset` / `legend`, focus déplacé à chaque étape.
96. ✅ Tableau du comparateur avec titre et en-têtes associés.
97. ⏳ Audit RGAA externe sur échantillon, puis publication du taux.
98. ⏳ Transcription textuelle de l'animation du héros.
99. ⏳ Test complet au lecteur d'écran (NVDA, VoiceOver) des parcours d'achat.
100. ⏳ Contrôle automatique axe-core dans la CI.
101. ⏳ Version FALC (facile à lire et à comprendre) de la page d'accueil.
102. ✅ Liens d'évitement supplémentaires (vers la recherche, vers le pied de page).
103. ✅ Préférence « réduire les animations » réglable sur le site lui-même.
104. ⏳ Vérification des contrastes du thème sombre dans la CI.
105. ⏳ Schéma de navigation au clavier documenté dans la déclaration d'accessibilité.

## 5. Référencement et contenu (15)

106. ✅ Données structurées BreadcrumbList sur les pages de détail.
107. ✅ Nouvelles pages ajoutées au sitemap.
108. ✅ Pages de recherche avec résultats non indexées (`noindex` si une requête est présente).
109. ✅ Plan du site mis à jour avec les nouveaux outils.
110. ⏳ Pages « Konsent vs [CMP] » détaillées, une par plateforme.
111. ✅ Pages par secteur (e-commerce, santé, collectivités, médias).
112. ⏳ Articles de fond sur les décisions CNIL récentes.
113. ✅ Données structurées HowTo sur les guides de correction.
114. ⏳ Données structurées SoftwareApplication sur chaque outil.
115. ⏳ Maillage interne automatique entre règles, traceurs et guides.
116. ✅ Liens « Voir aussi » sur chaque fiche.
117. ⏳ Pages d'atterrissage par ville (Lyon, Paris…) pour les agences.
118. ⏳ Glossaire enrichi (schémas, exemples concrets).
119. ✅ Flux de la veille au format JSON Feed.
120. ✅ Optimisation pour les moteurs de réponse IA (fichier `llms.txt`).

## 6. Performance (10)

121. ✅ Animations confiées au CSS (pas de JavaScript ajouté pour la progression ni l'apparition).
122. ✅ Index de recherche servi par une route : rien n'est embarqué côté navigateur.
123. ✅ Badge mis en cache 24 h en périphérie, revalidé en arrière-plan, et soumis à la même limite de débit que l'audit.
124. ⏳ Mise en cache des résultats d'audit récents (même adresse, moins d'une heure).
125. ⏳ Génération statique des fiches règles et cookies au build (déjà en partie).
126. ⏳ Chargement différé des sections basses de l'accueil.
127. ⏳ Budget de performance vérifié dans la CI (Lighthouse).
128. ⏳ Préchargement des pages de la palette au survol.
129. ✅ Jauge et libellés de gravité séparés du référentiel : la page d'auto-évaluation passe de 34 à 12 Ko de JavaScript.
130. ⏳ Compression des réponses JSON volumineuses de l'API.

## 7. Sécurité et RGPD (10)

131. ✅ Limitation de débit des API sensibles (audit, connexion, contact, preuve), adresses IP hachées.
132. ✅ Fichier `security.txt` (RFC 9116) servi sous `/.well-known/`.
133. ✅ Badge et comparateur sans aucun stockage des adresses analysées.
134. ✅ Auto-évaluation et générateur de bandeau 100 % dans le navigateur.
135. ⏳ CSP à nonces (suppression de `unsafe-inline`).
136. ⏳ Confirmation de l'adresse d'alerte de surveillance (double opt-in).
137. ✅ Journal d'accès de l'espace client (dernières connexions).
138. ✅ Suppression du compte en libre-service (droit à l'effacement).
139. ✅ Export de toutes ses données en libre-service (droit à la portabilité).
140. ⏳ Programme de divulgation responsable publié.

## 8. Technique et qualité (10)

141. ✅ Page de recherche et API typées, testées par requêtes réelles.
142. ✅ Catalogue d'outils unifié (`toolHref`) pour toutes les adresses d'outils.
143. ✅ Registre de l'API à jour (badge public, recherche interne).
144. ✅ Tests de la limitation de débit.
145. ⏳ Tests de bout en bout Playwright des parcours clés.
146. ⏳ Configuration ESLint (absente du projet).
147. ⏳ Surveillance des erreurs en production (journal structuré, alertes).
148. ⏳ Prévisualisations Vercel commentées automatiquement avec captures.
149. ⏳ Documentation développeur du moteur de règles.
150. ⏳ Mise à jour automatique des dépendances avec fusion des correctifs mineurs.
