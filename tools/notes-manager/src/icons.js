import symbols from './material-icons.json';
export function icon(name){
  const source=symbols[name];
  if(!source)throw new Error('Unknown Material Symbol: '+name);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox',source.viewBox);svg.setAttribute('width','20');svg.setAttribute('height','20');
  svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('fill','currentColor');
  svg.classList.add('material-icon');svg.innerHTML=source.body;return svg;
}
export function setIcon(node,name,label){node.replaceChildren(icon(name));if(label)node.append(document.createTextNode(label));return node;}
