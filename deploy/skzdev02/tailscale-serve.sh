#!/usr/bin/env bash
# Expose LinkPortal on the tailnet over HTTPS via Tailscale Serve.
#
# Tailscale provisions a valid *.ts.net certificate automatically and proxies
#   https://skzdev02.tail898daf.ts.net/   (port 443)
#       ->  local nginx on  http://127.0.0.1:8090
#
# The existing todo app keeps its own port (9121); this only claims 443, so there
# is no conflict. The serve config is stored by tailscaled and survives reboots
# (--bg = keep running in the background, persistently).
#
# Requirements (already true on skzdev02 since the todo app runs over HTTPS):
#   - MagicDNS + "HTTPS Certificates" enabled for the tailnet in the admin console.
#
# Usage:
#   bash deploy/skzdev02/tailscale-serve.sh
#   HTTPS_PORT=443 LOCAL_URL=http://127.0.0.1:8090 bash deploy/skzdev02/tailscale-serve.sh
set -euo pipefail

LOCAL_URL="${LOCAL_URL:-http://127.0.0.1:8090}"
HTTPS_PORT="${HTTPS_PORT:-443}"

echo "==> Configuring Tailscale Serve:  https :${HTTPS_PORT}  ->  ${LOCAL_URL}"
# Newer Tailscale (v1.60+) syntax. If your version differs, check:  tailscale serve --help
sudo tailscale serve --bg --https="${HTTPS_PORT}" "${LOCAL_URL}"

echo
echo "==> Current serve config:"
sudo tailscale serve status

echo
echo "Done. Browse to:  https://skzdev02.tail898daf.ts.net/"
echo "To remove later:  sudo tailscale serve --https=${HTTPS_PORT} off"
