/**
 * Sequential image loading.
 *
 * Photos use data-src (no src in HTML) so they are not document subresources.
 * Safari’s tab spinner waits on every <img src> — even loading="lazy" — until
 * window.load; assigning src after that event keeps the chrome from hanging
 * on below-fold / hidden assets. Visible frames then fetch one at a time so
 * they appear as each file is ready, not as a batch.
 */
(function () {
  "use strict";

  var FRAME_SEL =
    ".featured-card__visual--photo, .duolingo-card__frame, .qr-modal__frame, .erhu-wiki__photo, .img-load";
  var IMG_SEL = "img[data-src], " +
    FRAME_SEL.split(", ")
      .map(function (sel) {
        return sel + " img";
      })
      .join(", ");
  var ROOT_MARGIN = "160px 0px";

  var queue = [];
  var busy = false;
  var gateOpen = false;
  var io = null;

  function loadingWord() {
    var lang = document.documentElement.getAttribute("data-language") || "en";
    var pack =
      typeof TRANSLATIONS === "object"
        ? TRANSLATIONS[lang] || TRANSLATIONS.en
        : null;
    var word = pack && pack.a11y && pack.a11y.loading;
    return word || "Loading";
  }

  function frameOf(img) {
    return img.closest(FRAME_SEL) || img.parentElement;
  }

  function usesLabel(frame) {
    return frame && frame.matches(FRAME_SEL);
  }

  function loaderLabel() {
    var lang = document.documentElement.getAttribute("data-language") || "en";
    var word = loadingWord();
    if (lang === "zh" || lang === "ja") return word;
    if (word.slice(-3) !== "...") return word + "...";
    return word;
  }

  function applyLoaderLabel(loader) {
    var lang = document.documentElement.getAttribute("data-language") || "en";
    var label = loaderLabel();
    var unit = lang === "zh" || lang === "ja" ? "em" : "ch";
    loader.setAttribute("data-label", label);
    loader.style.setProperty("--loader-shift", String(label.length) + unit);
  }

  function ensureLoader(frame) {
    if (!usesLabel(frame)) return null;
    var loader = frame.querySelector(".img-loader");
    if (!loader) {
      loader = document.createElement("div");
      loader.className = "img-loader";
      loader.setAttribute("aria-hidden", "true");
      frame.appendChild(loader);
    }
    applyLoaderLabel(loader);
    return loader;
  }

  function isHidden(el) {
    if (!el || !el.isConnected) return true;
    if (el.closest("[hidden]")) return true;
    var style = window.getComputedStyle(el);
    return style.display === "none" || style.visibility === "hidden";
  }

  function visibleIncomplete(frame) {
    var imgs = frame.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (isHidden(img)) continue;
      if (!img.getAttribute("src") || !img.complete || img.naturalWidth === 0) {
        return true;
      }
    }
    return false;
  }

  function setFrameState(frame) {
    if (!frame) return;
    if (!usesLabel(frame)) return;
    ensureLoader(frame);
    if (visibleIncomplete(frame)) {
      frame.classList.add("img-load", "is-img-loading");
      frame.classList.remove("is-img-ready");
    } else {
      frame.classList.add("img-load", "is-img-ready");
      frame.classList.remove("is-img-loading");
    }
  }

  function markImgReady(img) {
    img.classList.add("is-img-ready");
    setFrameState(frameOf(img));
  }

  function armSrc(img) {
    var src = img.getAttribute("src");
    var dataSrc = img.getAttribute("data-src");
    if (src && !dataSrc) {
      img.setAttribute("data-src", src);
      img.removeAttribute("src");
    }
  }

  function wantedSrc(img) {
    return img.getAttribute("data-src") || "";
  }

  function alreadyLoaded(img) {
    var url = wantedSrc(img);
    return (
      url &&
      img.getAttribute("src") === url &&
      img.complete &&
      img.naturalWidth > 0
    );
  }

  function domOrder(a, b) {
    if (a === b) return 0;
    var pos = a.compareDocumentPosition(b);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  }

  function pump() {
    if (busy) return;
    var img = null;
    while (queue.length && !img) {
      var next = queue.shift();
      if (!next || !next.isConnected) continue;
      if (isHidden(next)) {
        next.removeAttribute("data-queued");
        if (io) io.observe(next);
        continue;
      }
      if (alreadyLoaded(next)) {
        markImgReady(next);
        continue;
      }
      img = next;
    }
    if (!img) return;

    busy = true;
    var url = wantedSrc(img);
    var frame = frameOf(img);
    var settled = false;
    var hangTimer = 0;

    function finish() {
      if (settled) return;
      settled = true;
      if (hangTimer) window.clearTimeout(hangTimer);
      markImgReady(img);
      busy = false;
      pump();
    }

    function afterBytes() {
      if (typeof img.decode === "function" && img.naturalWidth > 0) {
        img.decode().then(finish, finish);
      } else {
        finish();
      }
    }

    if (!url) {
      finish();
      return;
    }

    setFrameState(frame);
    hangTimer = window.setTimeout(finish, 12000);
    img.addEventListener("load", afterBytes, { once: true });
    img.addEventListener("error", finish, { once: true });
    img.setAttribute("src", url);
    img.setAttribute("decoding", "async");

    if (img.complete && img.naturalWidth > 0) {
      afterBytes();
    }
  }

  function enqueue(img) {
    if (!img || img.getAttribute("data-queued") === "1") return;
    if (alreadyLoaded(img)) {
      markImgReady(img);
      return;
    }
    img.setAttribute("data-queued", "1");
    queue.push(img);
    queue.sort(domOrder);
    pump();
  }

  function inPrefetchRange(img) {
    var rect = img.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      var frame = frameOf(img);
      if (frame) rect = frame.getBoundingClientRect();
    }
    if (rect.width === 0 && rect.height === 0) return false;
    var vh = window.innerHeight || 0;
    return rect.bottom >= -160 && rect.top <= vh + 160;
  }

  function observeOrQueue(img) {
    if (!img || alreadyLoaded(img) || img.getAttribute("data-queued") === "1") {
      if (img && alreadyLoaded(img)) markImgReady(img);
      return;
    }
    if (!gateOpen) return;
    if (isHidden(img)) {
      if (io) io.observe(img);
      return;
    }
    if (!io || inPrefetchRange(img)) {
      enqueue(img);
      return;
    }
    io.observe(img);
  }

  function ensureObserver() {
    if (io || !window.IntersectionObserver) return;
    io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var img = entry.target;
          io.unobserve(img);
          if (isHidden(img)) return;
          enqueue(img);
        });
      },
      { root: null, rootMargin: ROOT_MARGIN, threshold: 0.01 }
    );
  }

  function attachImageLoader(img) {
    if (!img) return;
    armSrc(img);
    var frame = frameOf(img);
    if (usesLabel(frame)) {
      frame.classList.add("img-load");
      ensureLoader(frame);
      setFrameState(frame);
    }

    if (img.getAttribute("data-loader") === "1") {
      observeOrQueue(img);
      return;
    }
    img.setAttribute("data-loader", "1");
    observeOrQueue(img);
  }

  function loadDeferredImages(root) {
    var scope = root || document;
    var imgs = scope.querySelectorAll ? scope.querySelectorAll(IMG_SEL) : [];
    if (scope.tagName === "IMG") {
      attachImageLoader(scope);
      return;
    }
    imgs.forEach(attachImageLoader);
  }

  function openGate() {
    if (gateOpen) return;
    gateOpen = true;
    ensureObserver();
    loadDeferredImages(document);
  }

  function initImageLoaders(root) {
    ensureObserver();
    loadDeferredImages(root || document);

    if (document.readyState === "complete") {
      openGate();
    } else {
      window.addEventListener("load", openGate, { once: true });
    }

    if (initImageLoaders.watching || !window.MutationObserver) return;
    initImageLoaders.watching = true;
    var observer = new MutationObserver(function () {
      refreshImageLoaderCopy();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-language"],
    });
  }

  function refreshImageLoaderCopy() {
    document.querySelectorAll(".img-loader").forEach(applyLoaderLabel);
    document.querySelectorAll(".img-load").forEach(setFrameState);
    loadDeferredImages(document);
  }

  window.attachImageLoader = attachImageLoader;
  window.initImageLoaders = initImageLoaders;
  window.refreshImageLoaderCopy = refreshImageLoaderCopy;
  window.loadDeferredImages = loadDeferredImages;
})();
