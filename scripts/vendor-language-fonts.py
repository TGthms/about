#!/usr/bin/env python3
"""Deliberately vendor official Unicode-subsetted Noto fonts; not run during builds."""
from pathlib import Path
import subprocess,re,hashlib,json,concurrent.futures,datetime

root=Path(__file__).resolve().parents[1]/'public/assets/fonts/noto';root.mkdir(parents=True,exist_ok=True)
ua='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
def fetch(url):
    return subprocess.run(['curl','--fail','--silent','--show-error','--retry','2','--max-time','60','-H','User-Agent: '+ua,url],capture_output=True,check=True).stdout
catalog={}; jobs={}
for suffix in ['SC','TC','JP','KR']:
    url='https://fonts.googleapis.com/css2?family=Noto+Sans+'+suffix+':wght@400..700&family=Noto+Serif+'+suffix+':wght@400..700&display=swap'
    css=fetch(url).decode()
    assert 'unicode-range:' in css and "format('woff2')" in css
    for remote in set(re.findall(r'https://fonts.gstatic.com/[^)]+',css)):
        name=hashlib.sha256(remote.encode()).hexdigest()[:20]+'.woff2';jobs[remote]=name
        css=css.replace(remote,name)
    assert 'https://' not in css
    # Keep every original Unicode range and the complete variable weight range.
    css=re.sub(r'/\*.*?\*/','',css,flags=re.S)
    css=re.sub(r'\s+',' ',css).strip()+'\n'
    (root/(suffix.lower()+'.css')).write_text(css)
    catalog[suffix]={'source':url,'stylesheet':suffix.lower()+'.css'}
    print(suffix,'stylesheet prepared',flush=True)
def download(item):
    url,name=item;path=root/name
    if not path.exists():
        raw=fetch(url);assert raw[:4]==b'wOF2';path.write_bytes(raw)
    else: raw=path.read_bytes()
    return name,{'url':url,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    results={}
    for i,(name,record) in enumerate(pool.map(download,jobs.items()),1):
        results[name]=record
        if i%100==0:print(i,'/',len(jobs),'font subsets',flush=True)
for suffix in ['sc','tc','jp','kr']:
    for family in ['sans','serif']:
        path=f'noto{family}{suffix}'
        raw=fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/'+path+'/OFL.txt')
        assert b'SIL OPEN FONT LICENSE' in raw
        (root/(path+'-OFL.txt')).write_bytes(raw)
(root/'manifest.json').write_text(json.dumps({'retrieved':datetime.datetime.now(datetime.timezone.utc).date().isoformat(),'families':catalog,'files':results},indent=2)+'\n')
print('DONE',len(results),'subsets',sum(v['bytes'] for v in results.values()),'bytes',flush=True)
