/**
 * Home page interactions.
 * Depends on js/i18n.js (theme, language, controls).
 */
(function () {
  "use strict";

  var WECHAT_ID = "realTimGong";
  /* Entrance duration + max stagger buffer (keep in sync with CSS --dur-enter) */
  var REVEAL_MS = 720;

  document.documentElement.classList.add("js", "app-ready");
  document.documentElement.classList.remove("reveal-fallback");

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  function prefersReducedMotion() {
    return typeof systemPrefersReducedMotion === "function"
      ? systemPrefersReducedMotion()
      : false;
  }

  /* ---------- Shared prefs ---------- */
  if (typeof initTheme === "function") initTheme();

  var currentLang = "en";
  if (typeof detectLanguage === "function" && typeof applyLanguage === "function") {
    currentLang = applyLanguage(detectLanguage());
  }
  if (typeof initControlsPanel === "function") initControlsPanel();
  if (typeof initLanguageMenu === "function") {
    initLanguageMenu(function (lang) {
      if (!lang || lang === currentLang) return;
      if (typeof applyLanguage === "function") currentLang = applyLanguage(lang);
    });
  }

  /* ---------- Scroll entrance ---------- */
  function settle(el) {
    el.classList.add("is-settled");
  }

  function markVisible(el) {
    if (el.classList.contains("is-visible")) return;
    el.classList.add("is-visible");

    if (prefersReducedMotion()) {
      settle(el);
      return;
    }

    /* After entrance finishes, free will-change and enable hover transforms */
    var settled = false;
    function done() {
      if (settled) return;
      settled = true;
      el.removeEventListener("transitionend", onEnd);
      settle(el);
    }
    function onEnd(e) {
      if (e.target !== el) return;
      if (e.propertyName !== "opacity" && e.propertyName !== "transform") return;
      done();
    }
    el.addEventListener("transitionend", onEnd);
    window.setTimeout(done, REVEAL_MS);
  }

  function showAllReveals() {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-visible");
      settle(el);
    });
  }

  function initReveals() {
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      showAllReveals();
      return;
    }

    /* Hero: play on load so mobile always gets an entrance */
    var heroReveals = document.querySelectorAll(".hero .reveal");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        heroReveals.forEach(function (el, i) {
          window.setTimeout(function () {
            markVisible(el);
          }, i * 70);
        });
      });
    });

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          markVisible(entry.target);
          obs.unobserve(entry.target);
        });
      },
      {
        root: null,
        /* Start a bit before fully in view so mobile scrolls feel alive */
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.08,
      }
    );

    document.querySelectorAll(".reveal").forEach(function (el) {
      if (el.closest(".hero") || el.classList.contains("is-visible")) return;
      observer.observe(el);
    });

    /* Catch anything still hidden after layout settles (fast flings, short pages) */
    window.setTimeout(function () {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      document.querySelectorAll(".reveal:not(.is-visible)").forEach(function (el) {
        var top = el.getBoundingClientRect().top;
        if (top < vh * 1.15) {
          markVisible(el);
          observer.unobserve(el);
        }
      });
    }, 900);
  }

  initReveals();

  /* ---------- WeChat ID copy (Chinese social card) ---------- */
  var socialCard = document.getElementById("social-card");
  if (socialCard) {
    var copyTimer = 0;

    function weChatId() {
      var sub = socialCard.querySelector(".link-card__sub");
      var text = sub && sub.textContent ? sub.textContent.trim() : "";
      if (!text || text === "已复制" || text === "Copied") return WECHAT_ID;
      return text;
    }

    function fallbackCopy(text, onSuccess) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.setAttribute("aria-hidden", "true");
        ta.style.cssText =
          "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, text.length);
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok && onSuccess) onSuccess();
      } catch (_) {
        /* leave ID visible */
      }
    }

    function copyWeChatId() {
      if (socialCard.getAttribute("data-mode") !== "wechat") return;
      var sub = socialCard.querySelector(".link-card__sub");
      var id = weChatId();

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

  /* ---------- In-page smooth scroll (only for taps, not global page scroll) ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      var id = anchor.getAttribute("href");
      if (!id || id === "#" || id === "#wechat") return;
      var target;
      try {
        target = document.querySelector(id);
      } catch (_) {
        return;
      }
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
      if (typeof target.focus !== "function") return;
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      try {
        target.focus({ preventScroll: true });
      } catch (_) {
        target.focus();
      }
    });
  });

  /* ---------- Duolingo QR modal ---------- */
  (function initQrModal() {
    var openBtn = document.getElementById("duolingo-qr-open");
    var modal = document.getElementById("duolingo-qr-modal");
    if (!openBtn || !modal) return;

    var lastFocus = null;
    var closeEls = modal.querySelectorAll("[data-qr-close]");

    function modalIsOpen() {
      return !modal.hidden;
    }

    function focusableInModal() {
      return Array.prototype.slice
        .call(
          modal.querySelectorAll(
            'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
          )
        )
        .filter(function (el) {
          return el.getAttribute("aria-hidden") !== "true" && !el.disabled;
        });
    }

    function openModal() {
      if (typeof closeControlsPanel === "function") closeControlsPanel();
      lastFocus = document.activeElement;
      modal.hidden = false;
      document.body.classList.add("qr-modal-open");
      openBtn.setAttribute("aria-expanded", "true");
      var closeBtn = modal.querySelector(".qr-modal__close");
      window.setTimeout(function () {
        if (closeBtn) closeBtn.focus();
      }, 10);
    }

    function closeModal() {
      if (!modalIsOpen()) return;
      modal.hidden = true;
      document.body.classList.remove("qr-modal-open");
      openBtn.setAttribute("aria-expanded", "false");
      if (lastFocus && typeof lastFocus.focus === "function") {
        try {
          lastFocus.focus();
        } catch (_) {
          /* ignore */
        }
      }
    }

    openBtn.setAttribute("aria-expanded", "false");
    openBtn.addEventListener("click", function (e) {
      e.preventDefault();
      openModal();
    });

    closeEls.forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        closeModal();
      });
    });

    document.addEventListener("keydown", function (e) {
      if (!modalIsOpen()) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
        return;
      }
      if (e.key !== "Tab") return;
      var nodes = focusableInModal();
      if (!nodes.length) return;
      var first = nodes[0];
      var last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  })();
})();
