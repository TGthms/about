/* A Pong-style practice break. Nothing moves until the visitor serves. */
(function () {
  "use strict";
  var lightweight = window.SiteRuntime && window.SiteRuntime.lightweight;
  var renderScale = lightweight ? .5 : 2;
  var opener = document.getElementById("rally-open");
  var modal = document.getElementById("rally-modal");
  var canvas = document.getElementById("rally-court");
  if (!opener || !modal || !canvas || !window.RallyEngine) return;
  var ctx = null;
  if (typeof canvas.getContext !== "function") { opener.hidden = true; return; }
  opener.hidden = false;
  var panel = modal.querySelector(".rally-panel");
  var serveButton = document.getElementById("rally-serve");
  var summary = document.getElementById("rally-summary");
  var status = document.getElementById("rally-status");
  var score = document.getElementById("rally-score");
  var bestLabel = document.getElementById("rally-best");
  var opponentScore = document.getElementById("rally-opponent-score");
  var game = new window.RallyEngine();
  var countdown = document.getElementById("rally-countdown");
  var countdownValue = document.getElementById("rally-countdown-value");
  var lastBeat = "", beatAnimation = null;
  var countdownMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  if (countdownMotion && countdownMotion.addEventListener) countdownMotion.addEventListener("change", function () {
    if (countdownMotion.matches && beatAnimation) beatAnimation.cancel();
  });
  function activePhase() { return game.phase === "playing" || game.phase === "point" || game.phase === "resuming"; }
  function updateCountdown() {
    if (!countdown || !countdownValue) return;
    countdown.hidden = game.phase !== "resuming";
    if (countdown.hidden) {
      lastBeat = ""; if (beatAnimation) beatAnimation.cancel(); beatAnimation = null;
      return;
    }
    var beat = String(Math.max(1, Math.min(3, Math.ceil(game.resumeTime / .4))));
    if (beat === lastBeat) return;
    lastBeat = beat; countdownValue.textContent = beat;
    if (beatAnimation) beatAnimation.cancel();
    if (!lightweight && countdownValue.animate && !(countdownMotion && countdownMotion.matches)) {
      beatAnimation = countdownValue.animate([
        { opacity: .45, transform: "translateY(3px)" },
        { opacity: 1, transform: "translateY(0)" }
      ], { duration: 180, easing: "ease-out" });
    }
  }
  var best = 0, open = false, frame = 0, lastTime = null;
  var held = { left: false, right: false };
  var colors;
  var menuPaused = false;
  var celebration = typeof window.createRallyCelebration === "function"
    ? window.createRallyCelebration(canvas.parentElement) : { play: function () {}, clear: function () {} };
  function readBest() {
    best = 0;
    try {
      var saved = localStorage.getItem("timg-rally-best-" + game.level);
      if (saved === null && game.level === "medium") saved = localStorage.getItem("timg-rally-best");
      saved = Number(saved);
      if (Number.isSafeInteger(saved) && saved >= 0) best = saved;
    } catch (_) {}
  }
  function saveBest() {
    try { localStorage.setItem("timg-rally-best-" + game.level, String(best)); } catch (_) {}
  }
  readBest();
  var picker = typeof window.createRallyLevelPicker === "function" ? window.createRallyLevelPicker({
    open: function () { menuPaused = activePhase(); if (menuPaused) pause(); },
    close: function () { if (menuPaused && open && game.phase === "paused") togglePlay(); menuPaused = false; },
    change: function (level) {
      if (level === game.level) return;
      saveBest(); stop(); celebration.clear(); menuPaused = false;
      game.setLevel(level); readBest(); renderCopy(); draw();
    }
  }) : null;

  function copy() {
    var lang = document.documentElement.getAttribute("data-language") || "en";
    return (TRANSLATIONS[lang] || TRANSLATIONS.en).rally;
  }
  function clearInput() { held.left = false; held.right = false; }
  function refreshColors() {
    var css = window.getComputedStyle(canvas);
    colors = { table: css.getPropertyValue("--bg-card").trim(), ink: css.getPropertyValue("--ink").trim(), rule: css.getPropertyValue("--mute").trim(), ball: css.getPropertyValue("--signature-accent").trim() };
  }
  function renderCopy() {
    var words = copy();
    serveButton.disabled = !ctx;
    serveButton.textContent = words[activePhase() ? "pause" : game.phase === "paused" ? "resume" : game.phase === "ended" ? "again" : "serve"];
    var key = game.phase === "ended" ? (game.you === 5 ? "won" : "lost") : game.phase === "point" ? (game.lastPoint === "you" ? "yourPoint" : "theirPoint") : game.phase;
    status.textContent = (!ctx ? words.unavailable : words[key] || words.ready).replace("{you}", String(game.you)).replace("{opponent}", String(game.ai));
    score.textContent = String(game.you);
    opponentScore.textContent = String(game.ai);
    bestLabel.textContent = String(best);
    if (summary) {
      summary.hidden = game.phase !== "ended";
      summary.textContent = game.phase === "ended" ? words.matchLongest.replace("{count}", String(game.longest)) : "";
    }
    updateCountdown();
  }
  function draw() {
    if (!ctx) return;
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    ctx.clearRect(0, 0, 600, 320);
    ctx.fillStyle = colors.table;
    ctx.fillRect(0, 0, 600, 320);
    ctx.strokeStyle = colors.rule;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35;
    ctx.strokeRect(14, 14, 572, 292);
    ctx.setLineDash([4, 7]);
    ctx.beginPath(); ctx.moveTo(14, 160); ctx.lineTo(586, 160); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.ink;
    var hit = game.hit, age = hit ? game.clock - hit.time : 1;
    var pulse = !lightweight && age < .16 && !(countdownMotion && countdownMotion.matches) ? Math.sin(age / .16 * Math.PI) : 0;
    ctx.fillRect(game.paddle - 50 - (hit && hit.side === "you" ? pulse * 2 : 0), 288, 100 + (hit && hit.side === "you" ? pulse * 4 : 0), 7 - (hit && hit.side === "you" ? pulse * 1.5 : 0));
    ctx.globalAlpha = 0.65;
    ctx.fillRect(game.opponent - game.settings.halfWidth - (hit && hit.side === "ai" ? pulse * 2 : 0), 25, game.settings.halfWidth * 2 + (hit && hit.side === "ai" ? pulse * 4 : 0), 7 - (hit && hit.side === "ai" ? pulse * 1.5 : 0));
    ctx.globalAlpha = 1;
    if (!lightweight && hit && age < .2 && !(countdownMotion && countdownMotion.matches)) {
      ctx.globalAlpha = (1 - age / .2) * .45;
      ctx.strokeStyle = colors.ball; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(hit.x, hit.y, 4 + age * 55, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    var waiting = game.phase === "point" || ((game.phase === "paused" || game.phase === "resuming") && game.resumePhase === "point");
    if (waiting) {
      ctx.strokeStyle = colors.rule; ctx.globalAlpha = .25; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(game.ball.x, game.ball.y, 12, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = colors.ball; ctx.globalAlpha = .65; ctx.lineWidth = 1.5;
      var progress = Math.max(0, Math.min(1, 1 - game.pointTime / game.pointDuration));
      ctx.beginPath(); ctx.arc(game.ball.x, game.ball.y, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = colors.ball;
    ctx.beginPath(); ctx.arc(game.ball.x, game.ball.y, 5, 0, Math.PI * 2); ctx.fill();
  }

  function stop() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0; lastTime = null; clearInput();
  }
  function tick(time) {
    frame = 0;
    if (!open || !activePhase()) return;
    if (lightweight && lastTime !== null && time - lastTime < 32) {
      frame = window.requestAnimationFrame(tick);
      return;
    }
    var dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    game.move(game.paddle + ((held.right ? 1 : 0) - (held.left ? 1 : 0)) * 430 * dt);
    var oldPhase = game.phase, oldYou = game.you, oldAi = game.ai;
    game.advance(dt);
    if (game.longest > best) { best = game.longest; bestLabel.textContent = String(best); }
    if (game.you > oldYou) celebration.play(game.phase === "ended");
    if (oldPhase !== game.phase || oldYou !== game.you || oldAi !== game.ai) renderCopy();
    updateCountdown(); draw();
    if (game.phase === "ended") {
      stop(); renderCopy();
      saveBest();
      return;
    }
    frame = window.requestAnimationFrame(tick);
  }
  function pause() {
    celebration.clear();
    if (!activePhase()) return;
    game.pause(); stop(); renderCopy();
  }
  function togglePlay() {
    if (!ctx) return;
    if (activePhase()) { pause(); return; }
    if (game.phase === "paused") game.resume();
    else { celebration.clear(); game.serve(); }
    clearInput(); renderCopy(); draw();
    lastTime = null;
    frame = window.requestAnimationFrame(tick);
  }
  function close() {
    if (!open) return;
    pause(); stop(); open = false;
    saveBest();
    menuPaused = false; if (picker) picker.close();
    function finish() {
      modal.hidden = true;
      if (lightweight) { canvas.width = 1; canvas.height = 1; ctx = null; }
      opener.setAttribute("aria-expanded", "false");
      if (typeof setBackgroundInert === "function") setBackgroundInert(modal, false);
      if (typeof unlockPageScroll === "function") unlockPageScroll();
      opener.focus({ preventScroll: true });
    }
    if (typeof closeSiteDialog === "function") closeSiteDialog(modal, finish);
    else finish();
  }
  opener.addEventListener("click", function () {
    if (open || (modal.classList && modal.classList.contains("is-closing"))) return;
    if (!ctx) {
      canvas.width = 600 * renderScale;
      canvas.height = 320 * renderScale;
      try { ctx = canvas.getContext("2d"); } catch (_) { ctx = null; }
    }
    open = true; modal.hidden = false;
    opener.setAttribute("aria-expanded", "true");
    if (typeof lockPageScroll === "function") lockPageScroll();
    if (typeof setBackgroundInert === "function") setBackgroundInert(modal, true);
    panel.scrollTop = 0;
    refreshColors(); renderCopy(); draw();
    (ctx ? serveButton : modal.querySelector(".erhu-modal__close")).focus({ preventScroll: true });
  });
  modal.querySelectorAll("[data-rally-close]").forEach(function (button) { button.addEventListener("click", close); });
  serveButton.addEventListener("click", togglePlay);
  function point(event) {
    var rect = canvas.getBoundingClientRect();
    if (!open || rect.width <= 0) return;
    game.move((event.clientX - rect.left) / rect.width * 600);
    if (game.phase !== "playing") draw();
  }
  canvas.addEventListener("pointerdown", function (event) {
    if (event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId); point(event);
    canvas.focus({ preventScroll: true });
  });
  canvas.addEventListener("pointermove", function (event) {
    if (event.pointerType === "mouse" || canvas.hasPointerCapture(event.pointerId)) point(event);
  });
  ["left", "right"].forEach(function (direction) {
    var button = document.getElementById("rally-" + direction);
    var pointerMoved = false;
    button.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) return;
      held[direction] = true; pointerMoved = activePhase();
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener("pointerup", function () { held[direction] = false; });
    button.addEventListener("pointercancel", clearInput);
    button.addEventListener("lostpointercapture", clearInput);
    // Native click also provides discrete movement to assistive technology.
    button.addEventListener("click", function () {
      if (!pointerMoved) { game.move(game.paddle + (direction === "left" ? -36 : 36)); draw(); }
      pointerMoved = false;
    });
  });
  document.addEventListener("keydown", function (event) {
    if (!open || event.defaultPrevented) return;
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key === "Tab") {
      var nodes = Array.from(modal.querySelectorAll('button:not([disabled]), [tabindex="0"]')).filter(function (el) { return !el.getClientRects || el.getClientRects().length > 0; });
      var first = nodes[0], last = nodes[nodes.length - 1];
      if (!nodes.includes(document.activeElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault(); (event.shiftKey ? last : first).focus();
      }
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      var direction = event.key === "ArrowLeft" ? "left" : "right";
      held[direction] = true;
      if (!activePhase()) { game.move(game.paddle + (direction === "left" ? -20 : 20)); draw(); }
    }
    if (event.code === "Space" && !event.repeat) {
      // Buttons retain native Space activation; elsewhere Space serves/pauses.
      if (document.activeElement.tagName === "BUTTON") return;
      event.preventDefault(); togglePlay();
    }
  });
  document.addEventListener("keyup", function (event) {
    if (event.key === "ArrowLeft") held.left = false;
    if (event.key === "ArrowRight") held.right = false;
  });
  window.addEventListener("blur", pause);
  document.addEventListener("visibilitychange", function () { if (document.hidden) pause(); });
  new MutationObserver(function () {
    if (!open) return;
    refreshColors(); renderCopy(); draw();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-language", "data-theme"] });
})();
