/* Bring the hero photo in after it has decoded, matching the travel guide. */
(function () {
  "use strict";

  var image = document.querySelector(".hero__backdrop img");
  if (!image) return;

  var occasion = document.documentElement.getAttribute("data-occasion");
  var original = image.getAttribute("data-hero-src");
  image.addEventListener("error", function () {
    if (image.getAttribute("src") !== original) image.src = original;
  });
  image.src = window.SeasonCalendar ? window.SeasonCalendar.photo(occasion, document.documentElement.getAttribute("data-new-year-phase")) : original;

  var started = false;
  var entered = false;

  image.addEventListener("animationend", function (event) {
    if (event.target === image && event.animationName === "hub-hero-zoom") {
      image.classList.remove("is-hero-enter");
    }
  });

  function reveal() {
    if (entered) return;
    entered = true;
    document.documentElement.classList.remove("hero-photo-pending");
    image.classList.add("is-hero-enter");
  }

  function revealAfterDecode() {
    window.requestAnimationFrame(function () {
      window.setTimeout(reveal, 40);
    });
  }

  function start() {
    if (started) return;
    started = true;

    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      reveal();
      return;
    }

    if (!image.complete) {
      image.addEventListener("load", revealAfterDecode, { once: true });
      image.addEventListener("error", reveal, { once: true });
      window.setTimeout(reveal, 1600);
      return;
    }

    if (!image.naturalWidth || typeof image.decode !== "function") {
      revealAfterDecode();
      return;
    }

    try {
      image.decode().then(revealAfterDecode, revealAfterDecode);
    } catch (_) {
      revealAfterDecode();
    }
  }

  window.requestAnimationFrame(function () {
    window.setTimeout(start, 40);
  });
  window.setTimeout(reveal, 2200);
})();
