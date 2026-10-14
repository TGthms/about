/* Paper falls inside the table after a point or a match. */
(function () {
  "use strict";
  window.createRallyCelebration = function (table) {
    var layer = null, timer = 0;
    var motion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    function clear() {
      if (timer) window.clearTimeout(timer);
      timer = 0;
      if (layer) layer.remove();
      layer = null;
    }
    function play(win) {
      clear();
      if (!table || (motion && motion.matches)) return;
      layer = document.createElement("div");
      layer.className = "rally-celebration";
      layer.setAttribute("aria-hidden", "true");
      var colors = ["#e07a5f", "#4d93d2", "#f2bb45", "#58aa83", "#aa7bc8", "#42b3b6", "#e982a9"];
      var count = win ? 42 : 20;
      var fall = (table.clientHeight || 320) * 1.12;
      for (var i = 0; i < count; i++) {
        var paper = document.createElement("span");
        paper.className = "rally-paper";
        paper.style.setProperty("--paper-x", (8 + (i + .5) / count * 84 + (Math.random() - .5) * 3) + "%");
        paper.style.setProperty("--paper-drift", (Math.random() - .5) * (win ? 70 : 44) + "px");
        paper.style.setProperty("--paper-fall", fall + "px");
        paper.style.setProperty("--paper-turn", (Math.random() - .5) * 220 + "deg");
        paper.style.setProperty("--paper-width", (win ? 5 : 4) + Math.random() * 2 + "px");
        paper.style.setProperty("--paper-height", (win ? 13 : 10) + Math.random() * 4 + "px");
        paper.style.setProperty("--paper-color", colors[i % colors.length]);
        paper.style.setProperty("--paper-duration", (win ? 2.5 : 1.5) + Math.random() * (win ? .6 : .35) + "s");
        paper.style.setProperty("--paper-delay", Math.random() * (win ? .4 : .18) + "s");
        layer.appendChild(paper);
      }
      table.appendChild(layer);
      timer = window.setTimeout(clear, win ? 3700 : 2200);
    }
    if (motion && motion.addEventListener) motion.addEventListener("change", function () { if (motion.matches) clear(); });
    return { play: play, clear: clear };
  };
})();
