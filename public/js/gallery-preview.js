/* One visible photograph, with a four-second shuffle cadence. */
(function () {
  "use strict";
  var frame = document.getElementById("gallery-preview");
  if (!frame) return;
  var catalog = window.GALLERY_PHOTOS || [];
  var image = frame.querySelector("img");
  var label = frame.querySelector(".gallery-preview__location");
  var toggle = frame.querySelector("button");
  var card = frame.closest("[data-project]");
  if (!image || !label || !toggle || !card || catalog.length < 2) return;
  var lightweight = window.SiteRuntime && window.SiteRuntime.lightweight;
  var connection = navigator.connection || {};
  var constrained = lightweight || connection.saveData || /(^|-)2g$/.test(connection.effectiveType || "");
  var motion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var current = catalog.filter(function (p) { return p.src === image.getAttribute("data-src"); })[0] || catalog[0];
  if (!constrained && !image.getAttribute("src")) {
    current = catalog[Math.floor(Math.random() * catalog.length)];
    image.setAttribute("data-src", current.src);
    label.textContent = current.location;
  }
  var layers = null, active = 0, visible = false, focused = false, paused = false;
  var timer = 0, captionTimer = 0, exitTimer = 0, requestTimer = 0, pending = null;
  var generation = 0;
  var observer = null;
  var interval = 4000, remaining = interval, startedAt = 0;

  function now() { return window.performance ? window.performance.now() : Date.now(); }
  function resetInterval() {
    remaining = interval;
    frame.classList.remove("is-gallery-timing", "is-gallery-running");
    void label.offsetWidth;
    frame.classList.add("is-gallery-timing");
  }

  function words() {
    var lang = document.documentElement.getAttribute("data-language") || "en";
    return typeof TRANSLATIONS === "object" ? (TRANSLATIONS[lang] || TRANSLATIONS.en).interests.photo : null;
  }
  function copy() {
    var pack = words();
    toggle.setAttribute("aria-label", pack ? pack[paused ? "resume" : "pause"] : (paused ? "Resume photo slideshow" : "Pause photo slideshow"));
    toggle.classList.toggle("is-paused", paused);
  }
  function select(photo) {
    current = photo;
    card.setAttribute("data-gallery-photo", photo.file);
    if (typeof applyProjectUrls === "function") applyProjectUrls(null, card);
  }
  function allowed() {
    return !constrained && !(motion && motion.matches) && visible && !document.hidden &&
      !document.documentElement.classList.contains("page-scroll-locked") && !paused && !focused;
  }
  function settle() {
    window.clearTimeout(captionTimer); window.clearTimeout(exitTimer);
    captionTimer = exitTimer = 0;
    label.textContent = current.location;
    label.classList.remove("is-swapping");
    if (layers) {
      var old = layers[1 - active];
      old.classList.remove("is-active", "is-exit");
      old.style.backgroundImage = "";
    }
  }
  function stop() {
    if (timer) remaining = Math.max(0, remaining - (now() - startedAt));
    frame.classList.remove("is-gallery-running");
    window.clearTimeout(timer); window.clearTimeout(requestTimer);
    timer = requestTimer = 0;
    generation += 1;
    if (pending) {
      pending.onload = pending.onerror = null;
      pending.removeAttribute("src");
      pending = null;
      resetInterval();
    }
    settle();
  }
  function schedule() {
    if (!allowed() || !layers || timer || pending) return;
    if (!frame.classList.contains("is-gallery-timing")) resetInterval();
    startedAt = now();
    frame.classList.add("is-gallery-running");
    timer = window.setTimeout(function () {
      timer = 0; remaining = 0;
      frame.classList.remove("is-gallery-running");
      next();
    }, remaining);
  }
  function sync() {
    copy();
    toggle.hidden = constrained || Boolean(motion && motion.matches) || !layers;
    if (allowed()) schedule();
    else stop();
  }
  function swap(photo) {
    settle();
    var old = layers[active], incoming = layers[1 - active];
    incoming.style.backgroundImage = 'url("' + photo.src + '")';
    void incoming.offsetWidth;
    incoming.classList.add("is-active");
    old.classList.remove("is-active"); old.classList.add("is-exit");
    active = 1 - active;
    select(photo);
    if (label.textContent !== photo.location) {
      label.classList.add("is-swapping");
      captionTimer = window.setTimeout(function () {
        captionTimer = 0; label.textContent = photo.location; label.classList.remove("is-swapping");
      }, 160);
    }
    exitTimer = window.setTimeout(settle, 1100);
    resetInterval();
    schedule();
  }
  function next() {
    if (!allowed() || !layers || pending) return;
    var choices = catalog.filter(function (p) { return p.file !== current.file; });
    var photo = choices[Math.floor(Math.random() * choices.length)];
    var ticket = ++generation;
    var loader = pending = new Image();
    function done(ok) {
      if (ticket !== generation || pending !== loader) return;
      window.clearTimeout(requestTimer); requestTimer = 0;
      loader.onload = loader.onerror = null; pending = null;
      if (ok && allowed()) swap(photo);
      else { resetInterval(); schedule(); }
    }
    loader.onload = function () {
      if (typeof loader.decode === "function") loader.decode().then(function () { done(true); }, function () { done(true); });
      else done(true);
    };
    loader.onerror = function () { done(false); };
    requestTimer = window.setTimeout(function () {
      loader.removeAttribute("src"); done(false);
    }, 12000);
    loader.decoding = "async";
    loader.src = photo.src;
  }
  function prepare() {
    if (!image.complete || !image.naturalWidth || layers) return;
    select(current);
    // A still frame retains the serial image loader and allocates no extra layer.
    if (constrained || (motion && motion.matches)) return;
    layers = [document.createElement("div"), document.createElement("div")];
    layers.forEach(function (layer) { layer.className = "gallery-preview__layer"; frame.appendChild(layer); });
    layers[0].style.backgroundImage = 'url("' + (image.currentSrc || image.src) + '")';
    layers[0].classList.add("is-active");
    // The shared loader's load listener may run after this one; its original
    // image is about to leave the frame, so finish the visible frame state here.
    frame.classList.remove("is-img-loading", "is-img-error");
    frame.classList.add("is-img-ready");
    image.remove();
    sync();
  }
  select(current); copy();
  if (constrained) { toggle.hidden = true; return; }
  frame.style.setProperty("--gallery-interval", interval + "ms");
  image.addEventListener("load", prepare);
  prepare();
  toggle.addEventListener("click", function () { paused = !paused; sync(); });
  card.addEventListener("focusin", function (event) { focused = event.target !== toggle && event.target !== card; sync(); });
  card.addEventListener("focusout", function (event) {
    if (!event.relatedTarget || !card.contains(event.relatedTarget)) { focused = false; sync(); }
  });
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("pagehide", stop);
  window.addEventListener("pageshow", sync);
  if (motion) {
    function changed() { resetInterval(); prepare(); sync(); }
    if (motion.addEventListener) motion.addEventListener("change", changed);
    else if (motion.addListener) motion.addListener(changed);
  }
  if (window.MutationObserver) {
    observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-language", "class"] });
  }
  if (!constrained && window.IntersectionObserver) {
    var visibility = new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; sync(); }, { threshold: 0.05 });
    visibility.observe(frame);
  } else if (!constrained) {
    function check() { var r = frame.getBoundingClientRect(); visible = r.bottom > 0 && r.top < window.innerHeight; sync(); }
    window.addEventListener("scroll", check, { passive: true }); window.addEventListener("resize", check); check();
  }
})();
