import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
await build({entryPoints:[path.join(root,'src/app.js')],bundle:true,format:'esm',target:'safari16',outfile:path.join(root,'static/app.js'),minify:true,legalComments:'linked',logLevel:'info'});
const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8')),groups=new Map();
for(const [relative,pkg]of Object.entries(lock.packages)){
  if(!relative||pkg.dev)continue;
  const folder=path.join(root,relative),file=fs.readdirSync(folder).find(name=>/^(license(?:\.(?:md|txt))?|copying)$/i.test(name));
  if(!file)throw new Error('Review the license notice for '+relative+' before bundling it.');
  const text=fs.readFileSync(path.join(folder,file),'utf8').trim(),name=relative.replace(/^node_modules\//,'')+' '+pkg.version;
  if(!groups.has(text))groups.set(text,[]);groups.get(text).push(name);
}
const sections=['# Third-party notices\n\nThe local editor bundles these open-source packages. They are not loaded by the\npublic website. Build and test tools are development-only.\n'];
for(const [text,names]of groups)sections.push('## '+names.join(', ')+'\n\n```text\n'+text+'\n```\n');
fs.writeFileSync(path.join(root,'THIRD_PARTY_NOTICES.md'),sections.join('\n'));
