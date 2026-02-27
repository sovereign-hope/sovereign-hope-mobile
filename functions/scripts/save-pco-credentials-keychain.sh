#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <pco_client_id> <pco_access_token>"
  exit 1
fi

PCO_CLIENT_ID="$1"
PCO_ACCESS_TOKEN="$2"

security add-generic-password -U -s "sovereign-hope-mobile.pco_client_id" -a "$USER" -w "$PCO_CLIENT_ID" >/dev/null
security add-generic-password -U -s "sovereign-hope-mobile.pco_access_token" -a "$USER" -w "$PCO_ACCESS_TOKEN" >/dev/null

echo "Saved Planning Center credentials in macOS Keychain."
echo "Service names:"
echo "- sovereign-hope-mobile.pco_client_id"
echo "- sovereign-hope-mobile.pco_access_token"
