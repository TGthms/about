/**
 * i18n + shared prefs (theme, language, mobile controls).
 * Loaded before page scripts on every HTML entry.
 */
const TRANSLATIONS = {
  en: {
    meta: {
      title: "Tim G — Personal Hub",
      description:
        "Tim G — high school student based in the San Francisco Bay Area. Builder, photographer, erhu player, and traveler.",
    },
    skip: "Skip to content",
    a11y: {
      themeToggle: "Toggle light or dark theme",
      themeLight: "Light mode",
      themeDark: "Dark mode",
      scrollAbout: "Scroll to about",
      siteControls: "Preferences",
      selectLanguage: "Language",
      displayPrefs: "Display",
    },
    hero: {
      eyebrow: "Hello — welcome",
      tagline: "High school student based in the San Francisco Bay Area",
      scroll: "Scroll",
    },
    about: {
      label: "About",
      title: "A little about me",
      p1: "I'm a high school student in the Bay Area who likes building things, capturing moments, music, and exploring — both nearby and farther afield.",
      p2: "Outside of school and projects, Psalm 23 keeps me grounded and centered through busy seasons.",
    },
    interests: {
      label: "Interests",
      title: "What I care about",
      bilingual: {
        title: "Bilingual",
        desc: "Chinese-American — fluent in Mandarin Chinese and English",
      },
      erhu: {
        title: "Erhu",
        desc: "Traditional Chinese two-string instrument",
      },
      photo: {
        title: "Photography",
        desc: "Finding light, frames, and quiet moments",
      },
      travel: {
        title: "Travel",
        desc: "Exploring places, cultures, and open roads",
      },
      tech: {
        title: "Tech",
        desc: "Building things that work — and feel good to use",
      },
      tt: {
        title: "Table tennis",
        desc: "Quick rallies, focus, and friendly competition",
      },
    },
    links: {
      projects: {
        label: "Projects",
        title: "Things I've built",
      },
      connect: {
        label: "Elsewhere",
        title: "Where to find me",
      },
      featured: "Featured",
      project: "Project",
      open: "Open project",
      travelGuide: {
        title: "USA Travel Guide",
        desc: "A curated guide to places worth visiting across the United States — built as a small web project.",
      },
      japanTravelGuide: {
        title: "Japan Travel Guide",
        desc: "A curated guide to places worth visiting across Japan — built as a small web project.",
      },
      kit: {
        title: "Kit",
        desc: "Private on-device tools for PDF, image, audio, and text — no account, no upload.",
      },
      github: "GitHub",
      social: {
        label: "Instagram",
        sub: "@timg.ins",
        href: "https://www.instagram.com/timg.ins/",
        mode: "instagram",
      },
      duolingo: {
        label: "Duolingo",
        hint: "Scan the code in the Duolingo app to add me",
        profile: "Open profile",
        enlarge: "View full QR code",
        enlargeShort: "Enlarge",
        modalTitle: "Duolingo QR",
        close: "Close",
      },
    },
    footer: {
      signoff: "Thanks for stopping by.",
      contact: "Contact:",
      built: "Built with care",
      privacy: "Privacy Policy",
      terms: "Terms of Use",
    },
  },

  es: {
    meta: {
      title: "Tim G — Página personal",
      description:
        "Tim G — estudiante de secundaria en el Área de la Bahía de San Francisco. Crea, fotografía, toca el erhu y viaja.",
    },
    skip: "Saltar al contenido",
    a11y: {
      themeToggle: "Cambiar entre tema claro y oscuro",
      themeLight: "Modo claro",
      themeDark: "Modo oscuro",
      scrollAbout: "Ir a la sección Sobre mí",
      siteControls: "Preferencias",
      selectLanguage: "Idioma",
      displayPrefs: "Apariencia",
    },
    hero: {
      eyebrow: "Hola — bienvenido",
      tagline: "Estudiante de secundaria en el Área de la Bahía de San Francisco",
      scroll: "Bajar",
    },
    about: {
      label: "Sobre mí",
      title: "Un poco sobre mí",
      p1: "Soy estudiante de secundaria en el Área de la Bahía. Me gusta crear, capturar momentos, la música y explorar — cerca de casa y más lejos.",
      p2: "Fuera de la escuela y de los proyectos, el Salmo 23 me mantiene con los pies en la tierra y centrado en las épocas más ajetreadas.",
    },
    interests: {
      label: "Intereses",
      title: "Lo que me importa",
      bilingual: {
        title: "Bilingüe",
        desc: "Chino-estadounidense — hablo con fluidez mandarín e inglés",
      },
      erhu: {
        title: "Erhu",
        desc: "Instrumento tradicional chino de dos cuerdas",
      },
      photo: {
        title: "Fotografía",
        desc: "Buscar la luz, el encuadre y los momentos tranquilos",
      },
      travel: {
        title: "Viajes",
        desc: "Conocer lugares, culturas y carreteras abiertas",
      },
      tech: {
        title: "Tecnología",
        desc: "Hacer cosas que funcionen — y que se sientan bien al usarlas",
      },
      tt: {
        title: "Tenis de mesa",
        desc: "Peloteos rápidos, concentración y competencia amistosa",
      },
    },
    links: {
      projects: {
        label: "Proyectos",
        title: "Lo que he creado",
      },
      connect: {
        label: "En la red",
        title: "Dónde encontrarme",
      },
      featured: "Destacado",
      project: "Proyecto",
      open: "Abrir proyecto",
      travelGuide: {
        title: "Guía de viaje por EE. UU.",
        desc: "Una guía de lugares que merecen la pena en Estados Unidos — un pequeño proyecto web.",
      },
      japanTravelGuide: {
        title: "Guía de viaje por Japón",
        desc: "Una guía de lugares que merecen la pena en Japón — un pequeño proyecto web.",
      },
      kit: {
        title: "Kit",
        desc: "Herramientas privadas en tu dispositivo para PDF, imagen, audio y texto — sin cuenta ni subidas.",
      },
      github: "GitHub",
      social: {
        label: "Instagram",
        sub: "@timg.ins",
        href: "https://www.instagram.com/timg.ins/",
        mode: "instagram",
      },
      duolingo: {
        label: "Duolingo",
        hint: "Escanea el código en la app de Duolingo para agregarme",
        profile: "Abrir perfil",
        enlarge: "Ver el código QR completo",
        enlargeShort: "Ampliar",
        modalTitle: "Código QR de Duolingo",
        close: "Cerrar",
      },
    },
    footer: {
      signoff: "Gracias por tu visita.",
      contact: "Contacto:",
      built: "Hecho con cuidado",
      privacy: "Política de privacidad",
      terms: "Condiciones de uso",
    },
  },

  zh: {
    meta: {
      title: "Tim G — 个人主页",
      description:
        "Tim G - San Francisco",
    },
    skip: "跳到主要内容",
    a11y: {
      themeToggle: "切换浅色或深色主题",
      themeLight: "浅色模式",
      themeDark: "深色模式",
      scrollAbout: "滚动到关于部分",
      siteControls: "偏好设置",
      selectLanguage: "语言",
      displayPrefs: "显示",
    },
    hero: {
      eyebrow: "Hi — 欢迎",
      tagline: "旧金山湾区",
      scroll: "向下浏览",
    },
    about: {
      label: "关于",
      title: "一点自我介绍",
      p1: "我是位于旧金山湾区的一名高中生，喜欢创作、多元音乐和探索",
      p2: "在学业与项目之外，诗篇 23 是我内心安静的支点——在忙碌的日子里让我保持踏实与平和",
    },
    interests: {
      label: "兴趣特长",
      title: "我的爱好与特长...",
      bilingual: {
        title: "双语",
        desc: "流利的中文普通话与英语",
      },
      erhu: {
        title: "二胡",
        desc: "传统两弦乐器",
      },
      photo: {
        title: "摄影",
        desc: "寻找光线、构图与安静的瞬间",
      },
      travel: {
        title: "旅行",
        desc: "探索地方、文化与开放的道路",
      },
      tech: {
        title: "科技",
        desc: "一些实用有趣的小项目",
      },
      tt: {
        title: "乒乓球",
        desc: "快节奏的回合对抗，友好而充满乐趣的竞技",
      },
    },
    links: {
      projects: {
        label: "作品",
        title: "我做的项目",
      },
      connect: {
        label: "链接",
        title: "找到我",
      },
      featured: "推荐",
      project: "项目",
      open: "打开项目",
      travelGuide: {
        title: "美国旅行指南",
        desc: "一份精心制作的指南 — 小型网页项目",
      },
      japanTravelGuide: {
        title: "日本旅行指南",
        desc: "一份关于日本值得一去之地的指南 — 小型网页项目",
      },
      kit: {
        title: "Kit",
        desc: "在设备上运行的私密工具：PDF、图片、音视频与文本 — 无需账号，无需上传。",
      },
      github: "GitHub",
      social: {
        label: "微信",
        sub: "realTimGong",
        href: null,
        mode: "wechat",
      },
      duolingo: {
        label: "多邻国",
        hint: "在多邻国 App 中扫描二维码添加我",
        profile: "打开主页",
        enlarge: "查看完整二维码",
        enlargeShort: "放大",
        modalTitle: "多邻国二维码",
        close: "关闭",
      },
    },
    footer: {
      signoff: "谢谢你的到访。",
      contact: "联系：",
      built: "精心制作",
      privacy: "隐私政策",
      terms: "使用条款",
    },
  },

  ja: {
    meta: {
      title: "Tim G — 個人ページ",
      description:
        "Tim G — サンフランシスコ・ベイエリア在住の高校生。ものづくり、写真、二胡、旅が好きです。",
    },
    skip: "本文へスキップ",
    a11y: {
      themeToggle: "ライトとダークを切り替え",
      themeLight: "ライトモード",
      themeDark: "ダークモード",
      scrollAbout: "自己紹介へ移動",
      siteControls: "設定",
      selectLanguage: "言語",
      displayPrefs: "外観",
    },
    hero: {
      eyebrow: "こんにちは — ようこそ",
      tagline: "サンフランシスコ・ベイエリア在住の高校生",
      scroll: "下へ",
    },
    about: {
      label: "自己紹介",
      title: "少しだけ自己紹介",
      p1: "ベイエリアの高校生です。ものづくり、写真、音楽、そして近くも遠くも出かけてみるのが好きです。",
      p2: "学校やプロジェクトの外では、詩篇23が心の軸になっています。忙しい時期でも落ち着いていられるように。",
    },
    interests: {
      label: "興味",
      title: "大切にしていること",
      bilingual: {
        title: "バイリンガル",
        desc: "中華系アメリカ人 — 中国語（普通話）と英語が話せます",
      },
      erhu: {
        title: "二胡",
        desc: "中国の伝統的な二弦楽器",
      },
      photo: {
        title: "写真",
        desc: "光、構図、静かな一瞬を探すこと",
      },
      travel: {
        title: "旅",
        desc: "土地、文化、ひらけた道をめぐること",
      },
      tech: {
        title: "テクノロジー",
        desc: "ちゃんと動いて、使っていて気持ちいいものをつくる",
      },
      tt: {
        title: "卓球",
        desc: "テンポの良いラリーと集中、気軽な勝負",
      },
    },
    links: {
      projects: {
        label: "プロジェクト",
        title: "つくったもの",
      },
      connect: {
        label: "そのほか",
        title: "つながる",
      },
      featured: "注目",
      project: "プロジェクト",
      open: "開く",
      travelGuide: {
        title: "アメリカ旅行ガイド",
        desc: "アメリカのおすすめスポットをまとめた小さなウェブプロジェクト。",
      },
      japanTravelGuide: {
        title: "日本旅行ガイド",
        desc: "日本のおすすめスポットをまとめた小さなウェブプロジェクト。",
      },
      kit: {
        title: "Kit",
        desc: "PDF・画像・音声・テキスト向けの端末内ツール。アカウント不要、アップロード不要。",
      },
      github: "GitHub",
      social: {
        label: "Instagram",
        sub: "@timg.ins",
        href: "https://www.instagram.com/timg.ins/",
        mode: "instagram",
      },
      duolingo: {
        label: "Duolingo",
        hint: "DuolingoアプリでQRコードを読み取って追加できます",
        profile: "プロフィールを開く",
        enlarge: "QRコードを大きく表示",
        enlargeShort: "拡大",
        modalTitle: "DuolingoのQRコード",
        close: "閉じる",
      },
    },
    footer: {
      signoff: "見てくれてありがとう。",
      contact: "連絡先：",
      built: "丁寧に作りました",
      privacy: "プライバシーポリシー",
      terms: "利用規約",
    },
  },
};

/** Map BCP 47 / browser codes → our language keys */
const LANG_ALIASES = {
  en: "en",
  es: "es",
  zh: "zh",
  "zh-cn": "zh",
  "zh-hans": "zh",
  "zh-sg": "zh",
  "zh-tw": "zh", // Simplified UI text; still use zh pack
  "zh-hant": "zh",
  ja: "ja",
  "ja-jp": "ja",
};

const SUPPORTED_LANGS = ["en", "es", "zh", "ja"];
const STORAGE_KEY = "timg-lang";
const THEME_LEGACY_KEY = "timg-theme";
const THEME_SESSION_KEY = "timg-theme-session";

/** Native language names shown in the custom picker (not translated). */
const LANG_OPTIONS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
];

/**
 * Resolve a nested key like "hero.tagline" from a translation object.
 */
function getNested(obj, path) {
  return path.split(".").reduce((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) return acc[part];
    return undefined;
  }, obj);
}

function isDesktopControls() {
  return window.matchMedia && window.matchMedia("(min-width: 768px)").matches;
}

/**
 * Close mobile preferences bottom sheet immediately (no exit animation).
 */
function closeControlsPanel() {
  const cluster = document.querySelector("[data-controls]");
  const trigger = document.getElementById("controls-trigger");
  const panel = document.getElementById("controls-panel");
  const backdrop = document.getElementById("controls-backdrop");
  if (cluster) cluster.classList.remove("is-open");
  if (trigger) trigger.setAttribute("aria-expanded", "false");
  if (panel && !isDesktopControls()) {
    panel.classList.remove("is-raised", "is-dragging");
    panel.hidden = true;
    panel.style.transform = "";
    panel.style.transition = "";
    panel.removeAttribute("aria-modal");
    if (panel.getAttribute("data-default-role")) {
      panel.setAttribute("role", panel.getAttribute("data-default-role"));
    }
  }
  if (backdrop) {
    backdrop.classList.remove("is-visible");
    backdrop.hidden = true;
    backdrop.style.opacity = "";
    backdrop.style.transition = "";
  }
  document.body.classList.remove("controls-open");
}

/**
 * Wire mobile preferences: bottom sheet + backdrop + iOS-style drag dismiss.
 */
function initControlsPanel() {
  const cluster = document.querySelector("[data-controls]");
  const trigger = document.getElementById("controls-trigger");
  const panel = document.getElementById("controls-panel");
  const backdrop = document.getElementById("controls-backdrop");
  const grab = panel && panel.querySelector(".controls-panel__grab");
  if (!cluster || !trigger || !panel) return;

  /* Store non-dialog role for desktop; mobile open uses dialog */
  if (!panel.getAttribute("data-default-role")) {
    panel.setAttribute("data-default-role", panel.getAttribute("role") || "region");
  }

  var sheetGen = 0;

  function resetSheetInlineStyles() {
    panel.style.transform = "";
    panel.style.transition = "";
    panel.classList.remove("is-dragging");
    if (backdrop) {
      backdrop.style.opacity = "";
      backdrop.style.transition = "";
    }
  }

  function setSheetDialogMode(isDialog) {
    if (isDialog) {
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
    } else {
      panel.setAttribute("role", panel.getAttribute("data-default-role") || "region");
      panel.removeAttribute("aria-modal");
    }
  }

  function syncForViewport() {
    sheetGen += 1;
    resetSheetInlineStyles();
    panel.classList.remove("is-raised");
    if (backdrop) backdrop.classList.remove("is-visible");

    if (isDesktopControls()) {
      panel.hidden = false;
      if (backdrop) backdrop.hidden = true;
      cluster.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      document.body.classList.remove("controls-open");
      setSheetDialogMode(false);
    } else {
      panel.hidden = true;
      if (backdrop) backdrop.hidden = true;
      cluster.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      document.body.classList.remove("controls-open");
      setSheetDialogMode(false);
    }
  }

  function setOpen(open) {
    if (isDesktopControls()) return;
    sheetGen += 1;
    var gen = sheetGen;

    cluster.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("controls-open", open);

    if (open) {
      setSheetDialogMode(true);
      panel.hidden = false;
      if (backdrop) {
        backdrop.hidden = false;
        backdrop.classList.remove("is-visible");
      }
      panel.classList.remove("is-raised", "is-dragging");
      resetSheetInlineStyles();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (gen !== sheetGen) return;
          panel.classList.add("is-raised");
          if (backdrop) backdrop.classList.add("is-visible");
        });
      });
      return;
    }

    /* Close: CSS drops .is-raised → slides down (unless drag left an inline transform) */
    setSheetDialogMode(false);
    panel.classList.remove("is-dragging");
    if (backdrop) backdrop.classList.remove("is-visible");

    var reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var closeMs = reduce ? 0 : 380;

    if (panel.style.transform) {
      panel.style.transition =
        "transform " + closeMs + "ms cubic-bezier(0.32, 0.72, 0, 1)";
      panel.style.transform = "translate3d(0, 100%, 0)";
      panel.classList.remove("is-raised");
    } else {
      panel.style.transition = "";
      panel.classList.remove("is-raised");
    }

    window.setTimeout(function () {
      if (gen !== sheetGen) return;
      panel.hidden = true;
      resetSheetInlineStyles();
      if (backdrop) backdrop.hidden = true;
    }, closeMs);
  }

  /** Finalize after drag-dismiss animation (panel already off-screen). */
  function finishDragClose() {
    sheetGen += 1;
    cluster.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("controls-open");
    setSheetDialogMode(false);
    panel.classList.remove("is-raised", "is-dragging");
    panel.hidden = true;
    resetSheetInlineStyles();
    if (backdrop) {
      backdrop.classList.remove("is-visible");
      backdrop.hidden = true;
    }
  }

  syncForViewport();

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isDesktopControls()) return;
    const open = trigger.getAttribute("aria-expanded") === "true";
    setOpen(!open);
  });

  if (backdrop) {
    backdrop.addEventListener("click", function () {
      setOpen(false);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (document.body.classList.contains("qr-modal-open")) return;
    if (document.body.classList.contains("lang-picker-open")) return;
    if (isDesktopControls()) return;
    if (trigger.getAttribute("aria-expanded") !== "true") return;
    setOpen(false);
  });

  /* Drag grabber to dismiss — iOS sheet pattern */
  if (grab) {
    var drag = {
      active: false,
      startY: 0,
      dy: 0,
      startTime: 0,
    };

    function clientY(e) {
      if (e.touches && e.touches[0]) return e.touches[0].clientY;
      if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0].clientY;
      return e.clientY;
    }

    function onDragStart(e) {
      if (isDesktopControls() || panel.hidden) return;
      if (trigger.getAttribute("aria-expanded") !== "true") return;
      drag.active = true;
      drag.startY = clientY(e);
      drag.dy = 0;
      drag.startTime = Date.now();
      panel.classList.add("is-dragging");
      panel.style.transition = "none";
      if (e.pointerId != null && grab.setPointerCapture) {
        try {
          grab.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
      e.preventDefault();
    }

    function onDragMove(e) {
      if (!drag.active) return;
      drag.dy = Math.max(0, clientY(e) - drag.startY);
      panel.style.transform = "translate3d(0, " + drag.dy + "px, 0)";
      if (backdrop) {
        backdrop.style.opacity = String(Math.max(0.12, 1 - drag.dy / 280));
      }
      if (e.cancelable) e.preventDefault();
    }

    function onDragEnd() {
      if (!drag.active) return;
      drag.active = false;
      panel.classList.remove("is-dragging");

      var elapsed = Math.max(1, Date.now() - drag.startTime);
      var velocity = drag.dy / elapsed;
      var shouldClose = drag.dy > 96 || (drag.dy > 48 && velocity > 0.45);

      if (shouldClose) {
        var h = panel.getBoundingClientRect().height || 400;
        panel.classList.remove("is-raised");
        panel.style.transition =
          "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)";
        panel.style.transform =
          "translate3d(0, " + Math.max(h, drag.dy + 24) + "px, 0)";
        if (backdrop) {
          backdrop.classList.remove("is-visible");
          backdrop.style.transition = "opacity 0.22s ease-out";
          backdrop.style.opacity = "0";
        }
        window.setTimeout(finishDragClose, 300);
      } else {
        panel.style.transition =
          "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)";
        panel.style.transform = "translate3d(0, 0, 0)";
        if (backdrop) {
          backdrop.style.transition = "opacity 0.2s ease-out";
          backdrop.style.opacity = "";
          backdrop.classList.add("is-visible");
        }
        window.setTimeout(function () {
          panel.style.transition = "";
          panel.style.transform = "";
          panel.classList.add("is-raised");
          if (backdrop) backdrop.style.transition = "";
        }, 300);
      }
      drag.dy = 0;
    }

    if (window.PointerEvent) {
      grab.addEventListener("pointerdown", onDragStart);
      grab.addEventListener("pointermove", onDragMove);
      grab.addEventListener("pointerup", onDragEnd);
      grab.addEventListener("pointercancel", onDragEnd);
    } else {
      grab.addEventListener("touchstart", onDragStart, { passive: false });
      grab.addEventListener("touchmove", onDragMove, { passive: false });
      grab.addEventListener("touchend", onDragEnd);
      grab.addEventListener("touchcancel", onDragEnd);
    }
  }

  if (window.matchMedia) {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = function () {
      syncForViewport();
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
}

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
    card.setAttribute("href", "#wechat");
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

/**
 * Apply translations to all [data-i18n] nodes and document meta.
 */
function applyLanguage(lang) {
  const pack = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const resolved = TRANSLATIONS[lang] ? lang : "en";

  const htmlLang =
    resolved === "zh" ? "zh-Hans" : resolved === "ja" ? "ja" : resolved === "es" ? "es" : "en";
  document.documentElement.lang = htmlLang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const value = getNested(pack, key);
    if (typeof value === "string") {
      el.textContent = value;
    }
  });

  // Accessible labels (aria-label / title on controls; aria-label only on landmarks)
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    const value = getNested(pack, key);
    if (typeof value !== "string") return;
    el.setAttribute("aria-label", value);
    if (el.matches("button, a.scroll-cue, .pref-btn, select")) {
      el.setAttribute("title", value);
    }
  });

  // Instagram vs WeChat (Chinese only swaps this card)
  updateSocialCard(pack);

  // Document title + meta description + locale
  if (pack.meta) {
    if (pack.meta.title) document.title = pack.meta.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc && pack.meta.description) {
      desc.setAttribute("content", pack.meta.description);
    }
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogTitle && pack.meta.title) ogTitle.setAttribute("content", pack.meta.title);
    if (ogDesc && pack.meta.description) {
      ogDesc.setAttribute("content", pack.meta.description);
    }
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twTitle && pack.meta.title) twTitle.setAttribute("content", pack.meta.title);
    if (twDesc && pack.meta.description) {
      twDesc.setAttribute("content", pack.meta.description);
    }
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) {
      const localeMap = { en: "en_US", es: "es_ES", zh: "zh_CN", ja: "ja_JP" };
      ogLocale.setAttribute("content", localeMap[resolved] || "en_US");
    }
  }

  // Keep custom language picker in sync
  if (typeof syncLangPicker === "function") syncLangPicker(resolved);

  try {
    localStorage.setItem(STORAGE_KEY, resolved);
  } catch (_) {
    /* ignore */
  }

  return resolved;
}

/* -------------------------------------------------------------------------- */
/* Theme — OS default; session override only; OS change clears override        */
/* -------------------------------------------------------------------------- */

function systemPrefersDark() {
  return Boolean(
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function systemPrefersReducedMotion() {
  return Boolean(
    window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function getThemeOverride() {
  try {
    var v = sessionStorage.getItem(THEME_SESSION_KEY);
    if (v === "light" || v === "dark") return v;
  } catch (_) {
    /* private mode */
  }
  return null;
}

function setThemeOverride(value) {
  try {
    if (value === "light" || value === "dark") {
      sessionStorage.setItem(THEME_SESSION_KEY, value);
    } else {
      sessionStorage.removeItem(THEME_SESSION_KEY);
    }
  } catch (_) {
    /* ignore */
  }
}

function resolveTheme() {
  var override = getThemeOverride();
  if (override) return override;
  return systemPrefersDark() ? "dark" : "light";
}

function applyTheme(theme) {
  var resolved = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.style.colorScheme = resolved;

  var meta = document.getElementById("meta-theme-color");
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#13110f" : "#f3eee4");
  }

  var btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.setAttribute("aria-pressed", resolved === "dark" ? "true" : "false");
  }
}

function toggleTheme() {
  var next = resolveTheme() === "dark" ? "light" : "dark";
  // Persist only while different from OS; else clear (auto again)
  if (next === (systemPrefersDark() ? "dark" : "light")) {
    setThemeOverride(null);
  } else {
    setThemeOverride(next);
  }
  applyTheme(resolveTheme());
}

/**
 * Wire theme button + follow OS changes. Safe to call once per page.
 */
function initTheme() {
  try {
    localStorage.removeItem(THEME_LEGACY_KEY);
  } catch (_) {
    /* ignore */
  }

  applyTheme(resolveTheme());

  var themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      toggleTheme();
    });
  }

  if (!window.matchMedia) return;
  var colorMq = window.matchMedia("(prefers-color-scheme: dark)");
  var onColorChange = function () {
    setThemeOverride(null);
    applyTheme(resolveTheme());
  };
  if (colorMq.addEventListener) colorMq.addEventListener("change", onColorChange);
  else if (colorMq.addListener) colorMq.addListener(onColorChange);
}
