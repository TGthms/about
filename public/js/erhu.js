/* Responsive, localized erhu wiki dialog. */
(function () {
  "use strict";

  var VIDEO_SRC = "assets/erhu/always-with-me-performance.mov";
  var openButton = document.getElementById("erhu-wiki-open");
  var modal = document.getElementById("erhu-wiki-modal");
  var body = document.getElementById("erhu-wiki-body");
  if (!openButton || !modal || !body || typeof ERHU_WIKI === "undefined") return;

  var lastFocus = null;
  var isOpen = false;
  var videoEl = null;
  var videoStash = null;
  var preloadStarted = false;

  function activeLanguage() {
    return document.documentElement.getAttribute("data-language") || "en";
  }

  function text(tag, className, value) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (value) el.textContent = value;
    return el;
  }

  function ensureStash() {
    if (videoStash && videoStash.isConnected) return videoStash;
    videoStash = document.createElement("div");
    videoStash.className = "erhu-video-stash";
    videoStash.setAttribute("aria-hidden", "true");
    document.body.appendChild(videoStash);
    return videoStash;
  }

  function ensureVideo(label) {
    if (!videoEl) {
      videoEl = document.createElement("video");
      videoEl.className = "erhu-wiki__video";
      videoEl.controls = true;
      videoEl.playsInline = true;
      videoEl.setAttribute("playsinline", "");
      videoEl.setAttribute("webkit-playsinline", "");
      videoEl.preload = "auto";
      var sourceEl = document.createElement("source");
      sourceEl.src = VIDEO_SRC;
      videoEl.appendChild(sourceEl);
    }
    if (label) videoEl.setAttribute("aria-label", label);
    return videoEl;
  }

  function stashVideo() {
    if (!videoEl) return;
    ensureStash().appendChild(videoEl);
  }

  function kickVideoLoad() {
    if (!videoEl) return;
    videoEl.preload = "auto";
    if (videoEl.readyState >= 2) return;
    if (videoEl.networkState === 2) return;
    try {
      videoEl.load();
    } catch (_) {}
  }

  function canSilentPreload() {
    var conn =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    if (!conn) return true;
    if (conn.saveData) return false;
    var type = String(conn.effectiveType || "");
    return type !== "slow-2g" && type !== "2g";
  }

  function startSilentPreload() {
    if (preloadStarted) return;
    if (!canSilentPreload()) return;
    preloadStarted = true;
    ensureVideo();
    if (!isOpen) stashVideo();
    kickVideoLoad();
  }

  function scheduleSilentPreload() {
    function run() {
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(startSilentPreload, { timeout: 2000 });
      } else {
        window.setTimeout(startSilentPreload, 600);
      }
    }
    if (document.readyState === "complete") run();
    else window.addEventListener("load", run, { once: true });
  }

  function render(lang) {
    var copy = ERHU_WIKI[lang] || ERHU_WIKI.en;
    var title = document.getElementById("erhu-wiki-title");
    var eyebrow = document.getElementById("erhu-wiki-eyebrow");
    var close = modal.querySelector(".erhu-modal__close");
    if (title) title.textContent = copy.title;
    if (eyebrow) eyebrow.textContent = copy.eyebrow;
    if (close) close.setAttribute("aria-label", copy.close);

    var video = ensureVideo(copy.videoTitle);
    if (video.parentNode) video.parentNode.removeChild(video);
    body.replaceChildren();

    var intro = document.createElement("div");
    intro.className = "erhu-wiki__intro";
    var photo = document.createElement("div");
    photo.className = "erhu-wiki__photo img-load";
    var image = document.createElement("img");
    image.setAttribute("data-src", "assets/erhu/erhu-instrument.jpg");
    image.alt = copy.imageAlt;
    image.width = 2766;
    image.height = 4000;
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
    media.appendChild(video);
    kickVideoLoad();
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
    if (typeof lockPageScroll === "function") lockPageScroll();
    if (typeof loadDeferredImages === "function") loadDeferredImages(modal);
    if (typeof setBackgroundInert === "function") setBackgroundInert(modal, true);
    modal.querySelector(".erhu-modal__close").focus();
  }

  function close() {
    if (!isOpen) return;
    if (videoEl) {
      videoEl.pause();
      try {
        videoEl.currentTime = 0;
      } catch (_) {}
      stashVideo();
    }
    modal.hidden = true;
    document.body.classList.remove("erhu-modal-open");
    openButton.setAttribute("aria-expanded", "false");
    isOpen = false;
    if (typeof unlockPageScroll === "function") unlockPageScroll();
    if (typeof setBackgroundInert === "function") setBackgroundInert(modal, false);
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  window.renderErhuWiki = render;
  openButton.setAttribute("aria-expanded", "false");
  openButton.addEventListener("click", open);
  scheduleSilentPreload();
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
