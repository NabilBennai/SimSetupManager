# 7. Décisions d’architecture

## ADR-001 — Monolithe modulaire

**Statut :** accepté.

**Décision :** construire une API NestJS unique organisée en modules métier.

**Motif :** réduire les coûts de coordination et d’exploitation au stade MVP, tout en conservant des frontières facilitant une extraction future.

## ADR-002 — PostgreSQL et Prisma

**Statut :** accepté.

**Décision :** utiliser PostgreSQL pour les données structurées et Prisma comme couche d’accès.

**Motif :** intégrité relationnelle, migrations, filtres riches et typage TypeScript.

## ADR-003 — Fichiers hors base de données

**Statut :** accepté.

**Décision :** stocker les fichiers dans un stockage objet et uniquement leurs métadonnées en PostgreSQL.

**Motif :** coût, scalabilité, téléchargement direct et sauvegardes adaptées.

## ADR-004 — Upload direct signé

**Statut :** accepté.

**Décision :** le navigateur envoie le fichier directement au stockage après autorisation de l’API.

**Motif :** réduire durée, mémoire et bande passante des fonctions NestJS.

## ADR-005 — REST versionné

**Statut :** accepté.

**Décision :** exposer `/api/v1` avec OpenAPI et client généré.

**Motif :** contrats simples, outillage mature et intégration directe avec Angular.

## ADR-006 — Setups versionnés et fichiers immuables

**Statut :** accepté.

**Décision :** remplacer un fichier crée une nouvelle `SetupVersion`.

**Motif :** comparaison, traçabilité et absence d’écrasement accidentel.

## ADR-007 — Privé par défaut

**Statut :** accepté.

**Décision :** tout nouveau setup possède la visibilité `PRIVATE`.

**Motif :** minimiser les fuites involontaires et respecter les attentes utilisateur.

## ADR-008 — PostgreSQL avant moteur de recherche dédié

**Statut :** accepté.

**Décision :** réaliser la recherche MVP dans PostgreSQL.

**Motif :** éviter une infrastructure supplémentaire avant d’avoir des mesures justifiant son coût.

## ADR-009 — Compatibilité serverless

**Statut :** accepté avec réserve.

**Décision :** garder l’API sans état et les traitements synchrones courts afin de la déployer sur Vercel Functions.

**Conséquence :** tout traitement lourd sera déplacé vers un worker ou une plateforme de conteneurs.

## ADR-010 — Pas de synchronisation locale dans le MVP

**Statut :** accepté.

**Décision :** l’import initial est manuel depuis le navigateur.

**Motif :** un navigateur ne peut pas surveiller durablement les dossiers de jeux ; cette fonction nécessitera un compagnon desktop et augmente fortement le périmètre.
