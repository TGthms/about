/**
 * Tim G Personal Hub - Data.
 * Split from the former monolithic i18n.js module.
 */
/**
 * i18n + shared prefs (theme, language, mobile controls).
 * Loaded before page scripts on every HTML entry.
 */
const TRANSLATIONS = {
  en: {
    meta: {
      title: "Tim G — Personal Hub",
      description:
        "Tim G — high school student based in San Francisco Bay Area. Builder, photographer, erhu player, and traveler.",
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
    host: {
      label: "Project links",
      select: "Choose project host",
      main: "Main line",
      backup: "Backup line",
      cloudflare: "Cloudflare",
      github: "GitHub",
    },
    hero: {
      eyebrow: "Hello — welcome",
      tagline: "High school student based in San Francisco Bay Area",
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
        learnMore: "Explore the erhu · see my performance",
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
        title: "Where to find me & Links",
      },
      featured: "Featured",
      project: "Project",
      madeByGrok: "Made by Grok",
      archived: {
        eyebrow: "A quieter shelf",
        title: "Archived Projects",
        open: "Click to view",
        close: "Close archived projects",
      },
      open: "Open project",
      travelGuide: {
        title: "USA Travel Guide",
        desc: "A curated guide to places worth visiting across the United States — built as a small web project.",
      },
      usaGallery: {
        title: "Travel Gallery",
        desc: "A photo gallery companion to the USA Travel Guide.",
      },
      japanTravelGuide: {
        title: "Japan Travel Guide",
        desc: "A curated guide to places worth visiting across Japan — built as a small web project.",
      },
      duskline: {
        title: "duskline",
        desc: "Weather, beautifully clear. Anywhere in the world.",
      },
      kit: {
        title: "Kit",
        desc: "Everyday tools in your browser. Private by design.",
      },
      nimbus: {
        title: "Nimbus",
        desc: "Cinematic native macOS weather, powered by Open-Meteo.",
      },
      folio: {
        title: "Folio",
        desc: "A local-only macOS PDF toolbox — no account, no upload.",
      },
      kiln: {
        title: "Kiln",
        desc: "Native macOS converter for files and units.",
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
        qrAlt: "Duolingo QR code for Tim G, @AAPL.TimGong",
      },
    },
    footer: {
      signoff: "Thanks for stopping by.",
      contact: "Contact:",
      verse: "For God has not given us the spirit of fear; but of power, and of love, and of a sound mind.",
      verseReference: "— 2 Timothy 1:7",
      built: "Personal Hub",
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
    host: {
      label: "Enlaces de proyectos",
      select: "Elegir host del proyecto",
      main: "Línea principal",
      backup: "Línea de respaldo",
      cloudflare: "Cloudflare",
      github: "GitHub",
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
        learnMore: "Conoce el erhu · mira mi interpretación",
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
        title: "Dónde encontrarme y enlaces",
      },
      featured: "Destacado",
      project: "Proyecto",
      madeByGrok: "Hecho con Grok",
      archived: {
        eyebrow: "Una estantería más tranquila",
        title: "Proyectos archivados",
        open: "Ver proyectos archivados",
        close: "Cerrar proyectos archivados",
      },
      open: "Abrir proyecto",
      travelGuide: {
        title: "Guía de viaje por EE. UU.",
        desc: "Una guía de lugares que merecen la pena en Estados Unidos — un pequeño proyecto web.",
      },
      usaGallery: {
        title: "Galería de viajes",
        desc: "Una galería de fotos que acompaña a la guía de viaje por Estados Unidos.",
      },
      japanTravelGuide: {
        title: "Guía de viaje por Japón",
        desc: "Una guía de lugares que merecen la pena en Japón — un pequeño proyecto web.",
      },
      duskline: {
        title: "duskline",
        desc: "El clima, con total claridad. En cualquier parte del mundo.",
      },
      kit: {
        title: "Kit",
        desc: "Herramientas de cada día, en tu navegador. Privadas desde el diseño.",
      },
      nimbus: {
        title: "Nimbus",
        desc: "Tiempo nativo y cinematográfico para macOS, con Open-Meteo.",
      },
      folio: {
        title: "Folio",
        desc: "Caja de herramientas PDF local para macOS — sin cuenta ni subidas.",
      },
      kiln: {
        title: "Kiln",
        desc: "Conversor nativo de macOS para archivos y unidades.",
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
        qrAlt: "Código QR de Duolingo de Tim G, @AAPL.TimGong",
      },
    },
    footer: {
      signoff: "Gracias por tu visita.",
      contact: "Contacto:",
      verse: "Pues Dios no nos ha dado un espíritu de timidez, sino de poder, de amor y de dominio propio.",
      verseReference: "— 2 Timoteo 1:7",
      built: "Personal Hub",
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
    host: {
      label: "项目线路",
      select: "选择项目线路",
      main: "主线",
      backup: "备用",
      cloudflare: "Cloudflare",
      github: "GitHub",
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
        learnMore: "探索二胡 · 查看我的演奏",
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
        title: "一些小项目",
      },
      connect: {
        label: "链接",
        title: "如何找到我 & 友情链接",
      },
      featured: "推荐",
      project: "项目",
      madeByGrok: "由 Grok 制作",
      archived: {
        eyebrow: "安静的一角",
        title: "已归档项目",
        open: "轻点以查看",
        close: "关闭已归档项目",
      },
      open: "打开项目",
      travelGuide: {
        title: "美国旅行指南",
        desc: "一份精心制作的指南 — 小型网页项目",
      },
      usaGallery: {
        title: "旅行相册",
        desc: "美国旅行指南的配套相册",
      },
      japanTravelGuide: {
        title: "日本旅行指南",
        desc: "一份关于日本值得一去之地的指南 — 小型网页项目",
      },
      duskline: {
        title: "duskline",
        desc: "天气，一目了然。遍及世界每一处。",
      },
      kit: {
        title: "Kit",
        desc: "日常工具，尽在设备端运行 — 力保隐私安全，这很Kit。",
      },
      nimbus: {
        title: "Nimbus",
        desc: "原生 macOS 天气应用，画面电影感，数据来自 Open-Meteo。",
      },
      folio: {
        title: "Folio",
        desc: "仅在本地运行的 macOS PDF 工具箱 — 无需账号，无需上传。",
      },
      kiln: {
        title: "Kiln",
        desc: "原生 macOS 转换器：文件与单位。",
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
        hint: "在多邻国 App 中扫描二维码关注我",
        profile: "打开主页",
        enlarge: "查看完整二维码",
        enlargeShort: "放大",
        modalTitle: "多邻国二维码",
        close: "关闭",
        qrAlt: "Tim G 的多邻国二维码，用户名 @AAPL.TimGong",
      },
    },
    footer: {
      signoff: "谢谢你的到访。",
      contact: "联系：",
      verse: "因为神赐给我们不是胆怯的心，乃是刚强、仁爱、谨守的心。",
      verseReference: "— 提摩太后书 1:7",
      built: "个人主页",
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
    host: {
      label: "プロジェクトの接続先",
      select: "プロジェクトのホストを選択",
      main: "メイン",
      backup: "予備",
      cloudflare: "Cloudflare",
      github: "GitHub",
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
        learnMore: "二胡を知る · 演奏を観る",
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
        title: "リンクとつながり",
      },
      featured: "注目",
      project: "プロジェクト",
      madeByGrok: "Grokで制作",
      archived: {
        eyebrow: "静かな棚",
        title: "アーカイブプロジェクト",
        open: "アーカイブプロジェクトを表示",
        close: "アーカイブプロジェクトを閉じる",
      },
      open: "開く",
      travelGuide: {
        title: "アメリカ旅行ガイド",
        desc: "アメリカのおすすめスポットをまとめた小さなウェブプロジェクト。",
      },
      usaGallery: {
        title: "旅行ギャラリー",
        desc: "アメリカ旅行ガイドの写真ギャラリー。",
      },
      japanTravelGuide: {
        title: "日本旅行ガイド",
        desc: "日本のおすすめスポットをまとめた小さなウェブプロジェクト。",
      },
      duskline: {
        title: "duskline",
        desc: "天気を、どこまでもクリアに。世界のどこにいても。",
      },
      kit: {
        title: "Kit",
        desc: "日常のツールを、すべて端末内で。プライバシーを守り抜く、それがKitらしさ。",
      },
      nimbus: {
        title: "Nimbus",
        desc: "Open-Meteoを使った、映画のようなネイティブmacOS天気アプリ。",
      },
      folio: {
        title: "Folio",
        desc: "端末内だけで動くmacOSのPDFツール。アカウント不要、アップロード不要。",
      },
      kiln: {
        title: "Kiln",
        desc: "ファイルと単位のためのネイティブmacOSコンバーター。",
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
        qrAlt: "Tim G の Duolingo QR コード（@AAPL.TimGong）",
      },
    },
    footer: {
      signoff: "見てくれてありがとう。",
      contact: "連絡先：",
      verse: "というのは、神がわたしたちに下さったのは、臆する霊ではなく、力と愛と慎みとの霊なのである。",
      verseReference: "— テモテへの第二の手紙 1:7",
      built: "個人ページ",
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
const PROJECT_HOST_KEY = "timg-project-host";
const HOST_CLOUDFLARE = "cloudflare";
const HOST_GITHUB = "github";
const DEFAULT_PROJECT_HOST = HOST_CLOUDFLARE;

/** Native language names shown in the custom picker (not translated). */
const LANG_OPTIONS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
];
