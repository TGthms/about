/* A Pong-style practice break. Nothing moves until the visitor serves. */
(function () {
  "use strict";
  var opener = document.getElementById("rally-open");
  var modal = document.getElementById("rally-modal");
  var canvas = document.getElementById("rally-court");
  if (!opener || !modal || !canvas || !window.RallyEngine) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) { opener.hidden = true; return; }
  opener.hidden = false;
  var panel = modal.querySelector(".rally-panel");
  var serveButton = document.getElementById("rally-serve");
  var status = document.getElementById("rally-status");
  var score = document.getElementById("rally-score");
  var bestLabel = document.getElementById("rally-best");
  var opponentScore = document.getElementById("rally-opponent-score");
  var game = new window.RallyEngine();
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
    open: function () { menuPaused = game.phase === "playing" || game.phase === "point"; if (menuPaused) pause(); },
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
    serveButton.textContent = words[game.phase === "playing" || game.phase === "point" ? "pause" : game.phase === "paused" ? "resume" : game.phase === "ended" ? "again" : "serve"];
    var key = game.phase === "ended" ? (game.you === 5 ? "won" : "lost") : game.phase === "point" ? (game.lastPoint === "you" ? "yourPoint" : "theirPoint") : game.phase;
    status.textContent = words[key].replace("{you}", String(game.you)).replace("{opponent}", String(game.ai));
    score.textContent = String(game.you);
    opponentScore.textContent = String(game.ai);
    bestLabel.textContent = String(best);
  }
  function draw() {
    ctx.setTransform(2, 0, 0, 2, 0, 0);
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
    ctx.fillRect(game.paddle - 50, 288, 100, 7);
    ctx.globalAlpha = 0.65;
    ctx.fillRect(game.opponent - game.settings.halfWidth, 25, game.settings.halfWidth * 2, 7);
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.ball;
    if (game.phase !== "point" && game.phase !== "ended") {
      ctx.beginPath(); ctx.arc(game.ball.x, game.ball.y, 5, 0, Math.PI * 2); ctx.fill();
    }
  }
  function stop() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0; lastTime = null; clearInput();
  }
  function tick(time) {
    frame = 0;
    if (!open || (game.phase !== "playing" && game.phase !== "point")) return;
    var dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    game.move(game.paddle + ((held.right ? 1 : 0) - (held.left ? 1 : 0)) * 430 * dt);
    var oldPhase = game.phase, oldYou = game.you, oldAi = game.ai;
    game.advance(dt);
    if (game.longest > best) { best = game.longest; bestLabel.textContent = String(best); }
    if (game.you > oldYou) celebration.play(game.phase === "ended");
    if (oldPhase !== game.phase || oldYou !== game.you || oldAi !== game.ai) renderCopy();
    draw();
    if (game.phase === "ended") {
      stop(); renderCopy();
      saveBest();
      return;
    }
    frame = window.requestAnimationFrame(tick);
  }
  function pause() {
    celebration.clear();
    if (game.phase !== "playing" && game.phase !== "point") return;
    game.pause(); stop(); renderCopy();
  }
  function togglePlay() {
    if (game.phase === "playing" || game.phase === "point") { pause(); return; }
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
    modal.hidden = true;
    opener.setAttribute("aria-expanded", "false");
    if (typeof setBackgroundInert === "function") setBackgroundInert(modal, false);
    if (typeof unlockPageScroll === "function") unlockPageScroll();
    opener.focus({ preventScroll: true });
  }
  opener.addEventListener("click", function () {
    if (open) return;
    open = true; modal.hidden = false;
    opener.setAttribute("aria-expanded", "true");
    if (typeof lockPageScroll === "function") lockPageScroll();
    if (typeof setBackgroundInert === "function") setBackgroundInert(modal, true);
    panel.scrollTop = 0;
    refreshColors(); renderCopy(); draw();
    serveButton.focus({ preventScroll: true });
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
      held[direction] = true; pointerMoved = game.phase === "playing" || game.phase === "point";
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
      if (game.phase !== "playing") { game.move(game.paddle + (direction === "left" ? -20 : 20)); draw(); }
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
