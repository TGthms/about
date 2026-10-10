/* Localized about paragraphs. Keep text readable without animation or JS. */
(function () {
  "use strict";
  var targets = { build: "#projects", photo: "#project-usa-gallery", erhu: "#interest-erhu" };
  function renderAbout() {
    var language = document.documentElement.getAttribute("data-language") || "en";
    var pack = TRANSLATIONS[language] || TRANSLATIONS.en;
    document.querySelectorAll("[data-about-copy]").forEach(function (paragraph) {
      var copy = pack.about[paragraph.getAttribute("data-about-copy")];
      if (typeof copy !== "string") return;
      paragraph.textContent = "";
      copy.split(/(\{(?:build|photo|erhu)\})/g).forEach(function (part) {
        var match = part.match(/^\{(build|photo|erhu)\}$/);
        if (!match) { paragraph.appendChild(document.createTextNode(part)); return; }
        var link = document.createElement("a");
        link.href = targets[match[1]];
        link.className = "about__link";
        link.textContent = pack.about.links[match[1]];
        paragraph.appendChild(link);
      });
    });
  }
  window.renderAbout = renderAbout;
})();
