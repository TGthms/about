/* Annual occasions use the visitor's local calendar. */
(function (root) {
  "use strict";

  function easter(year) {
    var a = year % 19, b = Math.floor(year / 100), c = year % 100;
    var d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var n = h + l - 7 * m + 114;
    return new Date(year, Math.floor(n / 31) - 1, n % 31 + 1);
  }

  function sameDay(a, b) {
    return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function state(now) {
    var year = now.getFullYear(), month = now.getMonth(), day = now.getDate();
    var midnight = new Date(year, month, day + 1).getTime();
    var result = { occasion: "", next: midnight };
    if (month === 11 && day === 31) {
      var start = midnight - 600000;
      if (now.getTime() < start) result.next = start;
      else return { occasion: "new-year", phase: "countdown", target: midnight, year: year + 1, next: midnight };
    }
    if (month === 0 && day === 1) {
      return { occasion: "new-year", phase: "greeting", target: new Date(year, 0, 1).getTime(), year: year, next: midnight };
    }
    if (month === 11 && day === 25) result.occasion = "christmas";
    var sunday = easter(year);
    if (sameDay(now, sunday)) result.occasion = "easter";
    var friday = new Date(year, sunday.getMonth(), sunday.getDate() - 2);
    if (sameDay(now, friday)) result.occasion = "good-friday";
    var palm = new Date(year, sunday.getMonth(), sunday.getDate() - 7);
    if (sameDay(now, palm)) result.occasion = "palm-sunday";
    var thanksgiving = 22 + (4 - new Date(year, 10, 22).getDay() + 7) % 7;
    if (month === 10 && day === thanksgiving) result.occasion = "thanksgiving";
    return result;
  }

  var previews = ["christmas", "good-friday", "easter", "palm-sunday", "thanksgiving", "new-year", "countdown", "final-minute", "fireworks"];
  function photo(occasion, phase) {
    if (occasion === "new-year" && phase === "greeting") return "assets/seasonal/new-year.webp";
    return ["christmas", "good-friday", "easter", "thanksgiving", "palm-sunday"].indexOf(occasion) !== -1 ?
      "assets/seasonal/" + occasion + ".webp" : "assets/main-modern.webp";
  }
  function resolve(now, preview, started) {
    if (previews.indexOf(preview) === -1) return state(now);
    if (preview === "countdown" || preview === "final-minute" || preview === "fireworks") {
      var target = started + (preview === "countdown" ? 75000 : preview === "final-minute" ? 60000 : 0);
      return { occasion: "new-year", phase: now.getTime() < target ? "countdown" : "greeting", target: target, year: new Date(started).getFullYear() + 1, next: Infinity };
    }
    return { occasion: preview, phase: "greeting", target: preview === "new-year" ? new Date(now.getFullYear(), 0, 1).getTime() : undefined, year: now.getFullYear(), next: Infinity };
  }

  var api = { easter: easter, state: state, resolve: resolve, photo: photo };
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    api.preview = new URLSearchParams(root.location.search).get("occasion");
    api.started = Date.now();
    api.current = function () { return resolve(new Date(), api.preview, api.started); };
    root.SeasonCalendar = api;
    var initial = api.current();
    if (initial.occasion) document.documentElement.setAttribute("data-occasion", initial.occasion);
    if (initial.occasion === "new-year") document.documentElement.setAttribute("data-new-year-phase", initial.phase);
    var preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "image";
    preload.href = photo(initial.occasion, initial.phase);
    preload.fetchPriority = "high";
    document.head.appendChild(preload);
  }
})(typeof window === "object" ? window : this);
