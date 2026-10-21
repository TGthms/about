/* Bring the hero photo in after it has decoded, matching the travel guide. */
(function () {
  "use strict";

  var image = document.querySelector(".hero__backdrop img");
  if (!image) return;

  var occasion = document.documentElement.getAttribute("data-occasion");
  var original = image.getAttribute("data-hero-src");
  if (window.SiteRuntime) original = window.SiteRuntime.image(original);
  image.addEventListener("error", function () {
    image.removeAttribute("srcset"); image.removeAttribute("sizes");
    if (image.getAttribute("src") !== original || !image.complete) image.src = original;
  });
  function setPhoto() {
    var calendar = window.SeasonCalendar;
    if (calendar && calendar.setPhoto) calendar.setPhoto(image, document.documentElement.getAttribute("data-occasion"), document.documentElement.getAttribute("data-new-year-phase"));
    else image.src = original;
  }
  setPhoto();
  if (window.matchMedia) window.matchMedia("(max-width: 600px) and (max-aspect-ratio: 3/5)").addEventListener("change", setPhoto);

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
