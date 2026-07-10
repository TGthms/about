/**
 * Main behavior: language, theme, motion prefs, scroll reveals, card tilt.
 */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  const THEME_KEY = "timg-theme";
  const MOTION_KEY = "timg-motion";

  // ---------- Year ----------
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ---------- Helpers ----------
  function systemPrefersDark() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }

  function systemPrefersReducedMotion() {
    return (
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
      /* ignore */
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

  // ---------- Theme ----------
  function applyTheme(theme) {
    const resolved = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", resolved);

    const meta = document.getElementById("meta-theme-color");
    if (meta) {
      meta.setAttribute("content", resolved === "dark" ? "#0f1114" : "#f7f5f2");
    }

    const btn = document.getElementById("theme-toggle");
    if (btn) {
      // pressed = currently dark (or "toggle to light")
      btn.setAttribute("aria-pressed", resolved === "dark" ? "true" : "false");
    }
  }

  function toggleTheme() {
    const next = resolveTheme() === "dark" ? "light" : "dark";
    setStored(THEME_KEY, next);
    applyTheme(next);
  }

  // ---------- Motion ----------
  function applyMotion(reduce) {
    const root = document.documentElement;
    root.classList.toggle("reduce-motion", reduce);
    root.classList.toggle("motion-full", !reduce);

    const btn = document.getElementById("motion-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", reduce ? "true" : "false");
    }
  }

  function toggleMotion() {
    const next = !resolveReduceMotion();
    setStored(MOTION_KEY, next ? "reduce" : "full");
    applyMotion(next);
    // Soft reload of motion-dependent setup is heavy; page state is fine.
    // Tilt/scroll already check class via CSS. Re-init reveals if enabling motion.
  }

  // Apply (sync with early script; re-apply so aria states are correct)
  applyTheme(resolveTheme());
  applyMotion(resolveReduceMotion());

  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

  const motionBtn = document.getElementById("motion-toggle");
  if (motionBtn) motionBtn.addEventListener("click", toggleMotion);

  // Follow system theme only when user has not set a manual preference
  if (window.matchMedia) {
    const colorMq = window.matchMedia("(prefers-color-scheme: dark)");
    const onColorChange = () => {
      const saved = getStored(THEME_KEY);
      if (saved !== "light" && saved !== "dark") {
        applyTheme(resolveTheme());
      }
    };
    if (colorMq.addEventListener) colorMq.addEventListener("change", onColorChange);
    else if (colorMq.addListener) colorMq.addListener(onColorChange);

    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => {
      const saved = getStored(MOTION_KEY);
      if (saved !== "reduce" && saved !== "full") {
        applyMotion(resolveReduceMotion());
      }
    };
    if (motionMq.addEventListener) motionMq.addEventListener("change", onMotionChange);
    else if (motionMq.addListener) motionMq.addListener(onMotionChange);
  }

  // ---------- Language ----------
  let currentLang = "en";
  if (typeof detectLanguage === "function" && typeof applyLanguage === "function") {
    currentLang = applyLanguage(detectLanguage());
  }

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang");
      if (!lang || lang === currentLang) return;
      currentLang = applyLanguage(lang);
    });
  });

  // ---------- Reduced motion (runtime) ----------
  function isReduceMotion() {
    return document.documentElement.classList.contains("reduce-motion");
  }

  // ---------- Scroll reveals (IntersectionObserver) ----------
  const revealEls = document.querySelectorAll(".reveal");

  if (isReduceMotion()) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else if ("IntersectionObserver" in window) {
    const heroReveals = document.querySelectorAll(".hero .reveal");
    requestAnimationFrame(() => {
      setTimeout(() => {
        heroReveals.forEach((el) => el.classList.add("is-visible"));
      }, 80);
    });

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.12,
      }
    );

    revealEls.forEach((el) => {
      if (el.closest(".hero")) return;
      observer.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // ---------- Interest card subtle tilt (pointer devices) ----------
  if (
    !isReduceMotion() &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  ) {
    document.querySelectorAll(".interest-card").forEach((card) => {
      const maxTilt = 6;

      card.addEventListener("pointermove", (e) => {
        if (isReduceMotion()) return;
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const tiltX = (0.5 - y) * maxTilt;
        const tiltY = (x - 0.5) * maxTilt;
        card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px) scale(1.02)`;
      });

      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });

      card.addEventListener("pointerdown", () => {
        if (isReduceMotion()) return;
        card.style.transform = "perspective(800px) scale(0.98)";
      });

      card.addEventListener("pointerup", (e) => {
        if (isReduceMotion()) {
          card.style.transform = "";
          return;
        }
        if (e.pointerType === "mouse") {
          const rect = card.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = (e.clientY - rect.top) / rect.height;
          if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
            const tiltX = (0.5 - y) * maxTilt;
            const tiltY = (x - 0.5) * maxTilt;
            card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px) scale(1.02)`;
            return;
          }
        }
        card.style.transform = "";
      });
    });
  }

  // ---------- WeChat ID copy (Chinese social card) ----------
  const socialCard = document.getElementById("social-card");
  if (socialCard) {
    const copyWeChatId = async () => {
      if (socialCard.getAttribute("data-mode") !== "wechat") return false;
      const sub = socialCard.querySelector(".link-card__sub");
      const id = (sub && sub.textContent ? sub.textContent : "realTimGong").trim();
      if (id === "已复制") return true;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(id);
        } else {
          const ta = document.createElement("textarea");
          ta.value = id;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        socialCard.classList.add("is-copied");
        if (sub) sub.textContent = "已复制";
        setTimeout(() => {
          socialCard.classList.remove("is-copied");
          if (sub) sub.textContent = id;
        }, 1400);
      } catch (_) {
        /* ignore copy failures */
      }
      return true;
    };

    socialCard.addEventListener("click", (e) => {
      if (socialCard.getAttribute("data-mode") !== "wechat") return;
      e.preventDefault();
      copyWeChatId();
    });

    socialCard.addEventListener("keydown", (e) => {
      if (socialCard.getAttribute("data-mode") !== "wechat") return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        copyWeChatId();
      }
    });
  }

  // ---------- Smooth scroll for in-page anchors ----------
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({
        behavior: isReduceMotion() ? "auto" : "smooth",
        block: "start",
      });
      if (typeof target.focus === "function") {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    });
  });
})();
