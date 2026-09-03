/**
 * Centralized preferences markup.
 * Injected into every page so language, theme, and host controls stay in sync.
 */
(function () {
  "use strict";

  function inertExcept(root, keep, on) {
    var children = root.children;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (keep && (child === keep || child.contains(keep))) {
        if (child !== keep) inertExcept(child, keep, on);
        continue;
      }
      if (on) child.setAttribute("inert", "");
      else child.removeAttribute("inert");
    }
  }

  window.setBackgroundInert = function (activeModal, on) {
    var roots = document.querySelectorAll("[data-page-root]");
    for (var i = 0; i < roots.length; i++) {
      var el = roots[i];
      if (activeModal && el.contains(activeModal)) {
        inertExcept(el, activeModal, on);
        continue;
      }
      if (on) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    }
    var dialogs = document.querySelectorAll('[role="dialog"]');
    for (var j = 0; j < dialogs.length; j++) {
      var dialog = dialogs[j];
      if (dialog === activeModal) {
        dialog.removeAttribute("inert");
        continue;
      }
      if (on) dialog.setAttribute("inert", "");
      else dialog.removeAttribute("inert");
    }
  };

  var root = document.querySelector("[data-preferences-root]");
  if (!root) return;

  root.innerHTML = `
    <nav class="control-cluster" data-controls aria-label="Preferences" data-i18n-aria="a11y.siteControls">
      <button
        type="button"
        class="controls-trigger"
        id="controls-trigger"
        aria-expanded="false"
        aria-controls="controls-panel"
        data-i18n-aria="a11y.siteControls"
        aria-label="Preferences"
        title="Preferences"
      >
        <span class="controls-trigger__icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" focusable="false">
            <path d="M3 5.5h8M14 5.5h1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="12.5" cy="5.5" r="1.75" stroke="currentColor" stroke-width="1.5"/>
            <path d="M3 12.5h2M8 12.5h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="6.5" cy="12.5" r="1.75" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </span>
      </button>

      <div class="controls-backdrop" id="controls-backdrop" hidden></div>
      <div
        class="controls-panel"
        id="controls-panel"
        role="region"
        aria-labelledby="controls-panel-title"
        hidden
      >
        <div class="controls-panel__surface">
          <div class="controls-panel__dragzone" data-sheet-grab>
            <div class="controls-panel__grab" aria-hidden="true"></div>
            <p class="controls-panel__title" id="controls-panel-title" data-i18n="a11y.siteControls">Preferences</p>
          </div>

          <div class="controls-section">
            <p class="controls-section__label" id="language-label" data-i18n="a11y.selectLanguage">Language</p>
            <div class="lang-picker" id="lang-picker">
              <button
                type="button"
                class="lang-picker__trigger"
                id="lang-trigger"
                aria-haspopup="listbox"
                aria-expanded="false"
                aria-controls="lang-menu"
                data-i18n-aria="a11y.selectLanguage"
                aria-label="Language"
              >
                <span class="lang-picker__value" id="lang-value">English</span>
                <svg class="lang-picker__chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true" focusable="false">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <ul class="lang-picker__menu" id="lang-menu" role="listbox" aria-labelledby="language-label" tabindex="-1" hidden>
                <li role="presentation">
                  <button type="button" class="lang-picker__option is-selected" role="option" data-lang="en" aria-selected="true">
                    <span class="lang-picker__check" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2L5 8.7 9.5 3.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </span>
                    <span class="lang-picker__option-label">English</span>
                  </button>
                </li>
                <li role="presentation">
                  <button type="button" class="lang-picker__option" role="option" data-lang="es" aria-selected="false">
                    <span class="lang-picker__check" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2L5 8.7 9.5 3.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </span>
                    <span class="lang-picker__option-label">Español</span>
                  </button>
                </li>
                <li role="presentation">
                  <button type="button" class="lang-picker__option" role="option" data-lang="zh" aria-selected="false">
                    <span class="lang-picker__check" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2L5 8.7 9.5 3.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </span>
                    <span class="lang-picker__option-label">中文</span>
                  </button>
                </li>
                <li role="presentation">
                  <button type="button" class="lang-picker__option" role="option" data-lang="ja" aria-selected="false">
                    <span class="lang-picker__check" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2L5 8.7 9.5 3.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </span>
                    <span class="lang-picker__option-label">日本語</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div class="controls-section">
            <p class="controls-section__label" data-i18n="a11y.displayPrefs">Display</p>
            <div class="pref-switcher" role="group" aria-label="Display preferences" data-i18n-aria="a11y.displayPrefs">
              <button
                type="button"
                class="pref-btn"
                id="theme-toggle"
                aria-pressed="false"
                data-i18n-aria="a11y.themeToggle"
                aria-label="Toggle light or dark theme"
                title="Theme"
              >
                <span class="pref-btn__icon pref-btn__icon--sun" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" focusable="false">
                    <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M3.2 12.8l1.1-1.1M11.7 4.3l1.1-1.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="pref-btn__icon pref-btn__icon--moon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" focusable="false">
                    <path d="M13.5 9.2A5.5 5.5 0 0 1 6.8 2.5 5.5 5.5 0 1 0 13.5 9.2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                  </svg>
                </span>
                <span class="pref-btn__label pref-btn__label--light" data-i18n="a11y.themeLight">Light mode</span>
                <span class="pref-btn__label pref-btn__label--dark" data-i18n="a11y.themeDark">Dark mode</span>
              </button>
            </div>
          </div>

          <div class="controls-section project-host project-host--sheet" data-host-pref data-host-placement="sheet">
            <p class="controls-section__label project-host__label" id="project-host-label-sheet" data-i18n="host.label">Project links</p>
            <div class="host-switcher" role="radiogroup" id="host-switcher-sheet" aria-labelledby="project-host-label-sheet">
              <button type="button" class="host-option is-selected" role="radio" aria-checked="true" data-host="cloudflare">
                <span class="host-option__kicker" data-i18n="host.main">Main line</span>
                <span class="host-option__name" data-i18n="host.cloudflare">Cloudflare</span>
              </button>
              <button type="button" class="host-option" role="radio" aria-checked="false" data-host="github">
                <span class="host-option__kicker" data-i18n="host.backup">Backup line</span>
                <span class="host-option__name" data-i18n="host.github">GitHub</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <p id="site-language-status" class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"></p>
    </nav>
  `;
})();
