import {icon} from './icons.js';
let active=null;
export function closeContextMenu(restore=true){
  if(!active)return;const current=active;active=null;current.node.remove();if(restore)current.restore?.();
}
export function contextMenu(items,{x,y,restore}={}){
  closeContextMenu(false);
  const menu=document.createElement('div');menu.className='context-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Actions');
  for(const item of items){
    if(item.separator){const line=document.createElement('div');line.className='menu-separator';line.setAttribute('role','separator');menu.append(line);continue;}
    const button=document.createElement('button');button.type='button';button.setAttribute('role',item.checked===undefined?'menuitem':'menuitemcheckbox');
    button.setAttribute('aria-label',item.label);
    if(item.shortcut)button.setAttribute('aria-keyshortcuts',item.shortcut.replace('⇧','Shift+').replace('⌘','Meta+'));
    if(item.checked!==undefined)button.setAttribute('aria-checked',String(item.checked));
    button.disabled=Boolean(item.disabled);button.className=item.danger?'danger':'';
    if(item.icon)button.append(icon(item.icon));else button.append(document.createElement('span'));
    const label=document.createElement('span');label.textContent=item.label;button.append(label);
    if(item.shortcut){const key=document.createElement('kbd');key.textContent=item.shortcut;button.append(key);}
    button.onmousedown=event=>event.preventDefault();button.onclick=()=>{closeContextMenu();Promise.resolve().then(item.run).catch(item.onError||console.error);};menu.append(button);
  }
  document.body.append(menu);const bounds=menu.getBoundingClientRect();
  menu.style.left=Math.max(8,Math.min(x??8,innerWidth-bounds.width-8))+'px';menu.style.top=Math.max(8,Math.min(y??8,innerHeight-bounds.height-8))+'px';
  active={node:menu,restore};const buttons=()=>[...menu.querySelectorAll('button:not(:disabled)')];buttons()[0]?.focus();
  menu.onkeydown=event=>{
    const all=buttons(),index=all.indexOf(document.activeElement);let next;
    if(event.key==='ArrowDown')next=(index+1)%all.length;if(event.key==='ArrowUp')next=(index-1+all.length)%all.length;
    if(event.key==='Home')next=0;if(event.key==='End')next=all.length-1;
    if(next!==undefined){event.preventDefault();all[next]?.focus();}
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeContextMenu();}
    if(event.key==='Tab')closeContextMenu();
  };
}
document.addEventListener('pointerdown',event=>{if(active&&!active.node.contains(event.target))closeContextMenu(false);},true);
window.addEventListener('blur',()=>closeContextMenu(false));window.addEventListener('resize',()=>closeContextMenu(false));
document.addEventListener('scroll',event=>{if(active&&!active.node.contains(event.target))closeContextMenu(false);},true);
