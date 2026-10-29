/* Small enhancements only: every note remains readable without JavaScript. */
(function () {
  "use strict";
  var root = document.documentElement;
  var isPage = document.body.classList.contains("notes-page");
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  function refresh() {
    var lang = root.getAttribute("data-language") || "en";
    var pack = TRANSLATIONS[lang] || TRANSLATIONS.en;
    if (isPage && document.body.getAttribute("data-notes-kind") === "index") {
      var pageTitle = pack.notes.title + " — Tim G";
      document.title = pageTitle;
      document.querySelectorAll('meta[property="og:title"], meta[name="twitter:title"]').forEach(function (meta) { meta.setAttribute("content", pageTitle); });
      document.querySelectorAll('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]').forEach(function (meta) { meta.setAttribute("content", pack.notes.intro); });
    }
    document.querySelectorAll("[data-note-date]").forEach(function (element) {
      var value = element.getAttribute("datetime");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return;
      try { element.textContent = new Intl.DateTimeFormat(lang, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value + "T12:00:00")); } catch (_) {}
    });
    document.querySelectorAll("[data-note-original]").forEach(function (element) {
      var language = element.getAttribute("data-note-original");
      var label = language;
      try { label = new Intl.DisplayNames([lang], { type: "language" }).of(language); } catch (_) {}
      element.textContent = pack.notes.original.replace("{language}", label);
    });
    document.querySelectorAll("[data-note-language-label]").forEach(function (element) { element.lang = root.lang; });
    var expiry = document.querySelector("[data-note-highlight-until]");
    if (expiry) {
      var until = expiry.getAttribute("data-note-highlight-until");
      var expired = until && new Date(until + "T23:59:59").getTime() < Date.now();
      expiry.hidden = Boolean(expired);
      var latest = document.querySelector("[data-notes-latest]");
      if (latest) latest.hidden = !expired;
    }
  }

  if (isPage) {
    if (typeof initTheme === "function") initTheme();
    var current = applyLanguage(detectLanguage());
    if (typeof initControlsPanel === "function") initControlsPanel();
    if (typeof initLanguageMenu === "function") initLanguageMenu(function (lang) {
      if (!lang || lang === current) return;
      current = applyLanguage(lang);
      refresh();
    });
    document.querySelectorAll("[data-host-pref]").forEach(function (control) {
      var section = control.closest(".controls-section");
      if (section) section.hidden = true;
    });
    var header = document.querySelector(".top-bar");
    function measure() {
      if (root.classList.contains("page-scroll-locked")) return;
      root.style.setProperty("--top-bar-h", (header ? header.getBoundingClientRect().height : 0) + "px");
    }
    measure();
    window.addEventListener("resize", measure, { passive: true });
    if (window.ResizeObserver && header && !(window.SiteRuntime && window.SiteRuntime.lightweight)) new ResizeObserver(measure).observe(header);
  }
  refresh();
  /* Homepage language changes are owned by main.js. Observe only that attribute. */
  if (!isPage && window.MutationObserver) new MutationObserver(refresh).observe(root, { attributes: true, attributeFilter: ["data-language"] });
  window.addEventListener("pageshow", refresh);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refresh(); });

  var share = document.getElementById("note-share");
  if (!share) return;
  share.hidden = false;
  share.addEventListener("click", function () {
    var lang = root.getAttribute("data-language") || "en";
    var words = (TRANSLATIONS[lang] || TRANSLATIONS.en).notes;
    var status = document.getElementById("note-share-status");
    var canonical = document.querySelector('link[rel="canonical"]');
    var url = canonical ? canonical.href : window.location.href;
    function failed() {
      var fallback = document.getElementById("note-share-fallback");
      fallback.hidden = false;
      var input = fallback.querySelector("input");
      input.value = url;
      input.focus();
      input.select();
      status.textContent = words.copyFailed;
    }
    if (navigator.share) {
      navigator.share({ title: document.title, url: url }).catch(function (error) { if (error.name !== "AbortError") failed(); });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { status.textContent = words.copied; }, failed);
    } else failed();
  });
})();
