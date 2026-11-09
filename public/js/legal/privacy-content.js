/** Localized privacy content. Keep English aligned with privacy.html’s fallback. */
window.LEGAL_DOCUMENTS = window.LEGAL_DOCUMENTS || {};
window.LEGAL_DOCUMENTS.privacy = {
  "en": {
    "metaTitle": "Privacy Policy — Tim G",
    "metaDesc": "How Tim G’s personal hub handles privacy, local preferences, and contact information.",
    "label": "Legal",
    "title": "Privacy Policy",
    "updated": "Last updated: November 8, 2026",
    "intro": "This Privacy Policy explains what information is handled when you visit this personal hub website (the “Site”), how on-device preferences work, and how to contact the Site operator with questions.",
    "sections": [
      {
        "id": "overview",
        "title": "Overview",
        "paragraphs": [
          "This personal website is operated by Tim G (“I” or “me”). It includes Notes, photographs, performances, projects, and interactive features, and is available through timgong.me, t-g.pages.dev, and GitHub Pages.",
          "You can browse the public Site without an account or a purchase. The owner-only writing and preview tools are separate from public browsing; their authentication and private draft storage are not visitor accounts.",
          "This policy describes public browsing, local preferences, technical requests, and information you choose to send me. I am responsible for the personal information I control, including correspondence and information about people appearing in my posts."
        ]
      },
      {
        "id": "information",
        "title": "Information and Data Practices",
        "paragraphs": [
          "Information you choose to send. If you email contact.timg@icloud.com (or another address I publish), I receive the contents of that message, which may include your email address, name, and message body. That information is used to respond and, where reasonably necessary, to retain a record of the correspondence.",
          "Preferences and game records. The Site stores a few settings on your device, as listed below. The Site does not upload these stored values to an operator-run personal-data database.",
          "Hosting and delivery. Cloudflare and GitHub Pages deliver the public Site, depending on the address you use. Their infrastructure may process IP addresses, request times, browser and device information, and referring URLs for delivery, security, and operation. GitHub states that GitHub Pages logs visitor IP addresses for security. Provider retention and processing are governed by their own policies.",
          "Analytics and performance. Where enabled by the host, including on t-g.pages.dev, Cloudflare Web Analytics / real user monitoring (RUM) sends page URLs, referrers, and browser performance measurements to Cloudflare. Availability can differ between hosts and configurations. Cloudflare documents that its RUM beacon does not use cookies or browser storage, and that source IP addresses received with beacon requests are discarded at its edge rather than stored in RUM databases or logs. This is separate from ordinary hosting security logs. I do not use advertising trackers or behavioral profiling. Details: https://developers.cloudflare.com/speed/observatory/rum-beacon/",
          "GitHub preview. Opening, focusing, or hovering over the GitHub card loads a public contribution snapshot and profile image served by this Site. The snapshot is refreshed periodically from GitHub, rather than requesting a contribution service from your browser. Following the profile link opens GitHub under its own policy.",
          "Media and fonts. Images, display fonts, and the erhu performance video are served by this Site. On supported connections, approaching or showing interest in the erhu section can preload its image and video. Lightweight browsing and reported data-saver or very slow connections skip automatic video preloading. These are ordinary requests to the Site’s host."
        ]
      },
      {
        "id": "notes",
        "title": "Notes and reader interactions",
        "paragraphs": [
          "Reading Notes and subscribing through RSS do not require giving me your email address or creating an account. Your feed reader requests the public feed from t-g.pages.dev and may store its own copies; the reader’s privacy practices are its own. Feed requests are still ordinary requests to the hosting provider.",
          "Notes search runs in your browser against a downloaded public index. The search text is not sent to a search service by the Site. The index contains published writing, not private drafts.",
          "“Share this note” opens your device’s sharing interface or copies the article link when you choose. The Site does not read your clipboard or receive the recipients you select. Your chosen sharing application may process the link under its own policy.",
          "Notes likes. The public count is served by Cloudflare. If you like a note, your browser saves a random key for that note and sends it to Cloudflare so you can undo the like. The service stores a hash of the key with the note’s identifier while the like remains recorded. Only the total is public. The service uses your IP address to limit repeated requests and does not store it in the likes database. Clearing browser storage does not remove an existing like and may prevent you from undoing it.",
          "Comments. If you post a comment, the display name you enter, your message, and the posting date are public. No account or email address is required. Cloudflare stores and serves comments. The service uses your IP address to limit repeated submissions and does not store it with your comment. I can remove comments from the Site. Copies saved elsewhere may still exist.",
          "If a Note includes an externally hosted video, playing it or opening its direct link sends requests to that video host. Review that provider’s policy before using it."
        ]
      },
      {
        "id": "use",
        "title": "How Information Is Used",
        "paragraphs": [
          "To display the Site and remember preferences you set.",
          "To respond when you contact me.",
          "To maintain security, diagnose issues, and improve the Site over time.",
          "To comply with applicable law when required."
        ]
      },
      {
        "id": "sharing",
        "title": "Sharing",
        "paragraphs": [
          "I do not sell your personal information or share it for cross-context behavioral advertising.",
          "Service providers. Hosting and infrastructure providers process technical data as needed to deliver the Site. Outbound links (for example to GitHub, Instagram, or project pages) are operated by third parties under their own privacy policies.",
          "Legal requirements. I may disclose information if required by law or legal process, or to protect rights, safety, or security."
        ]
      },
      {
        "id": "cookies",
        "title": "Cookies and Local Storage",
        "paragraphs": [
          "The public Site uses browser storage for preferences and does not set advertising cookies. Hosting providers may use essential security cookies when needed. Authentication cookies for the separate owner-only tools are not needed to read the public Site.",
          "Storage belongs to the address you visit: settings on timgong.me and t-g.pages.dev are separate. You can clear site data, block storage, or use private browsing. The Site remains readable, but saved settings and game records may reset."
        ],
        "table": {
          "caption": "On-device storage",
          "headers": [
            "Stored item",
            "Storage",
            "Lifetime"
          ],
          "rows": [
            [
              "Language preference",
              "Local storage",
              "Until changed or cleared"
            ],
            [
              "Project-link host preference",
              "Local storage",
              "Until changed or cleared"
            ],
            [
              "Pong best rally, by difficulty",
              "Local storage",
              "Until replaced by a better record or cleared"
            ],
            [
              "Random key for each note you like",
              "Local storage",
              "Until cleared"
            ],
            [
              "Temporary light/dark override",
              "Session storage",
              "For the browser’s page session"
            ],
            [
              "Public GitHub-preview cache",
              "Session storage",
              "Reused for up to one hour within the page session"
            ]
          ]
        }
      },
      {
        "id": "retention",
        "title": "Retention",
        "paragraphs": [
          "On-device settings and caches follow the lifetimes in the table above. Your browser controls its storage and session restoration.",
          "Email is kept only as long as reasonably needed to respond and manage correspondence, unless a longer period is required by law.",
          "Notes may stay public until changed or withdrawn. Birthday Notes are listed for 24 hours after first publication; afterward, the author’s selected setting either keeps the direct link available or removes the article from the Site. Removal or withdrawal does not guarantee deletion of copies already saved by readers, feed services, caches, or public repository history. Private originals and backups may remain.",
          "Hosting, analytics, email, and other providers apply their own retention practices to information held in their systems."
        ]
      },
      {
        "id": "children",
        "title": "Children",
        "paragraphs": [
          "The Site is a general personal page and is not directed to children under 13 (or the equivalent age under the laws of your jurisdiction). I do not knowingly collect personal information from children under that age. If you believe a child has provided personal information, contact me and I will take appropriate steps."
        ]
      },
      {
        "id": "rights",
        "title": "Your Choices and Rights",
        "paragraphs": [
          "Depending on applicable law, you may have rights concerning personal information I control. You may also contact me about correcting or removing information or a photograph of you in a published Note. I will consider the request and respond within any period required by applicable law.",
          "Send requests to contact.timg@icloud.com. I may need enough information to identify the material and verify a request; please avoid sending unnecessary sensitive information.",
          "You can change local preferences using the Site’s controls or clear them in your browser. I cannot remotely erase data stored only on your device or copies independently held by others."
        ]
      },
      {
        "id": "security",
        "title": "Security",
        "paragraphs": [
          "I take reasonable steps appropriate to a personal static website. No method of transmission or storage is completely secure. Please use care when sending sensitive information by email."
        ]
      },
      {
        "id": "links",
        "title": "Links to Other Sites",
        "paragraphs": [
          "The Site links to my own projects and to independently operated services. My projects may have separate policies suited to their features. Other operators control their own privacy practices. Read the destination’s policy before providing information."
        ]
      },
      {
        "id": "changes",
        "title": "Changes to This Policy",
        "paragraphs": [
          "I may update this policy as the Site changes. The revised policy and its “Last updated” date will be posted here. If a change requires consent or an additional notice under applicable law, I will provide it before the relevant processing; continuing to browse does not by itself provide that consent."
        ]
      },
      {
        "id": "contact",
        "title": "Contact",
        "paragraphs": [
          "Questions about this Privacy Policy or privacy practices:",
          "Email: contact.timg@icloud.com",
          "Site operator: Tim G — San Francisco Bay Area"
        ]
      }
    ]
  },
  "es": {
    "metaTitle": "Política de privacidad — Tim G",
    "metaDesc": "Tratamiento de la información, preferencias locales y datos de contacto en el sitio personal de Tim G.",
    "label": "Legal",
    "title": "Política de privacidad",
    "updated": "Última actualización: 8 de noviembre de 2026",
    "intro": "La presente Política de privacidad explica qué información se trata cuando usted visita este sitio personal (el «Sitio»), cómo funcionan las preferencias en su dispositivo y cómo puede ponerse en contacto con el operador del Sitio.",
    "sections": [
      {
        "id": "overview",
        "title": "Objeto y ámbito",
        "paragraphs": [
          "Este sitio personal está operado por Tim G («yo»). Incluye notas, fotografías, actuaciones, proyectos y funciones interactivas, y está disponible en timgong.me, t-g.pages.dev y GitHub Pages.",
          "Puedes visitar el Sitio público sin cuenta ni compras. Las herramientas privadas de escritura y vista previa son exclusivas del propietario; su autenticación y almacenamiento de borradores no son cuentas para visitantes.",
          "Esta política describe la navegación pública, las preferencias locales, las solicitudes técnicas y la información que decides enviarme. Soy responsable de los datos personales que controlo, incluida la correspondencia y la información sobre personas que aparecen en mis publicaciones."
        ]
      },
      {
        "id": "information",
        "title": "Información objeto de tratamiento",
        "paragraphs": [
          "Información que usted decide enviar. Si escribe a contact.timg@icloud.com (u otra dirección que publique), recibo el contenido del mensaje, que puede incluir su dirección de correo electrónico, nombre y cuerpo del mensaje. Dicha información se utiliza para responder y, cuando resulte razonablemente necesario, para conservar un registro de la correspondencia.",
          "Preferencias y récords del juego. El Sitio guarda algunos ajustes en tu dispositivo, indicados en la tabla siguiente. El Sitio no envía esos valores a una base de datos personales gestionada por mí.",
          "Alojamiento y distribución. Cloudflare y GitHub Pages sirven el Sitio público según la dirección que utilices. Su infraestructura puede tratar direcciones IP, horas de solicitud, información del navegador y dispositivo, y URL de referencia para distribuir y proteger el Sitio y mantener su funcionamiento. GitHub indica que GitHub Pages registra las IP de los visitantes por seguridad. Cada proveedor aplica sus propias políticas de tratamiento y conservación.",
          "Analítica y rendimiento. Cuando el alojamiento lo habilita, incluido t-g.pages.dev, Cloudflare Web Analytics y la monitorización de usuarios reales (RUM) envían a Cloudflare las URL de las páginas, las páginas de referencia y métricas de rendimiento del navegador. Su disponibilidad puede variar según el alojamiento y la configuración. Cloudflare documenta que su baliza RUM no utiliza cookies ni almacenamiento del navegador y que descarta las IP de origen en su red perimetral sin guardarlas en bases de datos o registros de RUM. Esto es distinto de los registros de seguridad del alojamiento. No utilizo rastreadores publicitarios ni perfiles de comportamiento. Más información: https://developers.cloudflare.com/speed/observatory/rum-beacon/",
          "Vista previa de GitHub. Al abrir, enfocar o pasar el cursor por la tarjeta de GitHub, se cargan un resumen público de contribuciones y una imagen de perfil servidos por este Sitio. El resumen se actualiza periódicamente desde GitHub; tu navegador no consulta un servicio de contribuciones externo. El enlace al perfil abre GitHub, sujeto a su propia política.",
          "Contenido multimedia y fuentes. Este Sitio sirve las imágenes, las fuentes y el vídeo de erhu. En conexiones compatibles, acercarte a la sección de erhu o mostrar interés puede precargar su imagen y vídeo. El modo ligero y las conexiones que indican ahorro de datos o una velocidad muy baja omiten la precarga automática del vídeo. Son solicitudes normales al alojamiento del Sitio."
        ]
      },
      {
        "id": "notes",
        "title": "Notas e interacción con lectores",
        "paragraphs": [
          "Leer notas y suscribirte mediante RSS no requiere darme tu correo ni crear una cuenta. Tu lector consulta el canal público en t-g.pages.dev y puede guardar sus propias copias, conforme a su política de privacidad. Las consultas al canal siguen siendo solicitudes al proveedor de alojamiento.",
          "La búsqueda de notas se realiza en tu navegador sobre un índice público descargado. El Sitio no envía el texto de búsqueda a ningún servicio de búsqueda. El índice contiene textos publicados, no borradores privados.",
          "«Compartir esta nota» abre el menú de compartir del dispositivo o copia el enlace cuando lo eliges. El Sitio no lee el portapapeles ni recibe los destinatarios que seleccionas. La aplicación elegida puede tratar el enlace conforme a su política.",
          "Me gusta en las notas. Cloudflare proporciona el recuento público. Si indicas que te gusta una nota, tu navegador guarda una clave aleatoria para esa nota y la envía a Cloudflare para que puedas deshacer la reacción. El servicio guarda un hash de la clave junto al identificador de la nota mientras la reacción siga registrada. Solo el total es público. El servicio usa tu dirección IP para limitar las solicitudes repetidas y no la guarda en la base de datos de reacciones. Borrar los datos del navegador no elimina una reacción existente y puede impedir que la deshagas.",
          "Comentarios. Si publicas un comentario, el nombre visible que escribas, tu mensaje y la fecha de publicación serán públicos. No necesitas una cuenta ni un correo electrónico. Cloudflare almacena y sirve los comentarios. El servicio usa tu dirección IP para limitar los envíos repetidos y no la guarda con tu comentario. Puedo eliminar comentarios del Sitio. Pueden seguir existiendo copias guardadas en otros lugares.",
          "Si una nota incluye un vídeo alojado externamente, reproducirlo o abrir su enlace directo envía solicitudes a ese alojamiento. Consulta la política del proveedor antes de utilizarlo."
        ]
      },
      {
        "id": "use",
        "title": "Finalidades del tratamiento",
        "paragraphs": [
          "Mostrar el Sitio y recordar las preferencias que usted configure.",
          "Responder cuando se ponga en contacto conmigo.",
          "Mantener la seguridad, diagnosticar incidencias y mejorar el Sitio con el tiempo.",
          "Cumplir la normativa aplicable cuando resulte exigible."
        ]
      },
      {
        "id": "sharing",
        "title": "Comunicación a terceros",
        "paragraphs": [
          "No vendo su información personal.",
          "Proveedores de servicios. Los proveedores de alojamiento e infraestructura tratan datos técnicos en la medida necesaria para prestar el Sitio. Los enlaces salientes (por ejemplo, a GitHub, Instagram o páginas de proyectos) son operados por terceros con arreglo a sus propias políticas de privacidad.",
          "Obligaciones legales. Podré comunicar información cuando lo exija la ley o un procedimiento judicial, o para proteger derechos, la seguridad o la integridad."
        ]
      },
      {
        "id": "cookies",
        "title": "Cookies y almacenamiento local",
        "paragraphs": [
          "El Sitio público usa almacenamiento del navegador para las preferencias y no establece cookies publicitarias. El alojamiento puede utilizar cookies de seguridad esenciales cuando sean necesarias. Las cookies de autenticación de las herramientas privadas del propietario no son necesarias para leer el Sitio público.",
          "El almacenamiento pertenece a cada dirección: los ajustes de timgong.me y t-g.pages.dev son independientes. Puedes borrar los datos, bloquear el almacenamiento o navegar en privado. El Sitio seguirá siendo legible, pero los ajustes y récords guardados pueden restablecerse."
        ],
        "table": {
          "caption": "Almacenamiento en el dispositivo",
          "headers": [
            "Dato guardado",
            "Almacenamiento",
            "Duración"
          ],
          "rows": [
            [
              "Idioma",
              "Almacenamiento local",
              "Hasta cambiarlo o borrarlo"
            ],
            [
              "Alojamiento preferido para los proyectos",
              "Almacenamiento local",
              "Hasta cambiarlo o borrarlo"
            ],
            [
              "Mejor intercambio de Pong por dificultad",
              "Almacenamiento local",
              "Hasta superar el récord o borrarlo"
            ],
            [
              "Clave aleatoria para cada nota que te gusta",
              "Almacenamiento local",
              "Hasta que se borre"
            ],
            [
              "Cambio temporal de modo claro u oscuro",
              "Almacenamiento de sesión",
              "Durante la sesión de la página en el navegador"
            ],
            [
              "Caché de la vista previa pública de GitHub",
              "Almacenamiento de sesión",
              "Se reutiliza hasta una hora dentro de la sesión"
            ]
          ]
        }
      },
      {
        "id": "retention",
        "title": "Conservación",
        "paragraphs": [
          "Los ajustes y cachés del dispositivo siguen los plazos de la tabla. Tu navegador controla el almacenamiento y la restauración de sesiones.",
          "Conservo los correos solo durante el tiempo razonablemente necesario para responder y gestionar la correspondencia, salvo que la ley exija más tiempo.",
          "Las notas pueden permanecer públicas hasta modificarlas o retirarlas. Las notas de cumpleaños aparecen en los listados durante 24 horas desde su primera publicación; después, el ajuste del autor conserva el enlace directo o retira el artículo del Sitio. Retirarlo no garantiza borrar las copias de lectores, servicios RSS, cachés o el historial del repositorio público. Los originales privados y las copias de seguridad pueden conservarse.",
          "Los proveedores de alojamiento, analítica, correo y otros servicios aplican sus propios plazos de conservación a la información en sus sistemas."
        ]
      },
      {
        "id": "children",
        "title": "Menores de edad",
        "paragraphs": [
          "El Sitio es una página personal de carácter general y no está dirigido a menores de 13 años (o la edad equivalente según la normativa de su jurisdicción). No recopilo a sabiendas información personal de menores de dicha edad. Si considera que un menor ha facilitado información personal, póngase en contacto conmigo y adoptaré las medidas oportunas."
        ]
      },
      {
        "id": "rights",
        "title": "Derechos y opciones del interesado",
        "paragraphs": [
          "Según la ley aplicable, puedes tener derechos sobre los datos personales que controlo. También puedes solicitar que corrija o retire información o una fotografía tuya en una nota publicada. Evaluaré la solicitud y responderé dentro del plazo legal aplicable.",
          "Envía las solicitudes a contact.timg@icloud.com. Puede ser necesaria información suficiente para identificar el contenido y verificar la solicitud; evita enviar datos sensibles innecesarios.",
          "Puedes cambiar las preferencias con los controles del Sitio o borrarlas en el navegador. No puedo borrar a distancia datos guardados solo en tu dispositivo ni copias independientes de otras personas."
        ]
      },
      {
        "id": "security",
        "title": "Seguridad",
        "paragraphs": [
          "Adopto medidas razonables y proporcionadas a un sitio personal estático. Ningún método de transmisión o almacenamiento es absolutamente seguro. Extreme la precaución al enviar información sensible por correo electrónico."
        ]
      },
      {
        "id": "links",
        "title": "Enlaces a sitios de terceros",
        "paragraphs": [
          "El Sitio enlaza a mis proyectos y a servicios independientes. Mis proyectos pueden tener políticas propias según sus funciones. Los demás operadores controlan sus prácticas de privacidad. Consulta la política del destino antes de facilitar información."
        ]
      },
      {
        "id": "changes",
        "title": "Modificaciones de esta Política",
        "paragraphs": [
          "Puedo actualizar esta política cuando cambie el Sitio. Publicaré aquí la versión revisada y su fecha de actualización. Si la ley exige consentimiento u otro aviso, lo proporcionaré antes del tratamiento correspondiente; seguir navegando no constituye por sí solo ese consentimiento."
        ]
      },
      {
        "id": "contact",
        "title": "Contacto",
        "paragraphs": [
          "Para consultas sobre esta Política de privacidad o las prácticas de privacidad del Sitio:",
          "Correo electrónico: contact.timg@icloud.com",
          "Operador del Sitio: Tim G — Área de la Bahía de San Francisco"
        ]
      }
    ]
  },
  "zh": {
    "metaTitle": "隐私政策 — Tim G",
    "metaDesc": "Tim G 个人主页对个人信息、本地偏好及联系方式的处理说明。",
    "label": "法律信息",
    "title": "隐私政策",
    "updated": "最后更新：2026年11月8日",
    "intro": "本隐私政策说明您访问本个人主页网站（以下简称“本网站”）时会处理哪些信息、设备端偏好如何运作，以及如何就本政策联系网站运营者。",
    "sections": [
      {
        "id": "overview",
        "title": "概述",
        "paragraphs": [
          "本个人网站由 Tim G（下称“我”）运营，包含随记、照片、演奏、项目及互动内容，可通过 timgong.me、t-g.pages.dev 和 GitHub Pages 访问。",
          "浏览公开网站无需注册账号或购物。写作与预览工具仅供网站所有者使用；其中的身份验证和私人草稿存储不属于访客账号服务。",
          "本政策说明公开浏览、本地偏好、技术请求以及你主动发送给我的信息。我对由我控制的个人信息负责，包括往来邮件及文章中涉及他人的信息。"
        ]
      },
      {
        "id": "information",
        "title": "信息处理方式",
        "paragraphs": [
          "您主动发送的信息。如您向 contact.timg@icloud.com（或本人公布的其他地址）发送电子邮件，本人将收到该邮件所载内容，其中可能包括您的电子邮箱地址、姓名及正文。该等信息仅用于回复，并在合理必要时保留通信记录。",
          "偏好与游戏记录。本网站会在你的设备上保存下表所列的少量设置，不会将这些存储值上传到由我运营的个人信息数据库。",
          "托管与内容传送。本网站的公开页面由 Cloudflare 和 GitHub Pages 提供，具体取决于访问地址。服务商可能为内容传送、安全与运行处理 IP 地址、请求时间、浏览器和设备信息及来源网址。GitHub 说明 GitHub Pages 会出于安全目的记录访客 IP。各服务商依照自身政策处理和保留其系统内的数据。",
          "分析与性能。在托管服务启用时（包括 t-g.pages.dev），Cloudflare Web Analytics／真实用户监测（RUM）会向 Cloudflare 发送页面网址、来源网址及浏览器性能指标。不同访问地址和配置下的启用情况可能不同。Cloudflare 说明其 RUM 信标不使用 Cookie 或浏览器存储，并会在边缘网络丢弃信标请求携带的来源 IP，而不将其存入 RUM 数据库或日志。这与托管服务的一般安全日志不同。我不使用广告追踪或行为画像。详情：https://developers.cloudflare.com/speed/observatory/rum-beacon/",
          "GitHub 预览。打开、聚焦或悬停 GitHub 卡片时，会从本网站加载公开贡献数据的快照和头像。快照会定期从 GitHub 更新，而非由你的浏览器向第三方贡献服务请求。点击个人主页链接后，将访问 GitHub 并适用其政策。",
          "媒体与字体。图片、显示字体和二胡演奏视频由本网站提供。在支持的连接上，接近二胡部分或表现出查看意图时，浏览器可能预加载图片和视频。轻量浏览模式，以及浏览器报告的节省流量或极慢连接，会跳过自动视频预加载。这些均为发送至网站托管服务的一般请求。"
        ]
      },
      {
        "id": "notes",
        "title": "随记与读者互动",
        "paragraphs": [
          "阅读随记或通过 RSS 订阅无需向我提供邮箱或创建账号。你的阅读器会向 t-g.pages.dev 请求公开订阅源，并可能自行保存副本，其隐私处理遵循阅读器自身政策。订阅源请求仍会由托管服务处理。",
          "随记搜索在你的浏览器内，使用下载的公开索引完成。本网站不会将搜索文字发送给搜索服务。索引仅包含已公开的文章，不包含私人草稿。",
          "“分享这篇随记”会在你选择操作后打开设备分享界面或复制文章链接。本网站不会读取剪贴板，也不会获知你选择的收件人。你使用的分享应用可能按自身政策处理链接。",
          "随记点赞。公开的点赞总数由 Cloudflare 提供。点赞时，浏览器会为这篇随记保存一个随机密钥，并将其发送给 Cloudflare，以便你取消点赞。点赞记录保留期间，服务会保存密钥的哈希值和随记标识。只有总数会公开。服务使用你的 IP 地址限制重复请求，但不会将其存入点赞数据库。清除浏览器存储不会删除已有的点赞，也可能导致你无法取消点赞。",
          "评论。发表评论后，你填写的显示名称、评论内容和发布日期会公开。无需注册账号或提供电子邮箱。Cloudflare 存储并提供评论。服务使用你的 IP 地址限制重复提交，但不会将其与评论一同存储。我可以从本站移除评论，其他地方保存的副本仍可能存在。",
          "若随记包含外部托管的视频，播放或打开其直达链接会向该视频服务商发送请求。请在使用前查看其政策。"
        ]
      },
      {
        "id": "use",
        "title": "信息的使用目的",
        "paragraphs": [
          "用于展示本网站，并记住您设置的偏好。",
          "用于在您联系本人时作出回复。",
          "用于维护安全、排查故障，并持续改进本网站。",
          "用于在法律要求时遵守适用法律。"
        ]
      },
      {
        "id": "sharing",
        "title": "信息的共享",
        "paragraphs": [
          "本人不出售您的个人信息。",
          "服务提供商。托管与基础设施提供商为提供本网站，在必要范围内处理技术数据。外链（例如指向 GitHub、Instagram 或项目页面的链接）由第三方依其各自隐私政策运营。",
          "法律要求。在法律或司法程序要求，或为保护权利、安全或公共安全所必要时，本人可能披露相关信息。"
        ]
      },
      {
        "id": "cookies",
        "title": "Cookie 与本地存储",
        "paragraphs": [
          "公开网站使用浏览器存储保存偏好，不设置广告 Cookie。托管服务商可能在必要时使用必需的安全 Cookie。阅读公开网站无需使用仅限所有者的工具所需的身份验证 Cookie。",
          "存储按访问地址独立：timgong.me 和 t-g.pages.dev 的设置互不共享。你可以清除网站数据、禁止存储或使用隐私浏览；页面仍可阅读，但已保存的设置和游戏记录可能重置。"
        ],
        "table": {
          "caption": "设备上的存储",
          "headers": [
            "存储内容",
            "存储方式",
            "保留时间"
          ],
          "rows": [
            [
              "语言偏好",
              "本地存储",
              "直到修改或清除"
            ],
            [
              "项目链接的主站／备用站偏好",
              "本地存储",
              "直到修改或清除"
            ],
            [
              "各难度的 Pong 最佳回合记录",
              "本地存储",
              "直到刷新纪录或清除"
            ],
            [
              "每篇已点赞随记的随机密钥",
              "本地存储",
              "直到清除"
            ],
            [
              "临时浅色／深色模式选择",
              "会话存储",
              "在浏览器的页面会话期间"
            ],
            [
              "公开 GitHub 预览缓存",
              "会话存储",
              "在页面会话内最多复用一小时"
            ]
          ]
        }
      },
      {
        "id": "retention",
        "title": "保存期限",
        "paragraphs": [
          "设备上的设置与缓存遵循上表所列时间。存储及会话恢复由你的浏览器管理。",
          "邮件仅保留至回复与管理往来所合理需要的时间，法律另有要求的除外。",
          "随记可能持续公开，直到修改或撤下。生日随记自首次发布起展示在列表中 24 小时；之后，作者选择的设置会保留直达链接，或从网站移除文章。移除或撤下不保证删除读者、订阅服务、缓存或公开仓库历史中已保存的副本。私人原稿和备份可能继续保留。",
          "托管、分析、邮件等服务商对其系统内的信息适用各自的保留规则。"
        ]
      },
      {
        "id": "children",
        "title": "未成年人",
        "paragraphs": [
          "本网站为一般性个人页面，并非以未满 13 周岁的未成年人（或您所在司法辖区法律规定的相应年龄）为对象。本人不会在知情的情况下收集该年龄以下未成年人的个人信息。如您认为未成年人提供了个人信息，请与本人联系，本人将采取适当措施。"
        ]
      },
      {
        "id": "rights",
        "title": "您的选择与权利",
        "paragraphs": [
          "根据适用法律，你可能对我控制的个人信息享有相应权利。若已发布的随记包含你的信息或照片，也可联系我要求更正或移除。我会评估请求，并在适用法律规定的期限内答复。",
          "请发送请求至 contact.timg@icloud.com。我可能需要足以定位相关内容和核实请求的信息；请勿提供不必要的敏感信息。",
          "你可以通过网站控件修改本地偏好，或在浏览器中清除。我无法远程删除仅存于你设备上的数据或他人独立持有的副本。"
        ]
      },
      {
        "id": "security",
        "title": "安全措施",
        "paragraphs": [
          "本人采取与个人静态网站性质相称的合理措施。任何传输或存储方式均无法保证绝对安全。通过电子邮件发送敏感信息时，请谨慎行事。"
        ]
      },
      {
        "id": "links",
        "title": "第三方链接",
        "paragraphs": [
          "本网站链接至我自己的项目和独立运营的服务。我的项目可能根据其功能适用单独的政策。其他运营者自行决定其隐私处理方式，请在提供信息前阅读目标网站的政策。"
        ]
      },
      {
        "id": "changes",
        "title": "本政策的变更",
        "paragraphs": [
          "我可能随网站变化更新本政策，并在此发布新版本及“最后更新”日期。若适用法律要求取得同意或另行通知，我会在相关处理开始前提供；继续浏览本身不代表作出该同意。"
        ]
      },
      {
        "id": "contact",
        "title": "联系方式",
        "paragraphs": [
          "如对本隐私政策或隐私相关做法有任何疑问：",
          "电子邮箱：contact.timg@icloud.com",
          "网站运营者：Tim G — 美国旧金山湾区"
        ]
      }
    ]
  },
  "ja": {
    "metaTitle": "プライバシーポリシー — Tim G",
    "metaDesc": "Tim G の個人向けサイトにおける情報の取扱い、端末上の設定、およびお問い合わせ方法について。",
    "label": "法的情報",
    "title": "プライバシーポリシー",
    "updated": "最終更新日：2026年11月8日",
    "intro": "本プライバシーポリシーは、本個人向けハブウェブサイト（以下「本サイト」）への訪問に際し、情報がどのように収集、利用、開示および保存されるか、端末上の設定がどのように機能するか、ならびに本サイト運営者へのお問い合わせ方法を定めるものです。",
    "sections": [
      {
        "id": "overview",
        "title": "総則",
        "paragraphs": [
          "この個人サイトはTim G（以下「私」）が運営しています。ノート、写真、演奏、プロジェクト、インタラクティブなコンテンツを掲載し、timgong.me、t-g.pages.dev、GitHub Pagesで公開しています。",
          "公開サイトはアカウント登録や購入なしで閲覧できます。執筆・プレビューツールは所有者専用であり、その認証や非公開の下書き保存は訪問者向けのアカウントサービスではありません。",
          "本ポリシーでは、公開ページの閲覧、端末内の設定、技術的なリクエスト、任意で送っていただく情報について説明します。メールのやり取りや投稿内の人物情報など、私が管理する個人情報については私が責任を負います。"
        ]
      },
      {
        "id": "information",
        "title": "取り扱う情報",
        "paragraphs": [
          "お客様が自ら送信する情報。contact.timg@icloud.com（または私が公表する他のアドレス）宛てに電子メールを送信された場合、私は当該メッセージの内容（電子メールアドレス、氏名、本文等を含み得ます）を受領します。当該情報は返信のため、および合理的に必要な範囲で通信記録を保持するために利用します。",
          "設定とゲーム記録。下の表に記載した少数の設定を端末に保存します。本サイトがその保存値を私の運営する個人情報データベースへ送信することはありません。",
          "ホスティングと配信。公開サイトは、アクセス先に応じてCloudflareまたはGitHub Pagesから配信されます。これらの基盤では、配信、安全性、運用のためにIPアドレス、リクエスト時刻、ブラウザー・端末情報、参照元URLを処理する場合があります。GitHubは、GitHub Pagesが安全性のために訪問者のIPを記録すると説明しています。各社のシステム内の処理・保存には各社のポリシーが適用されます。",
          "アクセス解析と性能。t-g.pages.devを含め、ホスト側で有効な場合、Cloudflare Web Analytics／リアルユーザーモニタリング（RUM）はページURL、参照元URL、ブラウザーの性能測定値をCloudflareへ送信します。有効かどうかはホストや設定により異なります。Cloudflareの説明では、RUMビーコンはCookieやブラウザーの保存領域を使わず、リクエストの送信元IPはエッジで破棄され、RUMのデータベースやログには保存されません。通常のホスティングのセキュリティログとは別の仕組みです。広告トラッカーや行動プロファイリングは使用しません。詳細：https://developers.cloudflare.com/speed/observatory/rum-beacon/",
          "GitHubプレビュー。GitHubカードを開く、フォーカスする、またはポインターを重ねると、このサイトから公開貢献データのスナップショットとプロフィール画像を読み込みます。データはGitHubから定期的に更新され、訪問者のブラウザーから外部の貢献データサービスへ問い合わせることはありません。プロフィールのリンク先ではGitHubのポリシーが適用されます。",
          "メディアとフォント。画像、表示用フォント、二胡の演奏動画はこのサイトから配信します。対応する接続環境では、二胡のセクションに近づいたり閲覧の意図を示したりすると、画像や動画を先読みする場合があります。軽量表示や、ブラウザーが通信量節約・非常に低速な接続を報告する場合、自動の動画先読みは行いません。いずれもサイトのホストへの通常のリクエストです。"
        ]
      },
      {
        "id": "notes",
        "title": "ノートと読者の参加",
        "paragraphs": [
          "ノートの閲覧やRSS購読のために、メールアドレスの提供やアカウント作成は必要ありません。フィードリーダーはt-g.pages.devの公開フィードを取得し、独自にコピーを保存することがあります。そのプライバシー慣行は各リーダーのポリシーに従います。フィードの取得もホストへの通常のリクエストです。",
          "ノート検索は、ダウンロードした公開インデックスを使ってブラウザー内で実行します。本サイトが検索語を検索サービスへ送ることはありません。インデックスに含むのは公開済みの文章であり、非公開の下書きではありません。",
          "「このノートを共有」を選ぶと、端末の共有画面を開くか記事のリンクをコピーします。本サイトはクリップボードを読み取らず、選んだ送信先も受け取りません。選択したアプリは、そのポリシーに従ってリンクを処理する場合があります。",
          "ノートの「いいね」。公開される件数は Cloudflare が提供します。「いいね」を押すと、ブラウザーがそのノート専用のランダムなキーを保存し、取り消せるよう Cloudflare に送信します。「いいね」が記録されている間、サービスはキーのハッシュ値とノートの識別子を保存します。公開されるのは合計件数のみです。サービスは連続したリクエストを制限するために IP アドレスを使用しますが、「いいね」のデータベースには保存しません。ブラウザーのデータを消去しても「いいね」は消えず、取り消せなくなる場合があります。",
          "コメントを投稿すると、入力した表示名、コメント本文、投稿日が公開されます。アカウントやメールアドレスは不要です。コメントの保存と配信には Cloudflare を利用します。連続投稿を制限するために IP アドレスを使用しますが、コメントと一緒には保存しません。コメントはこのサイトから削除できますが、他の場所に保存されたコピーが残る場合があります。",
          "ノートに外部ホストの動画が含まれる場合、再生や直接リンクの利用により、そのホストへリクエストが送られます。利用前に提供元のポリシーをご確認ください。"
        ]
      },
      {
        "id": "use",
        "title": "利用目的",
        "paragraphs": [
          "本サイトを表示し、お客様が設定した内容を保持するため。",
          "お問い合わせへの返信のため。",
          "セキュリティの維持、障害の診断、および本サイトの改善のため。",
          "適用法令の遵守が求められる場合のため。"
        ]
      },
      {
        "id": "sharing",
        "title": "第三者への提供等",
        "paragraphs": [
          "お客様の個人情報を販売することはありません。",
          "サービス提供者。ホスティングおよびインフラ提供者は、本サイトの提供に必要な範囲で技術データを処理します。外部リンク（GitHub、Instagram、プロジェクトページ等）は、各第三者のプライバシーポリシーに従って運営されます。",
          "法令上の要請。法令もしくは法的手続により要求される場合、または権利・安全・セキュリティの保護のために必要な場合、情報を開示することがあります。"
        ]
      },
      {
        "id": "cookies",
        "title": "Cookie およびローカルストレージ",
        "paragraphs": [
          "公開サイトは設定にブラウザーの保存領域を使い、広告Cookieを設定しません。ホストは必要に応じて必須のセキュリティCookieを使う場合があります。所有者専用ツールの認証Cookieは、公開サイトの閲覧には不要です。",
          "保存領域はアクセス先ごとに独立し、timgong.meとt-g.pages.devの設定は共有されません。サイトデータの消去、保存の禁止、プライベートブラウズが可能です。ページは引き続き読めますが、設定やゲーム記録はリセットされる場合があります。"
        ],
        "table": {
          "caption": "端末内の保存",
          "headers": [
            "保存するもの",
            "保存先",
            "期間"
          ],
          "rows": [
            [
              "言語設定",
              "ローカルストレージ",
              "変更または消去するまで"
            ],
            [
              "プロジェクトの主・予備ホスト設定",
              "ローカルストレージ",
              "変更または消去するまで"
            ],
            [
              "難易度別のPong最長ラリー",
              "ローカルストレージ",
              "記録更新または消去するまで"
            ],
            [
              "「いいね」したノートごとのランダムなキー",
              "ローカルストレージ",
              "消去するまで"
            ],
            [
              "一時的なライト・ダーク設定",
              "セッションストレージ",
              "ブラウザーのページセッション中"
            ],
            [
              "公開GitHubプレビューのキャッシュ",
              "セッションストレージ",
              "ページセッション内で最長1時間再利用"
            ]
          ]
        }
      },
      {
        "id": "retention",
        "title": "保存期間",
        "paragraphs": [
          "端末内の設定とキャッシュは上の表の期間に従います。保存とセッション復元はブラウザーが管理します。",
          "メールは返信ややり取りの管理に合理的に必要な期間のみ保存します。法律で長期保存が求められる場合はその限りではありません。",
          "ノートは変更・撤回するまで公開される場合があります。誕生日ノートは初回公開から24時間一覧に表示され、その後は著者の設定により直接リンクを維持するか記事をサイトから削除します。削除・撤回しても、読者、フィードサービス、キャッシュ、公開リポジトリの履歴に保存されたコピーの削除は保証できません。非公開の原稿やバックアップは残る場合があります。",
          "ホスティング、解析、メールなどの提供元は、自社のシステム内の情報に独自の保存方針を適用します。"
        ]
      },
      {
        "id": "children",
        "title": "児童等",
        "paragraphs": [
          "本サイトは一般向けの個人ページであり、13歳未満（またはお客様の法域における法令が定める同等の年齢）の児童を対象としていません。当該年齢未満の児童から故意に個人情報を収集することはありません。児童が個人情報を提供したと思われる場合はご連絡ください。適切な措置を講じます。"
        ]
      },
      {
        "id": "rights",
        "title": "お客様の権利および選択",
        "paragraphs": [
          "適用法に基づき、私が管理する個人情報について権利を有する場合があります。公開ノートに含まれるご自身の情報や写真の訂正・削除についても連絡できます。内容を確認し、適用法が定める期限内に回答します。",
          "ご連絡はcontact.timg@icloud.comへお願いします。対象を特定し、依頼を確認するのに十分な情報が必要な場合がありますが、不必要な機微情報は送らないでください。",
          "設定はサイトの操作画面で変更するかブラウザーで消去できます。端末だけに保存されたデータや他者が独立して保持するコピーを、私が遠隔で消去することはできません。"
        ]
      },
      {
        "id": "security",
        "title": "安全管理",
        "paragraphs": [
          "個人向け静的サイトとして相当な合理的措置を講じます。伝送または保存のいかなる方法も完全に安全とは限りません。機密性の高い情報を電子メールで送付する際はご注意ください。"
        ]
      },
      {
        "id": "links",
        "title": "他サイトへのリンク",
        "paragraphs": [
          "本サイトは私のプロジェクトと独立したサービスへリンクしています。私のプロジェクトには、その機能に応じた別のポリシーがある場合があります。他の運営者はそれぞれのプライバシー慣行を管理します。情報を提供する前にリンク先のポリシーをご確認ください。"
        ]
      },
      {
        "id": "changes",
        "title": "本ポリシーの変更",
        "paragraphs": [
          "サイトの変更に応じて本ポリシーを更新する場合があります。改訂版と「最終更新日」をここに掲載します。適用法が同意や追加通知を求める場合は、対象の処理を始める前に対応します。閲覧を続けること自体がその同意となるわけではありません。"
        ]
      },
      {
        "id": "contact",
        "title": "お問い合わせ",
        "paragraphs": [
          "本プライバシーポリシーまたはプライバシーに関する取扱いについてのご質問：",
          "電子メール：contact.timg@icloud.com",
          "サイト運営者：Tim G — サンフランシスコ・ベイエリア"
        ]
      }
    ]
  },
  "zh-Hant": {
    "intro": "本隱私政策說明您瀏覽本個人主頁網站（以下簡稱“本網站”）時會處理哪些資訊、裝置端偏好如何運作，以及如何就本政策聯絡網站營運者。",
    "label": "法律資訊",
    "metaDesc": "Tim G 個人主頁對個人資訊、本地偏好及聯絡方式的處理說明。",
    "metaTitle": "隱私政策 — Tim G",
    "sections": [
      {
        "id": "overview",
        "paragraphs": [
          "本個人網站由 Tim G（下稱「我」）營運，包含隨記、照片、演奏、專案及互動內容，可透過 timgong.me、t-g.pages.dev 和 GitHub Pages 造訪。",
          "瀏覽公開網站無須註冊帳號或購物。寫作與預覽工具僅供網站擁有者使用；其中的身分驗證和私人草稿儲存不屬於訪客帳號服務。",
          "本政策說明公開瀏覽、本機偏好設定、技術請求，以及你主動傳送給我的資訊。我對由我控制的個人資訊負責，包括往來郵件及文章中涉及他人的資訊。"
        ],
        "title": "概述"
      },
      {
        "id": "information",
        "paragraphs": [
          "您主動發送的資訊。如您向 contact.timg@icloud.com（或本人公佈的其他地址）發送電子郵件，本人將收到該郵件所載內容，其中可能包括您的電子郵箱地址、姓名及正文。該等資訊僅用於回復，並在合理必要時保留通信記錄。",
          "偏好設定與遊戲紀錄。本網站會在你的裝置上儲存下表所列的少量設定，不會將這些儲存值上傳至由我營運的個人資訊資料庫。",
          "託管與內容傳送。本網站的公開網頁由 Cloudflare 和 GitHub Pages 提供，實際服務取決於造訪地址。服務商可能為內容傳送、安全與運作處理 IP 位址、請求時間、瀏覽器和裝置資訊及來源網址。GitHub 說明 GitHub Pages 會基於安全目的記錄訪客 IP。各服務商依照自身政策處理和保留其系統內的資料。",
          "分析與效能。在託管服務啟用時（包括 t-g.pages.dev），Cloudflare Web Analytics／真實使用者監測（RUM）會向 Cloudflare 傳送網頁網址、來源網址及瀏覽器效能指標。不同造訪地址和設定下的啟用情況可能不同。Cloudflare 說明其 RUM 信標不使用 Cookie 或瀏覽器儲存空間，並會在邊緣網路捨棄信標請求攜帶的來源 IP，不將其存入 RUM 資料庫或日誌。這與託管服務的一般安全日誌不同。我不使用廣告追蹤或行為剖析。詳情：https://developers.cloudflare.com/speed/observatory/rum-beacon/",
          "GitHub 預覽。開啟、聚焦或將游標停在 GitHub 卡片時，會從本網站載入公開貢獻資料的快照與頭像。快照會定期從 GitHub 更新，而非由你的瀏覽器向第三方貢獻服務請求。點選個人頁面連結後，將造訪 GitHub 並適用其政策。",
          "媒體與字型。圖片、顯示字型和二胡演奏影片由本網站提供。在支援的連線上，接近二胡部分或表現出查看意圖時，瀏覽器可能預先載入圖片和影片。輕量瀏覽模式，以及瀏覽器回報的節省流量或極慢連線，會略過自動影片預載。這些均為傳送至網站託管服務的一般請求。"
        ],
        "title": "資訊處理方式"
      },
      {
        "id": "notes",
        "title": "隨記與讀者互動",
        "paragraphs": [
          "閱讀隨記或透過 RSS 訂閱，無須向我提供電子郵件地址或建立帳號。你的閱讀器會向 t-g.pages.dev 請求公開訂閱來源，並可能自行儲存副本，其隱私處理遵循閱讀器自身政策。訂閱來源請求仍會由託管服務處理。",
          "隨記搜尋在你的瀏覽器內，使用下載的公開索引完成。本網站不會將搜尋文字傳送給搜尋服務。索引僅包含已公開文章，不包含私人草稿。",
          "「分享這篇隨記」會在你選擇操作後開啟裝置分享介面或複製文章連結。本網站不會讀取剪貼簿，也不會得知你選擇的收件人。你使用的分享應用程式可能按自身政策處理連結。",
          "隨記按讚。公開的按讚總數由 Cloudflare 提供。按讚時，瀏覽器會為該篇隨記儲存一組隨機金鑰，並傳送給 Cloudflare，讓你可以收回讚。按讚紀錄保留期間，服務會儲存金鑰的雜湊值和隨記識別碼。只有總數會公開。服務使用你的 IP 位址限制重複請求，但不會將其存入按讚資料庫。清除瀏覽器儲存空間不會移除既有的讚，也可能讓你無法收回。",
          "留言。發表留言後，你填寫的顯示名稱、留言內容和發表日期都會公開。無須註冊帳號或提供電子郵件。Cloudflare 儲存並提供留言。服務使用你的 IP 位址限制重複送出，但不會將其與留言一同儲存。我可以從本站移除留言，其他地方儲存的副本仍可能存在。",
          "若隨記包含外部託管的影片，播放或開啟其直接連結會向該影片服務商傳送請求。請在使用前查看其政策。"
        ]
      },
      {
        "id": "use",
        "paragraphs": [
          "用於展示本網站，並記住您設定的偏好。",
          "用於在您聯絡本人時作出回復。",
          "用於維護安全、排查故障，並持續改進本網站。",
          "用於在法律要求時遵守適用法律。"
        ],
        "title": "資訊的使用目的"
      },
      {
        "id": "sharing",
        "paragraphs": [
          "本人不出售您的個人資訊。",
          "服務提供者。託管與基礎設施提供者為提供本網站，在必要範圍內處理技術資料。外部連結（例如指向 GitHub、Instagram 或專案頁面的連結）由第三方依其各自隱私政策營運。",
          "法律要求。在法律或司法程序要求，或為保護權利、安全或公共安全所必要時，本人可能披露相關資訊。"
        ],
        "title": "資訊的共享"
      },
      {
        "id": "cookies",
        "paragraphs": [
          "公開網站使用瀏覽器儲存空間保存偏好設定，不設定廣告 Cookie。託管服務商可能在必要時使用必要的安全 Cookie。閱讀公開網站無須使用僅限擁有者工具所需的身分驗證 Cookie。",
          "儲存按造訪地址獨立：timgong.me 和 t-g.pages.dev 的設定互不共用。你可以清除網站資料、禁止儲存或使用私密瀏覽；網頁仍可閱讀，但已儲存的設定和遊戲紀錄可能重設。"
        ],
        "title": "Cookie 與本機儲存",
        "table": {
          "caption": "裝置上的儲存",
          "headers": [
            "儲存內容",
            "儲存方式",
            "保留時間"
          ],
          "rows": [
            [
              "語言偏好",
              "本機儲存空間",
              "直到變更或清除"
            ],
            [
              "專案連結的主站／備用站偏好",
              "本機儲存空間",
              "直到變更或清除"
            ],
            [
              "各難度的 Pong 最佳回合紀錄",
              "本機儲存空間",
              "直到刷新紀錄或清除"
            ],
            [
              "每篇已按讚隨記的隨機金鑰",
              "本機儲存空間",
              "直到清除"
            ],
            [
              "暫時的淺色／深色模式選擇",
              "工作階段儲存空間",
              "在瀏覽器的網頁工作階段期間"
            ],
            [
              "公開 GitHub 預覽快取",
              "工作階段儲存空間",
              "在網頁工作階段內最多重用一小時"
            ]
          ]
        }
      },
      {
        "id": "retention",
        "paragraphs": [
          "裝置上的設定與快取遵循上表所列時間。儲存與工作階段還原由你的瀏覽器管理。",
          "郵件僅保留至回覆與管理往來所合理需要的時間，法律另有要求的除外。",
          "隨記可能持續公開，直到修改或撤下。生日隨記自首次發布起顯示在列表中 24 小時；之後，作者選擇的設定會保留直接連結，或從網站移除文章。移除或撤下不保證刪除讀者、訂閱服務、快取或公開儲存庫歷史中已儲存的副本。私人原稿和備份可能繼續保留。",
          "託管、分析、郵件等服務商對其系統內的資訊適用各自的保留規則。"
        ],
        "title": "保存期限"
      },
      {
        "id": "children",
        "paragraphs": [
          "本網站為一般性個人頁面，並非以未滿 13 歲的未成年人（或您所在司法轄區法律規定的相應年齡）為對象。本人不會在知情的情況下收集該年齡以下未成年人的個人資訊。如您認為未成年人提供了個人資訊，請與本人聯絡，本人將採取適當措施。"
        ],
        "title": "未成年人"
      },
      {
        "id": "rights",
        "paragraphs": [
          "根據適用法律，你可能對我控制的個人資訊享有相應權利。若已發布的隨記包含你的資訊或照片，也可聯絡我要求更正或移除。我會評估請求，並在適用法律規定的期限內答覆。",
          "請傳送請求至 contact.timg@icloud.com。我可能需要足以定位相關內容和核實請求的資訊；請勿提供不必要的敏感資訊。",
          "你可以透過網站控制項變更本機偏好設定，或在瀏覽器中清除。我無法遠端刪除僅存於你裝置上的資料或他人獨立持有的副本。"
        ],
        "title": "您的選擇與權利"
      },
      {
        "id": "security",
        "paragraphs": [
          "本人採取與個人靜態網站性質相稱的合理措施。任何傳輸或儲存方式均無法保證絕對安全。通過電子郵件發送敏感資訊時，請謹慎行事。"
        ],
        "title": "安全措施"
      },
      {
        "id": "links",
        "paragraphs": [
          "本網站連結至我自己的專案和獨立營運的服務。我的專案可能根據其功能適用個別政策。其他營運者自行決定其隱私處理方式，請在提供資訊前閱讀目標網站的政策。"
        ],
        "title": "第三方連結"
      },
      {
        "id": "changes",
        "paragraphs": [
          "我可能隨網站變化更新本政策，並在此發布新版本及「最後更新」日期。若適用法律要求取得同意或另行通知，我會在相關處理開始前提供；繼續瀏覽本身不代表作出該同意。"
        ],
        "title": "本政策的變更"
      },
      {
        "id": "contact",
        "paragraphs": [
          "如對本隱私政策或隱私相關做法有任何疑問：",
          "電子郵箱：contact.timg@icloud.com",
          "網站營運者：Tim G — 美國舊金山灣區"
        ],
        "title": "聯絡方式"
      }
    ],
    "title": "隱私政策",
    "updated": "最後更新：2026年11月8日"
  },
  "ko": {
    "metaTitle": "개인정보 처리방침 — Tim G",
    "metaDesc": "Tim G의 개인 웹사이트에서 개인정보, 기기 내 환경설정, 연락처 정보를 처리하는 방식입니다.",
    "label": "법적 안내",
    "title": "개인정보 처리방침",
    "updated": "최종 수정일: 2026년 11월 8일",
    "intro": "이 개인정보 처리방침은 개인 웹사이트(이하 ‘사이트’)를 방문할 때 어떤 정보가 처리되는지, 기기에 저장되는 환경설정이 어떻게 작동하는지, 질문이 있을 때 운영자에게 어떻게 연락할 수 있는지 설명합니다.",
    "sections": [
      {
        "id": "overview",
        "title": "개요",
        "paragraphs": [
          "이 개인 웹사이트는 Tim G(이하 “저”)가 운영합니다. 노트, 사진, 연주, 프로젝트, 인터랙티브 콘텐츠를 제공하며 timgong.me, t-g.pages.dev, GitHub Pages에서 이용할 수 있습니다.",
          "공개 사이트는 계정이나 구매 없이 둘러볼 수 있습니다. 글쓰기와 미리보기 도구는 소유자 전용이며, 해당 도구의 인증과 비공개 초안 저장은 방문자용 계정 서비스가 아닙니다.",
          "이 방침은 공개 페이지 이용, 기기 내 설정, 기술적 요청, 직접 보내 주시는 정보를 설명합니다. 이메일과 게시물에 등장하는 사람의 정보 등 제가 관리하는 개인정보에 대해서는 제가 책임을 집니다."
        ]
      },
      {
        "id": "information",
        "title": "정보와 데이터 처리",
        "paragraphs": [
          "직접 보내는 정보. contact.timg@icloud.com 또는 제가 공개한 다른 주소로 이메일을 보내면, 이메일 주소, 이름, 메시지 본문 등이 포함된 내용을 받게 됩니다. 이 정보는 답변을 보내고, 합리적으로 필요한 경우 서신 기록을 보관하는 데 사용합니다.",
          "설정과 게임 기록. 아래 표의 몇 가지 설정을 기기에 저장합니다. 사이트는 이 저장값을 제가 운영하는 개인정보 데이터베이스로 전송하지 않습니다.",
          "호스팅과 전송. 접속 주소에 따라 Cloudflare와 GitHub Pages가 공개 사이트를 제공합니다. 이들의 시스템은 전송, 보안, 운영을 위해 IP 주소, 요청 시각, 브라우저·기기 정보, 유입 경로 URL을 처리할 수 있습니다. GitHub는 GitHub Pages가 보안을 위해 방문자 IP를 기록한다고 설명합니다. 각 제공업체 시스템의 처리와 보관에는 해당 업체의 방침이 적용됩니다.",
          "분석 및 성능. t-g.pages.dev를 포함해 호스트가 활성화한 경우 Cloudflare Web Analytics와 실제 사용자 모니터링(RUM)은 페이지 URL, 유입 경로, 브라우저 성능 측정값을 Cloudflare로 전송합니다. 호스트와 설정에 따라 활성화 여부가 다를 수 있습니다. Cloudflare에 따르면 RUM 비콘은 쿠키나 브라우저 저장소를 사용하지 않으며, 비콘 요청의 발신 IP는 엣지에서 폐기되고 RUM 데이터베이스나 로그에 저장되지 않습니다. 이는 일반 호스팅 보안 로그와 별개입니다. 광고 추적이나 행동 프로파일링은 사용하지 않습니다. 자세한 내용: https://developers.cloudflare.com/speed/observatory/rum-beacon/",
          "GitHub 미리보기. GitHub 카드를 열거나, 포커스를 두거나, 마우스를 올리면 이 사이트에서 제공하는 공개 기여 내역의 스냅샷과 프로필 사진을 불러옵니다. 스냅샷은 GitHub에서 정기적으로 갱신되며, 방문자의 브라우저가 외부 기여 내역 서비스에 요청하지 않습니다. 프로필 링크를 열면 GitHub로 이동하며 해당 방침이 적용됩니다.",
          "미디어와 글꼴. 이미지, 표시용 글꼴, 얼후 연주 영상은 이 사이트에서 제공합니다. 지원되는 연결에서는 얼후 영역에 가까이 가거나 관심을 표시하면 이미지와 영상을 미리 불러올 수 있습니다. 경량 모드와 브라우저가 데이터 절약 또는 매우 느린 연결을 보고한 경우에는 영상을 자동으로 미리 불러오지 않습니다. 모두 사이트 호스트에 보내는 일반적인 요청입니다."
        ]
      },
      {
        "id": "notes",
        "title": "노트와 독자 참여",
        "paragraphs": [
          "노트를 읽거나 RSS로 구독할 때 이메일을 제공하거나 계정을 만들 필요가 없습니다. 피드 리더는 t-g.pages.dev의 공개 피드를 요청하고 사본을 보관할 수 있으며, 해당 리더의 개인정보 처리방침이 적용됩니다. 피드 요청도 호스팅 제공업체로 보내는 일반적인 요청입니다.",
          "노트 검색은 다운로드한 공개 색인을 이용해 브라우저 안에서 실행됩니다. 사이트는 검색어를 검색 서비스로 보내지 않습니다. 색인에는 공개된 글만 있으며 비공개 초안은 없습니다.",
          "“이 노트 공유하기”는 선택한 경우 기기의 공유 화면을 열거나 글의 링크를 복사합니다. 사이트는 클립보드를 읽거나 선택한 수신자를 전달받지 않습니다. 선택한 앱은 자체 방침에 따라 링크를 처리할 수 있습니다.",
          "노트 좋아요. 공개 좋아요 수는 Cloudflare가 제공합니다. 좋아요를 누르면 브라우저가 해당 노트에 대한 무작위 키를 저장하고, 나중에 좋아요를 취소할 수 있도록 Cloudflare에 전송합니다. 좋아요가 기록되어 있는 동안 서비스는 키의 해시값과 노트 식별자를 저장합니다. 공개되는 것은 총개수뿐입니다. 반복 요청을 제한하기 위해 IP 주소를 사용하며, 이를 좋아요 데이터베이스에 저장하지 않습니다. 브라우저의 데이터를 지워도 기존 좋아요는 삭제되지 않으며, 이후에는 취소하지 못할 수 있습니다.",
          "댓글을 등록하면 입력한 표시 이름, 댓글 내용, 작성 날짜가 공개됩니다. 계정이나 이메일 주소는 필요하지 않습니다. Cloudflare가 댓글을 저장하고 제공합니다. 반복 제출을 제한하기 위해 IP 주소를 사용하지만 댓글과 함께 저장하지 않습니다. 사이트에서 댓글을 삭제할 수 있으며, 다른 곳에 저장된 사본은 남아 있을 수 있습니다.",
          "노트에 외부 호스팅 영상이 포함된 경우 재생하거나 직접 링크를 열면 해당 호스트로 요청이 전송됩니다. 이용 전에 제공업체의 방침을 확인해 주세요."
        ]
      },
      {
        "id": "use",
        "title": "정보를 사용하는 목적",
        "paragraphs": [
          "사이트를 표시하고 사용자가 지정한 환경설정을 기억하기 위해 사용합니다.",
          "연락을 받았을 때 답변하기 위해 사용합니다.",
          "보안을 유지하고, 문제를 진단하며, 사이트를 점진적으로 개선하기 위해 사용합니다.",
          "필요한 경우 적용되는 법률을 준수하기 위해 사용합니다."
        ]
      },
      {
        "id": "sharing",
        "title": "정보 공유",
        "paragraphs": [
          "저는 사용자의 개인정보를 판매하거나, 서로 다른 서비스의 이용 활동을 연결하는 행동 기반 광고를 위해 공유하지 않습니다.",
          "서비스 제공업체. 호스팅 및 인프라 제공업체는 사이트 제공에 필요한 기술 데이터를 처리합니다. GitHub, Instagram, 프로젝트 페이지 등 외부 링크의 서비스는 제3자가 자체 개인정보 처리방침에 따라 운영합니다.",
          "법적 요구. 법률이나 법적 절차에서 요구하거나 권리, 안전 또는 보안을 보호하기 위해 필요한 경우 정보를 공개할 수 있습니다."
        ]
      },
      {
        "id": "cookies",
        "title": "쿠키와 로컬 저장소",
        "paragraphs": [
          "공개 사이트는 설정을 위해 브라우저 저장소를 사용하며 광고 쿠키를 설정하지 않습니다. 호스팅 제공업체는 필요한 경우 필수 보안 쿠키를 사용할 수 있습니다. 소유자 전용 도구의 인증 쿠키는 공개 사이트를 읽는 데 필요하지 않습니다.",
          "저장소는 접속 주소별로 구분되어 timgong.me와 t-g.pages.dev의 설정은 공유되지 않습니다. 사이트 데이터를 지우거나 저장소를 차단하거나 비공개 브라우징을 사용할 수 있습니다. 페이지는 계속 읽을 수 있지만 저장한 설정과 게임 기록은 초기화될 수 있습니다."
        ],
        "table": {
          "caption": "기기 내 저장소",
          "headers": [
            "저장 항목",
            "저장 방식",
            "보관 기간"
          ],
          "rows": [
            [
              "언어 설정",
              "로컬 저장소",
              "변경하거나 삭제할 때까지"
            ],
            [
              "프로젝트 기본·예비 호스트 설정",
              "로컬 저장소",
              "변경하거나 삭제할 때까지"
            ],
            [
              "난이도별 Pong 최장 랠리",
              "로컬 저장소",
              "기록을 경신하거나 삭제할 때까지"
            ],
            [
              "좋아요를 누른 노트별 무작위 키",
              "로컬 저장소",
              "삭제할 때까지"
            ],
            [
              "임시 밝은·어두운 테마 설정",
              "세션 저장소",
              "브라우저의 페이지 세션 동안"
            ],
            [
              "공개 GitHub 미리보기 캐시",
              "세션 저장소",
              "페이지 세션 안에서 최대 한 시간 재사용"
            ]
          ]
        }
      },
      {
        "id": "retention",
        "title": "정보 보관 기간",
        "paragraphs": [
          "기기 내 설정과 캐시는 위 표의 기간을 따릅니다. 저장소와 세션 복원은 브라우저가 관리합니다.",
          "이메일은 답변과 연락 관리에 합리적으로 필요한 기간에만 보관하며, 법률이 더 긴 기간을 요구하면 그에 따릅니다.",
          "노트는 수정하거나 철회할 때까지 공개될 수 있습니다. 생일 노트는 최초 게시 후 24시간 동안 목록에 표시되며, 이후 작성자의 설정에 따라 직접 링크를 유지하거나 사이트에서 글을 제거합니다. 제거하거나 철회해도 독자, 피드 서비스, 캐시, 공개 저장소 이력에 이미 보관된 사본의 삭제를 보장할 수 없습니다. 비공개 원본과 백업은 남아 있을 수 있습니다.",
          "호스팅, 분석, 이메일 등 제공업체는 자체 시스템의 정보에 각자의 보관 정책을 적용합니다."
        ]
      },
      {
        "id": "children",
        "title": "아동",
        "paragraphs": [
          "이 사이트는 일반적인 개인 홈페이지이며, 만 13세 미만 아동 또는 사용자의 관할 법률상 이에 해당하는 연령의 아동을 대상으로 하지 않습니다. 저는 해당 연령 미만 아동의 개인정보를 알면서 수집하지 않습니다. 아동이 개인정보를 제공했다고 생각되면 연락해 주세요. 적절한 조치를 취하겠습니다."
        ]
      },
      {
        "id": "rights",
        "title": "선택권과 권리",
        "paragraphs": [
          "적용 법률에 따라 제가 관리하는 개인정보에 대한 권리가 있을 수 있습니다. 게시된 노트 속 본인 정보나 사진의 수정·삭제도 요청하실 수 있습니다. 요청을 검토하고 적용 법률이 정한 기한 안에 답변하겠습니다.",
          "요청은 contact.timg@icloud.com으로 보내 주세요. 해당 자료와 요청을 확인할 수 있는 정보가 필요할 수 있으나, 불필요한 민감정보는 보내지 말아 주세요.",
          "사이트의 설정 도구로 기기 내 설정을 바꾸거나 브라우저에서 삭제할 수 있습니다. 기기에만 저장된 데이터나 다른 사람이 독립적으로 보관하는 사본을 제가 원격으로 지울 수는 없습니다."
        ]
      },
      {
        "id": "security",
        "title": "보안",
        "paragraphs": [
          "저는 정적 개인 웹사이트에 적절한 합리적인 보안 조치를 취합니다. 어떤 전송·저장 방식도 완전히 안전하지는 않습니다. 민감한 정보를 이메일로 보낼 때는 주의해 주세요."
        ]
      },
      {
        "id": "links",
        "title": "다른 사이트로 연결되는 링크",
        "paragraphs": [
          "사이트는 제 프로젝트와 독립적으로 운영되는 서비스에 연결됩니다. 제 프로젝트는 기능에 맞는 별도의 방침을 둘 수 있습니다. 다른 운영자는 각자의 개인정보 처리 방식을 관리하므로, 정보를 제공하기 전에 해당 방침을 확인해 주세요."
        ]
      },
      {
        "id": "changes",
        "title": "방침 변경",
        "paragraphs": [
          "사이트가 변경되면 이 방침을 수정할 수 있습니다. 수정본과 “최종 수정일”을 여기에 게시합니다. 적용 법률이 동의나 추가 고지를 요구하면 해당 처리를 시작하기 전에 제공하며, 계속 둘러보는 행위 자체가 그 동의가 되는 것은 아닙니다."
        ]
      },
      {
        "id": "contact",
        "title": "문의",
        "paragraphs": [
          "개인정보 처리방침 또는 개인정보 처리 방식에 관한 문의:",
          "이메일: contact.timg@icloud.com",
          "사이트 운영자: Tim G — 샌프란시스코 베이 지역"
        ]
      }
    ]
  }
};
