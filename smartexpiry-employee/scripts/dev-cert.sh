#!/usr/bin/env bash
# Creates a local HTTPS certificate for development (valid 1 year) covering
# localhost and this computer's LAN IPs, so phones on the same Wi-Fi can open
# https://<LAN-IP>:<port> and use the camera scanner.
# The browser shows "Not secure / Your connection is not private" once:
# tap Advanced → Proceed. No sudo needed; nothing is installed system-wide.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p certs
if [[ -f certs/dev-cert.pem && "${1:-}" != "--force" ]]; then
  echo "certs/dev-cert.pem already exists (use --force to recreate)."; exit 0
fi
SAN="DNS:localhost,IP:127.0.0.1"
for ip in $(hostname -I 2>/dev/null || true); do
  [[ "$ip" == *:* ]] && continue   # skip IPv6
  SAN="$SAN,IP:$ip"
done
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 365 \
  -keyout certs/dev-key.pem -out certs/dev-cert.pem \
  -subj "/CN=SmartExpiry local dev" -addext "subjectAltName=$SAN" 2>/dev/null
echo "Created certs/dev-cert.pem for: ${SAN//,/ }"
