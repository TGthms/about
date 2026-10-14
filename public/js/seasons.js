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
  var inlineNumber = document.getElementById("season-inline-number");
  var inlineUnit = document.getElementById("season-inline-unit");
  var stage = document.getElementById("season-stage");
  var stageNumber = document.getElementById("season-stage-number");
  var stageTitle = document.getElementById("season-stage-title");
  var stageYear = document.getElementById("season-stage-year");
  var stageClock = document.getElementById("season-stage-timer");
  var stageStatus = document.getElementById("season-stage-status");
  var photo = hero.querySelector(".hero__backdrop img");
  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var scripts = {}, timer = 0, stopTimer = 0, fadeTimer = 0, effect = null, layer = null;
  var flowLoading = false, flows = false, observed = false, offscreen = false;
  var played = null, dismissed = null, last = "", current = calendar.current();
  var witnessed = calendar.preview === "fireworks" ? current.target : null;
  var suspended = false, stageSkipped = null, stageLocked = false, stageOpener = null;
  var compactClosing = 0, stageCloseTimer = 0, stageLeaving = false;
  var yearPhoto = null, yearPhotoReady = false, yearPhotoFailed = false, photoFinishTimer = 0;
  var nightTimer = 0, nightUntil = 0, nightVisitStarted = false;

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
    if (clock.classList.contains("is-expanded")) {
      if (typeof inlineNumber.update === "function") {
        if (inlineNumber.value !== total) inlineNumber.update(total);
      } else inlineNumber.textContent = String(total).padStart(2, "0");
      clock.style.setProperty("--remaining", total);
    }
    if (stage.open) {
      var remaining = Math.min(60, total);
      if (typeof stageNumber.update === "function") {
        if (stageNumber.value !== remaining) stageNumber.update(remaining);
      } else stageNumber.textContent = String(remaining).padStart(2, "0");
      stage.style.setProperty("--remaining", Math.min(60, remaining * 6));
      stageClock.setAttribute("aria-label", (text ? text.timer : "Time until the new year") + ": " + remaining + " " + (text ? text.seconds : "seconds"));
      if (text && (remaining === 10 || remaining === 0)) stageStatus.textContent = remaining ? stageClock.getAttribute("aria-label") : text["new-year"][0];
    }
  }

  function numberFlow(old, max) {
    var flow = document.createElement("number-flow");
    flow.id = old.id;
    flow.format = { minimumIntegerDigits: 2, useGrouping: false };
    flow.locales = "en-US";
    flow.trend = -1;
    flow.digits = { 1: { max: max } };
    flow.transformTiming = { duration: 440, easing: "cubic-bezier(.22,1,.36,1)" };
    flow.spinTiming = flow.transformTiming;
    flow.opacityTiming = { duration: 180, easing: "ease-out" };
    flow.animated = false;
    old.replaceWith(flow);
    flow.update(Number(old.textContent));
    flow.animated = !motion.matches;
    return flow;
  }

  function upgradeClock() {
    if (motion.matches || document.hidden || suspended) return;
    if (window.customElements && window.customElements.get("number-flow")) {
      if (!flows && !clock.hidden) {
        minutes = numberFlow(minutes, 9);
        seconds = numberFlow(seconds, 5);
        flows = true;
      }
      if (clock.classList.contains("is-expanded") && typeof inlineNumber.update !== "function") inlineNumber = numberFlow(inlineNumber, 6);
      if (stage.open && typeof stageNumber.update !== "function") stageNumber = numberFlow(stageNumber, 6);
      return;
    }
    if (flowLoading) return;
    flowLoading = true;
    import(new URL(sources.getAttribute("data-number-flow-src"), document.baseURI).href).then(function () {
      upgradeClock();
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
    until.textContent = text.until.replace("{year}", current.year);
    inlineUnit.textContent = text.seconds;
    stageTitle.textContent = current.phase === "greeting" ? text["new-year"][0] : text.countdown[0];
    stageYear.textContent = String(current.year || "");
  }

  function stopFireworks() {
    window.clearTimeout(stopTimer);
    window.clearTimeout(fadeTimer);
    stopTimer = 0;
    fadeTimer = 0;
    if (effect) effect.stop(true);
    effect = null;
    if (layer) layer.remove();
    layer = null;
    releaseNight();
  }

  function releaseNight() {
    window.clearTimeout(nightTimer);
    nightTimer = 0;
    nightUntil = 0;
    root.removeAttribute("data-celebration-theme");
    if (typeof applyTheme === "function") applyTheme(resolveTheme());
  }

  function forceNight(until) {
    if (until <= Date.now()) { releaseNight(); return; }
    if (nightUntil === until && root.getAttribute("data-celebration-theme") === "dark") return;
    window.clearTimeout(nightTimer);
    nightUntil = until;
    root.setAttribute("data-celebration-theme", "dark");
    if (typeof applyTheme === "function") applyTheme(resolveTheme());
    if (Number.isFinite(until)) nightTimer = window.setTimeout(releaseNight, until - Date.now());
  }

  function eligible(target) {
    var state = calendar.current();
    return !suspended && !document.hidden && !motion.matches && played !== target && dismissed !== target &&
      state.occasion === "new-year" && state.phase === "greeting" && state.target === target &&
      (witnessed !== target || Date.now() < target + 30000);
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
        var until = witnessed === target ? target + 30000 : Date.now() + 5000;
        var duration = Math.max(0, until - Date.now());
        forceNight(until);
        window.clearTimeout(nightTimer);
        nightTimer = 0;
        fadeTimer = window.setTimeout(function () { if (layer) layer.classList.add("is-ending"); }, Math.max(0, duration - 600));
        stopTimer = window.setTimeout(stopFireworks, duration);
      } catch (_) { stopFireworks(); }
    }).catch(function () { /* The greeting does not depend on canvas support. */ });
  }

  function closeStage(restoreFocus) {
    window.clearTimeout(stageCloseTimer);
    stageCloseTimer = 0;
    stageLeaving = false;
    stage.classList.remove("is-leaving");
    if (stage.open) stage.close();
    if (stageLocked && typeof unlockPageScroll === "function") unlockPageScroll();
    stageLocked = false;
    if (restoreFocus && stageOpener && stageOpener.isConnected) stageOpener.focus({ preventScroll: true });
    stageOpener = null;
  }

  function minimizeStage() {
    stageSkipped = current.target;
    compactClosing = 0;
    closeStage(true);
    tick();
  }

  function openStage() {
    if (stage.open || stageSkipped === current.target || !pack() || typeof stage.showModal !== "function") return;
    var busy = Array.prototype.some.call(document.querySelectorAll('[aria-modal="true"], dialog[open]'), function (el) {
      return el !== stage && !el.hidden && el.getClientRects().length;
    });
    if (busy) return;
    stageOpener = document.activeElement;
    stageStatus.textContent = "";
    if (typeof stageNumber.update !== "function") stageNumber.textContent = "10";
    render();
    try {
      stage.showModal();
      if (typeof lockPageScroll === "function") { lockPageScroll(); stageLocked = true; }
      compactClosing = Date.now();
      stage.focus({ preventScroll: true });
    } catch (_) { closeStage(false); }
  }

  function finishStage() {
    if (!stage.open || stageLeaving) return;
    stageLeaving = true;
    /* Preserve the visitor's place as the dialog fades away. */
    if (stageLocked && typeof unlockPageScroll === "function") unlockPageScroll();
    stageLocked = false;
    stage.classList.add("is-leaving");
    stageCloseTimer = window.setTimeout(function () {
      closeStage(false);
    }, motion.matches ? 0 : 600);
  }

  function clearYearPhoto() {
    window.clearTimeout(photoFinishTimer);
    photoFinishTimer = 0;
    if (yearPhoto) yearPhoto.remove();
    yearPhoto = null;
    yearPhotoReady = false;
  }

  function activateYearPhoto() {
    if (suspended || document.hidden || !yearPhoto || !yearPhotoReady || photoFinishTimer || current.phase !== "greeting") return;
    var front = yearPhoto;
    var src = calendar.photo("new-year", "greeting");
    front.classList.add("is-active");
    photoFinishTimer = window.setTimeout(function () {
      photoFinishTimer = 0;
      if (yearPhoto !== front || calendar.current().phase !== "greeting") return;
      photo.src = src;
      function release() { if (yearPhoto === front) clearYearPhoto(); }
      if (typeof photo.decode === "function") photo.decode().then(release, function () {});
      else if (photo.complete) release();
      else photo.addEventListener("load", release, { once: true });
    }, motion.matches ? 0 : 1250);
  }

  function prepareYearPhoto() {
    var src = calendar.photo("new-year", "greeting");
    if (yearPhoto || yearPhotoFailed || photo.getAttribute("src") === src) return;
    var image = document.createElement("img");
    yearPhoto = image;
    image.className = "seasonal-year-photo";
    image.alt = "";
    image.width = 1672;
    image.height = 941;
    image.decoding = "async";
    image.fetchPriority = "high";
    image.setAttribute("aria-hidden", "true");
    function ready() {
      if (yearPhoto !== image) return;
      yearPhotoReady = true;
      activateYearPhoto();
    }
    image.onload = function () {
      if (typeof image.decode === "function") image.decode().then(ready, ready);
      else ready();
    };
    image.onerror = function () { if (yearPhoto === image) { yearPhotoFailed = true; clearYearPhoto(); } };
    photo.parentElement.appendChild(image);
    image.src = src;
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
    if (document.hidden || suspended) return;
    var now = Date.now();
    current = calendar.current();
    var occasion = current.occasion;
    if (occasion) {
      root.setAttribute("data-occasion", occasion);
      if (!pack()) load("content").then(function () { observe(); render(); tick(); }).catch(function () {});
    } else root.removeAttribute("data-occasion");
    if (occasion === "new-year") root.setAttribute("data-new-year-phase", current.phase);
    else root.removeAttribute("data-new-year-phase");
    var remaining = Math.max(0, Math.ceil((current.target - now) / 1000)) || 0;
    if (current.phase === "countdown") {
      witnessed = current.target;
      forceNight(Infinity);
      if (remaining <= 60) prepareYearPhoto();
      if (remaining <= 10) openStage();
    } else if (stage.open) finishStage();
    if (occasion === "new-year" && current.phase === "greeting") {
      var arriving = !nightVisitStarted;
      nightVisitStarted = true;
      if (witnessed === current.target && dismissed !== current.target && now < current.target + 30000) forceNight(current.target + 30000);
      else if (arriving) forceNight(now + 5000);
    }
    if (occasion !== "new-year" && nightUntil) releaseNight();
    var src = calendar.photo(occasion, current.phase);
    if (occasion === "new-year" && current.phase === "greeting" && photo.getAttribute("src") !== src) {
      prepareYearPhoto();
      activateYearPhoto();
    } else if (occasion !== "new-year" || current.phase !== "countdown") {
      if (photo.getAttribute("src") !== src) photo.src = src;
      if (occasion !== "new-year") clearYearPhoto();
    }
    var zero = !compactClosing && witnessed === current.target && current.phase === "greeting" && now < current.target + 1400;
    var settling = !compactClosing && witnessed === current.target && current.phase === "greeting" && now >= current.target + 1400 && now < current.target + 2100;
    var folding = compactClosing && current.phase === "countdown" && now < compactClosing + 700;
    clock.hidden = (current.phase !== "countdown" || (stage.open && !folding)) && !zero && !settling;
    clock.classList.toggle("is-finished", Boolean(settling || folding));
    clock.classList.toggle("is-expanded", current.phase === "countdown" && remaining <= 60 && (remaining > 10 || Boolean(folding)));
    floatClock();
    var signature = [occasion, current.phase, current.year, clock.hidden].join(":");
    if (last !== signature) { last = signature; render(); }
    if (!clock.hidden || stage.open) {
      setNumbers(remaining);
      upgradeClock();
    }
    if (current.phase === "countdown" && remaining <= 60 && !motion.matches && !scripts.fireworks) {
      load("fireworks").catch(function () {});
    }
    celebrate();
    var delay = current.phase === "countdown" ? Math.min(1000, (current.target - now) % 1000 || 1000) :
      zero ? current.target + 1400 - now : settling ? current.target + 2100 - now : current.next - now;
    if (Number.isFinite(delay)) timer = window.setTimeout(tick, Math.max(20, delay));
  }

  stage.addEventListener("cancel", function (event) { event.preventDefault(); minimizeStage(); });
  document.addEventListener("keydown", function (event) {
    if (stage.open && event.key === "Tab") { event.preventDefault(); stage.focus({ preventScroll: true }); return; }
    if (stage.open && event.key === "Escape") { event.preventDefault(); minimizeStage(); return; }
    if (event.key === "Escape" && current.phase === "greeting" && (effect || scripts.fireworks)) {
      dismissed = current.target;
      stopFireworks();
    }
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      window.clearTimeout(timer);
      window.clearTimeout(photoFinishTimer);
      photoFinishTimer = 0;
      stopFireworks();
      closeStage(false);
    }
    else tick();
  });
  window.addEventListener("pagehide", function () {
    suspended = true;
    window.clearTimeout(timer);
    window.clearTimeout(photoFinishTimer);
    photoFinishTimer = 0;
    stopFireworks();
    closeStage(false);
  });
  window.addEventListener("pageshow", function (event) {
    suspended = false;
    if (event.persisted) { played = null; dismissed = null; witnessed = null; nightVisitStarted = false; }
    tick();
  });
  motion.addEventListener("change", function () {
    if (motion.matches) stopFireworks();
    if (flows) { minutes.animated = !motion.matches; seconds.animated = !motion.matches; }
    if (typeof stageNumber.update === "function") stageNumber.animated = !motion.matches;
    if (typeof inlineNumber.update === "function") inlineNumber.animated = !motion.matches;
    tick();
  });
  tick();
})();
