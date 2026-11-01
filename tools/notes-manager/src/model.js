export const copy = value => JSON.parse(JSON.stringify(value));
export const getAt = (object, path) => path.reduce((value, key) => value?.[key], object);
export function setAt(object, path, value) {
  let target = object;
  for (let i=0;i<path.length-1;i++) target = target[path[i]] ??= typeof path[i+1] === 'number' ? [] : {};
  target[path.at(-1)] = value;
}
export function moveItem(items, from, to) {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const [value] = items.splice(from, 1); items.splice(to, 0, value); return items;
}
export function fieldSpec(field, components) {
  return field.component ? {...components[field.component], ...field} : field;
}
export function emptyValue(field, components) {
  const spec = fieldSpec(field, components);
  if (spec.default !== undefined) return copy(spec.default);
  if (spec.list) return [];
  if (spec.type === 'boolean') return false;
  if (spec.type === 'block') return null;
  if (spec.type === 'object') return {};
  return '';
}
export function newBlock(spec, components) {
  const result = {type: spec.name};
  for (const field of spec.fields || []) if (!fieldSpec(field, components).hidden) result[field.name] = emptyValue(field, components);
  return result;
}
// The editor never normalizes unedited HTML. Unsupported structures open as source
// so importing a legacy article cannot silently strip content from the next save.
export function needsSource(value, document) {
  const template = document.createElement('template'); template.innerHTML = value || '';
  const supported = new Set('p h2 h3 h4 strong em b i u s strike blockquote ul ol li br hr pre code a sub sup table tbody tr th td img'.split(' '));
  return [...template.content.querySelectorAll('*')].some(node => !supported.has(node.localName) ||
    [...node.attributes].some(attr => !['href','target','rel','src','alt','title','colspan','rowspan','start'].includes(attr.name)));
}
