/**
 * GitHub contribution calendar popover on the GitHub link card.
 * Adapted from Great UI GithubCard (MIT) by Saurabh Sharma —
 * https://github.com/Saurabh-2607/GreatUI
 *
 * Public contribution counts come from github-contributions-api.jogruber.de.
 */
(function () {
  "use strict";

  var USERNAME = "TGthms";
  var PROFILE_URL = "https://github.com/" + USERNAME;
  var CACHE_KEY = "timg-gh-card-v1";
  var CACHE_MS = 60 * 60 * 1000;
  var EMPTY_DAYS = 119;
  var MAX_TILT = 5;

  var wrap = null;
  var popover = null;
  var card = null;
  var cal = null;
  var tip = null;
  var meta = null;
  var nameEl = null;
  var avatarEl = null;
  var open = false;
  var reduced = false;
  var canHover = false;
  var remoteStarted = false;
  var remoteReady = false;
  var data = {
    name: "Tim G",
    avatarUrl: PROFILE_URL + ".png?size=96",
    days: [],
    total: 0,
    year: new Date().getFullYear(),
  };

  var tiltX = 0;
  var tiltY = 0;
  var curX = 0;
  var curY = 0;
  var tiltRaf = 0;
  var tilting = false;

  function prefersReduced() {
    return typeof systemPrefersReducedMotion === "function"
      ? systemPrefersReducedMotion()
      : false;
  }

  function hoverOk() {
    return Boolean(
      window.matchMedia &&
        window.matchMedia("(hover: hover) and (pointer: fine)").matches
    );
  }

  function locale() {
    var lang = document.documentElement.getAttribute("data-language") || "en";
    if (lang === "zh") return "zh-Hans";
    if (lang === "ja") return "ja";
    if (lang === "es") return "es";
    return "en";
  }

  function copy(key) {
    var lang = document.documentElement.getAttribute("data-language") || "en";
    var pack =
      typeof TRANSLATIONS === "object"
        ? TRANSLATIONS[lang] || TRANSLATIONS.en
        : null;
    var fromPack = pack && pack.links && pack.links.githubCard && pack.links.githubCard[key];
    if (typeof fromPack === "string") return fromPack;
    var fallback = {
      contributions: "{count} contributions in {year}",
      day: "{count} on {date}",
      loading: "Loading contributions…",
    };
    return fallback[key] || "";
  }

  function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, function (_, k) {
      return vars[k] == null ? "" : String(vars[k]);
    });
  }

  function formatCount(n) {
    try {
      return Number(n).toLocaleString(locale());
    } catch (_) {
      return String(n);
    }
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso + "T00:00:00");
      return d.toLocaleDateString(locale(), {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (_) {
      return iso;
    }
  }

  function emptyDays() {
    var out = [];
    var today = Date.now();
    for (var i = EMPTY_DAYS - 1; i >= 0; i--) {
      var d = new Date(today - i * 86400000);
      out.push({
        date: d.toISOString().slice(0, 10),
        count: 0,
        level: 0,
      });
    }
    return out;
  }

  function clampLevel(level) {
    var n = Number(level) || 0;
    if (n < 0) return 0;
    if (n > 4) return 4;
    return n;
  }

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || Date.now() - parsed.ts > CACHE_MS) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeCache(payload) {
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          ts: Date.now(),
          name: payload.name,
          avatarUrl: payload.avatarUrl,
          days: payload.days,
          total: payload.total,
          year: payload.year,
        })
      );
    } catch (_) {
      /* private mode */
    }
  }

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function buildPopover() {
    popover = el("div", "github-popover");
    popover.setAttribute("aria-hidden", "true");

    card = el("div", "github-popover__card");

    var head = el("div", "github-popover__head");
    avatarEl = el("img", "github-popover__avatar");
    avatarEl.alt = "";
    avatarEl.width = 44;
    avatarEl.height = 44;
    avatarEl.decoding = "async";

    var identity = el("div", "github-popover__identity");
    nameEl = el("span", "github-popover__name");
    nameEl.textContent = data.name;
    var user = el("span", "github-popover__user");
    user.textContent = "@" + USERNAME;
    identity.appendChild(nameEl);
    identity.appendChild(user);
    head.appendChild(avatarEl);
    head.appendChild(identity);

    cal = el("div", "github-cal");
    cal.setAttribute("aria-hidden", "true");
    tip = el("div", "github-cal__tip");
    cal.appendChild(tip);

    meta = el("span", "github-popover__meta");
    meta.textContent = copy("loading");

    card.appendChild(head);
    card.appendChild(cal);
    card.appendChild(meta);
    popover.appendChild(card);
    wrap.appendChild(popover);
  }

  function paintDays() {
    if (!cal) return;
    var existing = cal.querySelectorAll(".github-cal__cell");
    existing.forEach(function (node) {
      node.remove();
    });
    var days = data.days.length ? data.days : emptyDays();
    var frag = document.createDocumentFragment();
    for (var i = 0; i < days.length; i++) {
      var day = days[i];
      var cell = el("div", "github-cal__cell");
      cell.setAttribute("data-level", String(clampLevel(day.level)));
      cell.setAttribute("data-date", day.date || "");
      cell.setAttribute("data-count", String(day.count || 0));
      frag.appendChild(cell);
    }
    cal.insertBefore(frag, tip);
    refreshGithubCardCopy();
  }

  function refreshGithubCardCopy() {
    if (!meta) return;
    if (!remoteReady) {
      meta.textContent = copy("loading");
    } else {
      meta.textContent = fill(copy("contributions"), {
        count: formatCount(data.total),
        year: String(data.year),
      });
    }
    if (nameEl) nameEl.textContent = data.name;
    if (remoteStarted && avatarEl && data.avatarUrl && avatarEl.getAttribute("src") !== data.avatarUrl) {
      avatarEl.src = data.avatarUrl;
    }
  }

  function ensureRemote() {
    if (remoteStarted) return;
    remoteStarted = true;
    if (avatarEl && data.avatarUrl && !avatarEl.getAttribute("src")) {
      avatarEl.src = data.avatarUrl;
    }
    loadRemote();
  }

  function hideTip() {
    if (tip) tip.classList.remove("is-on");
  }

  function showTip(cell) {
    if (!tip || !cal || !cell) return;
    var iso = cell.getAttribute("data-date");
    if (!iso) {
      hideTip();
      return;
    }
    var count = Number(cell.getAttribute("data-count") || 0);
    tip.textContent = fill(copy("day"), {
      count: formatCount(count),
      date: formatDate(iso),
    });
    var calRect = cal.getBoundingClientRect();
    var cellRect = cell.getBoundingClientRect();
    tip.style.left = cellRect.left - calRect.left + cellRect.width / 2 + "px";
    tip.style.top = cellRect.top - calRect.top + "px";
    tip.classList.add("is-on");
  }

  function placePopover() {
    if (!popover || !wrap) return;
    var wrapRect = wrap.getBoundingClientRect();
    var height = popover.offsetHeight || 240;
    if (wrapRect.top < height + 16) popover.classList.add("is-below");
    else popover.classList.remove("is-below");
  }

  function setOpen(next) {
    if (!wrap || !popover) return;
    open = Boolean(next);
    wrap.classList.toggle("is-open", open);
    if (open) {
      ensureRemote();
      placePopover();
    } else {
      hideTip();
      tiltX = 0;
      tiltY = 0;
      if (!tiltRaf) startTilt();
    }
  }

  function startTilt() {
    if (reduced || !card) return;
    if (tiltRaf) return;
    tiltRaf = window.requestAnimationFrame(tickTilt);
  }

  function tickTilt() {
    curX += (tiltX - curX) * 0.18;
    curY += (tiltY - curY) * 0.18;
    var pctY = (curY + 20) / 40;
    var pctX = (curX + 20) / 40;
    var rotX = MAX_TILT - pctY * (2 * MAX_TILT);
    var rotY = -MAX_TILT + pctX * (2 * MAX_TILT);
    if (Math.abs(rotX) < 0.02) rotX = 0;
    if (Math.abs(rotY) < 0.02) rotY = 0;
    card.style.transform = "rotateX(" + rotX.toFixed(2) + "deg) rotateY(" + rotY.toFixed(2) + "deg)";
    var moving =
      tilting || Math.abs(tiltX - curX) > 0.04 || Math.abs(tiltY - curY) > 0.04;
    if (moving) {
      tiltRaf = window.requestAnimationFrame(tickTilt);
    } else {
      tiltRaf = 0;
      if (!tilting) card.style.transform = "rotateX(0deg) rotateY(0deg)";
    }
  }

  function onCardMove(e) {
    if (reduced || !card) return;
    var rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    tiltX = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 20;
    tiltY = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * 20;
    tilting = true;
    startTilt();
  }

  function onCardLeave() {
    tilting = false;
    tiltX = 0;
    tiltY = 0;
    startTilt();
  }

  function bind() {
    wrap.addEventListener("pointerenter", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      if (!canHover) return;
      setOpen(true);
    });
    wrap.addEventListener("pointerleave", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      setOpen(false);
    });
    wrap.addEventListener("focusin", function (e) {
      if (canHover) {
        setOpen(true);
        return;
      }
      if (e.target && e.target.matches && e.target.matches(":focus-visible")) {
        setOpen(true);
      }
    });
    wrap.addEventListener("focusout", function (e) {
      if (wrap.contains(e.relatedTarget)) return;
      if (canHover && wrap.matches(":hover")) return;
      setOpen(false);
    });

    card.addEventListener("mousemove", onCardMove);
    card.addEventListener("mouseleave", onCardLeave);

    cal.addEventListener("pointerover", function (e) {
      var cell = e.target.closest(".github-cal__cell");
      if (!cell || !cal.contains(cell)) return;
      showTip(cell);
    });
    cal.addEventListener("pointerout", function (e) {
      var cell = e.target.closest(".github-cal__cell");
      if (!cell) return;
      if (e.relatedTarget && cell.contains(e.relatedTarget)) return;
      hideTip();
    });

    window.addEventListener("keydown", function (e) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    });
  }

  function applyPayload(payload) {
    if (!payload) return;
    if (payload.name) data.name = payload.name;
    if (payload.avatarUrl) data.avatarUrl = payload.avatarUrl;
    if (payload.days && payload.days.length) data.days = payload.days;
    if (typeof payload.total === "number") data.total = payload.total;
    if (payload.year) data.year = payload.year;
    remoteReady = true;
    paintDays();
  }

  function loadRemote() {
    var cached = readCache();
    if (cached) {
      applyPayload(cached);
      return;
    }

    fetch("https://api.github.com/users/" + USERNAME)
      .then(function (res) {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(function (json) {
        data.name = json.name || json.login || data.name;
        data.avatarUrl = json.avatar_url || data.avatarUrl;
        refreshGithubCardCopy();
      })
      .catch(function () {
        /* keep fallbacks */
      });

    fetch("https://github-contributions-api.jogruber.de/v4/" + USERNAME)
      .then(function (res) {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(function (json) {
        var list = Array.isArray(json.contributions) ? json.contributions : [];
        var today = new Date();
        today.setHours(23, 59, 59, 999);
        var past = list.filter(function (item) {
          return item && item.date && new Date(item.date) <= today;
        });
        past.sort(function (a, b) {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
        data.days = past.slice(-EMPTY_DAYS).map(function (item) {
          return {
            date: item.date,
            count: Number(item.count) || 0,
            level: clampLevel(item.level),
          };
        });
        var yearKey = String(data.year);
        if (json.total && typeof json.total[yearKey] === "number") {
          data.total = json.total[yearKey];
        } else {
          data.total = data.days.reduce(function (sum, day) {
            return sum + day.count;
          }, 0);
        }
        remoteReady = true;
        paintDays();
        writeCache(data);
      })
      .catch(function () {
        remoteReady = true;
        refreshGithubCardCopy();
      });
  }

  function initGithubCard() {
    wrap = document.querySelector("[data-github-card]");
    if (!wrap) return;

    reduced = prefersReduced();
    canHover = hoverOk();
    data.days = emptyDays();
    data.year = new Date().getFullYear();

    buildPopover();
    paintDays();
    bind();

    if (window.matchMedia) {
      var hoverMq = window.matchMedia("(hover: hover) and (pointer: fine)");
      var onHover = function () {
        canHover = hoverOk();
        if (!canHover) setOpen(false);
      };
      if (hoverMq.addEventListener) hoverMq.addEventListener("change", onHover);
      else if (hoverMq.addListener) hoverMq.addListener(onHover);

      var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
      var onMotion = function () {
        reduced = prefersReduced();
        if (reduced && card) card.style.transform = "none";
      };
      if (motion.addEventListener) motion.addEventListener("change", onMotion);
      else if (motion.addListener) motion.addListener(onMotion);
    }
  }

  window.initGithubCard = initGithubCard;
  window.refreshGithubCardCopy = refreshGithubCardCopy;
})();
