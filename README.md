# Sim Setup Manager — Dossier de conception

## Objectif

Sim Setup Manager est une application web permettant aux simracers d’importer, organiser, rechercher, comparer et partager leurs fichiers de setup par jeu, voiture, circuit et conditions de piste.

Le projet est conçu comme un monorepo TypeScript basé sur Angular, NestJS, Turborepo et PostgreSQL, avec un déploiement prioritairement ciblé sur Vercel.

## Documents

| Fichier | Contenu |
|---|---|
| `01-specifications-fonctionnelles.md` | Périmètre produit, personas, parcours, règles métier et critères d’acceptation |
| `02-specifications-techniques.md` | Choix techniques, API, données, sécurité, qualité et observabilité |
| `03-architecture-logicielle.md` | Architecture du monorepo, modules, flux et décisions structurantes |
| `04-strategie-de-deploiement.md` | Environnements, Vercel, base de données, CI/CD, migrations et reprise |
| `05-backlog-developpement.md` | Epics, user stories, priorités, estimations et plan de livraison |
| `06-modele-de-donnees.md` | Modèle relationnel cible et contraintes principales |
| `07-decisions-architecture.md` | Registre initial des décisions d’architecture (ADR) |

## Hypothèses structurantes

- Le MVP cible d’abord un usage personnel, puis le partage communautaire.
- Les fichiers de setup restent privés par défaut.
- Le stockage binaire est séparé de PostgreSQL.
- Les métadonnées sont normalisées ; le contenu brut d’un setup peut être conservé sans être interprété.
- L’import automatique depuis le dossier local d’un jeu est hors MVP et nécessitera ultérieurement une application compagnon.
- L’API NestJS est compatible avec un déploiement serverless tant que les traitements restent courts et sans connexion persistante.

## Proposition de nom

Nom de travail : **ApexSetup**.
