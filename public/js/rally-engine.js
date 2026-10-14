/* A small, deterministic Pong match; the opponent predicts rebounds but has
   reaction delay, imperfect aim, and a limited speed. No network is involved. */
(function () {
  "use strict";
  function clamp(x, min, max) { return Math.max(min, Math.min(max, x)); }
  function folded(x) {
    var value = ((x - 19) % 1124 + 1124) % 1124;
    return 19 + (value > 562 ? 1124 - value : value);
  }
  var LEVELS = {
    easy: { speed: 110, boost: 20, delay: .24, error: 42, lookAhead: .1, halfWidth: 50, serveSpeed: 185, cap: 350, gain: 12 },
    medium: { speed: 155, boost: 25, delay: .16, error: 34, lookAhead: .2, halfWidth: 43, serveSpeed: 205, cap: 410, gain: 15 },
    hard: { speed: 235, boost: 40, delay: .09, error: 18, lookAhead: .45, halfWidth: 43, serveSpeed: 225, cap: 440, gain: 18 }
  };
  function RallyEngine(level) {
    this.level = Object.prototype.hasOwnProperty.call(LEVELS, level) ? level : "medium";
    this.settings = LEVELS[this.level];
    this.paddle = 300; this.opponent = 300; this.aim = 300;
    this.ball = {x: 300, y: 160, vx: 90, vy: 205};
    this.score = 0; this.longest = 0; this.you = 0; this.ai = 0;
    this.phase = "ready"; this.resumePhase = "playing";
    this.clock = 0; this.reaction = 0; this.pointTime = 0; this.lastPoint = "you";
  }
  RallyEngine.prototype.setLevel = function (level) {
    if (!Object.prototype.hasOwnProperty.call(LEVELS, level) || level === this.level) return false;
    this.level = level; this.settings = LEVELS[level];
    this.serve(); this.phase = "ready";
    return true;
  };
  RallyEngine.prototype.move = function (x) { if (Number.isFinite(x)) this.paddle = clamp(x, 64, 536); };
  RallyEngine.prototype.serve = function () {
    this.you = 0; this.ai = 0; this.longest = 0; this.clock = 0;
    this.lastPoint = "you"; this.nextBall();
  };
  RallyEngine.prototype.nextBall = function () {
    this.score = 0; this.paddle = 300; this.opponent = 300; this.aim = 300; this.reaction = this.settings.delay;
    var odd = (this.you + this.ai) % 2;
    this.ball = {x: 300, y: 160, vx: odd ? -90 : 90, vy: (this.lastPoint === "you" ? 1 : -1) * this.settings.serveSpeed};
    this.phase = "playing";
  };
  RallyEngine.prototype.pause = function () {
    if (this.phase !== "playing" && this.phase !== "point") return;
    this.resumePhase = this.phase; this.phase = "paused";
  };
  RallyEngine.prototype.resume = function () { if (this.phase === "paused") this.phase = this.resumePhase; };
  RallyEngine.prototype.point = function (winner) {
    this[winner === "you" ? "you" : "ai"] += 1;
    this.lastPoint = winner; this.pointTime = winner === "you" ? 2.2 : 1.1;
    this.phase = this.you === 5 || this.ai === 5 ? "ended" : "point";
  };
  RallyEngine.prototype.advance = function (seconds) {
    if ((this.phase !== "playing" && this.phase !== "point") || !Number.isFinite(seconds) || seconds <= 0) return;
    var remaining = Math.min(seconds, 0.05);
    while (remaining > 0 && (this.phase === "playing" || this.phase === "point")) {
      var dt = Math.min(remaining, 1 / 240); remaining -= dt; this.clock += dt;
      if (this.phase === "point") {
        this.pointTime -= dt;
        if (this.pointTime <= 0) this.nextBall();
        continue;
      }
      var ball = this.ball, oldY = ball.y;
      this.reaction -= dt;
      if (this.reaction <= 0) {
        this.reaction = this.settings.delay;
        var arrival = ball.vy < 0 ? Math.min(this.settings.lookAhead, (37 - ball.y) / ball.vy) : 0;
        this.aim = ball.vy < 0
          ? clamp(folded(ball.x + ball.vx * arrival) + Math.sin(this.clock * 2.3) * this.settings.error, 57, 543)
          : 300;
      }
      var aiStep = (this.settings.speed + Math.min(this.score * 2, this.settings.boost)) * dt;
      this.opponent += clamp(this.aim - this.opponent, -aiStep, aiStep);
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < 19) { ball.x = 38 - ball.x; ball.vx = Math.abs(ball.vx); }
      if (ball.x > 581) { ball.x = 1162 - ball.x; ball.vx = -Math.abs(ball.vx); }
      var playerHit = ball.vy > 0 && oldY <= 283 && ball.y >= 283 && Math.abs(ball.x - this.paddle) <= 55;
      var aiHit = ball.vy < 0 && oldY >= 37 && ball.y <= 37 && Math.abs(ball.x - this.opponent) <= this.settings.halfWidth + 5;
      if (playerHit || aiHit) {
        var paddle = playerHit ? this.paddle : this.opponent;
        var angle = clamp((ball.x - paddle) / (playerHit ? 50 : this.settings.halfWidth), -1, 1) * 1.05;
        var speed = Math.min(this.settings.cap, 230 + this.score * this.settings.gain);
        ball.y = playerHit ? 566 - ball.y : 74 - ball.y;
        ball.vx = Math.sin(angle) * speed;
        ball.vy = (playerHit ? -1 : 1) * Math.cos(angle) * speed;
        if (playerHit) { this.score += 1; this.longest = Math.max(this.longest, this.score); }
      }
      if (ball.y > 325) this.point("ai");
      else if (ball.y < -5) this.point("you");
    }
  };
  window.RallyEngine = RallyEngine;
})();
