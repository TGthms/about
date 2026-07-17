/**
 * Home page behavior: theme, language, reveals, tilt, WeChat copy, QR modal.
 * Depends on js/i18n.js (loaded first).
 */
(function () {
  "use strict";

  var WECHAT_ID = "realTimGong";

  document.documentElement.classList.add("js", "app-ready");
  document.documentElement.classList.remove("reveal-fallback");

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  function isReduceMotion() {
    return typeof systemPrefersReducedMotion === "function"
      ? systemPrefersReducedMotion()
      : false;
  }

  // ---------- Theme + language + controls (shared) ----------
  if (typeof initTheme === "function") initTheme();

  var currentLang = "en";
  if (typeof detectLanguage === "function" && typeof applyLanguage === "function") {
    currentLang = applyLanguage(detectLanguage());
  }
  if (typeof initControlsPanel === "function") initControlsPanel();
  if (typeof initLanguageMenu === "function") {
    initLanguageMenu(function (lang) {
      if (!lang || lang === currentLang) return;
      if (typeof applyLanguage === "function") {
        currentLang = applyLanguage(lang);
      }
    });
  }

  // ---------- Scroll reveals ----------
  function showAllReveals() {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  function initReveals() {
    if (isReduceMotion() || !("IntersectionObserver" in window)) {
      showAllReveals();
      return;
    }

    var revealEls = document.querySelectorAll(".reveal");
    var revealObserver = null;

    var heroReveals = document.querySelectorAll(".hero .reveal");
    requestAnimationFrame(function () {
      window.setTimeout(function () {
        heroReveals.forEach(function (el) {
          el.classList.add("is-visible");
        });
      }, 60);
    });

    revealObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: "0px 0px 12% 0px", threshold: 0.01 }
    );

    revealEls.forEach(function (el) {
      if (el.closest(".hero")) return;
      if (el.classList.contains("is-visible")) return;
      revealObserver.observe(el);
    });

    window.setTimeout(function () {
      document.querySelectorAll(".reveal:not(.is-visible)").forEach(function (el) {
        var rect = el.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        if (rect.top < vh * 1.25) {
          el.classList.add("is-visible");
          if (revealObserver) revealObserver.unobserve(el);
        }
      });
    }, 1200);
  }

  initReveals();

  // ---------- Interest card tilt ----------
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

  // ---------- WeChat ID copy ----------
  var socialCard = document.getElementById("social-card");
  if (socialCard) {
    var copyTimer = 0;

    function getWeChatId() {
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
        /* leave ID visible if copy fails */
      }
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

  // ---------- Duolingo QR large view ----------
  (function initQrModal() {
    var openBtn = document.getElementById("duolingo-qr-open");
    var modal = document.getElementById("duolingo-qr-modal");
    if (!openBtn || !modal) return;

    var lastFocus = null;
    var closeEls = modal.querySelectorAll("[data-qr-close]");

    function isOpen() {
      return !modal.hidden;
    }

    function getFocusable() {
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
      if (!isOpen()) return;
      modal.hidden = true;
      document.body.classList.remove("qr-modal-open");
      openBtn.setAttribute("aria-expanded", "false");
      if (lastFocus && typeof lastFocus.focus === "function") {
        try {
          lastFocus.focus();
        } catch (_) {}
      }
    }

    // Expose for shared Escape handling
    window.__closeQrModal = closeModal;
    window.__qrModalIsOpen = isOpen;

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
      if (!isOpen()) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
        return;
      }
      if (e.key !== "Tab") return;
      var focusable = getFocusable();
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
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
