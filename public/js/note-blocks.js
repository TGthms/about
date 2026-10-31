/* Optional controls; every block remains usable without this script. */
(function () {
  "use strict";
  var root = document.documentElement;
  function words(block, key) {
    var lang = root.getAttribute('data-language') || root.lang || 'en';
    if (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[lang] && TRANSLATIONS[lang].notes[key]) return TRANSLATIONS[lang].notes[key];
    return block.getAttribute(key === 'codeCopied' ? 'data-copy-success' : 'data-copy-failed');
  }
  document.querySelectorAll('[data-note-code]').forEach(function (block) {
    var button = block.querySelector('[data-code-copy]');
    var code = block.querySelector('code');
    var status = block.querySelector('[data-code-status]');
    button.hidden = false;
    button.addEventListener('click', function () {
      function failed() {
        code.parentElement.focus();
        if (window.getSelection && document.createRange) {
          var selection = window.getSelection(), range = document.createRange();
          range.selectNodeContents(code); selection.removeAllRanges(); selection.addRange(range);
        }
        status.textContent = words(block, 'codeCopyFailed'); button.disabled = false;
      }
      button.disabled = true;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          navigator.clipboard.writeText(code.textContent).then(function () { status.textContent = words(block, 'codeCopied'); button.disabled = false; }, failed);
        } catch (_) { failed(); }
      } else failed();
    });
  });
  var lite = (window.SiteRuntime && window.SiteRuntime.lightweight) || (window.matchMedia && window.matchMedia('(max-width: 320px)').matches);
  if (lite || !window.CSS || !window.CSS.supports('clip-path', 'inset(0)')) return;
  document.querySelectorAll('[data-note-compare]').forEach(function (block) {
    var control = block.querySelector('.note-comparison__control');
    var input = control.querySelector('input');
    block.classList.add('is-enhanced'); control.hidden = false;
    function update() { block.style.setProperty('--note-compare-position', Math.max(0, Math.min(100, Number(input.value) || 0)) + '%'); }
    input.addEventListener('input', update); update();
  });
}());
