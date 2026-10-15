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
      sections: "Sections",
      explore: "Explore",
      themeToggle: "Toggle light or dark theme",
      themeLight: "Light mode",
      themeDark: "Dark mode",
      scrollAbout: "Scroll to about",
      siteControls: "Preferences",
      selectLanguage: "Language",
      displayPrefs: "Display",
      loading: "Loading",
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
      eyebrow: "Hi, I’m",
      note: "I make websites, take photos, and play the erhu. This is where I keep a little of each.",
      contact: "Contact",
      scroll: "Scroll",
    },
    about: {
      label: "About",
      title: "A little more about me",
      p1: "I'm a high school student in the Bay Area who loves {build}, {photo}, {erhu}, and table tennis. Whether it's a project, a new experience, or learning English, I'm always curious about creating and discovering something new.",
      p2: "Outside of school and projects, Psalm 23 keeps me grounded through busy seasons and reminds me of what matters most.",
      links: {
        build: "building things",
        photo: "capturing moments",
        erhu: "playing erhu",
      },
    },
    interests: {
      label: "Interests",
      title: "Interests",
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
        title: "Elsewhere",
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
      githubCard: {
        contributions: "{count} contributions in {year}",
        day: "{count} on {date}",
        loading: "Loading contributions…",
        unavailable: "Contributions unavailable. Visit my GitHub profile.",
      },
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
      verse: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.",
      verseReference: "— 2 Timothy 1:7",
      built: "Personal Hub",
      privacy: "Privacy Policy",
      terms: "Terms of Use",
      legalNav: "Legal",
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
      sections: "Secciones",
      explore: "Explorar",
      themeToggle: "Cambiar entre tema claro y oscuro",
      themeLight: "Modo claro",
      themeDark: "Modo oscuro",
      scrollAbout: "Ir a la sección Sobre mí",
      siteControls: "Preferencias",
      selectLanguage: "Idioma",
      displayPrefs: "Apariencia",
      loading: "Cargando",
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
      eyebrow: "Hola, soy",
      note: "Hago sitios web, tomo fotos y toco el erhu. Aquí reúno un poco de todo.",
      contact: "Contacto",
      scroll: "Bajar",
    },
    about: {
      label: "Sobre mí",
      title: "Un poco sobre mí",
      p1: "Soy estudiante de secundaria en el Área de la Bahía. Me encanta {build}, {photo}, {erhu} y el tenis de mesa. Ya sea un proyecto, una experiencia nueva o aprender inglés, siempre tengo curiosidad por crear y descubrir algo nuevo.",
      p2: "Fuera de la escuela y de los proyectos, el Salmo 23 me mantiene con los pies en la tierra en las épocas más ajetreadas y me recuerda lo que más importa.",
      links: {
        build: "crear cosas",
        photo: "capturar momentos",
        erhu: "tocar el erhu",
      },
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
      githubCard: {
        contributions: "{count} contribuciones en {year}",
        day: "{count} el {date}",
        loading: "Cargando contribuciones…",
        unavailable: "Contribuciones no disponibles. Visita mi perfil de GitHub.",
      },
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
      legalNav: "Legal",
    },
  },

  zh: {
    meta: {
      title: "Tim G — 个人主页",
      description:
        "Tim G — 旧金山湾区高中生。喜欢做项目、摄影、拉二胡，也喜欢旅行。",
    },
    skip: "跳到主要内容",
    a11y: {
      sections: "页面导航",
      explore: "探索",
      themeToggle: "切换浅色或深色主题",
      themeLight: "浅色模式",
      themeDark: "深色模式",
      scrollAbout: "滚动到关于部分",
      siteControls: "偏好设置",
      selectLanguage: "语言",
      displayPrefs: "显示",
      loading: "加载中",
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
      eyebrow: "你好，我是",
      note: "我做网站、拍照，也拉二胡。这里收集着我的一些作品和日常兴趣。",
      contact: "联系",
      scroll: "向下浏览",
    },
    about: {
      label: "关于",
      title: "一点自我介绍",
      p1: "我是旧金山湾区的一名高中生，喜欢{build}、{photo}、{erhu}和乒乓球。无论是项目、新体验，还是学英语，我总想创造、发现一点新的东西。",
      p2: "在学业与项目之外，诗篇 23 让我在忙碌的日子里保持踏实，也提醒我什么最重要。",
      links: {
        build: "动手做东西",
        photo: "捕捉瞬间",
        erhu: "拉二胡",
      },
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
      githubCard: {
        contributions: "{year} 年共 {count} 次贡献",
        day: "{date}：{count} 次",
        loading: "正在加载贡献…",
        unavailable: "贡献数据暂不可用，请查看我的 GitHub 主页。",
      },
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
      legalNav: "法律信息",
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
      sections: "セクション",
      explore: "見てみる",
      themeToggle: "ライトとダークを切り替え",
      themeLight: "ライトモード",
      themeDark: "ダークモード",
      scrollAbout: "自己紹介へ移動",
      siteControls: "設定",
      selectLanguage: "言語",
      displayPrefs: "外観",
      loading: "読込中",
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
      eyebrow: "こんにちは、",
      note: "ウェブサイトを作ったり、写真を撮ったり、二胡を弾いたり。ここに少しずつまとめています。",
      contact: "連絡先",
      scroll: "下へ",
    },
    about: {
      label: "自己紹介",
      title: "少しだけ自己紹介",
      p1: "ベイエリアの高校生です。{build}、{photo}、{erhu}、それに卓球が好きです。プロジェクトでも、新しい体験でも、英語の勉強でも、つくることと見つけることにいつも好奇心があります。",
      p2: "学校やプロジェクトの外では、詩篇23が忙しい時期の軸になり、いちばん大切なことを思い出させてくれます。",
      links: {
        build: "ものづくり",
        photo: "写真を撮ること",
        erhu: "二胡を弾くこと",
      },
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
      githubCard: {
        contributions: "{year}年に{count}件のコントリビューション",
        day: "{date}：{count}件",
        loading: "読み込み中…",
        unavailable: "貢献データを取得できません。GitHubプロフィールをご覧ください。",
      },
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
      legalNav: "法的情報",
    },
  },
};

TRANSLATIONS["zh-Hant"] = {
  "a11y": {
    "sections": "頁面導覽",
    "explore": "探索",
    "displayPrefs": "顯示",
    "loading": "載入中",
    "scrollAbout": "捲動至關於區塊",
    "selectLanguage": "語言",
    "siteControls": "偏好設定",
    "themeDark": "深色模式",
    "themeLight": "淺色模式",
    "themeToggle": "切換淺色或深色主題"
  },
  "about": {
    "label": "關於",
    "links": {
      "build": "動手做東西",
      "erhu": "拉二胡",
      "photo": "捕捉瞬間"
    },
    "p1": "我是舊金山灣區的一名高中生，喜歡{build}、{photo}、{erhu}和乒乓球。無論是專案、新體驗，還是學英語，我總想創造、發現一點新的東西。",
    "p2": "在學業與專案之外，詩篇 23 讓我在忙碌的日子裡保持踏實，也提醒我什麼最重要。",
    "title": "一點自我介紹"
  },
  "footer": {
    "built": "個人主頁",
    "contact": "聯絡：",
    "legalNav": "法律資訊",
    "privacy": "隱私政策",
    "signoff": "謝謝你的到訪。",
    "terms": "使用條款",
    "verse": "因為神賜給我們不是膽怯的心，乃是剛強、仁愛、謹守的心。",
    "verseReference": "— 提摩太后書 1:7"
  },
  "hero": {
    "eyebrow": "你好，我是",
    "contact": "聯絡",
    "note": "我做網站、拍照，也拉二胡。這裡收集著我的一些作品和日常興趣。",
    "scroll": "向下瀏覽"
  },
  "host": {
    "backup": "備用",
    "cloudflare": "Cloudflare",
    "github": "GitHub",
    "label": "專案線路",
    "main": "主線",
    "select": "選擇專案線路"
  },
  "interests": {
    "bilingual": {
      "desc": "流利的中文普通話與英語",
      "title": "雙語"
    },
    "erhu": {
      "desc": "傳統兩弦樂器",
      "learnMore": "探索二胡 · 查看我的演奏",
      "title": "二胡"
    },
    "label": "興趣特長",
    "photo": {
      "desc": "尋找光線、構圖與安靜的瞬間",
      "title": "攝影"
    },
    "tech": {
      "desc": "一些實用有趣的小專案",
      "title": "科技"
    },
    "title": "我的愛好與特長...",
    "travel": {
      "desc": "探索地方、文化與開放的道路",
      "title": "旅行"
    },
    "tt": {
      "desc": "快節奏的回合對抗，友好而充滿樂趣的競技",
      "title": "乒乓球"
    }
  },
  "links": {
    "archived": {
      "close": "關閉已歸檔專案",
      "eyebrow": "安靜的一角",
      "open": "輕點以查看",
      "title": "已歸檔專案"
    },
    "connect": {
      "label": "連結",
      "title": "如何找到我 & 友情連結"
    },
    "duolingo": {
      "close": "關閉",
      "enlarge": "查看完整二維碼",
      "enlargeShort": "放大",
      "hint": "在多鄰國 App 中掃描二維碼關注我",
      "label": "多鄰國",
      "modalTitle": "多鄰國二維碼",
      "profile": "查看個人檔案",
      "qrAlt": "Tim G 的多鄰國二維碼，使用者名 @AAPL.TimGong"
    },
    "duskline": {
      "desc": "天氣，一目瞭然。遍及世界每一處。",
      "title": "duskline"
    },
    "featured": "推薦",
    "folio": {
      "desc": "僅在本地運行的 macOS PDF 工具箱 — 無需帳戶，無需上傳。",
      "title": "Folio"
    },
    "github": "GitHub",
    "githubCard": {
      "contributions": "{year} 年共 {count} 次貢獻",
      "day": "{date}：{count} 次",
      "loading": "正在載入貢獻…",
      "unavailable": "貢獻資料暫時無法載入，請查看我的 GitHub 個人頁面。"
    },
    "japanTravelGuide": {
      "desc": "一份關於日本值得一去之地的指南 — 小型網頁專案",
      "title": "日本旅行指南"
    },
    "kiln": {
      "desc": "原生 macOS 轉換器：文件與單位。",
      "title": "Kiln"
    },
    "kit": {
      "desc": "日常工具，盡在裝置端運行 — 力保隱私安全，這很Kit。",
      "title": "Kit"
    },
    "madeByGrok": "由 Grok 製作",
    "nimbus": {
      "desc": "原生 macOS 天氣應用，畫面電影感，資料來自 Open-Meteo。",
      "title": "Nimbus"
    },
    "open": "開啟專案",
    "project": "專案",
    "projects": {
      "label": "作品",
      "title": "一些小專案"
    },
    "social": {
      "href": null,
      "label": "微信",
      "mode": "wechat",
      "sub": "realTimGong",
      "copyHint": "點擊複製",
      "copySuccess": "已複製"
    },
    "travelGuide": {
      "desc": "一份精心製作的指南 — 小型網頁專案",
      "title": "美國旅行指南"
    },
    "usaGallery": {
      "desc": "美國旅行指南的配套相簿",
      "title": "旅行相簿"
    }
  },
  "meta": {
    "description": "Tim G — 舊金山灣區高中生。喜歡做專案、攝影、拉二胡，也喜歡旅行。",
    "title": "Tim G — 個人主頁"
  },
  "skip": "跳到主要內容"
};

/* Small home interactions share the same five language packs. */
const HOME_DETAILS = {
  "en": {
    "rally": {
      "open": "Play a quick rally",
      "title": "pong",
      "close": "Close table tennis game",
      "court": "Pong table with your paddle below and the computer above",
      "instructions": "Move with ← →, your mouse, or drag on the table. Space serves or pauses.",
      "serve": "Serve",
      "pause": "Pause",
      "resume": "Resume",
      "again": "Play again",
      "best": "Best rally",
      "ready": "First to 5. A little match between projects.",
      "playing": "Try the paddle’s edges to angle your shots.",
      "paused": "Take your time.",
      "left": "Move paddle left",
      "right": "Move paddle right",
      "you": "You",
      "opponent": "Computer",
      "yourPoint": "Your point! {you}–{opponent}",
      "theirPoint": "Computer’s point. {you}–{opponent}",
      "won": "You win! {you}–{opponent}. Rematch?",
      "lost": "Good game. {you}–{opponent}. Try again?"
    },
    "contact": {
      "copy": "Copy email",
      "copied": "Copied!",
      "success": "Email address copied.",
      "failed": "Couldn’t copy. Select the email address to copy it."
    }
  },
  "es": {
    "rally": {
      "open": "Juega un rally rápido",
      "title": "Un poco de Pong",
      "close": "Cerrar el juego de tenis de mesa",
      "court": "Mesa de Pong: tu pala abajo y la del ordenador arriba",
      "instructions": "Muévete con ← →, el ratón o arrastrando sobre la mesa. Espacio sirve o pausa.",
      "serve": "Sacar",
      "pause": "Pausar",
      "resume": "Continuar",
      "again": "Jugar de nuevo",
      "best": "Mejor rally",
      "ready": "Gana quien llegue a 5. Una partida entre proyectos.",
      "playing": "Usa los bordes de la pala para dirigir tus golpes.",
      "paused": "Sin prisa.",
      "left": "Mover la pala a la izquierda",
      "right": "Mover la pala a la derecha",
      "you": "Tú",
      "opponent": "Ordenador",
      "yourPoint": "¡Tu punto! {you}–{opponent}",
      "theirPoint": "Punto del ordenador. {you}–{opponent}",
      "won": "¡Ganaste! {you}–{opponent}. ¿Revancha?",
      "lost": "Buena partida. {you}–{opponent}. ¿Otra?"
    },
    "contact": {
      "copy": "Copiar correo",
      "copied": "¡Copiado!",
      "success": "Dirección de correo copiada.",
      "failed": "No se pudo copiar. Selecciona la dirección para copiarla."
    }
  },
  "zh": {
    "rally": {
      "open": "来一小局乒乓球",
      "title": "来一局乒乓球",
      "close": "关闭乒乓球游戏",
      "court": "乒乓球台：你的球拍在下方，电脑在上方",
      "instructions": "用 ← →、鼠标或在球台上拖动来移动球拍。空格键发球或暂停。",
      "serve": "发球",
      "pause": "暂停",
      "resume": "继续",
      "again": "再来一局",
      "best": "最长回合",
      "ready": "先得 5 分获胜。在项目之间，来一小局。",
      "playing": "试试用球拍边缘回球，改变球的方向。",
      "paused": "慢慢来。",
      "left": "向左移动球拍",
      "right": "向右移动球拍",
      "you": "你",
      "opponent": "电脑",
      "yourPoint": "你得分了！{you}–{opponent}",
      "theirPoint": "电脑得分。{you}–{opponent}",
      "won": "你赢了！{you}–{opponent}。再来一局？",
      "lost": "不错的一局。{you}–{opponent}。再试试？"
    },
    "contact": {
      "copy": "复制邮箱",
      "copied": "已复制！",
      "success": "邮箱地址已复制。",
      "failed": "无法复制，请选中邮箱地址手动复制。"
    }
  },
  "zh-Hant": {
    "rally": {
      "open": "來一小局乒乓球",
      "title": "來一局乒乓球",
      "close": "關閉乒乓球遊戲",
      "court": "乒乓球台：你的球拍在下方，電腦在上方",
      "instructions": "用 ← →、滑鼠或在球台上拖曳來移動球拍。空白鍵發球或暫停。",
      "serve": "發球",
      "pause": "暫停",
      "resume": "繼續",
      "again": "再來一局",
      "best": "最長回合",
      "ready": "先得 5 分獲勝。在專案之間，來一小局。",
      "playing": "試試用球拍邊緣回球，改變球的方向。",
      "paused": "慢慢來。",
      "left": "向左移動球拍",
      "right": "向右移動球拍",
      "you": "你",
      "opponent": "電腦",
      "yourPoint": "你得分了！{you}–{opponent}",
      "theirPoint": "電腦得分。{you}–{opponent}",
      "won": "你贏了！{you}–{opponent}。再來一局？",
      "lost": "不錯的一局。{you}–{opponent}。再試試？"
    },
    "contact": {
      "copy": "複製信箱",
      "copied": "已複製！",
      "success": "信箱地址已複製。",
      "failed": "無法複製，請選取信箱地址手動複製。"
    }
  },
  "ja": {
    "rally": {
      "open": "ちょっとラリーしよう",
      "title": "ちょっとPong",
      "close": "卓球ゲームを閉じる",
      "court": "Pongの台：自分のラケットが下、コンピューターが上",
      "instructions": "← →、マウス、または台の上をドラッグして移動。スペースキーでサーブ・一時停止。",
      "serve": "サーブ",
      "pause": "一時停止",
      "resume": "再開",
      "again": "もう一回",
      "best": "最長ラリー",
      "ready": "先に5点取ったら勝ち。合間にひと勝負。",
      "playing": "ラケットの端で返して、角度を変えてみよう。",
      "paused": "ゆっくりどうぞ。",
      "left": "ラケットを左に動かす",
      "right": "ラケットを右に動かす",
      "you": "あなた",
      "opponent": "コンピューター",
      "yourPoint": "あなたの得点！{you}–{opponent}",
      "theirPoint": "相手の得点。{you}–{opponent}",
      "won": "あなたの勝ち！{you}–{opponent}。もう一戦？",
      "lost": "いい勝負でした。{you}–{opponent}。もう一戦？"
    },
    "contact": {
      "copy": "メールをコピー",
      "copied": "コピー済み！",
      "success": "メールアドレスをコピーしました。",
      "failed": "コピーできませんでした。メールアドレスを選択してコピーしてください。"
    }
  }
};
Object.keys(HOME_DETAILS).forEach(function (lang) {
  Object.assign(TRANSLATIONS[lang], HOME_DETAILS[lang]);
});

/* Korean copy uses a conversational tone for the hub and formal language for legal pages. */
TRANSLATIONS.ko = {
  "meta": {
    "title": "Tim G — 나의 작은 공간",
    "description": "샌프란시스코 베이 지역에 사는 고등학생 Tim G. 웹사이트를 만들고, 사진을 찍고, 얼후를 연주하며 여행합니다."
  },
  "skip": "본문으로 건너뛰기",
  "a11y": {
    "sections": "주요 메뉴",
    "explore": "둘러보기",
    "themeToggle": "밝은 테마와 어두운 테마 전환",
    "themeLight": "밝은 테마",
    "themeDark": "어두운 테마",
    "scrollAbout": "소개로 이동",
    "siteControls": "환경설정",
    "selectLanguage": "언어",
    "displayPrefs": "화면 설정",
    "loading": "불러오는 중"
  },
  "host": {
    "label": "프로젝트 링크",
    "select": "프로젝트 호스팅 선택",
    "main": "기본 링크",
    "backup": "대체 링크",
    "cloudflare": "Cloudflare",
    "github": "GitHub"
  },
  "hero": {
    "eyebrow": "안녕하세요, 저는",
    "note": "웹사이트를 만들고, 사진을 찍고, 얼후를 연주해요. 그 이야기들을 조금씩 모아 두는 곳입니다.",
    "contact": "연락하기",
    "scroll": "아래로"
  },
  "about": {
    "label": "소개",
    "title": "저를 조금 더 소개할게요",
    "p1": "저는 베이 지역에 사는 고등학생으로, {build}, {photo}, {erhu}, 탁구를 좋아해요. 프로젝트를 만들 때도, 새로운 경험을 할 때도, 영어를 배울 때도 새로운 것을 만들고 발견하는 일에 늘 호기심을 느낍니다.",
    "p2": "학교생활과 프로젝트로 바쁜 날에도 시편 23편은 마음의 중심을 잡아 주고, 정말 소중한 것이 무엇인지 떠올리게 해 줍니다.",
    "links": {
      "build": "무언가 만드는 일",
      "photo": "순간을 사진에 담는 일",
      "erhu": "얼후 연주"
    }
  },
  "interests": {
    "label": "관심사",
    "title": "좋아하는 것들",
    "bilingual": {
      "title": "두 언어",
      "desc": "중국계 미국인으로, 중국어와 영어를 모두 편하게 사용해요"
    },
    "erhu": {
      "title": "얼후",
      "desc": "두 줄로 깊은 소리를 내는 중국 전통 현악기",
      "learnMore": "얼후 알아보기 · 제 연주 듣기"
    },
    "photo": {
      "title": "사진",
      "desc": "빛과 구도, 고요한 순간을 찾아서"
    },
    "travel": {
      "title": "여행",
      "desc": "새로운 장소와 문화, 탁 트인 길을 만나는 일"
    },
    "tech": {
      "title": "기술",
      "desc": "잘 작동하고, 쓰는 즐거움이 있는 것을 만들어요"
    },
    "tt": {
      "title": "탁구",
      "desc": "빠른 랠리, 집중, 그리고 즐거운 승부"
    }
  },
  "links": {
    "projects": {
      "label": "프로젝트",
      "title": "제가 만든 것들"
    },
    "connect": {
      "label": "다른 공간",
      "title": "다른 곳에서도 만나요"
    },
    "featured": "추천",
    "project": "프로젝트",
    "madeByGrok": "Grok으로 제작",
    "archived": {
      "eyebrow": "조용한 한쪽 책장",
      "title": "지난 프로젝트",
      "open": "둘러보기",
      "close": "지난 프로젝트 닫기"
    },
    "open": "프로젝트 열기",
    "travelGuide": {
      "title": "미국 여행 가이드",
      "desc": "미국 곳곳에서 가 볼 만한 장소를 모은 작은 웹 프로젝트입니다."
    },
    "usaGallery": {
      "title": "여행 사진첩",
      "desc": "미국 여행 가이드와 함께 둘러보는 사진 모음입니다."
    },
    "japanTravelGuide": {
      "title": "일본 여행 가이드",
      "desc": "일본 곳곳에서 가 볼 만한 장소를 모은 작은 웹 프로젝트입니다."
    },
    "duskline": {
      "title": "duskline",
      "desc": "전 세계 어디서나, 날씨를 아름답고 명료하게."
    },
    "kit": {
      "title": "Kit",
      "desc": "브라우저에서 바로 쓰는 일상 도구. 개인정보 보호를 기본으로."
    },
    "nimbus": {
      "title": "Nimbus",
      "desc": "Open-Meteo 데이터를 활용한, 영화 같은 macOS 날씨 앱."
    },
    "folio": {
      "title": "Folio",
      "desc": "기기 안에서만 작동하는 macOS PDF 도구. 가입도 업로드도 필요 없어요."
    },
    "kiln": {
      "title": "Kiln",
      "desc": "파일과 단위를 변환하는 macOS 전용 앱."
    },
    "github": "GitHub",
    "githubCard": {
      "contributions": "{year}년 기여 {count}회",
      "day": "{date}: {count}회",
      "loading": "기여 내역을 불러오는 중…",
      "unavailable": "기여 내역을 불러올 수 없어요. GitHub 프로필에서 확인해 주세요."
    },
    "social": {
      "label": "Instagram",
      "sub": "@timg.ins",
      "href": "https://www.instagram.com/timg.ins/",
      "mode": "instagram"
    },
    "duolingo": {
      "label": "Duolingo",
      "hint": "Duolingo 앱에서 코드를 스캔해 친구로 추가해 주세요",
      "profile": "프로필 열기",
      "enlarge": "QR 코드 크게 보기",
      "enlargeShort": "크게 보기",
      "modalTitle": "Duolingo QR 코드",
      "close": "닫기",
      "qrAlt": "Tim G의 Duolingo QR 코드, @AAPL.TimGong"
    }
  },
  "footer": {
    "signoff": "들러 주셔서 고마워요.",
    "contact": "연락처:",
    "verse": "하나님은 우리에게 두려워하는 마음을 주신 것이 아니라 능력과 사랑과 절제하는 마음을 주셨습니다.",
    "verseReference": "— 디모데후서 1:7 (KLB)",
    "built": "나의 작은 공간",
    "privacy": "개인정보 처리방침",
    "terms": "이용약관",
    "legalNav": "법적 안내"
  },
  "contact": {
    "copy": "이메일 복사",
    "copied": "복사했어요!",
    "success": "이메일 주소를 복사했어요.",
    "failed": "복사하지 못했어요. 이메일 주소를 선택해 직접 복사해 주세요."
  },
  "rally": {
    "open": "짧게 한 게임 할까요?",
    "title": "잠깐, 탁구 한 게임",
    "close": "탁구 게임 닫기",
    "court": "탁구 게임 코트",
    "instructions": "← →, 마우스 또는 코트 위 드래그로 움직이세요. 스페이스 키로 시작하거나 일시 정지할 수 있어요.",
    "serve": "시작하기",
    "pause": "일시 정지",
    "resume": "계속하기",
    "again": "다시 한 게임",
    "you": "나",
    "opponent": "컴퓨터",
    "best": "최고 랠리",
    "ready": "컴퓨터와 한 게임. 먼저 5점을 얻으면 이겨요.",
    "playing": "라켓 가장자리로 받아 방향을 바꿔 보세요.",
    "paused": "잠깐 쉬어 가요.",
    "yourPoint": "내 득점! {you}–{opponent}",
    "theirPoint": "컴퓨터 득점. {you}–{opponent}",
    "won": "이겼어요! {you}–{opponent}. 한 게임 더?",
    "lost": "좋은 승부였어요. {you}–{opponent}. 다시 해 볼까요?",
    "left": "라켓을 왼쪽으로 이동",
    "right": "라켓을 오른쪽으로 이동"
  }
};

/** Map BCP 47 / browser codes → our language keys */
const LANG_ALIASES = {
  en: "en",
  es: "es",
  zh: "zh",
  "zh-cn": "zh",
  "zh-hans": "zh",
  "zh-chs": "zh",
  "zh-sg": "zh",
  "zh-hans-cn": "zh",
  // Match script/region hints on a first visit; saved choices take precedence.
  "zh-hant": "zh-Hant",
  "zh-cht": "zh-Hant",
  "zh-tw": "zh-Hant",
  "zh-hk": "zh-Hant",
  "zh-mo": "zh-Hant",
  "zh-hant-sg": "zh-Hant",
  "zh-hant-tw": "zh-Hant",
  "zh-hant-hk": "zh-Hant",
  "zh-hant-mo": "zh-Hant",
  ja: "ja",
  "ja-jp": "ja",
  ko: "ko",
  "ko-kr": "ko",
};

const SUPPORTED_LANGS = ["en", "es", "zh", "zh-Hant", "ja", "ko"];
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
  { code: "zh", label: "简体中文" },
  { code: "zh-Hant", label: "繁體中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];

const RALLY_LEVEL_COPY = {
  "en": {
    "challenge": "Challenge",
    "easy": "Easy",
    "medium": "Medium",
    "hard": "Hard"
  },
  "es": {
    "challenge": "Dificultad",
    "easy": "Fácil",
    "medium": "Media",
    "hard": "Difícil"
  },
  "zh": {
    "challenge": "难度",
    "easy": "简单",
    "medium": "中等",
    "hard": "困难"
  },
  "zh-Hant": {
    "challenge": "難度",
    "easy": "簡單",
    "medium": "中等",
    "hard": "困難"
  },
  "ja": {
    "challenge": "難易度",
    "easy": "やさしい",
    "medium": "ふつう",
    "hard": "むずかしい"
  },
  "ko": {
    "challenge": "난이도",
    "easy": "쉬움",
    "medium": "보통",
    "hard": "어려움"
  }
};
Object.keys(RALLY_LEVEL_COPY).forEach(function (lang) { Object.assign(TRANSLATIONS[lang].rally, RALLY_LEVEL_COPY[lang]); });

const RALLY_RESUME_COPY = {"en": "Get ready…", "es": "Prepárate…", "zh": "准备好…", "zh-Hant": "準備好…", "ja": "準備はいい？", "ko": "준비하세요…"};
Object.keys(RALLY_RESUME_COPY).forEach(function (lang) { TRANSLATIONS[lang].rally.resuming = RALLY_RESUME_COPY[lang]; });

const DETAIL_COPY = {
  "en": [
    "Watch my performance",
    "About the erhu",
    "Couldn’t copy. You can select the WeChat ID above.",
    "Longest rally this match: {count}"
  ],
  "es": [
    "Ver mi interpretación",
    "Sobre el erhu",
    "No se pudo copiar. Puedes seleccionar el ID de WeChat de arriba.",
    "Rally más largo de la partida: {count}"
  ],
  "zh": [
    "观看我的演奏",
    "了解二胡",
    "未能复制。你可以手动选择上方的微信号。",
    "本局最长回合：{count}"
  ],
  "zh-Hant": [
    "觀看我的演奏",
    "了解二胡",
    "未能複製。你可以手動選取上方的微信號。",
    "本局最長回合：{count}"
  ],
  "ja": [
    "私の演奏を見る",
    "二胡について",
    "コピーできませんでした。上のWeChat IDを選択してコピーできます。",
    "この試合の最長ラリー：{count}"
  ],
  "ko": [
    "제 연주 보기",
    "얼후 알아보기",
    "복사하지 못했어요. 위의 WeChat ID를 직접 선택해 주세요.",
    "이번 경기 최장 랠리: {count}"
  ]
};
Object.keys(DETAIL_COPY).forEach(function (lang) {
  var words = DETAIL_COPY[lang], pack = TRANSLATIONS[lang];
  pack.interests.erhu.watch = words[0];
  pack.interests.erhu.learnMore = words[1];
  pack.links.social.copyFailed = words[2];
  pack.rally.matchLongest = words[3];
});

const RALLY_UNAVAILABLE_COPY = { en: "The table couldn’t load. Close and reopen it to try again.", es: "No se pudo cargar la mesa. Cierra y vuelve a abrir para intentarlo de nuevo.", zh: "球台暂时无法加载。请关闭后重新打开再试。", "zh-Hant": "球檯暫時無法載入。請關閉後重新開啟再試。", ja: "ゲームを読み込めませんでした。一度閉じて、もう一度開いてください。", ko: "게임을 불러오지 못했어요. 닫았다가 다시 열어 주세요." };
Object.keys(RALLY_UNAVAILABLE_COPY).forEach(function (lang) { TRANSLATIONS[lang].rally.unavailable = RALLY_UNAVAILABLE_COPY[lang]; });
