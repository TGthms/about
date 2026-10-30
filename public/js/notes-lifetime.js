/* Birthday notes expire against one publication deadline, including cached pages. */
(function () {
  'use strict';
  var root = document.documentElement;
  var source = document.currentScript;
  var deadline = source && Date.parse(source.getAttribute('data-note-expires'));
  var timer = 0;
  // This script runs in the head on articles, before their content can paint.
  if (deadline && Date.now() >= deadline) root.setAttribute('data-note-expired', '');

  function refresh() {
    window.clearTimeout(timer); timer = 0;
    var now = Date.now(), next = Infinity, articleExpired = false;
    document.querySelectorAll('[data-note-expires]:not(script)').forEach(function (node) {
      var expires = Date.parse(node.getAttribute('data-note-expires'));
      if (!isFinite(expires)) return;
      if (expires > now) { next = Math.min(next, expires); return; }
      if (node.classList.contains('notes-post')) articleExpired = true;
      node.querySelectorAll('video').forEach(function (video) { video.pause(); video.removeAttribute('src'); video.load(); });
      node.remove();
    });
    if (articleExpired || (deadline && now >= deadline)) {
      root.setAttribute('data-note-expired', '');
      var message = document.querySelector('.note-expired');
      if (message) message.hidden = false;
      document.dispatchEvent(new Event('noteexpired'));
    }
    document.querySelectorAll('[data-note-expiry-label]').forEach(function (label) {
      var end = new Date(label.getAttribute('datetime'));
      label.textContent = 'Until ' + end.toLocaleTimeString('en', {hour: 'numeric', minute: '2-digit'});
      label.title = 'Expires ' + end.toLocaleString('en');
    });
    document.querySelectorAll('.notes-list').forEach(function (list) {
      if (list.querySelector('.note-card')) return;
      list.hidden = true;
      if (!list.nextElementSibling || !list.nextElementSibling.hasAttribute('data-notes-expired-empty')) {
        var empty = document.createElement('p');
        empty.className = 'notes-empty'; empty.setAttribute('data-notes-expired-empty', '');
        empty.textContent = 'No notes here right now.'; list.after(empty);
      }
    });
    if (window.NotesCarousel) window.NotesCarousel.refresh();
    // One timeout at the next deadline; no polling or work in background tabs.
    if (isFinite(next) && !document.hidden) timer = window.setTimeout(refresh, Math.min(2147483647, Math.max(1, next - Date.now())));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh, {once: true});
  else refresh();
  window.addEventListener('pageshow', refresh);
  window.addEventListener('pagehide', function () { window.clearTimeout(timer); timer = 0; });
  document.addEventListener('visibilitychange', refresh);
}());
