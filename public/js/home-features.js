/* Load optional homepage dialogs when their buttons are used. */
(function () {
  "use strict";

  function load(source) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = source.getAttribute("data-feature-src");
      script.onload = function () { source.remove(); resolve(); };
      script.onerror = function () { script.remove(); reject(); };
      document.head.appendChild(script);
    });
  }

  ["site-history-open", "rally-open"].forEach(function (id) {
    var button = document.getElementById(id);
    var status = document.getElementById(id + "-status");
    if (id === "rally-open" && typeof document.createElement("canvas").getContext !== "function") return;
    button.hidden = false;

    function open(event) {
      event.stopImmediatePropagation();
      if (button.hasAttribute("aria-busy")) return;
      button.setAttribute("aria-busy", "true");
      status.textContent = "";
      var scripts = Array.from(document.querySelectorAll('script[data-feature="' + id + '"]'));
      var entry = scripts.pop();
      Promise.allSettled(scripts.map(load)).then(function (results) {
        if (results.some(function (result) { return result.status === "rejected"; })) throw new Error("Feature dependencies unavailable");
        return load(entry);
      }).then(function () {
        button.removeEventListener("click", open, true);
        button.removeAttribute("aria-busy");
        if (!button.closest("[inert]") && !document.documentElement.classList.contains("page-scroll-locked")) button.click();
      }, function () {
        button.removeAttribute("aria-busy");
        var language = document.documentElement.getAttribute("data-language") || "en";
        status.textContent = (TRANSLATIONS[language] || TRANSLATIONS.en).featureLoadFailed;
      });
    }

    button.addEventListener("click", open, true);
  });
})();
