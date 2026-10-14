/* Seasonal hero copy and a wall-clock New Year countdown. */
(function () {
  "use strict";
  var calendar = window.SeasonCalendar;
  var hero = document.getElementById("hero");
  if (!calendar || !hero) return;
  var sources = document.currentScript;
  var root = document.documentElement;
  var note = hero.querySelector(".hero__note");
  var label = document.getElementById("season-label");
  var reference = document.getElementById("season-reference");
  var verse = document.getElementById("season-verse");
  var verseText = document.getElementById("season-verse-text");
  var credits = document.getElementById("season-credits");
  var clock = document.getElementById("season-countdown");
  var until = document.getElementById("season-until");
  var minutes = document.getElementById("season-minutes");
  var seconds = document.getElementById("season-seconds");
  var close = document.getElementById("season-dismiss");
  var photo = hero.querySelector(".hero__backdrop img");
  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var scripts = {}, timer = 0, stopTimer = 0, effect = null, layer = null;
  var flowLoading = false, flows = false, observed = false, offscreen = false;
  var played = null, dismissed = null, last = "", current = calendar.current();

  function load(name) {
    if (scripts[name]) return scripts[name];
    scripts[name] = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = sources.getAttribute("data-" + name + "-src");
      script.async = true;
      script.onload = function () { script.remove(); resolve(); };
      script.onerror = function () { script.remove(); reject(new Error(name)); };
      document.head.appendChild(script);
    });
    return scripts[name];
  }

  function pack() {
    var content = window.SEASON_CONTENT;
    return content && (content[root.getAttribute("data-language")] || content.en);
  }

  function floatClock() {
    clock.classList.toggle("is-floating", offscreen && !clock.hidden);
  }

  function setNumbers(total) {
    var m = Math.floor(total / 60), s = total % 60;
    if (flows) {
      if (minutes.value !== m) minutes.update(m);
      if (seconds.value !== s) seconds.update(s);
    } else {
      minutes.textContent = String(m).padStart(2, "0");
      seconds.textContent = String(s).padStart(2, "0");
    }
    var text = pack();
    clock.setAttribute("aria-label", (text ? text.timer : "Time until the new year") + ": " + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0"));
  }

  function upgradeClock() {
    if (flowLoading || flows || motion.matches) return;
    flowLoading = true;
    import(new URL(sources.getAttribute("data-number-flow-src"), document.baseURI).href).then(function () {
      if (!window.customElements || !customElements.get("number-flow") || clock.hidden) { flowLoading = false; return; }
      ["minutes", "seconds"].forEach(function (unit) {
        var old = unit === "minutes" ? minutes : seconds;
        var flow = document.createElement("number-flow");
        flow.id = old.id;
        flow.format = { minimumIntegerDigits: 2, useGrouping: false };
        flow.locales = "en-US";
        flow.trend = -1;
        flow.digits = { 1: { max: unit === "seconds" ? 5 : 9 } };
        flow.transformTiming = { duration: 440, easing: "cubic-bezier(.22,1,.36,1)" };
        flow.spinTiming = flow.transformTiming;
        flow.opacityTiming = { duration: 180, easing: "ease-out" };
        flow.animated = false;
        old.replaceWith(flow);
        flow.update(Number(old.textContent));
        flow.animated = !motion.matches;
        if (unit === "minutes") minutes = flow;
        else seconds = flow;
      });
      flows = true;
    }).catch(function () { /* The plain-text clock remains usable. */ });
  }

  function render() {
    var text = pack();
    if (!text) return;
    var occasion = current.occasion;
    var entry = text[current.phase === "countdown" ? "countdown" : occasion];
    label.hidden = !entry;
    if (entry) { label.textContent = entry[0]; note.textContent = entry[1]; }
    else if (typeof TRANSLATIONS !== "undefined") {
      var language = root.getAttribute("data-language") || "en";
      note.textContent = (TRANSLATIONS[language] || TRANSLATIONS.en).hero.note;
    }
    var scripture = text.scripture[occasion];
    note.hidden = Boolean(scripture);
    verse.hidden = !scripture;
    reference.hidden = !scripture;
    credits.hidden = !scripture;
    if (scripture) {
      verseText.textContent = entry[1];
      reference.textContent = scripture.reference;
      reference.href = scripture.url;
      credits.querySelector("summary").textContent = text.credits;
      credits.querySelector("p").textContent = text.copyright;
    }
    close.setAttribute("aria-label", text.close);
    until.textContent = text.until.replace("{year}", current.year);
  }

  function stopFireworks() {
    var focused = document.activeElement === close;
    window.clearTimeout(stopTimer);
    stopTimer = 0;
    if (effect) effect.stop(true);
    effect = null;
    if (layer) layer.remove();
    layer = null;
    close.hidden = true;
    if (focused && !document.hidden) {
      var target = hero.querySelector(".hero__index a");
      if (target) target.focus({ preventScroll: true });
    }
  }

  function eligible(target) {
    return !document.hidden && !motion.matches && played !== target && dismissed !== target &&
      Date.now() >= target && Date.now() < target + 30000;
  }

  function celebrate() {
    var target = current.target;
    if (current.phase !== "greeting" || !eligible(target)) return;
    load("fireworks").then(function () {
      if (!eligible(target) || calendar.current().target !== target || !window.Fireworks) return;
      played = target;
      try {
        layer = document.createElement("div");
        layer.className = "seasonal-fireworks";
        layer.setAttribute("aria-hidden", "true");
        document.body.appendChild(layer);
        effect = new window.Fireworks.Fireworks(layer, {
          autoresize: true, opacity: 0.22, acceleration: 1.025, friction: 0.97,
          gravity: 1.3, particles: window.innerWidth < 600 ? 32 : 48,
          traceLength: 3, traceSpeed: 7, explosion: 5, intensity: 22, flickering: 0,
          hue: { min: 0, max: 360 }, rocketsPoint: { min: 15, max: 85 },
          brightness: { min: 65, max: 85 }, decay: { min: 0.018, max: 0.03 },
          mouse: { click: false, move: false, max: 1 }, sound: { enabled: false }
        });
        effect.start();
        close.hidden = false;
        stopTimer = window.setTimeout(stopFireworks, Math.max(0, target + 30000 - Date.now()));
      } catch (_) { stopFireworks(); }
    }).catch(function () { /* The greeting does not depend on canvas support. */ });
  }

  function observe() {
    if (observed) return;
    observed = true;
    new MutationObserver(render).observe(root, { attributes: true, attributeFilter: ["data-language"] });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        offscreen = !entries[0].isIntersecting;
        floatClock();
      }).observe(hero);
    }
  }

  function tick() {
    window.clearTimeout(timer);
    timer = 0;
    if (document.hidden) return;
    var now = Date.now();
    current = calendar.current();
    var occasion = current.occasion;
    if (occasion) {
      root.setAttribute("data-occasion", occasion);
      if (!pack()) load("content").then(function () { observe(); render(); if (!clock.hidden) setNumbers(Math.max(0, Math.ceil((current.target - Date.now()) / 1000))); }).catch(function () {});
    } else root.removeAttribute("data-occasion");
    var src = calendar.photo(occasion);
    if (photo.getAttribute("src") !== src) photo.src = src;
    var zero = current.phase === "greeting" && now >= current.target && now < current.target + 1400;
    var settling = current.phase === "greeting" && now >= current.target + 1400 && now < current.target + 2100;
    clock.hidden = current.phase !== "countdown" && !zero && !settling;
    clock.classList.toggle("is-finished", settling);
    floatClock();
    var signature = [occasion, current.phase, current.year, clock.hidden].join(":");
    if (last !== signature) { last = signature; render(); }
    if (!clock.hidden) {
      setNumbers(Math.max(0, Math.ceil((current.target - now) / 1000)));
      upgradeClock();
    }
    if (current.phase === "countdown" && current.target - now <= 10000 && !motion.matches) {
      load("fireworks").catch(function () {});
    }
    celebrate();
    var delay = current.phase === "countdown" ? Math.min(1000, (current.target - now) % 1000 || 1000) :
      zero ? current.target + 1400 - now : settling ? current.target + 2100 - now : current.next - now;
    if (Number.isFinite(delay)) timer = window.setTimeout(tick, Math.max(20, delay));
  }

  close.addEventListener("click", function () { dismissed = current.target; stopFireworks(); });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && (effect || (current.target && Date.now() < current.target + 30000))) {
      dismissed = current.target;
      stopFireworks();
    }
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { window.clearTimeout(timer); stopFireworks(); }
    else tick();
  });
  window.addEventListener("pagehide", function () { window.clearTimeout(timer); stopFireworks(); });
  window.addEventListener("pageshow", function (event) { if (event.persisted) tick(); });
  motion.addEventListener("change", function () {
    if (motion.matches) stopFireworks();
    if (flows) { minutes.animated = !motion.matches; seconds.animated = !motion.matches; }
    tick();
  });
  tick();
})();
