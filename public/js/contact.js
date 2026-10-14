/* Copy is an alternative to opening a mail app; report only actual success. */
(function () {
  "use strict";
  var button = document.getElementById("copy-email");
  var email = document.querySelector(".footer__email");
  var status = document.getElementById("contact-copy-status");
  if (!button || !email || !status) return;
  var state = "copy", busy = false, timer = 0;
  function words() {
    var lang = document.documentElement.getAttribute("data-language") || "en";
    return (TRANSLATIONS[lang] || TRANSLATIONS.en).contact;
  }
  function render() {
    button.querySelector("[data-i18n]").textContent = words()[state];
    button.classList.toggle("is-copied", state === "copied");
    button.querySelector(".copy-email__mark").textContent = state === "copied" ? "✓" : "⧉";
  }
  function fallbackCopy(text) {
    var focused = document.activeElement;
    var input = document.createElement("textarea");
    input.value = text; input.setAttribute("readonly", "");
    input.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0";
    document.body.appendChild(input);
    try {
      input.select(); input.setSelectionRange(0, text.length);
      return document.execCommand("copy");
    } finally {
      input.remove();
      if (focused && focused.isConnected) focused.focus({ preventScroll: true });
    }
  }
  button.hidden = false;
  render();
  button.addEventListener("click", async function () {
    if (busy) return;
    busy = true; status.textContent = "";
    var text = email.textContent.trim(), success = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try { await navigator.clipboard.writeText(text); success = true; } catch (_) { success = fallbackCopy(text); }
      } else success = fallbackCopy(text);
    } catch (_) { /* Keep the address available for manual selection. */ }
    busy = false;
    state = success ? "copied" : "copy";
    status.textContent = words()[success ? "success" : "failed"];
    render(); window.clearTimeout(timer);
    timer = window.setTimeout(function () { state = "copy"; render(); }, 2200);
  });
  new MutationObserver(function () {
    status.textContent = ""; render();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-language"] });
})();
