#!/bin/zsh
set -e
cd "${0:A:h}/../.."
PYTHON=python3
if ! "$PYTHON" -c 'from PIL import Image' >/dev/null 2>&1; then
  if [ ! -x .notes-manager/python/bin/python ]; then
    python3 -m venv .notes-manager/python
  fi
  PYTHON="$PWD/.notes-manager/python/bin/python"
  if ! "$PYTHON" -c 'from PIL import Image' >/dev/null 2>&1; then
    "$PYTHON" -m pip install -r scripts/notes/requirements.txt
  fi
fi
exec "$PYTHON" tools/notes-manager/server.py
