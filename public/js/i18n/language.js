/**
 * Tim G Personal Hub - Language.
 * Split from the former monolithic i18n.js module.
 */
/**
 * Sync custom language picker UI to the active language code.
 */
function syncLangPicker(lang) {
  const resolved = SUPPORTED_LANGS.includes(lang) ? lang : "en";
  const opt =
    LANG_OPTIONS.find(function (o) {
      return o.code === resolved;
    }) || LANG_OPTIONS[0];

  const valueEl = document.getElementById("lang-value");
  if (valueEl) valueEl.textContent = opt.label;

  const menu = document.getElementById("lang-menu");
  if (!menu) return;

  menu.querySelectorAll(".lang-picker__option").forEach(function (btn) {
    const selected = btn.getAttribute("data-lang") === resolved;
    btn.setAttribute("aria-selected", selected ? "true" : "false");
    btn.classList.toggle("is-selected", selected);
  });
}

/**
 * Custom language picker.
 * Desktop: compact trigger + macOS-style dropdown.
 * Mobile: options always visible in the prefs sheet (no nested popup).
 */
function initLanguageMenu(onSelect) {
  const picker = document.getElementById("lang-picker");
  const trigger = document.getElementById("lang-trigger");
  const menu = document.getElementById("lang-menu");
  if (!picker || !trigger || !menu) return;

  const options = Array.prototype.slice.call(
    menu.querySelectorAll(".lang-picker__option")
  );

  function isDesktopPicker() {
    return window.matchMedia && window.matchMedia("(min-width: 768px)").matches;
  }

  function isOpen() {
    return !menu.hidden;
  }

  function setMenuOpen(open) {
    /* Mobile: always show the list */
    if (!isDesktopPicker()) {
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      document.body.classList.remove("lang-picker-open");
      return;
    }
    menu.hidden = !open;
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("lang-picker-open", open);
    picker.classList.toggle("is-open", open);
    if (open) {
      const selected =
        menu.querySelector('.lang-picker__option[aria-selected="true"]') ||
        options[0];
      if (selected) selected.focus();
    }
  }

  function choose(lang) {
    if (!lang || !SUPPORTED_LANGS.includes(lang)) return;
    if (isDesktopPicker()) {
      setMenuOpen(false);
      trigger.focus();
    }
    if (typeof onSelect === "function") onSelect(lang);
    else if (typeof applyLanguage === "function") applyLanguage(lang);
  }

  function moveFocus(delta) {
    if (!options.length) return;
    const i = options.indexOf(document.activeElement);
    const next = options[(Math.max(i, 0) + delta + options.length) % options.length];
    if (next) next.focus();
  }

  /* Ensure mobile list is visible on load / resize */
  setMenuOpen(false);
  if (window.matchMedia) {
    const mq = window.matchMedia("(min-width: 768px)");
    const onVp = function () {
      if (!isDesktopPicker()) setMenuOpen(false);
      else setMenuOpen(false); /* collapse desktop dropdown on breakpoint */
    };
    if (mq.addEventListener) mq.addEventListener("change", onVp);
    else if (mq.addListener) mq.addListener(onVp);
  }

  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!isDesktopPicker()) return;
    setMenuOpen(!isOpen());
  });

  options.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      choose(btn.getAttribute("data-lang"));
    });
  });

  document.addEventListener("click", function (e) {
    if (!isDesktopPicker() || !isOpen()) return;
    if (picker.contains(e.target)) return;
    setMenuOpen(false);
  });

  document.addEventListener("keydown", function (e) {
    if (!isDesktopPicker()) {
      /* Mobile: simple list navigation when an option is focused */
      if (!options.includes(document.activeElement)) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveFocus(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveFocus(-1);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        choose(document.activeElement.getAttribute("data-lang"));
      }
      return;
    }

    if (!isOpen()) {
      if (
        (e.key === "ArrowDown" || e.key === "ArrowUp") &&
        document.activeElement === trigger
      ) {
        e.preventDefault();
        setMenuOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setMenuOpen(false);
      trigger.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(-1);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      if (options[0]) options[0].focus();
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      if (options[options.length - 1]) options[options.length - 1].focus();
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      const active = document.activeElement;
      if (active && active.classList.contains("lang-picker__option")) {
        e.preventDefault();
        choose(active.getAttribute("data-lang"));
      }
    }
  });
}

/**
 * Detect preferred language: saved override → browser → English.
 */
function detectLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  } catch (_) {
    /* private mode / blocked storage */
  }

  const candidates = [];
  if (Array.isArray(navigator.languages)) {
    candidates.push(...navigator.languages);
  }
  if (navigator.language) candidates.push(navigator.language);

  for (const raw of candidates) {
    if (!raw) continue;
    const lower = raw.toLowerCase();
    if (LANG_ALIASES[lower]) return LANG_ALIASES[lower];
    const base = lower.split("-")[0];
    if (LANG_ALIASES[base]) return LANG_ALIASES[base];
  }

  return "en";
}

/**
 * Swap Instagram ↔ WeChat card based on active language pack.
 * Chinese shows WeChat ID (copy on click); other languages link to Instagram.
 */
function updateSocialCard(pack) {
  const card = document.getElementById("social-card");
  if (!card || !pack.links || !pack.links.social) return;

  const social = pack.links.social;
  const isWeChat = social.mode === "wechat" || !social.href;

  card.setAttribute("data-mode", isWeChat ? "wechat" : "instagram");

  const igIcon = card.querySelector(".social-icon--instagram");
  const wxIcon = card.querySelector(".social-icon--wechat");
  const arrowExt = card.querySelector(".social-arrow--external");
  const arrowCopy = card.querySelector(".social-arrow--copy");

  if (igIcon) igIcon.hidden = isWeChat;
  if (wxIcon) wxIcon.hidden = !isWeChat;
  if (arrowExt) arrowExt.hidden = isWeChat;
  if (arrowCopy) arrowCopy.hidden = !isWeChat;

  // Reset copy feedback class when switching languages
  card.classList.remove("is-copied");

  if (isWeChat) {
    // Valid focusable control without navigation (no empty href)
    card.setAttribute("href", "#");
    card.removeAttribute("target");
    card.removeAttribute("rel");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute(
      "aria-label",
      (social.label || "微信") + ": " + (social.sub || "realTimGong") + " — 点击复制"
    );
    card.classList.add("link-card--copy");
  } else {
    card.setAttribute("href", social.href);
    card.setAttribute("target", "_blank");
    card.setAttribute("rel", "noopener noreferrer");
    card.removeAttribute("role");
    card.removeAttribute("tabindex");
    card.removeAttribute("aria-label");
    card.classList.remove("link-card--copy");
  }
}

const LANGUAGE_ANNOUNCEMENTS = {
  en: "Language changed to",
  es: "Idioma cambiado a",
  zh: "语言已切换为",
  ja: "言語を変更しました：",
};

/**
 * Apply translations to text, labels, image alternatives, and page metadata.
 * Preserve legal-page metadata because legal.js owns that page-specific content.
 */
function applyLanguage(lang) {
  const pack = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const resolved = TRANSLATIONS[lang] ? lang : "en";
  const previous = document.documentElement.getAttribute("data-language");
  const isLegalPage = document.body && document.body.classList.contains("legal-page");

  const htmlLang =
    resolved === "zh" ? "zh-Hans" : resolved === "ja" ? "ja" : resolved === "es" ? "es" : "en";
  document.documentElement.lang = htmlLang;
  document.documentElement.setAttribute("data-language", resolved);

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const value = getNested(pack, key);
    if (typeof value === "string") el.textContent = value;
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    const value = getNested(pack, key);
    if (typeof value !== "string") return;
    el.setAttribute("aria-label", value);
    if (el.matches("button, a.scroll-cue, .pref-btn, select")) {
      el.setAttribute("title", value);
    }
  });

  document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
    const key = el.getAttribute("data-i18n-alt");
    const value = getNested(pack, key);
    if (typeof value === "string") el.setAttribute("alt", value);
  });

  updateSocialCard(pack);
  applyProjectHostMode(resolved);

  if (pack.meta) {
    const localeMap = { en: "en_US", es: "es_ES", zh: "zh_CN", ja: "ja_JP" };
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute("content", localeMap[resolved] || "en_US");

    // Home-page metadata is owned here; legal.js owns legal-page metadata.
    if (!isLegalPage) {
      if (pack.meta.title) document.title = pack.meta.title;
      const desc = document.querySelector('meta[name="description"]');
      if (desc && pack.meta.description) desc.setAttribute("content", pack.meta.description);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogTitle && pack.meta.title) ogTitle.setAttribute("content", pack.meta.title);
      if (ogDesc && pack.meta.description) ogDesc.setAttribute("content", pack.meta.description);
      const twTitle = document.querySelector('meta[name="twitter:title"]');
      const twDesc = document.querySelector('meta[name="twitter:description"]');
      if (twTitle && pack.meta.title) twTitle.setAttribute("content", pack.meta.title);
      if (twDesc && pack.meta.description) twDesc.setAttribute("content", pack.meta.description);
    }
  }

  if (typeof syncLangPicker === "function") syncLangPicker(resolved);

  const status = document.getElementById("site-language-status");
  if (status && previous && previous !== resolved) {
    const selected = LANG_OPTIONS.find((option) => option.code === resolved) || LANG_OPTIONS[0];
    status.textContent = (LANGUAGE_ANNOUNCEMENTS[resolved] || LANGUAGE_ANNOUNCEMENTS.en) + " " + selected.label;
  }

  try {
    localStorage.setItem(STORAGE_KEY, resolved);
  } catch (_) {
    /* ignore */
  }

  return resolved;
}
