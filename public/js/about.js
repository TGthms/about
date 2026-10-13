/* Localized about paragraphs. Keep personal copy quiet; Psalm 23 opens a reader. */
(function () {
  "use strict";
  function renderAbout() {
    var language = document.documentElement.getAttribute("data-language") || "en";
    var pack = TRANSLATIONS[language] || TRANSLATIONS.en;
    document.querySelectorAll("[data-about-copy]").forEach(function (paragraph) {
      var copy = pack.about[paragraph.getAttribute("data-about-copy")];
      if (typeof copy !== "string") return;
      paragraph.textContent = "";
      copy.split(/(\{(?:build|photo|erhu|psalm)\})/g).forEach(function (part) {
        var match = part.match(/^\{(build|photo|erhu|psalm)\}$/);
        if (!match) { paragraph.appendChild(document.createTextNode(part)); return; }
        var label = pack.about.links[match[1]];
        if (match[1] !== "psalm") {
          paragraph.appendChild(document.createTextNode(label));
          return;
        }
        var button = document.createElement("button");
        button.type = "button";
        button.className = "about__psalm";
        button.setAttribute("data-psalm-open", "");
        button.setAttribute("aria-haspopup", "dialog");
        button.setAttribute("aria-controls", "psalm-modal");
        button.setAttribute("aria-expanded", "false");
        button.textContent = label;
        paragraph.appendChild(button);
      });
    });
  }
  window.renderAbout = renderAbout;
})();
