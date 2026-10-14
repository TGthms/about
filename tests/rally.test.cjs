const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function engine() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync('public/js/rally-engine.js', 'utf8'), context);
  return new context.window.RallyEngine();
}
test('match waits for a serve, pauses without movement, and resets on rematch', () => {
  const game = engine();
  game.advance(0.05); assert.equal(game.ball.y, 160);
  game.serve(); game.advance(0.05); assert.ok(game.ball.y > 160);
  game.pause(); const y = game.ball.y;
  game.advance(0.05); assert.equal(game.ball.y, y);
  game.resume(); assert.equal(game.phase, 'playing');
  game.you = 4; game.ai = 3; game.serve();
  assert.equal(game.you, 0); assert.equal(game.ai, 0); assert.equal(game.phase, 'playing');
});
test('paddle catches a fast return once, steers it, and scores a missed ball for the opponent', () => {
  const game = engine(); game.serve();
  game.ball = {x: 335, y: 280, vx: 0, vy: 350};
  game.advance(0.05);
  assert.equal(game.score, 1); assert.ok(game.ball.vy < 0); assert.ok(game.ball.vx > 0);
  game.advance(0.05); assert.equal(game.score, 1);
  game.ball = {x: 500, y: 280, vx: 0, vy: 350};
  for (let i = 0; i < 4; i++) game.advance(0.05);
  assert.equal(game.phase, 'point'); assert.equal(game.ai, 1); assert.equal(game.longest, 1);
  game.advance(0.05); assert.equal(game.ai, 1, 'one point per missed ball');
});
test('opponent is speed-limited, can return a ball, and can be beaten', () => {
  const game = engine(); game.serve();
  game.ball = {x: 500, y: 120, vx: 0, vy: -250}; game.reaction = 0;
  game.advance(0.05);
  assert.ok(game.opponent > 300 && game.opponent < 310, 'no teleporting to the shot');
  game.ball = {x: game.opponent, y: 40, vx: 0, vy: -250}; game.advance(0.05);
  assert.ok(game.ball.vy > 0, 'opponent returns the ball');
  game.ball = {x: 570, y: 0, vx: 0, vy: -250}; game.advance(0.05);
  assert.equal(game.you, 1); assert.equal(game.phase, 'point');
});
test('first to five wins and between-point countdown pauses and resumes safely', () => {
  const game = engine(); game.serve(); game.point('you');
  game.pause(); const time = game.pointTime; game.advance(0.05);
  assert.equal(game.pointTime, time); game.resume(); assert.equal(game.phase, 'point');
  for (let i = 0; i < 45; i++) game.advance(0.05);
  assert.equal(game.phase, 'playing'); assert.equal(game.you, 1);
  game.you = 4; game.point('you'); assert.equal(game.phase, 'ended');
  game.advance(0.05); assert.equal(game.you, 5);
});
test('side rebounds and paddle limits stay inside the court after stalled frames', () => {
  const game = engine(); game.serve();
  game.move(-100); assert.equal(game.paddle, 64);
  game.move(900); assert.equal(game.paddle, 536);
  game.ball = {x: 580, y: 160, vx: 300, vy: 100};
  game.advance(10);
  assert.ok(game.ball.x <= 581); assert.ok(game.ball.vx < 0);
  assert.ok(game.ball.y <= 166, 'long frame is bounded');
  const y = game.ball.y; game.advance(NaN); assert.equal(game.ball.y, y);
});

test('a complete match is winnable with delayed, speed-limited tracking', () => {
  const game = engine(); game.serve();
  let frame = 0, aim = 300;
  while (game.phase !== 'ended' && frame < 7200) {
    // Model a player checking the visible ball every 150ms, without predicting it.
    if (frame % 9 === 0) aim = game.ball.x;
    game.move(game.paddle + Math.max(-6, Math.min(6, aim - game.paddle)));
    game.advance(1 / 60); frame += 1;
  }
  assert.equal(game.phase, 'ended');
  assert.equal(game.you, 5, 'a responsive human-speed paddle can beat the opponent');
});

test('three challenge levels preserve Medium and order the opponent response', () => {
  const game = engine(); assert.equal(game.level, 'medium');
  const medium = {...game.settings};
  game.setLevel('easy'); const easy = {...game.settings};
  game.setLevel('hard'); const hard = {...game.settings};
  assert.ok(easy.speed < medium.speed && medium.speed < hard.speed);
  assert.ok(easy.delay > medium.delay && medium.delay > hard.delay);
  assert.ok(easy.error > medium.error && medium.error > hard.error);
  game.you = 3; game.ai = 2; game.phase = 'playing';
  assert.equal(game.setLevel('medium'), true);assert.equal(game.phase,'ready');assert.equal(game.you,0);assert.equal(game.ai,0);
  assert.equal(game.settings.speed,155);assert.equal(game.settings.delay,.16);
  assert.equal(game.setLevel('__proto__'),false);assert.equal(game.level,'medium');
});

test('non-finite pointer coordinates cannot move the paddle outside the court', () => {
  const game = engine();game.move(320);
  for (const value of [NaN,Infinity,-Infinity]) { game.move(value);assert.equal(game.paddle,320); }
});
