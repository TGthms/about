/**
 * Privacy / Terms: render LEGAL content + shared site prefs.
 * Depends on js/i18n.js and js/legal-content.js.
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

  function setLangSelect(lang) {
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

    setLangSelect(lang);

    try {
      localStorage.setItem("timg-lang", lang);
    } catch (_) {}

    // Footer chrome + control labels from main i18n pack
    if (typeof applyLanguage === "function") {
      applyLanguage(lang);
    }
  }

  var current = resolveLang();
  render(current);

  if (typeof initTheme === "function") initTheme();
  if (typeof initControlsPanel === "function") initControlsPanel();
  if (typeof initLanguageMenu === "function") {
    initLanguageMenu(function (lang) {
      if (!lang || lang === current) return;
      current = lang;
      render(lang);
      window.scrollTo(0, 0);
    });
  }

  // Smooth TOC jumps
  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest(".legal-toc__link");
    if (!link) return;
    var href = link.getAttribute("href") || "";
    if (href.charAt(0) !== "#") return;
    var target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    var reduce =
      typeof systemPrefersReducedMotion === "function"
        ? systemPrefersReducedMotion()
        : false;
    target.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
    if (history.replaceState) {
      history.replaceState(null, "", href);
    }
  });
})();
