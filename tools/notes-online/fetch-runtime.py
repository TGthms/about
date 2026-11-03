#!/usr/bin/env python3
"""Fetch the exact self-hosted runtime; verify every file before using it."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

HERE=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--cache',type=Path,required=True)
args=parser.parse_args();args.cache.mkdir(parents=True,exist_ok=True)
manifest=json.loads((HERE/'runtime-manifest.json').read_text())
for name,digest in manifest['files'].items():
    path=args.cache/name
    if path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest()==digest:continue
    url=(f"https://raw.githubusercontent.com/pyodide/pyodide/{manifest['version']}/LICENSE" if name=='LICENSE' else manifest['origin']+name)
    with tempfile.TemporaryDirectory(dir=args.cache) as temporary:
        downloaded=Path(temporary)/'download'
        subprocess.run(['curl','--fail','--location','--silent','--show-error','--proto','=https','--output',str(downloaded),url],check=True)
        if hashlib.sha256(downloaded.read_bytes()).hexdigest()!=digest:raise ValueError('Runtime checksum mismatch: '+name)
        downloaded.replace(path)
print('All pinned runtime files verified. No author content was accessed.')
