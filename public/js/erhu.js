/* Responsive, localized erhu wiki dialog. */
(function () {
  "use strict";

  var PHOTO_SRC = "assets/erhu/erhu-instrument.jpg";
  var photoEl = null;
  var VIDEO_SRC = "assets/erhu/always-with-me-performance.mp4";
  var openButton = document.getElementById("erhu-wiki-open");
  var modal = document.getElementById("erhu-wiki-modal");
  var body = document.getElementById("erhu-wiki-body");
  if (!openButton || !modal || !body || typeof ERHU_WIKI === "undefined") return;

  var lastFocus = null;
  var isOpen = false;
  var videoEl = null;
  var videoStash = null;
  var preloadStarted = false;
  var videoStatus = null;
  var videoProgress = null;
  var videoStatusText = null;
  var lastStatus = "";
  var videoLoadFailed = false;

  function updateVideoStatus() {
    if (!videoEl || !videoStatus) return;
    var copy = ERHU_WIKI[activeLanguage()] || ERHU_WIKI.en;
    // Native range requests keep playback streaming; this is buffered time,
    // not an invented byte-download percentage.
    var duration = videoEl.duration;
    var buffered = 0;
    if (Number.isFinite(duration) && duration > 0) {
      for (var i = 0; i < videoEl.buffered.length; i++) {
        buffered += videoEl.buffered.end(i) - videoEl.buffered.start(i);
      }
    }
    var percent = Number.isFinite(duration) && duration > 0
      ? Math.min(100, Math.floor(buffered / duration * 100)) : null;
    var failed = videoLoadFailed || Boolean(videoEl.error);
    var ready = percent === 100 || (videoEl.readyState >= 3 && (!videoEl.paused || videoEl.networkState === 1));
    videoStatus.hidden = ready && !failed;
    videoProgress.hidden = percent === null || failed;
    if (percent !== null) videoProgress.value = percent;
    var label = failed ? copy.videoError : percent === null
      ? copy.videoLoading : copy.videoBuffering + " · " + percent + "%";
    if (label !== lastStatus) {
      videoStatusText.textContent = label;
      lastStatus = label;
    }
  }

  function activeLanguage() {
    return document.documentElement.getAttribute("data-language") || "en";
  }

  function text(tag, className, value) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (value) el.textContent = value;
    return el;
  }

  function ensurePhoto(label) {
    if (!photoEl) {
      photoEl = document.createElement("img");
      photoEl.setAttribute("data-src", PHOTO_SRC);
      photoEl.width = 2766;
      photoEl.height = 4000;
      photoEl.decoding = "async";
      photoEl.addEventListener("load", function () {
        if (typeof photoEl.decode === "function") photoEl.decode().catch(function () {});
      });
    }
    if (label) photoEl.alt = label;
    return photoEl;
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
      sourceEl.type = "video/mp4";
      sourceEl.addEventListener("error", function () {
        videoLoadFailed = true;
        updateVideoStatus();
      });
      videoEl.appendChild(sourceEl);
      ["loadstart", "loadedmetadata", "progress", "canplay", "waiting", "seeking", "seeked", "playing", "error", "stalled", "suspend"].forEach(function (event) {
        videoEl.addEventListener(event, updateVideoStatus);
      });
    }
    if (label) videoEl.setAttribute("aria-label", label);
    return videoEl;
  }

  function stashVideo() {
    if (!videoEl) return;
    videoEl.tabIndex = -1;
    ensureStash().appendChild(videoEl);
  }

  function kickVideoLoad() {
    if (!videoEl) return;
    videoEl.preload = "auto";
    if (!videoLoadFailed && !videoEl.error) {
      if (videoEl.readyState >= 1) return;
      if (videoEl.networkState === 2) return;
    }
    videoLoadFailed = false;
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
    ensurePhoto().setAttribute("src", PHOTO_SRC);
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
    // Keep intentional preloading, but give the hero and visible photos priority.
    // Proximity or explicit interest is a better signal than page load alone.
    openButton.addEventListener("pointerenter", startSilentPreload, { once: true });
    openButton.addEventListener("focus", startSilentPreload, { once: true });
    if (window.IntersectionObserver) {
      var observer = new IntersectionObserver(function (entries) {
        if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
        observer.disconnect();
        if (document.readyState === "complete") run();
        else window.addEventListener("load", run, { once: true });
      }, { rootMargin: "240px 0px" });
      observer.observe(openButton);
    }
  }

  function render(lang) {
    var copy = ERHU_WIKI[lang] || ERHU_WIKI.en;
    var title = document.getElementById("erhu-wiki-title");
    var close = modal.querySelector(".erhu-modal__close");
    if (title) title.textContent = copy.title;
    if (close) close.setAttribute("aria-label", copy.close);

    var video = ensureVideo(copy.videoTitle);
    if (video.parentNode) video.parentNode.removeChild(video);
    body.replaceChildren();

    var intro = document.createElement("div");
    intro.className = "erhu-wiki__intro";
    var photo = document.createElement("div");
    photo.className = "erhu-wiki__photo img-load";
    var image = ensurePhoto(copy.imageAlt);
    if (image.parentNode) image.parentNode.removeChild(image);
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
    video.removeAttribute("tabindex");
    media.appendChild(video);
    videoStatus = document.createElement("div");
    videoStatus.className = "erhu-wiki__video-status";
    videoStatusText = text("span", "", copy.videoLoading);
    videoProgress = document.createElement("progress");
    videoProgress.max = 100;
    videoProgress.setAttribute("aria-label", copy.videoBuffering);
    videoStatus.append(videoStatusText, videoProgress);
    media.appendChild(videoStatus);
    lastStatus = "";
    kickVideoLoad();
    updateVideoStatus();
    media.appendChild(text("p", "erhu-wiki__media-note", copy.videoCredit));
    body.appendChild(media);
  }

  function focusable() {
    return Array.prototype.slice.call(
      modal.querySelectorAll('button:not([disabled]), a[href], video[controls]')
    );
  }

  function open() {
    if (isOpen) return;
    lastFocus = openButton;
    render(activeLanguage());
    modal.hidden = false;
    document.body.classList.add("erhu-modal-open");
    openButton.setAttribute("aria-expanded", "true");
    isOpen = true;
    if (typeof lockPageScroll === "function") lockPageScroll();
    if (typeof loadDeferredImages === "function") loadDeferredImages(modal);
    if (typeof setBackgroundInert === "function") setBackgroundInert(modal, true);
    modal.querySelector(".erhu-modal__panel").scrollTop = 0;
    modal.querySelector(".erhu-modal__close").focus({ preventScroll: true });
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
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus({ preventScroll: true });
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
