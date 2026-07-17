# 7. Décisions d’architecture

## ADR-001 — Monolithe modulaire

**Statut :** accepté.

**Décision :** construire une API NestJS unique organisée en modules métier.

**Motif :** réduire les coûts de coordination et d’exploitation au stade MVP, tout en conservant des frontières facilitant une extraction future.

## ADR-002 — Turso (libSQL) et Prisma

**Statut :** accepté (révisé le 2026-07-17, remplace la décision initiale PostgreSQL).

**Décision :** utiliser Turso (libSQL, compatible SQLite) pour les données structurées, avec Prisma comme couche d’accès via les driver adapters (`@prisma/adapter-libsql`).

**Motif :** intégration native avec Vercel, latence réduite via replicas Turso, coût d’exploitation faible au stade MVP, migrations et typage TypeScript conservés grâce à Prisma. Le développement local utilise un fichier SQLite local ; les environnements preview/production utilisent des bases Turso distinctes.

**Conséquence :** les contraintes relationnelles avancées (types avancés, certaines fonctions PostgreSQL) ne sont pas disponibles ; le modèle de données (`docs/06-modele-de-donnees.md`) doit rester compatible SQLite. Une migration vers PostgreSQL managé reste possible ultérieurement si des besoins relationnels avancés apparaissent.

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

## ADR-008 — Turso avant moteur de recherche dédié

**Statut :** accepté.

**Décision :** réaliser la recherche MVP directement dans Turso (SQL standard, `LIKE`/`FTS5` si nécessaire).

**Motif :** éviter une infrastructure supplémentaire avant d’avoir des mesures justifiant son coût.

## ADR-009 — Compatibilité serverless

**Statut :** accepté avec réserve.

**Décision :** garder l’API sans état et les traitements synchrones courts afin de la déployer sur Vercel Functions.

**Conséquence :** tout traitement lourd sera déplacé vers un worker ou une plateforme de conteneurs.

## ADR-010 — Pas de synchronisation locale dans le MVP

**Statut :** accepté.

**Décision :** l’import initial est manuel depuis le navigateur.

**Motif :** un navigateur ne peut pas surveiller durablement les dossiers de jeux ; cette fonction nécessitera un compagnon desktop et augmente fortement le périmètre.
