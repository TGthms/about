/* Responsive, localized erhu wiki dialog. */
(function () {
  "use strict";

  var PHOTO_SRC = "assets/erhu/erhu-instrument.jpg";
  var lightweight = window.SiteRuntime && window.SiteRuntime.lightweight;
  if (window.SiteRuntime) PHOTO_SRC = window.SiteRuntime.image(PHOTO_SRC);
  var photoEl = null;
  var VIDEO_SRC = "assets/erhu/always-with-me-performance.mp4";
  var openButton = document.getElementById("erhu-wiki-open");
  var performanceButton = document.getElementById("erhu-performance-open");
  var wikiModal = document.getElementById("erhu-wiki-modal");
  var performanceModal = document.getElementById("erhu-performance-modal");
  if (!openButton || !performanceButton || !wikiModal || !performanceModal || typeof ERHU_WIKI === "undefined") return;
  var activeModal = null;
  var lastFocus = null;
  var closing = false;
  var videoEl = null;
  var videoStash = null;
  var preloadStarted = false;
  var videoStatus = null;
  var videoProgress = null;
  var videoStatusText = null;
  var lastStatus = "";
  var videoLoadFailed = false;
  var videoProgressTimer = 0;
  var videoProgressDelayed = false;

  function resetVideoProgress() {
    if (videoProgressTimer) window.clearTimeout(videoProgressTimer);
    videoProgressTimer = 0;
    videoProgressDelayed = false;
  }

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
    var idle = lightweight && videoEl.paused && videoEl.readyState === 0 && videoEl.networkState !== 2;
    videoStatus.hidden = (ready || idle) && !failed;
    if (videoStatus.hidden || failed || activeModal !== performanceModal) resetVideoProgress();
    else if (!videoProgressDelayed && !videoProgressTimer) {
      videoProgressTimer = window.setTimeout(function () {
        videoProgressTimer = 0;
        videoProgressDelayed = true;
        updateVideoStatus();
      }, 2000);
    }
    videoProgress.hidden = !videoProgressDelayed || percent === null || failed;
    if (percent !== null) videoProgress.value = percent;
    var label = failed ? copy.videoError : !videoProgressDelayed || percent === null
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
      videoLoadFailed = false;
      videoEl = document.createElement("video");
      videoEl.className = "erhu-wiki__video";
      videoEl.controls = true;
      videoEl.playsInline = true;
      videoEl.setAttribute("playsinline", "");
      videoEl.setAttribute("webkit-playsinline", "");
      videoEl.preload = lightweight ? "none" : "auto";
      var sourceEl = document.createElement("source");
      sourceEl.src = VIDEO_SRC;
      sourceEl.type = "video/mp4";
      sourceEl.addEventListener("error", function () {
        if (sourceEl.parentNode !== videoEl) return;
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
    resetVideoProgress();
    if (!videoEl) return;
    if (lightweight) {
      videoEl.replaceChildren();
      videoEl.removeAttribute("src");
      try { videoEl.load(); } catch (_) {}
      if (videoEl.parentNode) videoEl.parentNode.removeChild(videoEl);
      videoEl = null;
      videoStatus = null;
      return;
    }
    videoEl.tabIndex = -1;
    ensureStash().appendChild(videoEl);
  }

  function kickVideoLoad() {
    if (!videoEl || lightweight) return;
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
    if (lightweight) return false;
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
    if (activeModal !== performanceModal) stashVideo();
    kickVideoLoad();
  }

  function scheduleSilentPreload() {
    if (lightweight) return;
    function run() {
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(startSilentPreload, { timeout: 2000 });
      } else {
        window.setTimeout(startSilentPreload, 600);
      }
    }
    // Keep intentional preloading, but give the hero and visible photos priority.
    // Proximity or explicit interest is a better signal than page load alone.
    [openButton, performanceButton].filter(Boolean).forEach(function (button) {
      button.addEventListener("pointerenter", startSilentPreload, { once: true });
      button.addEventListener("focus", startSilentPreload, { once: true });
    });
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

  function action(label, attributes) {
    var button = text("button", "erhu-dialog-action", label);
    button.type = "button";
    Object.keys(attributes).forEach(function (key) { button.setAttribute(key, attributes[key]); });
    return button;
  }

  function render(lang) {
    if (!activeModal) return;
    var copy = ERHU_WIKI[lang] || ERHU_WIKI.en;
    var performance = activeModal === performanceModal;
    var body = document.getElementById(performance ? "erhu-performance-body" : "erhu-wiki-body");
    var scrollY = body.scrollTop;
    var title = document.getElementById(performance ? "erhu-performance-title" : "erhu-wiki-title");
    title.textContent = performance ? copy.performanceTitle : copy.title;
    activeModal.querySelector(".erhu-modal__close").setAttribute("aria-label", copy.close);
    body.replaceChildren();

    if (performance) {
      body.appendChild(text("p", "erhu-performance__intro", copy.videoIntro));
      var video = ensureVideo(copy.videoTitle);
      video.removeAttribute("tabindex");
      body.appendChild(video);
      videoStatus = text("div", "erhu-wiki__video-status");
      videoStatusText = text("span", "", copy.videoLoading);
      videoProgress = document.createElement("progress");
      videoProgress.max = 100;
      videoProgress.setAttribute("aria-label", copy.videoBuffering);
      videoStatus.append(videoStatusText, videoProgress);
      body.appendChild(videoStatus);
      lastStatus = "";
      kickVideoLoad(); updateVideoStatus();
      if (lightweight) {
        var videoLink = text("a", "erhu-dialog-action", copy.videoTitle + " ↗");
        videoLink.href = VIDEO_SRC;
        body.appendChild(videoLink);
      }
      var details = text("details", "erhu-recording-details");
      details.appendChild(text("summary", "", copy.recordingDetails));
      details.appendChild(text("p", "erhu-wiki__media-note", copy.videoCredit));
      body.appendChild(details);
    } else {
      var layout = text("div", "erhu-instrument-layout");
      var figure = document.createElement("figure");
      figure.className = "erhu-wiki__intro";
      var photo = text("div", "erhu-wiki__photo img-load");
      var image = ensurePhoto(copy.imageAlt);
      photo.appendChild(image);
      figure.appendChild(photo);
      if (typeof attachImageLoader === "function") attachImageLoader(image);
      var credit = text("figcaption", "erhu-wiki__credit", copy.imageCredit + " ");
      var source = text("a", "", copy.imageSource);
      source.href = "https://commons.wikimedia.org/w/index.php?curid=192017131";
      source.target = "_blank"; source.rel = "noopener noreferrer";
      credit.appendChild(source); figure.appendChild(credit);
      var prose = text("div", "erhu-instrument-copy");
      copy.sections.forEach(function (section) {
        var sectionEl = text("section", "erhu-wiki__section");
        sectionEl.appendChild(text("h3", "erhu-wiki__heading", section.title));
        section.paragraphs.forEach(function (paragraph) {
          sectionEl.appendChild(text("p", "erhu-wiki__paragraph", paragraph));
        });
        prose.appendChild(sectionEl);
      });
      layout.append(figure, prose); body.appendChild(layout);
    }
    var words = (TRANSLATIONS[lang] || TRANSLATIONS.en).interests.erhu;
    var actions = text("div", "erhu-dialog-actions");
    actions.appendChild(action(performance ? words.learnMore + " →" : words.watch + " →", {
      "data-erhu-view": performance ? "instrument" : "performance",
      "aria-controls": performance ? "erhu-wiki-modal" : "erhu-performance-modal",
      "aria-haspopup": "dialog"
    }));
    actions.appendChild(action(copy.close, { "data-erhu-close": "" }));
    body.appendChild(actions);
    body.scrollTop = scrollY;
  }

  function show(performance, opener) {
    var next = performance ? performanceModal : wikiModal;
    if (closing || activeModal === next) return;
    var transferring = Boolean(activeModal);
    if (activeModal) {
      if (activeModal === performanceModal && videoEl) { videoEl.pause(); stashVideo(); }
      activeModal.hidden = true;
    } else lastFocus = opener;
    activeModal = next;
    render(activeLanguage());
    next.hidden = false;
    document.body.classList.add("erhu-modal-open");
    if (lastFocus) lastFocus.setAttribute("aria-expanded", "true");
    if (!transferring && typeof lockPageScroll === "function") lockPageScroll();
    if (typeof setBackgroundInert === "function") setBackgroundInert(next, true);
    if (typeof loadDeferredImages === "function") loadDeferredImages(next);
    document.getElementById(performance ? "erhu-performance-body" : "erhu-wiki-body").scrollTop = 0;
    next.querySelector(".erhu-modal__close").focus({ preventScroll: true });
  }

  function close() {
    if (!activeModal || closing) return;
    resetVideoProgress();
    closing = true;
    var modal = activeModal;
    if (modal === performanceModal && videoEl) videoEl.pause();
    function finish() {
      if (modal === performanceModal && videoEl) {
        try { videoEl.currentTime = 0; } catch (_) {}
        stashVideo();
      }
      modal.hidden = true; activeModal = null; closing = false;
      document.body.classList.remove("erhu-modal-open");
      if (lastFocus) lastFocus.setAttribute("aria-expanded", "false");
      if (typeof setBackgroundInert === "function") setBackgroundInert(modal, false);
      if (typeof unlockPageScroll === "function") unlockPageScroll();
      if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    }
    if (typeof closeSiteDialog === "function") closeSiteDialog(modal, finish);
    else finish();
  }

  window.renderErhuWiki = render;
  openButton.addEventListener("click", function () { show(false, openButton); });
  performanceButton.addEventListener("click", function () { show(true, performanceButton); });
  [wikiModal, performanceModal].forEach(function (modal) {
    modal.addEventListener("click", function (event) {
      var target = event.target.closest && event.target.closest("[data-erhu-close], [data-erhu-view]");
      if (!target || !modal.contains(target)) return;
      if (target.hasAttribute("data-erhu-close")) close();
      else show(target.getAttribute("data-erhu-view") === "performance");
    });
  });
  scheduleSilentPreload();
  document.addEventListener("keydown", function (event) {
    if (!activeModal || closing) return;
    if (event.key === "Escape") {
      if (document.fullscreenElement || (videoEl && videoEl.webkitDisplayingFullscreen)) return;
      event.preventDefault(); close(); return;
    }
    if (event.key !== "Tab") return;
    var nodes = Array.from(activeModal.querySelectorAll('button:not([disabled]), a[href], video[controls], [tabindex="0"]'));
    var first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
  if (window.MutationObserver) new MutationObserver(function () {
    if (activeModal && !closing) render(activeLanguage());
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-language"] });
})();
