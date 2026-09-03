/**
 * Render the selected legal document and keep shared site preferences active.
 * Depends on the focused i18n modules, legal UI content, and one page content file.
 */
(function () {
  "use strict";

  document.documentElement.classList.add("js", "app-ready");
  document.documentElement.classList.remove("reveal-fallback");

  var page = document.body.getAttribute("data-legal-page");
  var documents = window.LEGAL_DOCUMENTS || {};
  if (!page || !documents[page]) return;

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  function documentFor(lang) {
    return documents[page][lang] || documents[page].en;
  }

  function uiFor(lang) {
    var ui = window.LEGAL_UI || {};
    return ui[lang] || ui.en || {};
  }

  function resolveLang() {
    if (typeof detectLanguage === "function") return detectLanguage();
    return "en";
  }

  function setMeta(selector, value) {
    var element = document.querySelector(selector);
    if (element && value) element.setAttribute("content", value);
  }

  function appendLegalText(paragraph, text) {
    var tokens = /(contact\.timg@icloud\.com|https:\/\/creativecommons\.org\/licenses\/by-nc-nd\/4\.0\/)/g;
    var lastIndex = 0;
    var match;
    while ((match = tokens.exec(text))) {
      paragraph.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      var link = document.createElement("a");
      link.href = match[0].indexOf("@") !== -1 ? "mailto:" + match[0] : match[0];
      if (match[0].indexOf("@") === -1) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      link.textContent = match[0];
      paragraph.appendChild(link);
      lastIndex = match.index + match[0].length;
    }
    paragraph.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  function render(lang) {
    var resolved = documents[page][lang] ? lang : "en";
    var doc = documentFor(resolved);
    var ui = uiFor(resolved);
    var htmlLang =
      resolved === "zh" ? "zh-Hans" : resolved === "ja" ? "ja" : resolved === "es" ? "es" : "en";

    document.documentElement.lang = htmlLang;
    document.title = doc.metaTitle;
    setMeta('meta[name="description"]', doc.metaDesc);
    setMeta('meta[property="og:title"]', doc.metaTitle);
    setMeta('meta[property="og:description"]', doc.metaDesc);
    setMeta('meta[name="twitter:title"]', doc.metaTitle);
    setMeta('meta[name="twitter:description"]', doc.metaDesc);
    setMeta('meta[property="og:locale"]', {
      en: "en_US",
      es: "es_ES",
      zh: "zh_CN",
      ja: "ja_JP",
    }[resolved] || "en_US");

    var label = document.getElementById("legal-label");
    var title = document.getElementById("legal-title");
    var updated = document.getElementById("legal-updated");
    var intro = document.getElementById("legal-intro");
    if (label) label.textContent = doc.label;
    if (title) title.textContent = doc.title;
    if (updated) updated.textContent = doc.updated;
    if (intro) intro.textContent = doc.intro;

    var back = document.getElementById("legal-back");
    if (back) back.textContent = ui.back || "Back to home";
    var tocTitle = document.getElementById("legal-toc-title");
    if (tocTitle) tocTitle.textContent = ui.onThisPage || "On this page";

    document.querySelectorAll("[data-legal-ui]").forEach(function (element) {
      var key = element.getAttribute("data-legal-ui");
      if (typeof ui[key] === "string") element.textContent = ui[key];
    });

    var toc = document.getElementById("legal-toc");
    var body = document.getElementById("legal-body");
    if (toc) toc.replaceChildren();
    if (body) body.replaceChildren();

    (doc.sections || []).forEach(function (section) {
      if (toc) {
        var li = document.createElement("li");
        var link = document.createElement("a");
        link.href = "#" + section.id;
        link.textContent = section.title;
        link.className = "legal-toc__link";
        li.appendChild(link);
        toc.appendChild(li);
      }

      if (body) {
        var article = document.createElement("section");
        article.className = "legal-section reveal is-visible is-settled";
        article.id = section.id;

        var heading = document.createElement("h2");
        heading.className = "legal-section__title";
        heading.textContent = section.title;
        article.appendChild(heading);

        (section.paragraphs || []).forEach(function (text) {
          var paragraph = document.createElement("p");
          paragraph.className = "legal-section__p";
          appendLegalText(paragraph, text);
          article.appendChild(paragraph);
        });

        body.appendChild(article);
      }
    });

    if (typeof syncLangPicker === "function") syncLangPicker(resolved);
    if (typeof applyLanguage === "function") applyLanguage(resolved);

    try {
      localStorage.setItem(STORAGE_KEY, resolved);
    } catch (_) {}

    return resolved;
  }

  var current = render(resolveLang());
  if (typeof initTheme === "function") initTheme();
  if (typeof initProjectHost === "function") initProjectHost();
  if (typeof initControlsPanel === "function") initControlsPanel();
  if (typeof initLanguageMenu === "function") {
    initLanguageMenu(function (lang) {
      if (!lang || lang === current) return;
      current = render(lang);
      window.scrollTo(0, 0);
    });
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest(".legal-toc__link");
    if (!link) return;
    var href = link.getAttribute("href") || "";
    if (href.charAt(0) !== "#") return;
    var target = document.querySelector(href);
    if (!target) return;
    event.preventDefault();
    var reduce =
      typeof systemPrefersReducedMotion === "function" && systemPrefersReducedMotion();
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    if (history.replaceState) history.replaceState(null, "", href);
  });
})();
