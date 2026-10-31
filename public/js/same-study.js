/* A silent, bounded model of a SAME header and Signal Lab's burst comparison. */
(function (root, factory) {
  "use strict";
  var model = factory();
  if (typeof module === "object" && module.exports) module.exports = model;
  else model.init(root.document);
}(typeof window !== "undefined" ? window : this, function () {
  "use strict";
  var choices = { event: ["RWT", "DMO"], area: ["006037", "026163", "048453"], duration: ["0015", "0030", "0100"] };
  function header(values) {
    var safe = {};
    Object.keys(choices).forEach(function (key) {
      safe[key] = choices[key].indexOf(values[key]) >= 0 ? values[key] : choices[key][0];
    });
    return "ZCZC-EAS-" + safe.event + "-" + safe.area + "+" + safe.duration + "-3021800-SIGLAB  -";
  }
  function bits(character) {
    var byte = String(character).charCodeAt(0);
    if (!Number.isFinite(byte) || byte > 127) return [];
    var result = [];
    for (var i = 0; i < 8; i++) result.push((byte >> i) & 1);
    return result;
  }
  function parts(values) {
    var text = header(values);
    return [
      ['start', text.slice(0, 4)], ['', '-'], ['origin', 'EAS'], ['', '-'],
      ['event', text.slice(9, 12)], ['', '-'], ['area', text.slice(13, 19)], ['', '+'],
      ['duration', text.slice(20, 24)], ['', '-'], ['issued', '3021800'], ['', '-'], ['sender', 'SIGLAB  '], ['', '-']
    ];
  }
  function checkChallenge(values) {
    return ['area', 'duration', 'event'].map(function (key) {
      return values[key] === {area: '026163', duration: '0030', event: 'DMO'}[key];
    });
  }
  function compare(values) {
    var count = values.filter(function (value) { return value !== "missing"; }).length;
    var conflict = values.indexOf("different") >= 0 && values.indexOf("matching") >= 0;
    return { count: count, state: conflict ? "conflict" : count === 3 ? "matched" : "incomplete" };
  }
  function init(document) {
    if (!document) return;
    document.querySelectorAll("[data-same-study]").forEach(function (lab) {
      if (lab.hasAttribute("data-study-ready")) return;
      var words;
      try { words = JSON.parse(lab.getAttribute("data-study-copy")); } catch (_) { return; }
      var inputs = lab.querySelectorAll("[data-study-input]");
      var fields = lab.querySelectorAll("[data-study-field]");
      var burstInputs = lab.querySelectorAll("[data-study-burst]");
      var selected = "event";
      var line = lab.querySelector('[data-study-header]');
      var tokens = [];
      parts({}).forEach(function (part) {
        var token = document.createElement('span');
        token.textContent = part[1];
        if (part[0]) token.setAttribute('data-study-token', part[0]);
        tokens.push(token);
      });
      line.textContent = '';
      tokens.forEach(function (token) { line.appendChild(token); });
      function update() {
        var values = {};
        inputs.forEach(function (input) { values[input.getAttribute("data-study-input")] = input.value; });
        parts(values).forEach(function (part, i) {
          tokens[i].textContent = part[1];
          if (part[0] === selected) tokens[i].setAttribute('data-selected', '');
          else tokens[i].removeAttribute('data-selected');
        });
        fields.forEach(function (button) {
          button.setAttribute("aria-pressed", String(button.getAttribute("data-study-field") === selected));
        });
        lab.querySelector("[data-study-detail]").textContent = words.fields[selected] + (words.values[values[selected]] ? " " + words.values[values[selected]] : "");
        var character = lab.querySelector("[data-study-character]").value;
        var byte = bits(character);
        lab.querySelectorAll("[data-study-bit]").forEach(function (element, i) {
          element.textContent = byte[i];
          element.setAttribute("data-value", byte[i]);
        });
        lab.querySelector("[data-study-byte]").textContent = "0x" + character.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
        lab.querySelector("[data-study-wire]").textContent = byte.join(" ");
        var bursts = [];
        burstInputs.forEach(function (input) { bursts.push(input.value); });
        var result = compare(bursts);
        var status = lab.querySelector("[data-study-result]");
        status.setAttribute("data-state", result.state);
        status.textContent = words.results[result.state].replace("{count}", result.count);
      }
      inputs.forEach(function (input) { input.addEventListener("change", function () {
        selected = input.getAttribute("data-study-input"); update();
        var token = line.querySelector('[data-study-token="' + selected + '"]');
        var view = document.defaultView;
        if (token && token.animate && view && !(view.SiteRuntime && view.SiteRuntime.lightweight) &&
            !(view.matchMedia && view.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
          token.animate([{opacity: .45}, {opacity: 1}], {duration: 500, easing: 'ease-out'});
        }
      }); });
      fields.forEach(function (button) { button.addEventListener("click", function () { selected = button.getAttribute("data-study-field"); update(); }); });
      burstInputs.forEach(function (input) { input.addEventListener("change", update); });
      lab.querySelector("[data-study-character]").addEventListener("change", update);
      var quiz = lab.querySelector('[data-study-challenge]');
      if (quiz) quiz.querySelector('button').addEventListener('click', function () {
        var values = {};
        quiz.querySelectorAll('select').forEach(function (input) { values[input.getAttribute('data-quiz-field')] = input.value; });
        var results = checkChallenge(values);
        var count = results.filter(Boolean).length;
        quiz.querySelector('[data-study-answers]').textContent = words.quizFeedback.replace('{count}', count) + ' ' + words.quizExplanation;
      });
      lab.querySelector("[data-study-reset]").addEventListener("click", function () {
        inputs.forEach(function (input) { input.selectedIndex = 0; });
        burstInputs.forEach(function (input) { input.selectedIndex = 0; });
        lab.querySelector("[data-study-character]").selectedIndex = 0;
        if (quiz) { quiz.querySelectorAll('select').forEach(function (input) { input.selectedIndex = 0; }); quiz.querySelector('[data-study-answers]').textContent = ''; }
        selected = "event"; update();
      });
      update();
      lab.querySelectorAll("[data-study-enhanced]").forEach(function (node) { node.hidden = false; });
      lab.querySelector("[data-study-fallback]").hidden = true;
      lab.setAttribute("data-study-ready", "");
    });
  }
  return { header: header, parts: parts, checkChallenge: checkChallenge, bits: bits, compare: compare, init: init };
}));
