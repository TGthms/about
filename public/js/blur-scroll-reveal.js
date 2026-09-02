/**
 * Scroll-linked blur reveal for the about copy.
 * Adapted from Great UI BlurScrollReveal (MIT) by Saurabh Sharma —
 * https://github.com/Saurabh-2607/GreatUI
 */
(function () {
  "use strict";

  var STAGGER = 0.85;
  var DURATION = 0.12;
  var BLUR_PX = 8;
  var Y_PX = 8;

  var root = null;
  var words = [];
  var raf = 0;
  var listening = false;
  var useBlur = true;
  var reduced = false;

  function currentLang() {
    return document.documentElement.getAttribute("data-language") || "en";
  }

  function prefersReduced() {
    return typeof systemPrefersReducedMotion === "function"
      ? systemPrefersReducedMotion()
      : false;
  }

  function isCjk(language) {
    return language === "zh" || language === "ja";
  }

  function tokenize(text, language) {
    var trimmed = String(text || "").replace(/\s+/g, " ").trim();
    if (!trimmed) return [];

    if (isCjk(language) && typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      var locale = language === "zh" ? "zh-Hans" : "ja";
      var seg = new Intl.Segmenter(locale, { granularity: "word" });
      var out = [];
      var parts = seg.segment(trimmed);
      for (var part of parts) {
        if (part.segment && part.segment.trim().length) out.push(part.segment);
      }
      if (out.length) return out;
    }

    if (isCjk(language)) {
      return Array.from(trimmed).filter(function (ch) {
        return ch.trim().length;
      });
    }

    return trimmed.split(" ").filter(Boolean);
  }

  function progressFor(el) {
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var startY = vh;
    var endY = vh * 0.6 - rect.height;
    var span = startY - endY;
    if (span <= 1) return rect.bottom < vh * 0.6 ? 1 : 0;
    var t = (startY - rect.top) / span;
    if (t < 0) return 0;
    if (t > 1) return 1;
    return t;
  }

  function applyWord(el, t) {
    if (t <= 0) {
      el.style.opacity = "0";
      el.style.filter = useBlur ? "blur(" + BLUR_PX + "px)" : "none";
      el.style.transform = "translate3d(0," + Y_PX + "px,0)";
      return;
    }
    if (t >= 1) {
      el.style.opacity = "1";
      el.style.filter = "none";
      el.style.transform = "translate3d(0,0,0)";
      return;
    }
    el.style.opacity = String(t);
    el.style.filter = useBlur ? "blur(" + ((1 - t) * BLUR_PX).toFixed(2) + "px)" : "none";
    el.style.transform = "translate3d(0," + ((1 - t) * Y_PX).toFixed(2) + "px,0)";
  }

  function update() {
    raf = 0;
    if (!root || !words.length) return;
    if (reduced) {
      for (var r = 0; r < words.length; r++) applyWord(words[r], 1);
      return;
    }

    var p = progressFor(root);
    var n = Math.max(1, words.length);
    for (var i = 0; i < words.length; i++) {
      var start = (i / n) * STAGGER;
      var end = Math.min(1, start + DURATION);
      var local = end <= start ? 1 : (p - start) / (end - start);
      if (local < 0) local = 0;
      else if (local > 1) local = 1;
      applyWord(words[i], local);
    }
    if (p >= 1) {
      if (!root.classList.contains("is-complete")) {
        root.classList.add("is-complete");
        for (var w = 0; w < words.length; w++) words[w].style.willChange = "auto";
      }
    } else if (root.classList.contains("is-complete")) {
      root.classList.remove("is-complete");
      for (var x = 0; x < words.length; x++) {
        words[x].style.willChange = "opacity, filter, transform";
      }
    }
  }

  function requestUpdate() {
    if (raf) return;
    raf = window.requestAnimationFrame(update);
  }

  function fillParagraph(p, language) {
    var tokens = tokenize(p.textContent, language);
    var joinCjk = isCjk(language);
    p.textContent = "";
    var frag = document.createDocumentFragment();
    for (var i = 0; i < tokens.length; i++) {
      var span = document.createElement("span");
      span.className = "about__word";
      span.textContent = tokens[i];
      frag.appendChild(span);
      if (!joinCjk && i < tokens.length - 1) {
        frag.appendChild(document.createTextNode(" "));
      }
      words.push(span);
    }
    p.appendChild(frag);
  }

  function build() {
    root = document.querySelector("[data-blur-reveal]");
    if (!root) return;

    reduced = prefersReduced();
    useBlur =
      !reduced &&
      !(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

    words = [];
    try {
      var language = currentLang();
      root.querySelectorAll(".about__text").forEach(function (p) {
        fillParagraph(p, language);
      });

      if (reduced) {
        for (var i = 0; i < words.length; i++) applyWord(words[i], 1);
      } else {
        update();
      }
    } finally {
      root.classList.add("is-ready");
    }
  }

  function initBlurScrollReveal() {
    build();
    if (listening) return;
    listening = true;
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    if (window.matchMedia) {
      var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
      var onMotion = function () {
        refreshBlurScrollReveal();
      };
      if (motion.addEventListener) motion.addEventListener("change", onMotion);
      else if (motion.addListener) motion.addListener(onMotion);
    }
  }

  function refreshBlurScrollReveal() {
    if (root) root.classList.remove("is-ready");
    words = [];
    build();
  }

  window.initBlurScrollReveal = initBlurScrollReveal;
  window.refreshBlurScrollReveal = refreshBlurScrollReveal;
})();
