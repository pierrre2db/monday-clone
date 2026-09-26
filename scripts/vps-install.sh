#!/usr/bin/env bash
# One-shot installer for Monday Clone on a VPS.
# Run it directly on the server:
#   curl -fsSL https://raw.githubusercontent.com/pierrre2db/monday-clone/main/scripts/vps-install.sh | bash
# Optional: choose the first admin email ->  ADMIN_EMAIL=you@example.com bash <(curl -fsSL .../vps-install.sh)
set -euo pipefail

REPO="https://github.com/pierrre2db/monday-clone.git"
ADMIN_EMAIL="${ADMIN_EMAIL:-pierre2db@gmail.com}"
DIR="${DIR:-$HOME/monday-clone}"

command -v docker >/dev/null || { echo "❌ Docker n'est pas installé/joignable ici. (Es-tu bien sur le VPS ?)"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "❌ 'docker compose' (v2) requis."; exit 1; }

echo "→ Récupération du code dans $DIR"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull --ff-only
else
  git clone "$REPO" "$DIR"
fi
cd "$DIR"

if [ ! -f .env ]; then
  AP=$(openssl rand -base64 12)
  SS=$(openssl rand -base64 32)
  printf 'ADMIN_EMAIL=%s\nADMIN_PASSWORD=%s\nSESSION_SECRET=%s\n' "$ADMIN_EMAIL" "$AP" "$SS" > .env
  echo "=================================================="
  echo "  Compte admin : $ADMIN_EMAIL"
  echo "  Mot de passe : $AP"
  echo "  >>> NOTE-LE (il ne sera plus affiché) <<<"
  echo "=================================================="
else
  echo "→ .env déjà présent, conservé (aucun mot de passe régénéré)."
fi

echo "→ Build + démarrage (1–3 min)…"
docker compose up -d --build
echo "→ Board de démo (optionnel)…"
docker compose exec -T app npm run db:seed || echo "  (seed ignoré)"

echo
docker compose ps
echo
echo "✅ App démarrée sur le port 4000 (interne)."
echo "Étape suivante — créer le reverse proxy :"
echo "  cd $DIR && bash scripts/setup-npm-proxy.sh project.dedobbeleer.online"
echo "Puis ferme le port 4000 à l'extérieur (comme ton 5678)."
