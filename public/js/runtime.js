/* Keep constrained browsers on a small, predictable rendering budget. */
(function () {
  "use strict";
  var screen = window.screen || {};
  var width = Math.min(screen.width || Infinity, screen.height || Infinity);
  var compact = /(?:^|[?&])lite=1(?:&|$)/.test(window.location ? window.location.search : "") ||
    /Watch/i.test(navigator.userAgent || "") || width <= 320 ||
    Boolean(window.matchMedia && window.matchMedia("(max-width: 320px)").matches);
  window.SiteRuntime = {
    lightweight: compact,
    image: function (src) {
      if (!compact) return src;
      /* Only these local photographs have compact counterparts. */
      if (!/^assets\/(main-modern\.webp|seasonal\/(christmas|good-friday|easter|thanksgiving|palm-sunday|new-year)\.webp|projects\/(duskline|kit-og|gallery-og|tri-valley-mars-society|usa-og|japan-og)\.(jpg|png)|duolingo-qr(-light)?\.jpg|erhu\/erhu-instrument\.jpg)$/.test(src)) return src;
      return src.replace(/^assets\//, "assets/compact/").replace(/\.(jpg|png)$/, ".webp");
    }
  };
  if (compact) document.documentElement.setAttribute("data-lightweight", "");
})();
