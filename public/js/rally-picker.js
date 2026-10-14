/* Challenge selection shares the site's picker controls. */
(function () {
  "use strict";
  window.createRallyLevelPicker = function (hooks) {
    var root = document.getElementById("rally-level-picker");
    var trigger = document.getElementById("rally-level-trigger");
    var menu = document.getElementById("rally-level-menu");
    var value = document.getElementById("rally-level-value");
    if (!root || !trigger || !menu || !value) return null;
    var buttons = Array.from(menu.querySelectorAll("[data-level]"));
    var selected = "medium", opened = false;
    function sync() {
      var lang = document.documentElement.getAttribute("data-language") || "en";
      value.textContent = (TRANSLATIONS[lang] || TRANSLATIONS.en).rally[selected];
      buttons.forEach(function (button) {
        var active = button.getAttribute("data-level") === selected;
        button.setAttribute("aria-selected", active ? "true" : "false");
        button.classList.toggle("is-selected", active);
      });
    }
    function hide(restoreFocus, notify) {
      if (!opened) return;
      opened = false; menu.hidden = true;
      root.classList.remove("is-open"); trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus({ preventScroll: true });
      if (notify && hooks.close) hooks.close();
    }
    function show() {
      if (opened) return;
      if (hooks.open) hooks.open();
      opened = true; menu.hidden = false;
      root.classList.add("is-open"); trigger.setAttribute("aria-expanded", "true");
      var active = buttons.find(function (button) { return button.getAttribute("data-level") === selected; });
      if (active) active.focus({ preventScroll: true });
    }
    function choose(button) {
      selected = button.getAttribute("data-level"); sync();
      if (hooks.change) hooks.change(selected);
      hide(true, true);
    }
    trigger.addEventListener("click", function () { if (opened) hide(true, true); else show(); });
    buttons.forEach(function (button) { button.addEventListener("click", function () { choose(button); }); });
    root.addEventListener("keydown", function (event) {
      if (!opened) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); event.stopPropagation(); show(); }
        return;
      }
      if (event.key === "Tab") { hide(true, true); return; }
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); hide(true, true); return; }
      var index = buttons.indexOf(document.activeElement), next = -1;
      if (event.key === "ArrowDown") next = (index + 1) % buttons.length;
      if (event.key === "ArrowUp") next = (index - 1 + buttons.length) % buttons.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = buttons.length - 1;
      if ((event.key === "Enter" || event.key === " ") && index >= 0) {
        event.preventDefault(); event.stopPropagation(); choose(buttons[index]); return;
      }
      if (next >= 0) { event.preventDefault(); event.stopPropagation(); buttons[next].focus({ preventScroll: true }); }
    });
    document.addEventListener("click", function (event) { if (opened && !root.contains(event.target)) hide(false, true); });
    new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ["data-language"] });
    document.getElementById("rally-level").hidden = false;
    sync();
    return { close: function () { hide(false, false); }, isOpen: function () { return opened; } };
  };
})();
