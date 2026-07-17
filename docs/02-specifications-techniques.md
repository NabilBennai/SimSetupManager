# 2. Spécifications techniques

## 2.1 Stack cible

| Couche | Technologie |
|---|---|
| Monorepo | Turborepo + gestionnaire de paquets compatible workspaces |
| Frontend | Angular, composants standalone, Signals, Router, formulaires réactifs |
| Backend | NestJS, API REST versionnée |
| Accès aux données | Prisma ORM |
| Base de données | Turso (libSQL, compatible SQLite) managé |
| Stockage de fichiers | Stockage objet compatible URL signées, par exemple Vercel Blob ou S3 |
| Authentification | Fournisseur managé ou module NestJS avec sessions/JWT sécurisés |
| Validation | DTO NestJS + validation partagée des contrats lorsque pertinent |
| Tests | Tests unitaires, intégration API et tests end-to-end navigateur |
| Documentation API | OpenAPI/Swagger |
| CI/CD | GitHub Actions et intégration Vercel |
| Observabilité | Logs structurés, suivi d’erreurs et métriques produit |

Les versions exactes doivent être figées lors de l’initialisation du dépôt et mises à jour via un processus contrôlé.

## 2.2 Contraintes non fonctionnelles

### Performance

- Temps de réponse API cible hors upload : p95 inférieur à 500 ms.
- Premier affichage utilisable des pages principales : cible inférieure à 3 s sur connexion moyenne.
- Pagination obligatoire pour les collections.
- Upload direct vers le stockage objet lorsque possible, afin d’éviter le transit du fichier par la fonction API.
- Index de base de données sur les filtres les plus fréquents.

### Disponibilité

- Objectif initial : 99,5 % mensuel hors maintenance planifiée.
- Dégradation contrôlée si le service de statistiques ou de notifications est indisponible.
- Aucune perte silencieuse de fichier après confirmation d’import.

### Sécurité

- HTTPS obligatoire.
- Autorisation contrôlée côté API, jamais uniquement côté Angular.
- URL de téléchargement privées signées et à durée limitée.
- Validation stricte du type, de l’extension et de la taille.
- Nom physique du fichier généré côté serveur ; ne pas utiliser directement le nom fourni.
- Protection contre les doubles soumissions et les abus d’upload.
- Limitation de débit sur authentification, upload, commentaires et téléchargements.
- Secrets uniquement dans le gestionnaire d’environnement de la plateforme.
- Journalisation des opérations sensibles.
- Analyse antivirus à ajouter avant ouverture communautaire large si le stockage accepte des formats risqués.

### Confidentialité

- Principe de minimisation des données personnelles.
- Visibilité privée par défaut.
- Export des données personnelles à prévoir.
- Suppression de compte avec anonymisation ou suppression des données selon les obligations applicables.

### Maintenabilité

- Architecture modulaire par domaine.
- Contrats API versionnés.
- Lint, formatage et vérification des types obligatoires en CI.
- Couverture renforcée sur autorisations, uploads et règles métier.

## 2.3 API REST

Préfixe : `/api/v1`.

### Authentification

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh` si JWT avec renouvellement
- `GET /auth/me`

### Setups

- `GET /setups`
- `POST /setups`
- `GET /setups/:id`
- `PATCH /setups/:id`
- `DELETE /setups/:id`
- `POST /setups/:id/archive`
- `POST /setups/:id/restore`
- `POST /setups/:id/versions`
- `GET /setups/:id/versions`
- `POST /setups/:id/publish`
- `POST /setups/:id/unpublish`
- `POST /setups/:id/download-url`

### Upload

Flux recommandé :

1. `POST /uploads/prepare` crée une intention d’upload et renvoie une URL signée.
2. Le navigateur envoie directement le fichier au stockage.
3. `POST /uploads/:id/complete` confirme l’upload, calcule ou enregistre le hash, puis crée la version.

### Référentiels

- `GET /games`
- `GET /games/:gameId/cars`
- `GET /tracks`
- `GET /categories`

### Communauté

- `GET /public/setups`
- `GET /public/setups/:slug`
- `POST /setups/:id/favorites`
- `DELETE /setups/:id/favorites`
- `PUT /setups/:id/rating`
- `GET /setups/:id/comments`
- `POST /setups/:id/comments`
- `DELETE /comments/:id`
- `POST /reports`

## 2.4 Convention des réponses

Réponse de succès :

```json
{
  "data": {},
  "meta": {
    "requestId": "req_..."
  }
}
```

Réponse paginée :

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 24,
    "total": 120,
    "totalPages": 5,
    "requestId": "req_..."
  }
}
```

Erreur :

```json
{
  "error": {
    "code": "SETUP_NOT_FOUND",
    "message": "Le setup demandé est introuvable.",
    "details": []
  },
  "meta": {
    "requestId": "req_..."
  }
}
```

## 2.5 Contrats et validation

- Les DTO d’entrée NestJS sont la référence d’exécution.
- Les types exposés au frontend sont générés depuis OpenAPI ou partagés dans un package sans dépendance au framework.
- Les identifiants sont opaques pour le client.
- Toutes les dates sont échangées au format ISO 8601 UTC.
- Les temps au tour sont stockés en millisecondes entières.
- Les valeurs décimales nécessitant de la précision utilisent un type décimal en base plutôt qu’un flottant.

## 2.6 Gestion des fichiers

Métadonnées minimales :

- identifiant de stockage ;
- nom d’origine nettoyé pour affichage ;
- nom ou clé physique générée ;
- taille ;
- type MIME détecté ;
- extension ;
- hash SHA-256 ;
- date d’import ;
- statut d’analyse ;
- propriétaire.

États possibles : `PENDING`, `UPLOADED`, `VALIDATED`, `REJECTED`, `DELETED`.

Le fichier ne doit être associé définitivement à un setup qu’après confirmation de l’upload. Un traitement périodique supprime les intentions abandonnées.

## 2.7 Parseurs de setup

Une interface de plugin interne permet de prendre en charge progressivement plusieurs jeux :

```ts
interface SetupParser {
  supports(input: FileDescriptor): boolean;
  parse(content: Buffer): Promise<ParsedSetup>;
  compare(a: ParsedSetup, b: ParsedSetup): SetupDiff;
}
```

Chaque parseur fournit :

- formats compatibles ;
- version du parseur ;
- paramètres extraits ;
- règles de normalisation ;
- erreurs explicites.

Le système conserve toujours le fichier original. Une erreur de parsing ne doit pas empêcher l’enregistrement si le format est autorisé.

## 2.8 Authentification et autorisation

Option recommandée pour le MVP : authentification managée avec session sécurisée et validation de l’identité dans NestJS.

Politique d’autorisation :

- guards NestJS par route ;
- service de politique centralisé ;
- contrôle de propriété au niveau du domaine ;
- aucune confiance dans les identifiants envoyés par le client ;
- tests de non-régression pour les accès horizontaux.

## 2.9 Cache

Le cache n’est pas requis pour le premier incrément privé. Lors de l’ouverture du catalogue public :

- cache court pour référentiels ;
- cache de listes publiques à forte lecture ;
- invalidation à la publication, modification ou modération ;
- ne jamais mettre en cache une réponse privée sans clé utilisateur sûre.

## 2.10 Tests

### Unitaires

- règles métier ;
- validateurs ;
- politiques d’accès ;
- parseurs ;
- formatage des temps.

### Intégration

- endpoints avec base Turso/SQLite isolée ;
- création et versionnement ;
- upload préparé/confirmé ;
- contraintes d’unicité ;
- suppression logique.

### End-to-end

- inscription/connexion ;
- import ;
- recherche ;
- modification ;
- publication ;
- téléchargement public et refus privé.

## 2.11 Observabilité

- Identifiant de requête propagé.
- Logs JSON avec niveau, route, durée, statut et utilisateur pseudonymisé.
- Suivi des exceptions frontend et backend.
- Alertes sur taux d’erreur, latence, échec d’upload et saturation des connexions DB.
- Tableau de bord produit séparé des logs techniques.
