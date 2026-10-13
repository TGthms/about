/* Local, attributed Psalm 23 reader; no remote embed or tracking requests. */
(function () {
  "use strict";
  var modal = document.getElementById("psalm-modal");
  var body = document.getElementById("psalm-body");
  if (!modal || !body || typeof PSALM_23 === "undefined") return;
  var panel = modal.querySelector(".psalm-panel");
  var closeButton = modal.querySelector("button[data-psalm-close]");
  var isOpen = false;
  var opener = null;

  function language() { return document.documentElement.getAttribute("data-language") || "en"; }
  function node(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }
  function link(text, url, className) {
    var el = node("a", className, text);
    el.href = url;
    el.target = "_blank";
    el.rel = "noopener noreferrer";
    return el;
  }
  function render() {
    var copy = PSALM_23[language()] || PSALM_23.en;
    body.replaceChildren();
    if (copy.byline) body.appendChild(node("p", "psalm-byline", copy.byline));
    var verses = node("div", "psalm-verses");
    copy.verses.forEach(function (text, index) {
      var verse = node("p", "psalm-verse");
      var number = node("sup", "psalm-verse__number", copy.verseNumbers ? copy.verseNumbers[index] : String(index + 1));
      number.setAttribute("aria-hidden", "true");
      verse.append(number, node("span", "psalm-verse__text", text));
      verses.appendChild(verse);
    });
    body.appendChild(verses);
    body.appendChild(node("p", "psalm-citation", copy.citation));
    body.appendChild(link(copy.read + " ↗", copy.readUrl, "psalm-read"));
    var credits = node("div", "psalm-credits");
    credits.append(node("h3", "", copy.creditsTitle), node("p", "", copy.copyright), node("p", "", copy.footerCredit));
    var sources = node("div", "psalm-credits__links");
    sources.append(link(copy.sourceLabel, copy.sourceUrl), link(copy.permissionsLabel, copy.permissionsUrl));
    credits.appendChild(sources);
    body.appendChild(credits);
  }
  function focusable() { return Array.from(modal.querySelectorAll('button:not([disabled]), a[href]')); }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    modal.hidden = true;
    if (opener) opener.setAttribute("aria-expanded", "false");
    if (typeof setBackgroundInert === "function") setBackgroundInert(modal, false);
    if (typeof unlockPageScroll === "function") unlockPageScroll();
    var target = opener && opener.isConnected ? opener : document.querySelector("[data-psalm-open]");
    if (target) target.focus({ preventScroll: true });
  }
  document.addEventListener("click", function (event) {
    var target = event.target.closest && event.target.closest("[data-psalm-open]");
    if (!target) return;
    event.preventDefault();
    if (isOpen) return;
    opener = target;
    render();
    isOpen = true;
    modal.hidden = false;
    opener.setAttribute("aria-expanded", "true");
    if (typeof lockPageScroll === "function") lockPageScroll();
    if (typeof setBackgroundInert === "function") setBackgroundInert(modal, true);
    panel.scrollTop = 0;
    closeButton.focus({ preventScroll: true });
  });
  modal.querySelectorAll("[data-psalm-close]").forEach(function (el) { el.addEventListener("click", close); });
  document.addEventListener("keydown", function (event) {
    if (!isOpen) return;
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key !== "Tab") return;
    var elements = focusable();
    var first = elements[0], last = elements[elements.length - 1];
    if (!elements.includes(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
  if (window.MutationObserver) {
    new MutationObserver(function () {
      if (!isOpen) return;
      var y = panel.scrollTop;
      render();
      panel.scrollTop = y;
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-language"] });
  }
})();
