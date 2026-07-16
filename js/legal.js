/**
 * Render Privacy / Terms pages from LEGAL content + shared site prefs.
 */
(function () {
  "use strict";

  document.documentElement.classList.add("js", "app-ready");
  document.documentElement.classList.remove("reveal-fallback");

  var page = document.body.getAttribute("data-legal-page"); // "privacy" | "terms"
  if (!page || typeof LEGAL === "undefined") return;

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  function packFor(lang) {
    return LEGAL[lang] || LEGAL.en;
  }

  function resolveLang() {
    if (typeof detectLanguage === "function") return detectLanguage();
    return "en";
  }

  function setLangButtons(lang) {
    var select = document.getElementById("lang-select");
    if (select && select.value !== lang) select.value = lang;
  }

  function render(lang) {
    var pack = packFor(lang);
    var doc = pack[page];
    var ui = pack.ui;
    if (!doc) {
      pack = LEGAL.en;
      doc = pack[page];
      ui = pack.ui;
    }

    var htmlLang =
      lang === "zh" ? "zh-Hans" : lang === "ja" ? "ja" : lang === "es" ? "es" : "en";
    document.documentElement.lang = htmlLang;

    if (doc.metaTitle) document.title = doc.metaTitle;
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && doc.metaDesc) metaDesc.setAttribute("content", doc.metaDesc);

    var label = document.getElementById("legal-label");
    var title = document.getElementById("legal-title");
    var updated = document.getElementById("legal-updated");
    var intro = document.getElementById("legal-intro");
    if (label) label.textContent = doc.label;
    if (title) title.textContent = doc.title;
    if (updated) updated.textContent = doc.updated;
    if (intro) intro.textContent = doc.intro;

    var back = document.getElementById("legal-back");
    if (back && ui) back.textContent = ui.back;

    var tocTitle = document.getElementById("legal-toc-title");
    if (tocTitle && ui) tocTitle.textContent = ui.onThisPage;

    document.querySelectorAll("[data-legal-ui]").forEach(function (el) {
      var key = el.getAttribute("data-legal-ui");
      if (ui && typeof ui[key] === "string") el.textContent = ui[key];
    });

    // TOC + body
    var toc = document.getElementById("legal-toc");
    var body = document.getElementById("legal-body");
    if (toc) toc.innerHTML = "";
    if (body) body.innerHTML = "";

    (doc.sections || []).forEach(function (section) {
      if (toc) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "#" + section.id;
        a.textContent = section.title;
        a.className = "legal-toc__link";
        li.appendChild(a);
        toc.appendChild(li);
      }

      if (body) {
        var article = document.createElement("section");
        article.className = "legal-section reveal is-visible";
        article.id = section.id;

        var h2 = document.createElement("h2");
        h2.className = "legal-section__title";
        h2.textContent = section.title;
        article.appendChild(h2);

        (section.paragraphs || []).forEach(function (text) {
          var p = document.createElement("p");
          p.className = "legal-section__p";
          // Auto-link email addresses
          if (text.indexOf("contact.timg@icloud.com") !== -1) {
            p.innerHTML = text.replace(
              /contact\.timg@icloud\.com/g,
              '<a href="mailto:contact.timg@icloud.com">contact.timg@icloud.com</a>'
            );
          } else {
            p.textContent = text;
          }
          article.appendChild(p);
        });

        body.appendChild(article);
      }
    });

    setLangButtons(lang);

    try {
      localStorage.setItem("timg-lang", lang);
    } catch (_) {}

    // Sync main-site i18n chrome if present (footer strings etc.)
    if (typeof applyLanguage === "function") {
      applyLanguage(lang);
    }
  }

  var current = resolveLang();
  render(current);

  if (typeof initControlsPanel === "function") {
    initControlsPanel();
  }

  if (typeof initLanguageMenu === "function") {
    initLanguageMenu(function (lang) {
      if (!lang || lang === current) return;
      current = lang;
      render(lang);
      window.scrollTo(0, 0);
    });
  }

  // Theme — always follow OS; session toggle only (same as main site)
  var themeOverride = null;

  try {
    localStorage.removeItem("timg-theme");
  } catch (_) {}

  function systemPrefersDark() {
    return Boolean(
      window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }

  function resolveTheme() {
    if (themeOverride === "light" || themeOverride === "dark") return themeOverride;
    return systemPrefersDark() ? "dark" : "light";
  }

  function systemPrefersReducedMotion() {
    return Boolean(
      window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function applyTheme(theme) {
    var resolved = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved;
    var meta = document.getElementById("meta-theme-color");
    if (meta) {
      meta.setAttribute("content", resolved === "dark" ? "#12100e" : "#f3eee4");
    }
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", resolved === "dark" ? "true" : "false");
    }
  }

  applyTheme(resolveTheme());

  var themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = resolveTheme() === "dark" ? "light" : "dark";
      themeOverride =
        next === (systemPrefersDark() ? "dark" : "light") ? null : next;
      applyTheme(resolveTheme());
    });
  }

  // OS appearance change always re-applies auto-detect
  if (window.matchMedia) {
    var colorMq = window.matchMedia("(prefers-color-scheme: dark)");
    var onColorChange = function () {
      themeOverride = null;
      applyTheme(resolveTheme());
    };
    if (colorMq.addEventListener) colorMq.addEventListener("change", onColorChange);
    else if (colorMq.addListener) colorMq.addListener(onColorChange);
  }

  // Smooth in-page jumps for TOC (respect reduced motion; use scroll-margin)
  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest(".legal-toc__link");
    if (!link) return;
    var href = link.getAttribute("href") || "";
    if (href.charAt(0) !== "#") return;
    var target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    var reduce = systemPrefersReducedMotion();
    target.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
    if (history.replaceState) {
      history.replaceState(null, "", href);
    }
  });
})();
