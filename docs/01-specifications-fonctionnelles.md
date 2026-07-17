# 1. Spécifications fonctionnelles

## 1.1 Vision produit

ApexSetup centralise les setups de simulation automobile afin d’éviter la dispersion des fichiers, les noms ambigus et la perte de contexte. Un utilisateur doit pouvoir retrouver en quelques secondes le bon setup pour une combinaison jeu, voiture, circuit et conditions.

## 1.2 Objectifs

1. Réduire le temps nécessaire pour retrouver un setup.
2. Conserver le contexte d’utilisation et les performances associées.
3. Faciliter la comparaison entre deux versions.
4. Permettre un partage contrôlé avec d’autres pilotes.
5. Construire progressivement une bibliothèque communautaire fiable.

## 1.3 Hors périmètre du MVP

- Lecture télémétrique en direct.
- Synchronisation automatique avec les dossiers locaux des jeux.
- Modification graphique de tous les paramètres internes d’un fichier.
- Recommandation de réglages par intelligence artificielle.
- Vente de setups ou place de marché.
- Gestion complète de ligues et championnats.

## 1.4 Personas

### Pilote occasionnel

Possède peu de setups et veut les retrouver facilement sans comprendre une architecture de fichiers complexe.

### Pilote compétitif

Conserve plusieurs variantes par voiture et circuit, compare ses versions et documente ses temps au tour.

### Ingénieur ou responsable d’équipe

Partage des setups privés avec un groupe limité et doit savoir quelle version est la référence.

### Créateur de setups

Publie des setups, ajoute des instructions et souhaite obtenir des évaluations ou retours.

## 1.5 Rôles

| Rôle | Capacités principales |
|---|---|
| Visiteur | Consulter les setups publics et les profils publics |
| Utilisateur | Gérer sa bibliothèque, télécharger, favoriser, évaluer et commenter |
| Modérateur | Masquer un contenu, traiter un signalement |
| Administrateur | Gérer référentiels, utilisateurs, modération et configuration globale |

## 1.6 Domaines fonctionnels

### A. Authentification et compte

- Inscription par adresse e-mail ou fournisseur OAuth.
- Connexion et déconnexion.
- Vérification de l’adresse e-mail si une authentification locale est proposée.
- Réinitialisation du mot de passe.
- Gestion du pseudonyme, avatar, langue et visibilité du profil.
- Suppression du compte avec procédure de confirmation.

### B. Bibliothèque personnelle

- Importer un fichier de setup.
- Renseigner ou sélectionner : jeu, voiture, circuit, catégorie, conditions, version du jeu et type de session.
- Ajouter un titre, une description, des notes privées et des tags.
- Enregistrer un temps au tour, une consommation et une quantité de carburant.
- Marquer comme favori, archiver, dupliquer ou supprimer.
- Télécharger le fichier original.
- Voir l’historique des versions d’un setup.

### C. Recherche et filtrage

- Recherche textuelle sur le titre, l’auteur, la voiture, le circuit et les tags.
- Filtres combinables : jeu, voiture, circuit, météo, type de session, visibilité, auteur, date et note.
- Tri par date, popularité, note, nombre de téléchargements ou temps au tour.
- Conservation des filtres dans l’URL.
- Pagination côté serveur.

### D. Comparaison

- Sélectionner deux versions compatibles.
- Afficher les métadonnées côte à côte.
- Afficher les différences de paramètres lorsque le format du jeu est interprétable.
- Signaler clairement les paramètres ajoutés, supprimés ou modifiés.
- Permettre une comparaison minimale basée sur le fichier brut lorsque le parseur n’existe pas.

### E. Partage

Niveaux de visibilité :

- `PRIVATE` : propriétaire uniquement.
- `UNLISTED` : accessible par lien non indexé.
- `TEAM` : réservé aux membres d’un groupe autorisé, hors MVP initial.
- `PUBLIC` : visible dans le catalogue public.

Actions :

- Générer un lien public ou non répertorié.
- Retirer le partage à tout moment.
- Publier une description et des instructions d’utilisation distinctes des notes privées.
- Afficher les informations minimales obligatoires avant publication.

### F. Catalogue communautaire

- Parcourir les setups publics.
- Télécharger un setup.
- Ajouter aux favoris.
- Attribuer une note unique par utilisateur.
- Commenter et supprimer son propre commentaire.
- Signaler un contenu.
- Afficher le nombre de téléchargements, favoris et évaluations.

### G. Administration

- Gérer les jeux pris en charge.
- Gérer les voitures, catégories et circuits.
- Activer ou désactiver un parseur de format.
- Consulter les signalements.
- Masquer ou restaurer un contenu public.
- Suspendre un compte en cas d’abus.

## 1.7 Parcours principaux

### Parcours 1 — Import rapide

1. L’utilisateur ouvre sa bibliothèque.
2. Il dépose un fichier.
3. L’application détecte si possible le jeu ou le format.
4. L’utilisateur complète les informations obligatoires.
5. Le fichier est envoyé vers le stockage.
6. Les métadonnées sont persistées.
7. Le setup apparaît dans la bibliothèque privée.

### Parcours 2 — Retrouver un setup

1. L’utilisateur sélectionne un jeu.
2. Il filtre par voiture et circuit.
3. Il trie par date ou meilleur temps.
4. Il ouvre la fiche.
5. Il télécharge le fichier ou consulte ses notes.

### Parcours 3 — Publier

1. L’utilisateur ouvre un setup privé.
2. Il choisit `PUBLIC` ou `UNLISTED`.
3. L’application vérifie les champs obligatoires.
4. L’utilisateur confirme les informations rendues publiques.
5. Le lien partageable est créé.

### Parcours 4 — Comparer deux versions

1. L’utilisateur ouvre l’historique d’un setup.
2. Il sélectionne deux versions.
3. L’application valide leur compatibilité.
4. Les différences sont affichées.
5. L’utilisateur peut désigner une version comme référence.

## 1.8 Règles métier

- Un setup appartient toujours à un utilisateur.
- Un fichier importé ne devient jamais public automatiquement.
- Une version publiée reste liée à son auteur d’origine.
- Une note est comprise entre 1 et 5 et est unique par couple utilisateur/setup.
- Un utilisateur ne peut pas évaluer son propre setup.
- La suppression standard est logique pendant une période de rétention configurable.
- La taille et les extensions autorisées sont configurables par jeu.
- Le téléchargement d’un setup privé requiert l’autorisation du propriétaire.
- Le compteur de téléchargements ne doit pas être incrémenté par les robots identifiés ni par le propriétaire dans sa propre bibliothèque.
- La publication est bloquée si le jeu, la voiture, le circuit, le titre ou le fichier sont absents.

## 1.9 Exigences UX

- Interface responsive, prioritairement desktop et tablette.
- Navigation clavier sur les écrans principaux.
- États de chargement et erreurs explicites.
- Import par glisser-déposer et sélection classique.
- Retour visuel de progression pendant l’envoi.
- Filtres persistants dans l’URL.
- Affichage des temps au tour au format `mm:ss.mmm`.
- Confirmation obligatoire avant suppression ou changement de visibilité.
- Respect du niveau AA des WCAG comme cible.

## 1.10 Critères d’acceptation du MVP

Le MVP est considéré utilisable lorsque :

- un utilisateur peut créer un compte et se connecter ;
- il peut importer un fichier autorisé ;
- il peut renseigner jeu, voiture, circuit, titre et notes ;
- il peut rechercher et filtrer sa bibliothèque ;
- il peut télécharger, modifier, archiver et supprimer un setup ;
- il peut créer une nouvelle version ;
- il peut rendre un setup public ou non répertorié ;
- un visiteur peut ouvrir et télécharger un setup public ;
- les accès privés sont protégés par des tests automatisés ;
- les erreurs d’upload et de validation sont compréhensibles.

## 1.11 Indicateurs produit

- Taux d’import terminé.
- Temps médian entre ouverture de la bibliothèque et téléchargement d’un setup.
- Nombre de setups actifs par utilisateur.
- Taux de setups correctement renseignés.
- Nombre de téléchargements publics.
- Taux de rétention à 7 et 30 jours.
- Nombre d’erreurs d’import par format de fichier.
