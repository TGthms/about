/**
 * Main behavior: language, theme, motion prefs, scroll reveals, card tilt.
 */
(function () {
  "use strict";

  const THEME_KEY = "timg-theme";
  const MOTION_KEY = "timg-motion";
  const WECHAT_ID = "realTimGong";

  // Mark JS-ready early (pairs with noscript CSS fallback)
  document.documentElement.classList.add("js");
  document.documentElement.classList.add("app-ready");
  document.documentElement.classList.remove("reveal-fallback");

  // ---------- Year ----------
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ---------- Helpers ----------
  function systemPrefersDark() {
    return Boolean(
      window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }

  function systemPrefersReducedMotion() {
    return Boolean(
      window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function getStored(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function setStored(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {
      /* private mode / quota */
    }
  }

  function resolveTheme() {
    const saved = getStored(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return systemPrefersDark() ? "dark" : "light";
  }

  function resolveReduceMotion() {
    const saved = getStored(MOTION_KEY);
    if (saved === "reduce") return true;
    if (saved === "full") return false;
    return systemPrefersReducedMotion();
  }

  function isReduceMotion() {
    return document.documentElement.classList.contains("reduce-motion");
  }

  // ---------- Theme ----------
  function applyTheme(theme) {
    const resolved = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved;

    const meta = document.getElementById("meta-theme-color");
    if (meta) {
      meta.setAttribute("content", resolved === "dark" ? "#0f1114" : "#f7f5f2");
    }

    const btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", resolved === "dark" ? "true" : "false");
    }
  }

  function toggleTheme() {
    const next = resolveTheme() === "dark" ? "light" : "dark";
    setStored(THEME_KEY, next);
    applyTheme(next);
  }

  // ---------- Motion ----------
  function showAllReveals() {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  function applyMotion(reduce) {
    const root = document.documentElement;
    root.classList.toggle("reduce-motion", reduce);
    root.classList.toggle("motion-full", !reduce);

    const btn = document.getElementById("motion-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", reduce ? "true" : "false");
    }

    // Enabling reduce motion must never leave content invisible
    if (reduce) showAllReveals();
  }

  function toggleMotion() {
    const next = !resolveReduceMotion();
    setStored(MOTION_KEY, next ? "reduce" : "full");
    applyMotion(next);
  }

  applyTheme(resolveTheme());
  applyMotion(resolveReduceMotion());

  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

  const motionBtn = document.getElementById("motion-toggle");
  if (motionBtn) motionBtn.addEventListener("click", toggleMotion);

  // Follow system prefs only when user has not set a manual override
  if (window.matchMedia) {
    const colorMq = window.matchMedia("(prefers-color-scheme: dark)");
    const onColorChange = function () {
      const saved = getStored(THEME_KEY);
      if (saved !== "light" && saved !== "dark") {
        applyTheme(resolveTheme());
      }
    };
    if (colorMq.addEventListener) colorMq.addEventListener("change", onColorChange);
    else if (colorMq.addListener) colorMq.addListener(onColorChange);

    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = function () {
      const saved = getStored(MOTION_KEY);
      if (saved !== "reduce" && saved !== "full") {
        applyMotion(resolveReduceMotion());
      }
    };
    if (motionMq.addEventListener) motionMq.addEventListener("change", onMotionChange);
    else if (motionMq.addListener) motionMq.addListener(onMotionChange);
  }

  // ---------- Language (compact dropdown) ----------
  var currentLang = "en";
  if (typeof detectLanguage === "function" && typeof applyLanguage === "function") {
    currentLang = applyLanguage(detectLanguage());
  }

  if (typeof initControlsPanel === "function") {
    initControlsPanel();
  }

  if (typeof initLanguageMenu === "function") {
    initLanguageMenu(function (lang) {
      if (!lang || lang === currentLang) return;
      if (typeof applyLanguage === "function") {
        currentLang = applyLanguage(lang);
      }
    });
  }

  // ---------- Scroll reveals ----------
  var revealEls = document.querySelectorAll(".reveal");
  var revealObserver = null;

  function initReveals() {
    if (isReduceMotion()) {
      showAllReveals();
      return;
    }

    if (!("IntersectionObserver" in window)) {
      showAllReveals();
      return;
    }

    // Hero entrance on load
    var heroReveals = document.querySelectorAll(".hero .reveal");
    requestAnimationFrame(function () {
      window.setTimeout(function () {
        heroReveals.forEach(function (el) {
          el.classList.add("is-visible");
        });
      }, 60);
    });

    // Safer margins so bottom elements always reveal (short/landscape viewports)
    revealObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      {
        root: null,
        rootMargin: "0px 0px 12% 0px",
        threshold: 0.01,
      }
    );

    revealEls.forEach(function (el) {
      if (el.closest(".hero")) return;
      if (el.classList.contains("is-visible")) return;
      revealObserver.observe(el);
    });

    // Safety net: if anything is still hidden after load/scroll settle, show it
    window.setTimeout(function () {
      document.querySelectorAll(".reveal:not(.is-visible)").forEach(function (el) {
        var rect = el.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        // In or near viewport, or past (scrolled past)
        if (rect.top < vh * 1.25) {
          el.classList.add("is-visible");
          if (revealObserver) revealObserver.unobserve(el);
        }
      });
    }, 1200);
  }

  initReveals();

  // ---------- Interest card tilt (fine pointer + hover only) ----------
  var canTilt =
    !isReduceMotion() &&
    window.matchMedia &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (canTilt) {
    document.querySelectorAll(".interest-card").forEach(function (card) {
      var maxTilt = 5;
      var raf = 0;
      var pending = null;

      function applyTilt(e) {
        pending = e;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          if (!pending || isReduceMotion()) return;
          var e2 = pending;
          pending = null;
          var rect = card.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          var x = (e2.clientX - rect.left) / rect.width;
          var y = (e2.clientY - rect.top) / rect.height;
          var tiltX = (0.5 - y) * maxTilt;
          var tiltY = (x - 0.5) * maxTilt;
          card.style.transform =
            "perspective(800px) rotateX(" +
            tiltX.toFixed(2) +
            "deg) rotateY(" +
            tiltY.toFixed(2) +
            "deg) translateY(-4px) scale(1.02)";
        });
      }

      card.addEventListener("pointermove", applyTilt);

      card.addEventListener("pointerleave", function () {
        pending = null;
        card.style.transform = "";
      });

      card.addEventListener("pointerdown", function () {
        if (isReduceMotion()) return;
        card.style.transform = "perspective(800px) scale(0.98)";
      });

      card.addEventListener("pointerup", function (e) {
        if (isReduceMotion()) {
          card.style.transform = "";
          return;
        }
        if (e.pointerType === "mouse") applyTilt(e);
        else card.style.transform = "";
      });
    });
  }

  // ---------- WeChat ID copy (Chinese social card) ----------
  var socialCard = document.getElementById("social-card");
  if (socialCard) {
    var copyTimer = 0;

    function getWeChatId() {
      var sub = socialCard.querySelector(".link-card__sub");
      var text = sub && sub.textContent ? sub.textContent.trim() : "";
      if (!text || text === "已复制" || text === "Copied") return WECHAT_ID;
      return text;
    }

    function copyWeChatId() {
      if (socialCard.getAttribute("data-mode") !== "wechat") return;

      var sub = socialCard.querySelector(".link-card__sub");
      var id = getWeChatId();

      function showCopied() {
        socialCard.classList.add("is-copied");
        if (sub) sub.textContent = "已复制";
        if (copyTimer) window.clearTimeout(copyTimer);
        copyTimer = window.setTimeout(function () {
          socialCard.classList.remove("is-copied");
          if (sub) sub.textContent = id;
          copyTimer = 0;
        }, 1400);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(id).then(showCopied).catch(function () {
          fallbackCopy(id, showCopied);
        });
      } else {
        fallbackCopy(id, showCopied);
      }
    }

    function fallbackCopy(text, onSuccess) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.setAttribute("aria-hidden", "true");
        ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, text.length);
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok && onSuccess) onSuccess();
      } catch (_) {
        /* leave ID visible if copy fails */
      }
    }

    socialCard.addEventListener("click", function (e) {
      if (socialCard.getAttribute("data-mode") !== "wechat") return;
      e.preventDefault();
      copyWeChatId();
    });

    socialCard.addEventListener("keydown", function (e) {
      if (socialCard.getAttribute("data-mode") !== "wechat") return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        copyWeChatId();
      }
    });
  }

  // ---------- Smooth scroll for in-page anchors ----------
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      var id = anchor.getAttribute("href");
      // Skip empty hashes and non-section tokens (e.g. WeChat copy control)
      if (!id || id === "#" || id === "#wechat") return;
      var target = null;
      try {
        target = document.querySelector(id);
      } catch (_) {
        return;
      }
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({
        behavior: isReduceMotion() ? "auto" : "smooth",
        block: "start",
      });
      if (typeof target.focus === "function") {
        if (!target.hasAttribute("tabindex")) {
          target.setAttribute("tabindex", "-1");
        }
        try {
          target.focus({ preventScroll: true });
        } catch (_) {
          target.focus();
        }
      }
    });
  });
})();
