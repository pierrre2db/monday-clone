#!/usr/bin/env bash
# Request a Let's Encrypt certificate for a domain and attach it (Force SSL + HTTP/2)
# to its existing Nginx Proxy Manager proxy host. Run on the VPS.
# Usage: bash scripts/npm-add-ssl.sh <domain> [letsencrypt_email]
#   bash scripts/npm-add-ssl.sh project.dedobbeleer.online pierre2db@gmail.com
set -euo pipefail

DOMAIN="${1:?domaine requis, ex: project.dedobbeleer.online}"
LE_EMAIL="${2:-admin@$DOMAIN}"
NPM_URL="${NPM_URL:-http://127.0.0.1:81}"
command -v jq >/dev/null || { echo "Installe jq : apt-get install -y jq"; exit 1; }

read -rp  "Email admin NPM: " NPM_EMAIL
read -rsp "Mot de passe admin NPM: " NPM_PASS; echo
TOKEN=$(curl -fsS -X POST "$NPM_URL/api/tokens" -H 'Content-Type: application/json' \
  -d "{\"identity\":\"$NPM_EMAIL\",\"secret\":\"$NPM_PASS\"}" | jq -r '.token // empty')
[ -n "$TOKEN" ] || { echo "Auth NPM échouée."; exit 1; }
echo "✓ Authentifié."

echo "→ Demande d'un certificat Let's Encrypt pour $DOMAIN (peut prendre ~15 s)…"
CERT=$(curl -fsS -X POST "$NPM_URL/api/nginx/certificates" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"provider\":\"letsencrypt\",\"nice_name\":\"$DOMAIN\",\"domain_names\":[\"$DOMAIN\"],
       \"meta\":{\"letsencrypt_email\":\"$LE_EMAIL\",\"letsencrypt_agree\":true,\"dns_challenge\":false}}")
CERT_ID=$(echo "$CERT" | jq -r '.id // empty')
if [ -z "$CERT_ID" ]; then
  echo "❌ Échec de la création du certificat. Réponse :"; echo "$CERT" | jq . 2>/dev/null || echo "$CERT"
  echo "Vérifie que le DNS $DOMAIN pointe sur ce serveur et que le port 80 est ouvert."
  exit 1
fi
echo "✓ Certificat créé (id $CERT_ID)."

echo "→ Recherche du Proxy Host $DOMAIN…"
HOST_ID=$(curl -fsS "$NPM_URL/api/nginx/proxy-hosts" -H "Authorization: Bearer $TOKEN" \
  | jq -r --arg d "$DOMAIN" '.[] | select(.domain_names | index($d)) | .id' | head -1)
[ -n "$HOST_ID" ] || { echo "❌ Aucun Proxy Host pour $DOMAIN. Crée-le d'abord (setup-npm-proxy.sh)."; exit 1; }

echo "→ Attache le certificat + Force SSL + HTTP/2 au host $HOST_ID…"
curl -fsS -X PUT "$NPM_URL/api/nginx/proxy-hosts/$HOST_ID" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"certificate_id\":$CERT_ID,\"ssl_forced\":true,\"http2_support\":true,\"hsts_enabled\":false}" \
  | jq '{id, domain_names, ssl_forced, http2_support, certificate_id}'

echo
echo "✅ SSL activé. Teste :  curl -sI https://$DOMAIN | head -3"
