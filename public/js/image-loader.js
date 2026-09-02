/**
 * Photo-frame “Loading” flicker while raster images decode.
 */
(function () {
  "use strict";

  var FRAME_SEL =
    ".featured-card__visual--photo, .duolingo-card__frame, .qr-modal__frame, .erhu-wiki__photo, .img-load";
  var IMG_SEL = FRAME_SEL.split(", ")
    .map(function (sel) {
      return sel + " img";
    })
    .join(", ");

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

  function ensureLoader(frame) {
    var loader = frame.querySelector(".img-loader");
    if (loader) return loader;
    loader = document.createElement("span");
    loader.className = "img-loader";
    loader.setAttribute("aria-hidden", "true");
    loader.textContent = loadingWord();
    frame.appendChild(loader);
    return loader;
  }

  function visibleIncomplete(frame) {
    var imgs = frame.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (window.getComputedStyle(img).display === "none") continue;
      if (!img.complete || img.naturalWidth === 0) return true;
    }
    return false;
  }

  function setFrameState(frame) {
    if (!frame) return;
    ensureLoader(frame);
    if (visibleIncomplete(frame)) {
      frame.classList.add("img-load", "is-img-loading");
      frame.classList.remove("is-img-ready");
    } else {
      frame.classList.add("img-load", "is-img-ready");
      frame.classList.remove("is-img-loading");
    }
  }

  function attachImageLoader(img) {
    if (!img) return;
    var frame = frameOf(img);
    if (!frame) return;
    frame.classList.add("img-load");
    ensureLoader(frame);
    setFrameState(frame);

    if (img.getAttribute("data-loader") === "1") return;
    img.setAttribute("data-loader", "1");

    var onDone = function () {
      setFrameState(frame);
    };
    img.addEventListener("load", onDone);
    img.addEventListener("error", onDone);
  }

  function initImageLoaders(root) {
    var scope = root || document;
    var imgs = scope.querySelectorAll(IMG_SEL);
    imgs.forEach(attachImageLoader);

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
    var word = loadingWord();
    document.querySelectorAll(".img-loader").forEach(function (el) {
      el.textContent = word;
    });
    document.querySelectorAll(".img-load").forEach(setFrameState);
  }

  window.attachImageLoader = attachImageLoader;
  window.initImageLoaders = initImageLoaders;
  window.refreshImageLoaderCopy = refreshImageLoaderCopy;
})();
