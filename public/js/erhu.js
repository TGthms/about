/* Responsive, localized erhu wiki dialog. */
(function () {
  "use strict";

  var openButton = document.getElementById("erhu-wiki-open");
  var modal = document.getElementById("erhu-wiki-modal");
  var body = document.getElementById("erhu-wiki-body");
  if (!openButton || !modal || !body || typeof ERHU_WIKI === "undefined") return;

  var lastFocus = null;
  var isOpen = false;

  function activeLanguage() {
    return document.documentElement.getAttribute("data-language") || "en";
  }

  function text(tag, className, value) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (value) el.textContent = value;
    return el;
  }

  function render(lang) {
    var copy = ERHU_WIKI[lang] || ERHU_WIKI.en;
    var title = document.getElementById("erhu-wiki-title");
    var eyebrow = document.getElementById("erhu-wiki-eyebrow");
    var close = modal.querySelector(".erhu-modal__close");
    if (title) title.textContent = copy.title;
    if (eyebrow) eyebrow.textContent = copy.eyebrow;
    if (close) close.setAttribute("aria-label", copy.close);

    body.replaceChildren();

    var intro = document.createElement("div");
    intro.className = "erhu-wiki__intro";
    var photo = document.createElement("div");
    photo.className = "erhu-wiki__photo img-load";
    var image = document.createElement("img");
    image.src = "assets/erhu/erhu-instrument.jpg";
    image.alt = copy.imageAlt;
    image.width = 2766;
    image.height = 4000;
    image.loading = "lazy";
    image.decoding = "async";
    photo.appendChild(image);
    intro.appendChild(photo);
    if (typeof attachImageLoader === "function") attachImageLoader(image);
    var credit = text("p", "erhu-wiki__credit", copy.imageCredit + " ");
    var source = document.createElement("a");
    source.href = "https://commons.wikimedia.org/w/index.php?curid=192017131";
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = copy.imageSource;
    credit.appendChild(source);
    intro.appendChild(credit);
    body.appendChild(intro);

    copy.sections.forEach(function (section) {
      var sectionEl = text("section", "erhu-wiki__section");
      sectionEl.appendChild(text("h3", "erhu-wiki__heading", section.title));
      section.paragraphs.forEach(function (paragraph) {
        sectionEl.appendChild(text("p", "erhu-wiki__paragraph", paragraph));
      });
      body.appendChild(sectionEl);
    });

    var media = document.createElement("section");
    media.className = "erhu-wiki__media";
    media.appendChild(text("h3", "erhu-wiki__heading", copy.videoTitle));
    media.appendChild(text("p", "erhu-wiki__paragraph", copy.videoIntro));
    var video = document.createElement("video");
    video.className = "erhu-wiki__video";
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    video.setAttribute("aria-label", copy.videoTitle);
    var sourceEl = document.createElement("source");
    sourceEl.src = "assets/erhu/always-with-me-performance.mov";
    video.appendChild(sourceEl);
    video.load();
    media.appendChild(video);
    media.appendChild(text("p", "erhu-wiki__media-note", copy.videoCredit));
    body.appendChild(media);
  }

  function focusable() {
    return Array.prototype.slice.call(
      modal.querySelectorAll('button:not([disabled]), a[href], video[controls]')
    );
  }

  function open() {
    lastFocus = document.activeElement;
    render(activeLanguage());
    modal.hidden = false;
    document.body.classList.add("erhu-modal-open");
    openButton.setAttribute("aria-expanded", "true");
    isOpen = true;
    modal.querySelector(".erhu-modal__close").focus();
  }

  function close() {
    if (!isOpen) return;
    modal.hidden = true;
    document.body.classList.remove("erhu-modal-open");
    openButton.setAttribute("aria-expanded", "false");
    isOpen = false;
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  window.renderErhuWiki = render;
  openButton.setAttribute("aria-expanded", "false");
  openButton.addEventListener("click", open);
  modal.querySelectorAll("[data-erhu-close]").forEach(function (el) {
    el.addEventListener("click", close);
  });
  document.addEventListener("keydown", function (event) {
    if (!isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    var nodes = focusable();
    if (!nodes.length) return;
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
})();
