/* Small enhancements only: every note remains readable without JavaScript. */
(function () {
  "use strict";
  var root = document.documentElement;
  var isPage = document.body.classList.contains("notes-page");
  var posterObserver;
  var contentsObserver;
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  function preparePosters() {
    if (posterObserver) posterObserver.disconnect();
    var connection = navigator.connection;
    if (!isPage || document.hidden || (window.SiteRuntime && window.SiteRuntime.lightweight) ||
      (connection && (connection.saveData || /^(slow-)?2g$/.test(connection.effectiveType || ""))) || !window.IntersectionObserver) return;
    var videos = document.querySelectorAll("video[data-note-poster]");
    if (!videos.length) return;
    posterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || document.hidden) return;
        var video = entry.target;
        video.setAttribute("poster", video.getAttribute("data-note-poster"));
        video.removeAttribute("data-note-poster");
        posterObserver.unobserve(video);
      });
    }, { rootMargin: "120px" });
    videos.forEach(function (video) { posterObserver.observe(video); });
  }

  function refresh() {
    var lang = root.getAttribute("data-language") || "en";
    var pack = TRANSLATIONS[lang] || TRANSLATIONS.en;
    if (isPage && document.body.getAttribute("data-notes-kind") === "index") {
      var pageTitle = pack.notes.title + " — Tim G";
      document.title = pageTitle;
      document.querySelectorAll('meta[property="og:title"], meta[name="twitter:title"]').forEach(function (meta) { meta.setAttribute("content", pageTitle); });
      document.querySelectorAll('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]').forEach(function (meta) { meta.setAttribute("content", pack.notes.intro); });
    }
    if (isPage && document.body.getAttribute("data-notes-kind") === "follow") {
      document.title = pack.notes.followTitle + " — Tim G";
      document.querySelectorAll('meta[property="og:title"], meta[name="twitter:title"]').forEach(function (meta) { meta.setAttribute("content", document.title); });
      document.querySelectorAll('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]').forEach(function (meta) { meta.setAttribute("content", pack.notes.followIntro); });
    }
    document.querySelectorAll("[data-note-versions]").forEach(function (link) {
      try {
        var variants = JSON.parse(link.getAttribute("data-note-versions"));
        var chosen = variants.filter(function (version) { return version.language === lang; })[0] || variants[0];
        if (!chosen) return;
        link.setAttribute("href", chosen.href);
        link.querySelectorAll("[data-note-title], [data-note-summary]").forEach(function (element) {
          element.textContent = element.hasAttribute("data-note-title") ? chosen.title : chosen.summary;
          element.lang = chosen.language;
        });
        var label = link.querySelector("[data-note-language-name]");
        if (label) {
          try { label.textContent = new Intl.DisplayNames([lang], { type: "language" }).of(chosen.language); } catch (_) { label.textContent = chosen.language; }
        }
      } catch (_) { /* The static original remains a usable fallback. */ }
    });
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
    document.querySelectorAll('[data-note-category]').forEach(function (element) {
      var key = element.getAttribute('data-note-category');
      var label = pack.notes['category' + key.charAt(0).toUpperCase() + key.slice(1)];
      if (label) element.textContent = label;
    });
    if (isPage && document.body.getAttribute('data-notes-kind') === 'topic') {
      var category = document.querySelector('h1[data-note-category]');
      if (category) document.title = category.textContent + ' — ' + pack.notes.title + ' — Tim G';
    }
    if (window.NotesCarousel) window.NotesCarousel.refresh();
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
  var contents = document.querySelector('.note-contents');
  if (contents && window.matchMedia && window.matchMedia('(max-width: 1000px)').matches) contents.open = false;
  function prepareContents() {
    if (contentsObserver) contentsObserver.disconnect();
    if (!contents || document.hidden || !window.IntersectionObserver || (window.SiteRuntime && window.SiteRuntime.lightweight)) return;
    var links = contents.querySelectorAll('a[href^="#"]');
    contentsObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (link) {
          if (link.getAttribute('href') === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, {rootMargin:'-12% 0px -65% 0px',threshold:0});
    links.forEach(function (link) { var section = document.getElementById(link.getAttribute('href').slice(1)); if (section) contentsObserver.observe(section); });
  }
  refresh();
  preparePosters();
  prepareContents();
  /* Homepage language changes are owned by main.js. Observe only that attribute. */
  if (!isPage && window.MutationObserver) new MutationObserver(refresh).observe(root, { attributes: true, attributeFilter: ["data-language"] });
  window.addEventListener("pageshow", function () { refresh(); preparePosters(); prepareContents(); });
  window.addEventListener("pagehide", function () { if (posterObserver) posterObserver.disconnect(); if (contentsObserver) contentsObserver.disconnect(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refresh(); preparePosters(); prepareContents(); });

  var feedCopy = document.getElementById("feed-copy");
  if (feedCopy) {
    feedCopy.hidden = false;
    feedCopy.addEventListener("click", function () {
      var address = document.getElementById("feed-address");
      var status = document.getElementById("feed-status");
      var words = (TRANSLATIONS[root.getAttribute("data-language")] || TRANSLATIONS.en).notes;
      function failed() { address.focus(); address.select(); status.textContent = words.feedManual; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(address.value).then(function () { status.textContent = words.feedCopied; }, failed);
      else failed();
    });
  }

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
