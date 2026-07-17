# 5. Backlog de développement

## 5.1 Convention

Priorités :

- `P0` : indispensable au MVP.
- `P1` : important après stabilisation du MVP.
- `P2` : amélioration.

Estimations : points de complexité relatifs `1, 2, 3, 5, 8, 13`.

## 5.2 Roadmap synthétique

| Phase | Objectif | Résultat |
|---|---|---|
| 0 | Fondation | Monorepo, CI, environnements, conventions |
| 1 | Bibliothèque privée | Authentification, référentiels, import et CRUD |
| 2 | Recherche et versions | Filtres, pagination, historique et téléchargement |
| 3 | Partage | Public/non répertorié et catalogue |
| 4 | Communauté | Favoris, notes, commentaires et modération |
| 5 | Différenciation | Parseurs, comparaison avancée et application compagnon |

## 5.3 Epic 0 — Fondation

| ID | User story / tâche | Priorité | Points | Critères de fin |
|---|---|---:|---:|---|
| FND-01 | Initialiser le monorepo Turborepo | P0 | 3 | Web et API démarrent depuis la racine |
| FND-02 | Configurer lint, formatage et TypeScript partagé | P0 | 3 | Vérifications exécutables par Turbo |
| FND-03 | Configurer Prisma et PostgreSQL local | P0 | 3 | Migration initiale reproductible |
| FND-04 | Mettre en place CI GitHub | P0 | 5 | Lint, types, tests et builds bloquent une PR en échec |
| FND-05 | Créer projets Vercel Preview | P0 | 5 | Une PR produit web et API accessibles |
| FND-06 | Définir convention d’erreurs API | P0 | 2 | Filtre NestJS et affichage Angular cohérents |
| FND-07 | Ajouter logs structurés et request ID | P0 | 3 | Requête traçable de bout en bout |
| FND-08 | Ajouter documentation OpenAPI | P0 | 3 | Swagger disponible hors production publique ou protégé |

## 5.4 Epic 1 — Authentification et comptes

| ID | User story | Priorité | Points | Critères d’acceptation |
|---|---|---:|---:|---|
| AUTH-01 | En tant que visiteur, je peux créer un compte | P0 | 5 | Compte unique, validations et erreurs utiles |
| AUTH-02 | Je peux me connecter et me déconnecter | P0 | 5 | Session sécurisée et expiration gérée |
| AUTH-03 | Je peux consulter et modifier mon profil | P0 | 3 | Pseudonyme et préférences persistés |
| AUTH-04 | Les routes privées refusent un utilisateur non connecté | P0 | 3 | Tests API couvrant 401 et 403 |
| AUTH-05 | Je peux demander la suppression de mon compte | P1 | 5 | Confirmation et traitement documenté |
| AUTH-06 | Je peux utiliser un fournisseur OAuth | P1 | 5 | Connexion et liaison de compte testées |

## 5.5 Epic 2 — Référentiels

| ID | User story | Priorité | Points | Critères d’acceptation |
|---|---|---:|---:|---|
| REF-01 | Consulter la liste des jeux actifs | P0 | 2 | API paginée ou liste cacheable |
| REF-02 | Consulter voitures et catégories par jeu | P0 | 3 | Relations cohérentes |
| REF-03 | Consulter et rechercher les circuits | P0 | 3 | Recherche par nom et variante |
| REF-04 | Administrer jeux, voitures et circuits | P1 | 8 | Accès administrateur uniquement |
| REF-05 | Importer un seed de référentiels | P0 | 3 | Script idempotent disponible |

## 5.6 Epic 3 — Upload et bibliothèque privée

| ID | User story | Priorité | Points | Critères d’acceptation |
|---|---|---:|---:|---|
| LIB-01 | Je peux préparer l’upload d’un fichier | P0 | 5 | Type et taille validés, intention créée |
| LIB-02 | Je peux envoyer directement vers le stockage | P0 | 8 | Progression visible et reprise d’erreur claire |
| LIB-03 | Je peux confirmer un upload | P0 | 5 | Confirmation idempotente et objet vérifié |
| LIB-04 | Je peux créer une fiche de setup | P0 | 5 | Champs obligatoires validés |
| LIB-05 | Je vois mes setups dans une liste | P0 | 5 | Pagination, états vide/chargement/erreur |
| LIB-06 | Je peux ouvrir le détail | P0 | 3 | Métadonnées et fichier accessibles au propriétaire |
| LIB-07 | Je peux modifier les métadonnées | P0 | 3 | Modifications persistées et auditées |
| LIB-08 | Je peux télécharger mon fichier | P0 | 3 | URL privée courte durée |
| LIB-09 | Je peux archiver et restaurer | P0 | 3 | Archivé exclu par défaut de la liste |
| LIB-10 | Je peux supprimer un setup | P0 | 5 | Suppression logique et confirmation |
| LIB-11 | Les uploads abandonnés sont nettoyés | P1 | 5 | Tâche idempotente et métrique de résultat |

## 5.7 Epic 4 — Recherche, tri et filtres

| ID | User story | Priorité | Points | Critères d’acceptation |
|---|---|---:|---:|---|
| SRC-01 | Je recherche par texte | P0 | 5 | Titre, voiture, circuit et tags concernés |
| SRC-02 | Je filtre par jeu, voiture et circuit | P0 | 5 | Filtres combinables et validés côté API |
| SRC-03 | Je filtre par conditions et session | P1 | 5 | Valeurs normalisées |
| SRC-04 | Je trie par date et temps au tour | P0 | 3 | Tri stable et paginé |
| SRC-05 | Mes filtres restent dans l’URL | P0 | 3 | Partage et retour navigateur fonctionnels |
| SRC-06 | Les requêtes fréquentes sont indexées | P0 | 3 | Plan d’exécution contrôlé sur données de test |

## 5.8 Epic 5 — Versions et comparaison

| ID | User story | Priorité | Points | Critères d’acceptation |
|---|---|---:|---:|---|
| VER-01 | Je peux ajouter une nouvelle version | P0 | 5 | Ancienne version conservée |
| VER-02 | Je vois l’historique | P0 | 3 | Date, note et auteur affichés |
| VER-03 | Je marque une version de référence | P0 | 3 | Une seule référence active par setup |
| VER-04 | Je compare les métadonnées de deux versions | P1 | 5 | Différences visibles côte à côte |
| VER-05 | Le système parse un premier format de jeu | P1 | 13 | Parseur versionné et tests sur fixtures |
| VER-06 | Je compare les paramètres parsés | P1 | 8 | Ajouts, suppressions et modifications distingués |
| VER-07 | Une erreur de parsing n’empêche pas l’import | P0 | 3 | Statut explicite et fichier conservé |

## 5.9 Epic 6 — Partage et catalogue

| ID | User story | Priorité | Points | Critères d’acceptation |
|---|---|---:|---:|---|
| SHR-01 | Je rends un setup non répertorié | P0 | 5 | Lien opaque, non présent dans le catalogue |
| SHR-02 | Je rends un setup public | P0 | 5 | Champs obligatoires contrôlés |
| SHR-03 | Je retire le partage | P0 | 3 | Ancien accès refusé immédiatement |
| SHR-04 | Un visiteur consulte une fiche publique | P0 | 5 | Page indexable et responsive |
| SHR-05 | Un visiteur télécharge un setup public | P0 | 3 | Compteur fiable et URL signée |
| SHR-06 | Je parcours le catalogue | P0 | 8 | Pagination, filtres et tri |
| SHR-07 | Une page publique possède des métadonnées SEO | P1 | 5 | Titre, description et aperçu social |

## 5.10 Epic 7 — Communauté et modération

| ID | User story | Priorité | Points | Critères d’acceptation |
|---|---|---:|---:|---|
| COM-01 | J’ajoute un setup public à mes favoris | P1 | 3 | Action idempotente |
| COM-02 | Je note un setup | P1 | 5 | Une note par utilisateur, auteur exclu |
| COM-03 | Je commente un setup | P1 | 5 | Validation, pagination et suppression propre |
| COM-04 | Je signale un contenu | P1 | 3 | Motif obligatoire et doublons limités |
| MOD-01 | Un modérateur consulte les signalements | P1 | 5 | File filtrable et historique |
| MOD-02 | Un modérateur masque un contenu | P1 | 5 | Motif et journal d’action |
| MOD-03 | Limiter les abus sur interactions publiques | P0 | 5 | Rate limiting et tests |

## 5.11 Epic 8 — Qualité, sécurité et exploitation

| ID | Tâche | Priorité | Points | Critères de fin |
|---|---|---:|---:|---|
| OPS-01 | Tests E2E du parcours MVP | P0 | 8 | Parcours critique automatisé |
| OPS-02 | Politique de sauvegarde et restauration | P0 | 3 | Test de restauration documenté |
| OPS-03 | Alertes erreurs et latence | P0 | 3 | Alertes testées |
| OPS-04 | Rate limiting | P0 | 5 | Auth, upload et communauté couverts |
| OPS-05 | Audit des accès privés | P0 | 5 | Cas IDOR testés |
| OPS-06 | Analyse d’accessibilité | P1 | 5 | Défauts majeurs corrigés |
| OPS-07 | Budget de performance frontend | P1 | 3 | Seuils de bundle et mesures CI |
| OPS-08 | Réconciliation stockage/base | P1 | 5 | Rapport des blobs orphelins ou manquants |

## 5.12 Découpage MVP proposé

### Sprint 1 — Fondation

FND-01 à FND-08, REF-05.

### Sprint 2 — Authentification et référentiels

AUTH-01 à AUTH-04, REF-01 à REF-03.

### Sprint 3 — Import

LIB-01 à LIB-04, stockage et sécurité associée.

### Sprint 4 — Bibliothèque

LIB-05 à LIB-10, SRC-01, SRC-04.

### Sprint 5 — Recherche et versions

SRC-02, SRC-05, SRC-06, VER-01 à VER-03, VER-07.

### Sprint 6 — Partage

SHR-01 à SHR-06, OPS-01 à OPS-05.

Le MVP est livré à la fin du sprint 6. La durée réelle dépend de la taille de l’équipe, de la maturité de l’authentification choisie et du niveau de finition UI attendu.

## 5.13 Definition of Done

Une story est terminée lorsque :

- critères d’acceptation validés ;
- tests appropriés écrits et réussis ;
- autorisations vérifiées ;
- erreurs et chargements traités dans l’interface ;
- documentation API ou produit mise à jour ;
- logs sans données sensibles ;
- migration rétrocompatible si nécessaire ;
- déploiement Preview validé ;
- revue de code effectuée.
