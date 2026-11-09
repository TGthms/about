(function () {
  "use strict";
  var section = document.querySelector("[data-note-comments]");
  if (!section || !window.fetch || !window.crypto || !window.crypto.getRandomValues || !window.AbortController ||
      !/^https:\/\/(timgong\.me|t-g\.pages\.dev)$/.test(window.location.origin)) return;

  var copy = {
    en: ["Comments", "Display name", "Comment", "Your display name and comment will appear publicly.", "Post comment", "Load comments", "Older comments", "No comments yet.", "Couldn’t load comments. Try again.", "Comment posted.", "Couldn’t post your comment. Try again.", "Please wait a minute before posting again.", "This comment is no longer available."],
    es: ["Comentarios", "Nombre visible", "Comentario", "Tu nombre y tu comentario serán públicos.", "Publicar comentario", "Cargar comentarios", "Comentarios anteriores", "Todavía no hay comentarios.", "No se pudieron cargar los comentarios. Inténtalo de nuevo.", "Comentario publicado.", "No se pudo publicar tu comentario. Inténtalo de nuevo.", "Espera un minuto antes de volver a publicar.", "Este comentario ya no está disponible."],
    zh: ["评论", "显示名称", "评论内容", "你的显示名称和评论内容将公开。", "发表评论", "加载评论", "较早的评论", "还没有评论。", "评论加载失败，请重试。", "评论已发表。", "评论发表失败，请重试。", "请等一分钟再发表评论。", "这条评论已不可用。"],
    "zh-Hant": ["留言", "顯示名稱", "留言內容", "你的顯示名稱和留言內容將公開。", "發表留言", "載入留言", "較早的留言", "還沒有留言。", "無法載入留言，請再試一次。", "留言已發表。", "無法發表留言，請再試一次。", "請等一分鐘再發表留言。", "這則留言已無法查看。"],
    ja: ["コメント", "表示名", "コメント本文", "表示名とコメントは公開されます。", "コメントを投稿", "コメントを読み込む", "以前のコメント", "まだコメントはありません。", "コメントを読み込めませんでした。もう一度お試しください。", "コメントを投稿しました。", "コメントを投稿できませんでした。もう一度お試しください。", "1分ほど待ってからもう一度投稿してください。", "このコメントは表示できなくなりました。"],
    ko: ["댓글", "표시 이름", "댓글 내용", "표시 이름과 댓글 내용은 공개됩니다.", "댓글 등록", "댓글 불러오기", "이전 댓글", "아직 댓글이 없어요.", "댓글을 불러오지 못했어요. 다시 시도해 주세요.", "댓글을 등록했어요.", "댓글을 등록하지 못했어요. 다시 시도해 주세요.", "1분 뒤에 다시 등록해 주세요.", "이 댓글은 더 이상 볼 수 없어요."]
  };
  var root = document.documentElement;
  var list = section.querySelector("[data-comments-list]");
  var form = section.querySelector("form");
  var nameField = form.elements.namedItem("name");
  var bodyField = form.elements.namedItem("body");
  var submit = form.querySelector("button");
  var more = section.querySelector("[data-comments-more]");
  var empty = section.querySelector("[data-comments-empty]");
  var status = section.querySelector("[data-comments-status]");
  var endpoint = "https://notes-likes.tgthms.workers.dev/comments/" + section.getAttribute("data-note-comments");
  var next = null;
  var loaded = false;
  var loading = false;
  var posting = false;
  var retry = null;
  var message = -1;

  function renderLabels() {
    var lang = root.getAttribute("data-language") || "en";
    var words = copy[lang] || copy.en;
    section.lang = lang;
    section.querySelector("h2").textContent = words[0];
    form.querySelector('[for="note-comment-name"]').textContent = words[1];
    form.querySelector('[for="note-comment-body"]').textContent = words[2];
    section.querySelector("[data-comments-hint]").textContent = words[3];
    submit.textContent = words[4];
    more.textContent = words[loaded ? 6 : 5];
    empty.textContent = words[7];
    status.textContent = words[message] || "";
    list.querySelectorAll("time").forEach(function (time) {
      time.textContent = new Date(time.dateTime).toLocaleDateString(lang, { month: "short", day: "numeric", year: "numeric" });
    });
  }

  function request(url, data) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 8000);
    var options = { signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer" };
    if (data) {
      options.method = "POST";
      options.headers = { "Content-Type": "application/json" };
      options.body = JSON.stringify(data);
    }
    return fetch(url, options).then(function (response) {
      if (!response.ok) throw response.status;
      return response.json();
    }).finally(function () { clearTimeout(timer); });
  }

  function show(comment, first) {
    if (list.querySelector('[data-comment-id="' + comment.id + '"]')) return;
    var item = document.createElement("li");
    var line = document.createElement("div");
    var name = document.createElement("bdi");
    var time = document.createElement("time");
    var body = document.createElement("p");
    item.setAttribute("data-comment-id", String(comment.id));
    line.className = "note-comments__byline";
    name.textContent = comment.name;
    time.dateTime = new Date(comment.posted_at).toISOString();
    body.dir = "auto";
    body.textContent = comment.body;
    line.append(name, time);
    item.append(line, body);
    if (first) list.prepend(item);
    else list.append(item);
    return item;
  }

  function load() {
    if (loading || (loaded && !next) || section.closest("article").hidden) return;
    loading = true;
    more.setAttribute("aria-disabled", "true");
    request(endpoint + (next ? "?before=" + next : "")).then(function (page) {
      var focused = document.activeElement === more;
      var added = page.comments.map(function (comment) { return show(comment, false); }).filter(Boolean);
      next = page.next;
      loaded = true;
      empty.hidden = Boolean(list.childElementCount);
      form.hidden = false;
      more.hidden = !next;
      if (focused && added.length) {
        added[0].tabIndex = -1;
        added[0].focus({ preventScroll: true });
      } else if (focused && !next) nameField.focus({ preventScroll: true });
      message = -1;
    }).catch(function () { message = 8; }).finally(function () {
      loading = false;
      more.removeAttribute("aria-disabled");
      renderLabels();
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (posting) return;
    var name = nameField.value.trim();
    var body = bodyField.value.trim();
    if (!name || !body) {
      var invalid = name ? bodyField : nameField;
      invalid.value = "";
      invalid.reportValidity();
      return;
    }
    if (!retry || retry.name !== name || retry.body !== body) {
      var bytes = crypto.getRandomValues(new Uint8Array(16));
      var id = Array.from(bytes, function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
      retry = { submission: id, name: name, body: body, website: form.elements.namedItem("website").value };
    }
    posting = true;
    nameField.readOnly = bodyField.readOnly = true;
    submit.setAttribute("aria-disabled", "true");
    message = -1;
    renderLabels();
    request(endpoint, retry).then(function (comment) {
      show(comment, true);
      empty.hidden = true;
      bodyField.value = "";
      retry = null;
      message = 9;
    }).catch(function (error) {
      message = error === 429 ? 11 : error === 409 ? 12 : 10;
    }).finally(function () {
      posting = false;
      nameField.readOnly = bodyField.readOnly = false;
      submit.removeAttribute("aria-disabled");
      renderLabels();
    });
  });

  more.addEventListener("click", load);
  if (window.MutationObserver) new MutationObserver(renderLabels).observe(root, { attributes: true, attributeFilter: ["data-language"] });
  renderLabels();
  section.hidden = false;
  if (window.IntersectionObserver && !(window.SiteRuntime && window.SiteRuntime.lightweight)) {
    var observer = new IntersectionObserver(function (entries) {
      if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
      observer.disconnect();
      load();
    }, { rootMargin: "180px 0px" });
    observer.observe(section);
  }
})();
