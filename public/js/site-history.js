/* A small, local-first introduction and version history for the hub itself. */
(function () {
  "use strict";
  var opener = document.getElementById("site-history-open");
  var modal = document.getElementById("site-history-modal");
  var body = document.getElementById("site-history-body");
  if (!opener || !modal || !body || typeof PERSONAL_HUB === "undefined") return;
  var panel = modal.querySelector(".site-history-panel");
  var closeButton = modal.querySelector("button[data-site-history-close]");
  var isOpen = false;

  function language() {
    return document.documentElement.getAttribute("data-language") || "en";
  }
  function node(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }
  function externalLink(text, url) {
    var link = node("a", "", text);
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  }
  function dateLabel(date, lang, day) {
    var locale = lang === "zh" ? "zh-Hans" : lang;
    return new Date(date + "T12:00:00").toLocaleDateString(locale, {
      year: "numeric", month: day ? "short" : "long", day: day ? "numeric" : undefined,
    });
  }

  function render(lang) {
    var copy = PERSONAL_HUB.copy[lang] || PERSONAL_HUB.copy.en;
    body.replaceChildren();
    body.appendChild(node("p", "site-history-intro", copy.intro));
    var facts = node("dl", "site-history-facts");
    [[copy.builtWith, copy.stack], [copy.since, dateLabel("2026-07-10", lang, false)]].forEach(function (fact) {
      var item = node("div");
      item.append(node("dt", "", fact[0]), node("dd", "", fact[1]));
      facts.appendChild(item);
    });
    body.appendChild(facts);
    body.appendChild(node("h3", "site-history-heading", copy.history));
    var timeline = node("ol", "site-timeline");
    timeline.setAttribute("role", "list");
    PERSONAL_HUB.milestones.slice().reverse().forEach(function (milestone) {
      var words = milestone.copy[lang] || milestone.copy.en;
      var current = milestone.version === PERSONAL_HUB.currentVersion;
      var item = node("li", "site-timeline__item");
      var version = "v" + milestone.version;
      var label = milestone.commit
        ? externalLink(version, "https://github.com/TGthms/about/commit/" + milestone.commit)
        : node("span", "", version);
      label.className = "site-timeline__version";
      if (milestone.commit) label.setAttribute("aria-label", copy.viewChange + " " + version + ": " + words.title);
      var content = node("div", "site-timeline__content");
      var meta = node("div", "site-timeline__meta");
      var date = node("time", "", dateLabel(milestone.date, lang, true));
      date.dateTime = milestone.date;
      meta.appendChild(date);
      if (current) meta.appendChild(node("span", "site-timeline__current", copy.now));
      content.append(meta, node("h4", "", words.title), node("p", "", words.description));
      item.append(label, content);
      timeline.appendChild(item);
    });
    body.appendChild(timeline);
    var source = externalLink(copy.fullHistory + " ↗", "https://github.com/TGthms/about/commits/main/");
    source.className = "site-history-source";
    body.appendChild(source);
  }

  function focusable() {
    return Array.from(modal.querySelectorAll('button:not([disabled]), a[href]'));
  }
  function open() {
    if (isOpen || (modal.classList && modal.classList.contains("is-closing"))) return;
    render(language());
    isOpen = true;
    modal.hidden = false;
    opener.setAttribute("aria-expanded", "true");
    if (typeof lockPageScroll === "function") lockPageScroll();
    if (typeof setBackgroundInert === "function") setBackgroundInert(modal, true);
    panel.scrollTop = 0;
    closeButton.focus({ preventScroll: true });
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    function finish() {
      modal.hidden = true;
      opener.setAttribute("aria-expanded", "false");
      if (typeof setBackgroundInert === "function") setBackgroundInert(modal, false);
      if (typeof unlockPageScroll === "function") unlockPageScroll();
      opener.focus({ preventScroll: true });
    }
    if (typeof closeSiteDialog === "function") closeSiteDialog(modal, finish);
    else finish();
  }
  opener.addEventListener("click", open);
  modal.querySelectorAll("[data-site-history-close]").forEach(function (element) {
    element.addEventListener("click", close);
  });
  document.addEventListener("keydown", function (event) {
    if (!isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    var elements = focusable();
    var first = elements[0], last = elements[elements.length - 1];
    if (!elements.includes(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  if (window.MutationObserver) {
    new MutationObserver(function () {
      if (!isOpen) return;
      var y = panel.scrollTop;
      render(language());
      panel.scrollTop = y;
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-language"] });
  }
})();
