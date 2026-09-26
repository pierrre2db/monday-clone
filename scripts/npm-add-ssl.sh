#!/usr/bin/env bash
# Add a fresh Let's Encrypt certificate to an EXISTING Nginx Proxy Manager proxy host,
# the same way the NPM UI's "Request a new SSL Certificate" does (inline on the host).
# Run on the VPS AFTER the proxy host exists (setup-npm-proxy.sh with CERT_ID=0).
# Usage: bash scripts/npm-add-ssl.sh <domain> [letsencrypt_email]
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

HOST_ID=$(curl -fsS "$NPM_URL/api/nginx/proxy-hosts" -H "Authorization: Bearer $TOKEN" \
  | jq -r --arg d "$DOMAIN" '.[] | select(.domain_names|index($d)) | .id' | head -1)
[ -n "$HOST_ID" ] || { echo "❌ Aucun Proxy Host pour $DOMAIN. Crée-le d'abord : bash scripts/setup-npm-proxy.sh $DOMAIN (CERT_ID=0)"; exit 1; }
echo "✓ Proxy Host trouvé (id $HOST_ID)."

HOST=$(curl -fsS "$NPM_URL/api/nginx/proxy-hosts/$HOST_ID" -H "Authorization: Bearer $TOKEN")
PAYLOAD=$(echo "$HOST" | jq --arg em "$LE_EMAIL" '{
  domain_names, forward_scheme, forward_host, forward_port,
  access_list_id: (.access_list_id // 0),
  block_exploits: (.block_exploits // true),
  caching_enabled: (.caching_enabled // false),
  allow_websocket_upgrade: (.allow_websocket_upgrade // true),
  advanced_config: (.advanced_config // ""),
  locations: (.locations // []),
  hsts_enabled: false, hsts_subdomains: false,
  http2_support: true, ssl_forced: true,
  certificate_id: "new",
  meta: ((.meta // {}) + {letsencrypt_email:$em, letsencrypt_agree:true, dns_challenge:false})
}')

echo "→ Demande du certificat Let's Encrypt + activation SSL sur le host (peut prendre ~20 s)…"
CODE=$(curl -sS -o /tmp/npmssl.json -w '%{http_code}' -X PUT "$NPM_URL/api/nginx/proxy-hosts/$HOST_ID" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$PAYLOAD")
if [ "$CODE" != "200" ] && [ "$CODE" != "201" ]; then
  echo "❌ NPM a répondu HTTP $CODE. Détail :"
  jq . /tmp/npmssl.json 2>/dev/null || cat /tmp/npmssl.json
  echo
  echo "Si l'erreur parle du challenge/HTTP : vérifie que http://$DOMAIN répond (port 80 ouvert + DNS OK)."
  exit 1
fi
jq '{id, domain_names, ssl_forced, http2_support, certificate_id}' /tmp/npmssl.json 2>/dev/null || cat /tmp/npmssl.json
echo
echo "✅ Fait. Teste :  curl -sI https://$DOMAIN | head -3"
