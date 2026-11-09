(function () {
  "use strict";
  var button = document.querySelector("[data-note-like]");
  if (!button || !window.fetch || !window.crypto || !window.crypto.getRandomValues || !window.AbortController ||
      !/^https:\/\/(timgong\.me|t-g\.pages\.dev)$/.test(window.location.origin)) return;

  var root = document.documentElement;
  var article = button.closest("article");
  var label = button.querySelector("[data-note-like-label]");
  var countLabel = document.getElementById("note-like-count");
  var status = document.querySelector("[data-note-like-status]");
  var id = button.getAttribute("data-note-like");
  var endpoint = "https://notes-likes.tgthms.workers.dev/" + id;
  var storageKey = "timg-note-like:" + id;
  var state = { count: 0, liked: false };
  var message = "";
  var pending = false;

  function render() {
    var lang = root.getAttribute("data-language") || "en";
    var words = (TRANSLATIONS[lang] || TRANSLATIONS.en).notes;
    var count = state.count.toLocaleString(lang);
    button.lang = status.lang = lang;
    button.setAttribute("aria-label", words.like);
    button.setAttribute("aria-pressed", String(state.liked));
    label.textContent = state.count ? count : words.like;
    countLabel.textContent = state.count ? words[state.count === 1 ? "likeCountOne" : "likeCount"].replace("{count}", count) : "";
    status.textContent = message ? words[message] : "";
  }

  function token() {
    try {
      var value = window.localStorage.getItem(storageKey);
      return /^[a-f0-9]{32}$/.test(value || "") ? value : null;
    } catch (_) { return null; }
  }

  function request(body) {
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 6000);
    var options = { signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer" };
    if (body) {
      options.method = "POST";
      options.headers = { "Content-Type": "application/json" };
      options.body = JSON.stringify(body);
    }
    return fetch(endpoint, options).then(function (response) {
      if (!response.ok) throw new Error("Likes unavailable");
      return response.json();
    }).then(function (value) {
      if (!Number.isSafeInteger(value.count) || value.count < 0 ||
          (body && typeof value.liked !== "boolean")) throw new Error("Invalid likes response");
      return { count: value.count, liked: value.liked === true };
    }).finally(function () { clearTimeout(timeout); });
  }

  function refresh() {
    if (pending || article.hidden) return;
    pending = true;
    var key = token();
    request(key ? { token: key } : null).then(function (value) {
      state = value;
      message = "";
      render();
      if (!article.hidden) button.hidden = false;
    }).catch(function () {}).finally(function () { pending = false; });
  }

  button.addEventListener("click", function () {
    if (pending) return;
    var key = token();
    if (!key) {
      try {
        var bytes = window.crypto.getRandomValues(new Uint8Array(16));
        key = Array.from(bytes, function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
        window.localStorage.setItem(storageKey, key);
      } catch (_) {
        message = "likeStorage";
        render();
        return;
      }
    }
    var previous = state;
    var liked = !state.liked;
    pending = true;
    message = "";
    button.setAttribute("aria-disabled", "true");
    state = { liked: liked, count: Math.max(0, state.count + (liked ? 1 : -1)) };
    render();
    request({ token: key, liked: liked }).then(function (value) {
      state = value;
    }).catch(function () {
      state = previous;
      message = "likeFailed";
    }).finally(function () {
      pending = false;
      button.removeAttribute("aria-disabled");
      render();
    });
  });

  if (window.MutationObserver) new MutationObserver(render).observe(root, { attributes: true, attributeFilter: ["data-language"] });
  window.addEventListener("pageshow", function (event) { if (event.persisted) refresh(); });
  refresh();
})();
