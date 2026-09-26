# Déploiement sur un VPS (derrière Nginx Proxy Manager)

Guide pour héberger Monday Clone sur un serveur avec un reverse proxy **Nginx Proxy Manager (NPM)**
et un sous-domaine (ex. `project.dedobbeleer.online`). Postgres n'est jamais exposé publiquement ;
l'app écoute sur le port `4000` (interne), NPM fait le HTTPS.

## Prérequis
- Un VPS avec **Docker + Docker Compose**, et **NPM** déjà en place (admin sur `:81`).
- Un enregistrement **DNS A** `sous-domaine → IP du VPS` (le certificat wildcard couvre le HTTPS).

## 1. DNS
Chez ton registrar : ajoute un **A record** `project` → `<IP du VPS>` (Host = `project`, pas le
domaine complet). Vérifie : `dig +short project.tondomaine → <IP>`.

## 2. Déployer l'app
```bash
ssh <user>@<IP-du-VPS>
git clone https://github.com/pierrre2db/monday-clone.git
cd monday-clone
cp .env.example .env
# édite .env :
#   ADMIN_EMAIL=...           (le 1er compte admin, créé au démarrage)
#   ADMIN_PASSWORD=...        (mot de passe fort)
#   SESSION_SECRET=$(openssl rand -base64 32)
./scripts/deploy.sh --seed   # build + start (+ board de démo au 1er install)
```
Le conteneur applique les migrations et crée le 1er admin automatiquement (bootstrap).

## 3. Proxy Host NPM (en ligne de commande, via l'API)
```bash
apt-get install -y jq   # si absent
./scripts/setup-npm-proxy.sh project.dedobbeleer.online
```
Le script demande l'email + mot de passe admin NPM (tapé sans écho), liste tes certificats,
et crée le Proxy Host (`http` → `192.3.100.10:4000`, WebSockets, Force SSL + HTTP/2 si tu donnes
un `CERT_ID`). Réutilise ton certificat **wildcard `*.dedobbeleer.online`** si listé.

> Interface graphique : tu peux aussi créer le Proxy Host à la main dans NPM (`:81`) — mêmes valeurs.

### Pas de certificat wildcard ? Demander un Let's Encrypt à la volée
Dans le script (ou à la main) : demande un cert pour le domaine, puis relance avec son `CERT_ID`.
```bash
# nécessite le TOKEN NPM (le script t'aide) :
curl -fsS -X POST http://127.0.0.1:81/api/nginx/certificates \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"provider":"letsencrypt","nice_name":"project",
       "domain_names":["project.dedobbeleer.online"],
       "meta":{"letsencrypt_email":"toi@exemple.com","letsencrypt_agree":true,"dns_challenge":false}}' | jq '{id}'
```

## 4. Tester
```bash
curl -sI https://project.dedobbeleer.online | head -5
```
Ouvre l'URL → page de login → connecte-toi avec `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
Puis, dans l'app : change le mot de passe admin (Utilisateurs → ✎) et configure le SMTP
(Paramètres) — voir l'annexe Gmail dans `MANUAL.md`.

## Sécurité (important)
- **Ferme le port 4000 à l'extérieur** (comme les autres backends type n8n:5678). Le public passe
  uniquement par NPM (443). Exemple UFW (⚠️ autorise 22/80/443 AVANT d'activer, sinon tu te coupes le SSH) :
  ```bash
  ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
  ufw enable
  # 4000 n'est pas autorisé → fermé de l'extérieur ; NPM y accède en local.
  ```
- Postgres est déjà lié à `127.0.0.1` (non exposé). Tu peux durcir le mot de passe DB interne
  (`docker-compose.yml` service `db` + `DATABASE_URL`).
- (Optionnel) headers de sécurité dans l'onglet **Advanced** du Proxy Host NPM :
  ```
  add_header Strict-Transport-Security "max-age=31536000" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  ```

## Mettre à jour plus tard
```bash
cd monday-clone && ./scripts/deploy.sh   # git pull + rebuild + restart (données conservées)
```
Les données vivent dans les volumes Docker `pgdata` (base) et `uploads` (fichiers).
