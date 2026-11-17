/* Keep the preview visible until the full-size photo is ready. */
(function () {
  "use strict";

  var image = document.querySelector(".hero__backdrop img");
  if (!image) return;

  var root = document.documentElement;
  var original = image.getAttribute("data-hero-src");
  if (window.SiteRuntime) original = window.SiteRuntime.image(original);

  image.addEventListener("animationend", function (event) {
    if (event.animationName === "hub-hero-zoom") image.classList.remove("is-hero-enter");
  });

  image.addEventListener("load", function () {
    if (!root.classList.contains("hero-photo-pending")) return;
    if (!root.hasAttribute("data-lightweight") &&
        !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
      image.classList.add("is-hero-enter");
    }
    root.classList.remove("hero-photo-pending");
  });

  image.addEventListener("error", function () {
    if (image.hasAttribute("srcset") || image.getAttribute("src") !== original) {
      image.removeAttribute("srcset");
      image.removeAttribute("sizes");
      image.src = original;
    }
  });

  function setPhoto() {
    var calendar = window.SeasonCalendar;
    if (calendar && calendar.setPhoto) {
      calendar.setPhoto(image, root.getAttribute("data-occasion"), root.getAttribute("data-new-year-phase"));
    } else {
      image.src = original;
    }
  }

  root.classList.add("hero-photo-pending");
  setPhoto();
  if (window.matchMedia) {
    var portrait = window.matchMedia("(max-width: 600px) and (max-aspect-ratio: 3/5)");
    if (portrait.addEventListener) portrait.addEventListener("change", setPhoto);
    else if (portrait.addListener) portrait.addListener(setPhoto);
  }
})();
