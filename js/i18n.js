/**
 * Translation dictionary — edit strings here to update the site.
 * Keys map to [data-i18n] attributes in index.html.
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
      motionToggle: "Toggle reduced motion",
      scrollAbout: "Scroll to about",
      siteControls: "Site controls",
      selectLanguage: "Select language",
      displayPrefs: "Display preferences",
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
      p2: "Outside of school and projects, I'm grounded by Psalm 23 — a quiet personal touchstone that keeps me centered through busy seasons.",
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
      label: "Work & links",
      title: "Where to find me",
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
      github: "GitHub",
      social: {
        label: "Instagram",
        sub: "@timg.ins",
        href: "https://www.instagram.com/timg.ins/",
        mode: "instagram",
      },
      placeholder2: {
        label: "Coming soon",
        sub: "[Add another link]",
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
      title: "Tim G — Espacio personal",
      description:
        "Tim G — estudiante de secundaria en el Área de la Bahía de San Francisco. Creador, fotógrafo, músico de erhu y viajero.",
    },
    skip: "Saltar al contenido",
    a11y: {
      themeToggle: "Cambiar tema claro u oscuro",
      motionToggle: "Activar o desactivar menos movimiento",
      scrollAbout: "Ir a la sección sobre mí",
      siteControls: "Controles del sitio",
      selectLanguage: "Seleccionar idioma",
      displayPrefs: "Preferencias de visualización",
    },
    hero: {
      eyebrow: "Hola — bienvenido",
      tagline: "Estudiante de secundaria en el Área de la Bahía de San Francisco",
      scroll: "Desplazar",
    },
    about: {
      label: "Sobre mí",
      title: "Un poco sobre mí",
      p1: "Soy un estudiante de secundaria en el Área de la Bahía a quien le gusta crear, capturar momentos y explorar — cerca y más lejos.",
      p2: "Fuera de la escuela y los proyectos, me ancla el Salmo 23 — un punto de referencia personal y silencioso que me mantiene centrado en las temporadas ajetreadas.",
    },
    interests: {
      label: "Intereses",
      title: "Lo que me importa",
      bilingual: {
        title: "Bilingüe",
        desc: "Chino-estadounidense — fluido en mandarín e inglés",
      },
      erhu: {
        title: "Erhu",
        desc: "Instrumento tradicional chino de dos cuerdas",
      },
      photo: {
        title: "Fotografía",
        desc: "Buscar la luz, los encuadres y los momentos quietos",
      },
      travel: {
        title: "Viajes",
        desc: "Explorar lugares, culturas y caminos abiertos",
      },
      tech: {
        title: "Tecnología",
        desc: "Construir cosas que funcionen — y se sientan bien de usar",
      },
      tt: {
        title: "Tenis de mesa",
        desc: "Intercambios rápidos, concentración y competencia amistosa",
      },
    },
    links: {
      label: "Trabajo y enlaces",
      title: "Dónde encontrarme",
      featured: "Destacado",
      project: "Proyecto",
      open: "Abrir proyecto",
      travelGuide: {
        title: "Guía de viaje por EE. UU.",
        desc: "Una guía curada de lugares que vale la pena visitar en Estados Unidos — hecha como un pequeño proyecto web.",
      },
      japanTravelGuide: {
        title: "Guía de viaje por Japón",
        desc: "Una guía curada de lugares que vale la pena visitar en Japón — hecha como un pequeño proyecto web.",
      },
      github: "GitHub",
      social: {
        label: "Instagram",
        sub: "@timg.ins",
        href: "https://www.instagram.com/timg.ins/",
        mode: "instagram",
      },
      placeholder2: {
        label: "Próximamente",
        sub: "[Añadir otro enlace]",
      },
    },
    footer: {
      signoff: "Gracias por pasar.",
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
      motionToggle: "减弱动态效果",
      scrollAbout: "滚动到关于部分",
      siteControls: "网站控件",
      selectLanguage: "选择语言",
      displayPrefs: "显示偏好",
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
      label: "作品与链接",
      title: "探索",
      featured: "推荐",
      project: "项目",
      open: "打开项目",
      travelGuide: {
        title: "美国旅行指南",
        desc: "一份精心制作的的指南 — 小型网页项目",
      },
      japanTravelGuide: {
        title: "日本旅行指南",
        desc: "一份关于日本值得一去之地的指南 — 小型网页项目",
      },
      github: "GitHub",
      social: {
        label: "微信",
        sub: "realTimGong",
        href: null,
        mode: "wechat",
      },
      placeholder2: {
        label: "即将推出",
        sub: "[...]",
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
      title: "Tim G — パーソナルハブ",
      description:
        "Tim G — サンフランシスコ・ベイエリア在住の高校生。ものづくり、写真、二胡、旅が好きです。",
    },
    skip: "コンテンツへスキップ",
    a11y: {
      themeToggle: "ライト／ダークテーマを切り替え",
      motionToggle: "動きを減らす設定を切り替え",
      scrollAbout: "自己紹介へスクロール",
      siteControls: "サイト操作",
      selectLanguage: "言語を選択",
      displayPrefs: "表示設定",
    },
    hero: {
      eyebrow: "こんにちは — ようこそ",
      tagline: "サンフランシスコ・ベイエリア在住の高校生",
      scroll: "スクロール",
    },
    about: {
      label: "について",
      title: "少し自己紹介",
      p1: "ベイエリアの高校生で、ものづくりや瞬間を切り取ること、そして近くも遠くも探索することが好きです。",
      p2: "学校やプロジェクトの外では、詩篇23が静かな心の拠り所になっています。忙しい季節でも軸を保てるように。",
    },
    interests: {
      label: "関心",
      title: "大切にしていること",
      bilingual: {
        title: "バイリンガル",
        desc: "中華系アメリカ人 — 中国語（普通話）と英語が流暢",
      },
      erhu: {
        title: "二胡",
        desc: "中国の伝統的な二弦楽器",
      },
      photo: {
        title: "写真",
        desc: "光、フレーミング、静かな瞬間を探す",
      },
      travel: {
        title: "旅",
        desc: "場所、文化、開かれた道を探索する",
      },
      tech: {
        title: "テック",
        desc: "きちんと動いて、触れていて気持ちいいものを作る",
      },
      tt: {
        title: "卓球",
        desc: "素早いラリー、集中、そして楽しい競争",
      },
    },
    links: {
      label: "作品とリンク",
      title: "見つけ方",
      featured: "注目",
      project: "プロジェクト",
      open: "プロジェクトを開く",
      travelGuide: {
        title: "USA トラベルガイド",
        desc: "アメリカ各地のおすすめスポットをまとめたガイド — 小さなウェブプロジェクトとして制作。",
      },
      japanTravelGuide: {
        title: "日本トラベルガイド",
        desc: "日本各地のおすすめスポットをまとめたガイド — 小さなウェブプロジェクトとして制作。",
      },
      github: "GitHub",
      social: {
        label: "Instagram",
        sub: "@timg.ins",
        href: "https://www.instagram.com/timg.ins/",
        mode: "instagram",
      },
      placeholder2: {
        label: "近日公開",
        sub: "[リンクを追加]",
      },
    },
    footer: {
      signoff: "立ち寄ってくれてありがとう。",
      contact: "連絡先：",
      built: "丁寧に作りました",
      privacy: "プライバシーポリシー",
      terms: "ウェブサイト利用規約",
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

/**
 * Resolve a nested key like "hero.tagline" from a translation object.
 */
function getNested(obj, path) {
  return path.split(".").reduce((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) return acc[part];
    return undefined;
  }, obj);
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
    if (el.matches("button, a.scroll-cue, .pref-btn")) {
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

  // Language switcher pressed state
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    const isActive = btn.getAttribute("data-lang") === resolved;
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  try {
    localStorage.setItem(STORAGE_KEY, resolved);
  } catch (_) {
    /* ignore */
  }

  return resolved;
}
