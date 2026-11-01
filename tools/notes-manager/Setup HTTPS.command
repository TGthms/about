#!/bin/zsh
set -e
cd "${0:A:h}/../.."
if ! command -v mkcert >/dev/null 2>&1; then
  echo 'Install mkcert first: brew install mkcert'
  exit 1
fi
echo 'This sets up a local certificate authority and asks macOS to trust it.'
echo 'The authority and private keys stay on this Mac; do not share them.'
read 'NOTES_TRUST_OK?Continue with local HTTPS setup? [y/N] '
if [[ "$NOTES_TRUST_OK" != [yY] ]]; then exit 0; fi
mkcert -install
mkdir -p .notes-manager/tls
chmod 700 .notes-manager .notes-manager/tls
mkcert -cert-file .notes-manager/tls/localhost.pem -key-file .notes-manager/tls/localhost-key.pem localhost 127.0.0.1 ::1
chmod 600 .notes-manager/tls/localhost-key.pem
NOTES_CA_ROOT="$(mkcert -CAROOT)"
cp "$NOTES_CA_ROOT/rootCA.pem" .notes-manager/tls/rootCA.pem
echo 'Trusted HTTPS is ready. Open Notes.command to start the manager.'
