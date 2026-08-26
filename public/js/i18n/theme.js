/**
 * Tim G Personal Hub - Theme.
 * Split from the former monolithic i18n.js module.
 */
/* -------------------------------------------------------------------------- */
/* Theme — OS default; session override only; OS change clears override        */
/* -------------------------------------------------------------------------- */

function systemPrefersDark() {
  return Boolean(
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function systemPrefersReducedMotion() {
  return Boolean(
    window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function getThemeOverride() {
  try {
    var v = sessionStorage.getItem(THEME_SESSION_KEY);
    if (v === "light" || v === "dark") return v;
  } catch (_) {
    /* private mode */
  }
  return null;
}

function setThemeOverride(value) {
  try {
    if (value === "light" || value === "dark") {
      sessionStorage.setItem(THEME_SESSION_KEY, value);
    } else {
      sessionStorage.removeItem(THEME_SESSION_KEY);
    }
  } catch (_) {
    /* ignore */
  }
}

function resolveTheme() {
  var override = getThemeOverride();
  if (override) return override;
  return systemPrefersDark() ? "dark" : "light";
}

function applyTheme(theme) {
  var resolved = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.style.colorScheme = resolved;

  var meta = document.getElementById("meta-theme-color");
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#13110f" : "#f3eee4");
  }

  var btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.setAttribute("aria-pressed", resolved === "dark" ? "true" : "false");
  }
}

function toggleTheme() {
  var next = resolveTheme() === "dark" ? "light" : "dark";
  // Persist only while different from OS; else clear (auto again)
  if (next === (systemPrefersDark() ? "dark" : "light")) {
    setThemeOverride(null);
  } else {
    setThemeOverride(next);
  }
  applyTheme(resolveTheme());
}

/**
 * Wire theme button + follow OS changes. Safe to call once per page.
 */
function initTheme() {
  try {
    localStorage.removeItem(THEME_LEGACY_KEY);
  } catch (_) {
    /* ignore */
  }

  applyTheme(resolveTheme());

  var themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      toggleTheme();
    });
  }

  if (!window.matchMedia) return;
  var colorMq = window.matchMedia("(prefers-color-scheme: dark)");
  var onColorChange = function () {
    setThemeOverride(null);
    applyTheme(resolveTheme());
  };
  if (colorMq.addEventListener) colorMq.addEventListener("change", onColorChange);
  else if (colorMq.addListener) colorMq.addListener(onColorChange);
}
