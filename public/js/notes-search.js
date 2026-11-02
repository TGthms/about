/* Fetch the public-only index on demand. No requests while simply reading. */
(function () {
  'use strict';
  var host = document.querySelector('[data-note-search]');
  if (!host || !window.fetch || (window.SiteRuntime && window.SiteRuntime.lightweight)) return;
  var input = host.querySelector('input'), status = host.querySelector('[role=status]'), list = host.querySelector('ol');
  var index, pending, timer, serial = 0;
  function pack() { return (TRANSLATIONS[document.documentElement.getAttribute('data-language')] || TRANSLATIONS.en).notes; }
  function normalize(value) { var s = String(value).toLocaleLowerCase(); return s.normalize ? s.normalize('NFKC') : s; }
  function run() {
    var query = normalize(input.value.trim()), ticket = ++serial;
    list.replaceChildren(); status.textContent = '';
    if (!query) return;
    status.textContent = pack().searchLoading;
    if (!pending) pending = fetch(host.getAttribute('data-search-index')).then(function (response) {
      if (!response.ok) throw new Error('Unavailable'); return response.json();
    }).then(function (value) { index = value; return value; }).catch(function (error) { pending = null; throw error; });
    pending.then(function () {
      if (ticket !== serial) return;
      var language = document.documentElement.getAttribute('data-language') || 'en';
      var words = query.split(/\s+/), prefix = host.getAttribute('data-search-prefix');
      var matches = index.map(function (post) {
        var candidates = post.versions.filter(function (v) { return words.every(function (word) { return normalize(v.title + ' ' + v.summary + ' ' + v.text).indexOf(word) !== -1; }); });
        return {date:post.date, version:candidates.filter(function (v) { return v.language === language; })[0] || candidates[0]};
      }).filter(function (post) { return post.version; });
      status.textContent = matches.length ? pack().searchCount.replace('{count}', matches.length) : pack().searchEmpty;
      matches.slice(0, 40).forEach(function (post) {
        var v = post.version;
        // The generated index uses local note paths only; never turn data into HTML.
        if (!/^notes\/[a-z0-9-]+(?:\.[a-zA-Z-]+)?\.html$/.test(v.url)) return;
        var li = document.createElement('li'), link = document.createElement('a'), desc = document.createElement('p');
        link.href = prefix + v.url; link.textContent = v.title; link.lang = v.language;
        desc.textContent = v.summary; desc.lang = v.language;
        li.appendChild(link); li.appendChild(desc); list.appendChild(li);
      });
    }).catch(function () { if (ticket === serial) status.textContent = pack().searchFailed; });
  }
  input.addEventListener('input', function () { clearTimeout(timer); serial++; timer = setTimeout(run, 220); });
  if (window.MutationObserver) new MutationObserver(run).observe(document.documentElement, {attributes:true, attributeFilter:['data-language']});
  host.hidden = false;
})();
