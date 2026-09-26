#!/usr/bin/env bash
# Create an Nginx Proxy Manager proxy host via its API (run on the VPS, NPM admin on :81).
# Usage: ./scripts/setup-npm-proxy.sh <domain> [forward_host] [forward_port]
#   ./scripts/setup-npm-proxy.sh project.dedobbeleer.online
#   ./scripts/setup-npm-proxy.sh project.dedobbeleer.online 192.3.100.10 4000
# The NPM admin password is typed interactively (never echoed, never stored).
set -euo pipefail

DOMAIN="${1:?domaine requis, ex: project.dedobbeleer.online}"
FWD_HOST="${2:-192.3.100.10}"
FWD_PORT="${3:-4000}"
NPM_URL="${NPM_URL:-http://127.0.0.1:81}"

command -v jq >/dev/null || { echo "Installe jq :  apt-get install -y jq"; exit 1; }

read -rp  "Email admin NPM: " NPM_EMAIL
read -rsp "Mot de passe admin NPM: " NPM_PASS; echo

TOKEN=$(curl -fsS -X POST "$NPM_URL/api/tokens" \
  -H 'Content-Type: application/json' \
  -d "{\"identity\":\"$NPM_EMAIL\",\"secret\":\"$NPM_PASS\"}" | jq -r '.token // empty')
[ -n "$TOKEN" ] || { echo "Auth NPM échouée (email/mot de passe ?)"; exit 1; }
echo "✓ Authentifié."

echo "Certificats disponibles (id  nom  domaines) :"
curl -fsS "$NPM_URL/api/nginx/certificates" -H "Authorization: Bearer $TOKEN" \
  | jq -r '.[] | "  \(.id)\t\(.nice_name)\t\(.domain_names|join(","))"'
read -rp "CERT_ID à utiliser (0 = sans SSL pour l'instant) : " CERT_ID
CERT_ID="${CERT_ID:-0}"

if [ "$CERT_ID" = "0" ]; then SSL=false; H2=false; else SSL=true; H2=true; fi

echo "→ Création du Proxy Host $DOMAIN → $FWD_HOST:$FWD_PORT (SSL=$SSL)"
curl -fsS -X POST "$NPM_URL/api/nginx/proxy-hosts" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{
    \"domain_names\":[\"$DOMAIN\"],
    \"forward_scheme\":\"http\",
    \"forward_host\":\"$FWD_HOST\",
    \"forward_port\":$FWD_PORT,
    \"block_exploits\":true,
    \"allow_websocket_upgrade\":true,
    \"access_list_id\":0,
    \"certificate_id\":$CERT_ID,
    \"ssl_forced\":$SSL,
    \"http2_support\":$H2,
    \"hsts_enabled\":false,
    \"meta\":{\"letsencrypt_agree\":false,\"dns_challenge\":false},
    \"advanced_config\":\"\",
    \"locations\":[]
  }" | jq '{id, domain_names, enabled, forward_host, forward_port, ssl_forced}'

echo
echo "OK. Teste :  curl -sI https://$DOMAIN | head -5"
echo "Pas de cert wildcard listé ? Demande un Let's Encrypt (voir docs/DEPLOY.md) puis relance avec le nouveau CERT_ID."
