# 4. Stratégie de déploiement

## 4.1 Cible

Le frontend Angular et l’API NestJS sont déployés dans deux projets Vercel reliés au même monorepo. PostgreSQL et le stockage objet sont des services managés externes ou intégrés à l’écosystème Vercel.

Vercel documente la prise en charge d’Angular et le déploiement de NestJS via Vercel Functions. L’architecture doit néanmoins rester compatible avec les contraintes serverless : processus sans état, absence de serveur permanent et prudence sur les connexions persistantes.

## 4.2 Environnements

| Environnement | Déclencheur | Usage |
|---|---|---|
| Local | Commandes développeur | Développement et tests rapides |
| Preview | Pull request / branche | Validation fonctionnelle et revue |
| Staging | Branche dédiée ou promotion | Tests d’intégration proches de la production |
| Production | Branche principale + approbation | Utilisateurs réels |

Chaque environnement possède :

- base de données distincte ou schéma strictement isolé ;
- bucket/conteneur de fichiers distinct ;
- secrets distincts ;
- origine CORS explicite ;
- configuration d’observabilité séparée.

## 4.3 Projets Vercel

### Projet `apexsetup-web`

- Root directory : `apps/web` ou configuration depuis la racine du monorepo.
- Commande de build pilotée par Turborepo.
- Sortie Angular détectée par l’intégration de plateforme.
- Variables publiques limitées à l’URL d’API et aux identifiants non secrets.

### Projet `apexsetup-api`

- Root directory : `apps/api`.
- Déploiement comme fonctions Node.js.
- Région alignée autant que possible avec PostgreSQL.
- Limites de durée et de mémoire surveillées.
- Aucun fichier local utilisé comme stockage durable.

## 4.4 Base PostgreSQL

Exigences :

- connexions compatibles serverless ou pooler ;
- chiffrement en transit et au repos ;
- sauvegardes automatiques ;
- restauration à un instant donné si disponible ;
- branche ou base de preview lorsque le fournisseur le permet ;
- région proche de l’API.

Prisma doit être configuré de manière adaptée au fournisseur. Les migrations sont exécutées par un job CI contrôlé, pas automatiquement par chaque instance de fonction.

## 4.5 Stockage objet

- Upload direct depuis le navigateur via URL ou jeton signé.
- Clés séparées par environnement et propriétaire.
- Téléchargements privés par URL temporaires.
- Politique de rétention pour intentions abandonnées et suppressions logiques.
- CORS limité aux domaines attendus.
- Vérification serveur de l’objet après upload.

## 4.6 Pipeline CI

À chaque pull request :

1. installation reproductible des dépendances ;
2. vérification du formatage ;
3. lint ;
4. vérification TypeScript ;
5. tests unitaires ;
6. tests d’intégration ciblés ;
7. build Angular et NestJS ;
8. génération et vérification OpenAPI ;
9. déploiement Preview ;
10. tests end-to-end minimaux sur Preview.

À la fusion en production :

1. validation complète ;
2. sauvegarde ou vérification du point de restauration ;
3. application des migrations compatibles ;
4. déploiement API ;
5. smoke tests API ;
6. déploiement frontend ;
7. smoke tests utilisateur ;
8. annotation de version dans l’outil d’observabilité.

## 4.7 Migrations de base de données

Stratégie `expand and contract` :

1. ajouter les nouvelles colonnes/tables sans casser l’existant ;
2. déployer le code compatible avec les deux formes ;
3. migrer les données si nécessaire ;
4. basculer les lectures/écritures ;
5. supprimer les anciens champs dans une version ultérieure.

Interdictions en déploiement courant :

- renommage destructif immédiat ;
- suppression d’une colonne encore utilisée ;
- migration longue bloquant la table pendant le trafic ;
- dépendance à un rollback automatique de schéma complexe.

## 4.8 Variables d’environnement

Exemples :

```text
DATABASE_URL=
DIRECT_DATABASE_URL=
STORAGE_TOKEN=
AUTH_SECRET=
APP_ORIGIN=
API_ORIGIN=
SENTRY_DSN=
LOG_LEVEL=
```

Les secrets ne sont jamais stockés dans Git. Une documentation séparée décrit leur création et leur rotation sans contenir leurs valeurs.

## 4.9 Domaines et réseau

- `app.example.com` pour Angular.
- `api.example.com` pour NestJS.
- CORS limité à l’application et aux previews autorisées.
- Cookies `Secure`, `HttpOnly` et politique `SameSite` adaptée si sessions par cookie.
- CSP définie progressivement puis rendue stricte.
- Redirection HTTPS et HSTS en production.

## 4.10 Observabilité en production

Alertes minimales :

- taux d’erreur API supérieur au seuil ;
- hausse des réponses 401/403 anormales ;
- latence p95 élevée ;
- erreurs de connexion PostgreSQL ;
- échec de confirmation d’upload ;
- écart entre blobs chargés et versions confirmées ;
- consommation proche des limites de plateforme.

## 4.11 Reprise et rollback

### Code

- Rollback vers le déploiement Vercel précédent.
- Feature flags pour désactiver rapidement une fonction risquée.

### Base

- Migrations rétrocompatibles.
- Restauration depuis sauvegarde uniquement en cas d’incident majeur.
- Procédure documentée de validation après restauration.

### Fichiers

- Suppression différée.
- Journal des opérations.
- Réconciliation périodique entre base et stockage.

## 4.12 Limites et stratégie d’évolution

Le déploiement NestJS sur fonctions convient au MVP et aux appels courts. Un service Node persistant ou un worker séparé devra être envisagé pour :

- WebSocket durable ;
- parsing lourd ou long ;
- gros traitements de télémétrie ;
- files de travaux avec forte concurrence ;
- dépendances système non compatibles avec l’environnement serverless.

Dans ce cas, Angular peut rester sur Vercel tandis que l’API ou les workers sont déplacés vers une plateforme de conteneurs.
