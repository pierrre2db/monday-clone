#!/usr/bin/env bash
# Deploy / update Monday Clone on a server. Run from the repo root on the VPS.
#   ./scripts/deploy.sh          # build + start (or update)
#   ./scripts/deploy.sh --seed   # also seed a demo board (first install only)
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "ERREUR : pas de .env. Fais d'abord :  cp .env.example .env  puis édite-le"
  echo "  (ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET=\$(openssl rand -base64 32))"
  exit 1
fi

echo "→ git pull"
git pull --ff-only || echo "  (pull ignoré — pas un clone git ou pas de remote)"

echo "→ docker compose up -d --build"
docker compose up -d --build

if [ "${1:-}" = "--seed" ]; then
  echo "→ seed board de démo"
  docker compose exec -T app npm run db:seed
fi

echo "→ état :"
docker compose ps
echo
echo "OK. L'app écoute sur le port 4000 (interne). Configure le Proxy Host NPM :"
echo "  ./scripts/setup-npm-proxy.sh project.dedobbeleer.online"
echo "IMPORTANT : ferme le port 4000 à l'extérieur (comme ton 5678)."
