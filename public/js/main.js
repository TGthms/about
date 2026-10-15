/**
 * Home page interactions.
 * Depends on the focused modules in js/i18n/ and js/preferences.js.
 */
(function () {
  "use strict";

  var WECHAT_ID = "realTimGong";
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
  /* Host control after language so dual/single mode is correct on first paint */
  if (typeof initProjectHost === "function") initProjectHost();
  if (typeof initControlsPanel === "function") initControlsPanel();
  if (typeof initLanguageMenu === "function") {
    initLanguageMenu(function (lang) {
      if (!lang || lang === currentLang) return;
      if (typeof applyLanguage === "function") currentLang = applyLanguage(lang);
      if (typeof renderAbout === "function") renderAbout();
      if (typeof refreshGithubCardCopy === "function") refreshGithubCardCopy();
      if (typeof refreshImageLoaderCopy === "function") refreshImageLoaderCopy();
    });
  }

  if (typeof renderAbout === "function") renderAbout();
  if (typeof initGithubCard === "function") initGithubCard();

  if (typeof initImageLoaders === "function") initImageLoaders();

  /* ---------- WeChat ID copy (Chinese social card) ---------- */
  var socialCard = document.getElementById("social-card");
  if (socialCard) {
    var socialStatus = document.getElementById("social-copy-status");
    var copyTimer = 0;
    var copyGeneration = 0;

    socialCard.addEventListener("social-card-reset", function () {
      copyGeneration += 1;
      if (socialStatus) { socialStatus.textContent = ""; socialStatus.classList.add("visually-hidden"); }
      window.clearTimeout(copyTimer);
      copyTimer = 0;
    });

    function copiedLabel() {
      var lang = document.documentElement.getAttribute("data-language") || "en";
      var pack = typeof TRANSLATIONS === "object" ? TRANSLATIONS[lang] : null;
      var social = pack && pack.links && pack.links.social;
      return (social && social.copySuccess) || (lang === "zh-Hant" ? "已複製" : "已复制");
    }

    function weChatId() {
      var sub = socialCard.querySelector(".link-card__sub");
      var text = sub && sub.textContent ? sub.textContent.trim() : "";
      if (!text || text === copiedLabel() || text === "已复制" || text === "已複製" || text === "Copied") return WECHAT_ID;
      return text;
    }

    function fallbackCopy(text, onSuccess, onFailure) {
      var previousFocus = document.activeElement;
      var ta;
      try {
        ta = document.createElement("textarea");
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
        else if (onFailure) onFailure();
      } catch (_) {
        if (onFailure) onFailure();
      } finally {
        if (ta && ta.parentNode) ta.parentNode.removeChild(ta);
        if (previousFocus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
      }
    }

    function copyWeChatId() {
      if (socialCard.getAttribute("data-mode") !== "wechat") return;
      var sub = socialCard.querySelector(".link-card__sub");
      var id = weChatId();
      var generation = ++copyGeneration;
      if (socialStatus) socialStatus.textContent = "";
      function announce(failed) {
        if (!socialStatus || generation !== copyGeneration || socialCard.getAttribute("data-mode") !== "wechat") return;
        var lang = document.documentElement.getAttribute("data-language") || "en";
        socialStatus.classList.toggle("visually-hidden", !failed);
        socialStatus.textContent = failed ? (TRANSLATIONS[lang] || TRANSLATIONS.en).links.social.copyFailed : copiedLabel();
      }
      function showFailure() { announce(true); }

      function showCopied() {
        if (generation !== copyGeneration || socialCard.getAttribute("data-mode") !== "wechat") return;
        socialCard.classList.add("is-copied");
        announce(false);
        if (sub) sub.textContent = copiedLabel();
        if (copyTimer) window.clearTimeout(copyTimer);
        copyTimer = window.setTimeout(function () {
          if (generation !== copyGeneration) return;
          socialCard.classList.remove("is-copied");
          if (sub) sub.textContent = id;
          copyTimer = 0;
        }, 1400);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(id).then(showCopied).catch(function () {
          fallbackCopy(id, showCopied, showFailure);
        });
      } else {
        fallbackCopy(id, showCopied, showFailure);
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
  document.addEventListener("click", function (e) {
    var anchor = e.target.closest && e.target.closest('a[href^="#"]');
    if (!anchor || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
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
    if (window.location.hash !== id) window.history.pushState(null, "", id);
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

  /* ---------- Duolingo QR modal ---------- */
  (function initQrModal() {
    var openBtn = document.getElementById("duolingo-qr-open");
    var modal = document.getElementById("duolingo-qr-modal");
    if (!openBtn || !modal) return;

    var lastFocus = null;
    var closeEls = modal.querySelectorAll("[data-qr-close]");
    var modalGen = 0;
    var isOpen = false;

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
      if (modal.classList.contains("is-closing")) return;
      if (typeof closeControlsPanel === "function") closeControlsPanel();
      modalGen += 1;
      var gen = modalGen;
      var wasOpen = isOpen;
      isOpen = true;
      lastFocus = openBtn;
      modal.hidden = false;
      modal.querySelector(".dialog-scroll").scrollTop = 0;
      modal.classList.remove("is-shown");
      document.body.classList.add("qr-modal-open");
      openBtn.setAttribute("aria-expanded", "true");
      if (!wasOpen && typeof lockPageScroll === "function") lockPageScroll();
      if (typeof setBackgroundInert === "function") setBackgroundInert(modal, true);
      if (typeof loadDeferredImages === "function") loadDeferredImages(modal);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (gen !== modalGen) return;
          modal.classList.add("is-shown");
        });
      });
      var closeBtn = modal.querySelector(".qr-modal__close");
      window.setTimeout(function () {
        if (gen !== modalGen) return;
        if (closeBtn) closeBtn.focus({ preventScroll: true });
      }, 10);
    }

    function closeModal() {
      if (!isOpen) return;
      modalGen += 1;
      var gen = modalGen;
      isOpen = false;
      modal.classList.remove("is-shown");
      modal.classList.add("is-closing");
      openBtn.setAttribute("aria-expanded", "false");
      var closeMs = prefersReducedMotion() ? 0 : 160;
      window.setTimeout(function () {
        if (gen !== modalGen) return;
        modal.hidden = true;
        modal.classList.remove("is-closing");
        if (typeof unlockPageScroll === "function") unlockPageScroll();
        document.body.classList.remove("qr-modal-open");
        if (typeof setBackgroundInert === "function") setBackgroundInert(modal, false);
        if (lastFocus && typeof lastFocus.focus === "function") {
          try {
            lastFocus.focus({ preventScroll: true });
          } catch (_) {
            /* ignore */
          }
        }
      }, closeMs);
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
      if (!isOpen) return;
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
