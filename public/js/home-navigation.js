/* Keep section wayfinding and anchor offsets in sync with the actual header. */
(function () {
  "use strict";
  var header = document.querySelector(".top-bar");
  var links = Array.from(document.querySelectorAll(".site-nav a[href^='#']"));
  if (!header || !links.length) return;
  var sections = links.map(function (link) {
    return document.getElementById(link.getAttribute("href").slice(1));
  });
  var queued = false;
  var navIsScrolled = null;

  function update() {
    queued = false;
    // Scroll locking temporarily changes section positions; retain the current marker.
    if (document.documentElement.classList.contains("page-scroll-locked")) return;
    var scrollY = window.scrollY || window.pageYOffset || 0;
    var nextScrolled = navIsScrolled ? scrollY > 40 : scrollY >= 72;
    if (nextScrolled !== navIsScrolled) {
      navIsScrolled = nextScrolled;
      header.classList.toggle("is-scrolled", nextScrolled);
    }
    var height = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty("--top-bar-h", height + "px");
    var current = -1;
    sections.forEach(function (section, index) {
      if (section && section.getBoundingClientRect().top <= height + 48) current = index;
    });
    links.forEach(function (link, index) {
      if (index === current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  if (window.ResizeObserver) {
    var observer = new ResizeObserver(schedule);
    observer.observe(header);
    observer.observe(document.querySelector("main"));
  }
  update();
})();
