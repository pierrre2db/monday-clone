# Manuel du logiciel — Monday Clone

Application de gestion de travail auto-hébergeable, inspirée de Monday.com :
tableaux (boards), colonnes typées, et vues Table / Kanban / Calendrier.
Déployable en une commande via Docker, sur un VPS ou en local (macOS/Linux/Windows).

---

## Table des matières
1. [Concepts](#1-concepts)
2. [Installation & démarrage](#2-installation--démarrage)
3. [Configuration (variables d'environnement)](#3-configuration)
4. [Connexion](#4-connexion)
5. [Utilisation](#5-utilisation)
   - Boards, Groupes, Items
   - Types de colonnes
   - Vues (Table, Kanban, Calendrier)
   - Membres
   - Thème clair/sombre & mobile
6. [Sauvegarde & persistance des données](#6-sauvegarde--persistance)
7. [Mise à jour](#7-mise-à-jour)
8. [Mise en production sur un VPS](#8-mise-en-production-sur-un-vps)
9. [Développement local](#9-développement-local)
10. [Dépannage (FAQ)](#10-dépannage-faq)
11. [Architecture technique](#11-architecture-technique)
12. [Limites connues & feuille de route](#12-limites-connues--feuille-de-route)

---

## 1. Concepts

| Terme | Définition |
|-------|-----------|
| **Board** | Un tableau de travail. Contient des groupes, des colonnes et des items. |
| **Groupe** | Une section colorée d'un board (ex : « À faire », « En cours »). |
| **Item** | Une ligne / tâche dans un groupe. |
| **Colonne** | Un champ typé partagé par tous les items du board (ex : Statut, Personne, Date). |
| **Cellule** | La valeur d'une colonne pour un item donné. |
| **Membre** | Une personne assignable via une colonne « Personne » (pas un compte de connexion en v1). |

L'accès à toute l'instance est protégé par **un seul mot de passe partagé** (pas de comptes individuels en v1).

---

## 2. Installation & démarrage

**Prérequis :** [Docker](https://docs.docker.com/get-docker/) + Docker Compose (inclus dans Docker Desktop).

```bash
git clone <URL_DU_DEPOT> monday-clone
cd monday-clone
cp .env.example .env          # puis éditez .env (voir §3)
docker compose up -d --build
docker compose exec app npm run db:seed   # optionnel : board de démo
```

Ouvrez **http://localhost:3000** (ou le port choisi, voir ci-dessous) et connectez-vous avec `APP_PASSWORD`.

> **Changer le port hôte** (si 3000 est déjà pris) : dans `docker-compose.yml`, service `app`, remplacez
> `- "3000:3000"` par `- "4000:3000"` puis `docker compose up -d`. L'app est alors sur http://localhost:4000.

---

## 3. Configuration

Variables dans `.env` (jamais commité ; `.env.example` sert de modèle) :

| Variable | Rôle | Valeur par défaut |
|----------|------|-------------------|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL | `postgresql://monday:monday@db:5432/monday?schema=public` |
| `APP_PASSWORD` | Mot de passe unique de l'instance | `change-me` — **à changer** |
| `SESSION_SECRET` | Clé de signature du cookie de session | à générer (chaîne aléatoire longue) |
| `UPLOAD_DIR` | Dossier de stockage des fichiers | `/data/uploads` |
| `MAX_UPLOAD_BYTES` | Taille max d'un upload (octets) | `10485760` (10 Mo) |

Générer un `SESSION_SECRET` :
```bash
openssl rand -base64 32
```

> ⚠️ **Avant toute exposition publique** : changez `APP_PASSWORD` et mettez un vrai `SESSION_SECRET`.

---

## 4. Connexion

À la première visite, vous êtes redirigé vers `/login`. Saisissez `APP_PASSWORD`.
Un cookie de session signé (httpOnly, valable 30 jours) est posé ; toutes les pages
et l'API sont protégées sauf `/login` et l'endpoint d'authentification.

---

## 5. Utilisation

### Boards
- **Accueil** (`/`) : liste des boards.
- **Créer** : champ « + New board », entrez un nom → vous êtes redirigé dans le board.
- **Supprimer** : bouton `×` sur la carte du board (confirmation demandée).

### Groupes & Items (vue Table)
- **Ajouter un groupe** : bouton **+ Group** dans la barre du board.
- **Renommer un groupe / une colonne / un item** : cliquez le nom (champ éditable), modifiez, cliquez ailleurs (blur) pour sauvegarder. `Échap` annule.
- **Supprimer** : bouton `×` sur le groupe, l'en-tête de colonne, ou la ligne d'item (confirmation pour groupe/colonne).
- **Ajouter un item** : bouton **+ Ajouter un item** en bas de chaque groupe.
- **Ajouter une colonne** : menu **+ Column…**, choisissez un type.

### Types de colonnes

| Type | Édition | Valeur stockée |
|------|---------|----------------|
| **Texte** | champ libre | texte |
| **Nombre** | champ numérique | nombre |
| **Statut** | pastille colorée → popover de choix | un label (id) |
| **Personne** | avatars → checklist de membres | liste de membres |
| **Date** | sélecteur de date | date `AAAA-MM-JJ` |
| **Timeline** | deux dates (début → fin) | plage de dates |
| **Priorité / Dropdown** | popover à choix multiples | liste d'options |
| **Case à cocher** | case | booléen |
| **Fichiers** | bouton d'upload | fichiers joints |
| **Lien** | URL | url + libellé |
| **Tags** | texte séparé par virgules | liste de tags |

**Éditer les labels d'une colonne Statut / Dropdown** : bouton **⚙** sur l'en-tête de la colonne → ajoutez/renommez/recolorez les labels ou options → **Save**.

### Vues
Basculez via les onglets **Table / Kanban / Calendrier** en haut du board.
- **Table** : grille éditable. La 1re colonne (nom) reste visible au défilement horizontal.
- **Kanban** : cartes regroupées par la colonne Statut choisie. **Glissez-déposez** une carte d'une colonne à l'autre pour changer son statut. Défilement horizontal des lanes.
- **Calendrier** : items placés par une colonne Date/Timeline. Naviguez avec ‹ ›. Sur mobile, une vue **agenda** (liste) remplace la grille.

### Membres
Bouton **Members** dans la barre du board : ajoutez / supprimez des membres (nom + couleur).
Ils apparaissent aussitôt dans les colonnes « Personne » (sans rechargement).

### Thème & mobile
- **🌙 / ☀️** en haut : bascule clair/sombre (mémorisé dans le navigateur). Par défaut, suit le réglage du système.
- **Responsive** : sous 640 px de large, la Table devient des **cartes empilées**, le Calendrier une **liste agenda**. Fonctionne sur téléphone comme sur ordinateur.

---

## 6. Sauvegarde & persistance

Les données vivent dans deux volumes Docker nommés :
- `pgdata` — base PostgreSQL (boards, items, cellules, membres)
- `uploads` — fichiers uploadés

`docker compose down` **conserve** les volumes. `docker compose down -v` les **supprime** (perte de données).

**Sauvegarder la base :**
```bash
docker compose exec db pg_dump -U monday monday > backup_$(date +%F).sql
```

**Restaurer :**
```bash
cat backup_2026-09-18.sql | docker compose exec -T db psql -U monday monday
```

**Sauvegarder les fichiers uploadés :**
```bash
docker run --rm -v mondayclone_uploads:/data -v "$PWD":/backup alpine \
  tar czf /backup/uploads_backup.tgz -C /data .
```

---

## 7. Mise à jour

```bash
git pull
docker compose up -d --build   # rebuild + redémarrage
```
Les migrations de base sont appliquées automatiquement au démarrage du conteneur
(`prisma migrate deploy`). Les volumes (données) sont préservés.

---

## 8. Mise en production sur un VPS

1. Installez Docker + Docker Compose sur le VPS.
2. Clonez le dépôt, créez `.env` avec un **vrai** `APP_PASSWORD` et `SESSION_SECRET`.
3. `docker compose up -d --build`.
4. **Placez un reverse proxy avec HTTPS devant** (l'app écoute en HTTP sur le port choisi).
   Exemple avec [Caddy](https://caddyserver.com/) (HTTPS automatique) — `Caddyfile` :
   ```
   monday.mondomaine.com {
       reverse_proxy localhost:3000
   }
   ```
5. Ouvrez seulement le port 443 (HTTPS) au public ; ne pas exposer PostgreSQL (5432).

> **Sécurité v1** : un seul mot de passe protège l'instance, sans limitation de tentatives.
> Convient à une équipe de confiance derrière HTTPS. Pour un usage public/large,
> voir la feuille de route (comptes utilisateurs).

---

## 9. Développement local

```bash
docker compose up -d db        # juste PostgreSQL
cp .env.example .env           # DATABASE_URL → localhost:5432
npx prisma migrate deploy
npm install
npm run db:seed
npm run dev                    # http://localhost:3000
```
Tests : `npm test` (Vitest). Vérif types : `npx tsc --noEmit`. Build : `npm run build`.

---

## 10. Dépannage (FAQ)

**« Le port 3000 est déjà utilisé »** → remappez le port hôte dans `docker-compose.yml` (voir §2).

**« Wrong password » à la connexion** → vérifiez `APP_PASSWORD` dans `.env`, puis `docker compose up -d` pour recharger l'environnement.

**Un fichier uploadé renvoie « not found »** → le volume `uploads` a peut-être été recréé (`down -v`). Les références en base pointent vers des fichiers disparus.

**La base ne démarre pas** → `docker compose logs db` ; vérifiez que le port 5432 n'est pas déjà pris localement.

**Réinitialiser complètement** (⚠️ efface tout) :
```bash
docker compose down -v && docker compose up -d --build && docker compose exec app npm run db:seed
```

---

## 11. Architecture technique

- **Front + back** : Next.js (App Router) — un seul service applicatif (React + Route Handlers/API).
- **Base de données** : PostgreSQL via Prisma (ORM). Les valeurs de cellules sont stockées en JSON, validées par type de colonne.
- **Auth** : mot de passe unique → cookie de session JWT signé (HS256), vérifié par un middleware (`proxy.ts`).
- **Fichiers** : disque local monté en volume Docker, servis via une route authentifiée (garde anti-traversée de chemin).
- **UI** : design tokens CSS (clair/sombre), composants maison (`src/ui/kit/`), responsive mobile-first.
- **Déploiement** : image Docker multi-stage + `docker-compose.yml` (app + db + volumes).

Détails : voir `docs/superpowers/specs/` (spécifications) et `docs/superpowers/plans/` (plans d'implémentation).

---

## 12. Limites connues & feuille de route

**Limites v1 :**
- Un seul mot de passe partagé (pas de comptes/rôles individuels).
- Pas de temps réel (rechargez pour voir les changements des autres).
- Pas de rate-limiting sur la connexion.
- Réordonnancement par glisser-déposer : Kanban uniquement (pas les lignes/colonnes en Table).
- Le panneau d'édition des labels (⚙) peut être visuellement rogné dans certains cas.

**Feuille de route (v2) :**
- Comptes utilisateurs + rôles & permissions
- Automations (« quand statut = X → notifier / déplacer »)
- Temps réel (websockets)
- Réordonnancement lignes/colonnes, avatars images, recherche/filtres, sous-items

---

*Logiciel sous licence MIT. Contributions bienvenues.*
