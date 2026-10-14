/* A birthday surprise on December 21, in the visitor's local time. */
(function () {
  "use strict";

  var source = document.currentScript.getAttribute("data-balloons-src");
  var motion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var preview = new URLSearchParams(window.location.search).get("birthday") === "preview";
  var started = false;
  var dismissed = false;
  var loading = false;
  var timer = 0;
  var effect = null;

  function eligible() {
    var today = new Date();
    return (preview || (today.getMonth() === 11 && today.getDate() === 21)) &&
      !document.hidden && !(motion && motion.matches) && !started && !dismissed;
  }

  function clear() {
    window.clearTimeout(timer);
    timer = 0;
    if (effect) effect.clear();
    effect = null;
  }

  function show() {
    timer = 0;
    if (!eligible()) return;
    if (typeof window.createBirthdayBalloons === "function") {
      started = true;
      try { effect = window.createBirthdayBalloons(); } catch (_) { clear(); }
      return;
    }
    if (loading || !source) return;
    loading = true;
    var script = document.createElement("script");
    script.src = source;
    script.async = true;
    script.onload = function () {
      loading = false;
      script.remove();
      if (typeof window.createBirthdayBalloons === "function") show();
      else started = true;
    };
    script.onerror = function () {
      loading = false;
      started = true;
      script.remove();
    };
    document.head.appendChild(script);
  }

  function schedule() {
    if (document.readyState !== "complete" || !eligible() || timer || loading) return;
    timer = window.setTimeout(show, 700);
  }

  window.addEventListener("load", schedule, { once: true });
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) { started = false; dismissed = false; }
    schedule();
  });
  window.addEventListener("pagehide", clear);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) clear();
    else schedule();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && (effect || timer || loading)) {
      dismissed = true;
      clear();
    }
  });
  if (motion && motion.addEventListener) {
    motion.addEventListener("change", function () {
      if (motion.matches) clear();
      else schedule();
    });
  }
  schedule();
})();
