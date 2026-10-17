/**
 * Tim G Personal Hub - Project Host.
 * Split from the former monolithic i18n.js module.
 */
/* -------------------------------------------------------------------------- */
/* Project host — Cloudflare (main) / GitHub (backup)                          */
/* Every language uses one CTA selected by the saved host preference.          */
/* -------------------------------------------------------------------------- */

var activeProjectHost = null;

function isValidProjectHost(value) {
  return value === HOST_CLOUDFLARE || value === HOST_GITHUB;
}

function getStoredProjectHost() {
  if (isValidProjectHost(activeProjectHost)) return activeProjectHost;
  try {
    var v = localStorage.getItem(PROJECT_HOST_KEY);
    if (isValidProjectHost(v)) return (activeProjectHost = v);
  } catch (_) {
    /* private mode */
  }
  return (activeProjectHost = DEFAULT_PROJECT_HOST);
}

function setStoredProjectHost(value) {
  if (!isValidProjectHost(value)) return;
  /* Keep the choice for this visit even when browser storage is unavailable. */
  activeProjectHost = value;
  try {
    localStorage.setItem(PROJECT_HOST_KEY, value);
  } catch (_) {
    /* ignore */
  }
}

/**
 * Point each project card at the correct host URL(s).
 * Cards declare URLs on data-url-cloudflare / data-url-github.
 */
function applyProjectUrls(host) {
  var preferred = isValidProjectHost(host) ? host : getStoredProjectHost();
  document.querySelectorAll("[data-project]").forEach(function (card) {
    var urlCf = card.getAttribute("data-url-cloudflare") || "";
    var urlGh = card.getAttribute("data-url-github") || "";
    var single = card.querySelector("[data-project-single]");
    var lineCf = card.querySelector('[data-project-line="cloudflare"]');
    var lineGh = card.querySelector('[data-project-line="github"]');

    if (lineCf && urlCf) lineCf.setAttribute("href", urlCf);
    if (lineGh && urlGh) lineGh.setAttribute("href", urlGh);

    if (single) {
      var url = preferred === HOST_GITHUB ? urlGh : urlCf;
      if (url) single.setAttribute("href", url);
    }
  });
}

/**
 * Whether this host control is the active placement for the current viewport.
 * Sheet = mobile prefs; section = desktop Projects header.
 */
function isHostPlacementActive(el) {
  var root = el.closest ? el.closest("[data-host-pref]") : null;
  if (!root || root.hidden) return false;
  var placement = root.getAttribute("data-host-placement");
  var desktop = isDesktopControls();
  if (placement === "sheet") return !desktop;
  if (placement === "section") return desktop;
  return true;
}

/**
 * Sync radiogroup UI with the preferred host.
 * Uses roving tabindex (selected option is the tab stop) on the active placement only.
 */
function syncHostSwitcher(host) {
  var preferred = isValidProjectHost(host) ? host : getStoredProjectHost();
  document.documentElement.setAttribute("data-project-host", preferred);

  document.querySelectorAll(".host-option[data-host]").forEach(function (btn) {
    var on = btn.getAttribute("data-host") === preferred;
    btn.classList.toggle("is-selected", on);
    var kicker = btn.querySelector(".host-option__kicker"), name = btn.querySelector(".host-option__name");
    if (kicker && name) btn.setAttribute("aria-label", kicker.textContent.trim() + " " + name.textContent.trim());
    btn.setAttribute("aria-checked", on ? "true" : "false");
    if (!isHostPlacementActive(btn)) {
      btn.setAttribute("tabindex", "-1");
    } else {
      btn.setAttribute("tabindex", on ? "0" : "-1");
    }
  });
}

/** Apply the same host preference control in every language. */
function applyProjectHostMode() {
  document.documentElement.setAttribute("data-project-links", "single");

  document.querySelectorAll("[data-host-pref]").forEach(function (hostSection) {
    hostSection.hidden = false;
    hostSection.setAttribute("aria-hidden", "false");
  });

  /* Keep only the selected-host card link in the tab order. */
  document.querySelectorAll("[data-project]").forEach(function (card) {
    var single = card.querySelector("[data-project-single]");
    var lines = card.querySelector("[data-project-lines]");
    if (single) {
      single.removeAttribute("tabindex");
      single.removeAttribute("aria-hidden");
    }
    if (lines) {
      lines.setAttribute("aria-hidden", "true");
      lines.querySelectorAll("a").forEach(function (a) {
        a.setAttribute("tabindex", "-1");
        a.setAttribute("aria-hidden", "true");
      });
    }
  });

  var preferred = getStoredProjectHost();
  syncHostSwitcher(preferred);
  applyProjectUrls(preferred);
  document.querySelectorAll("[data-project]").forEach(function (card) {
    card.querySelectorAll("[data-project-line]").forEach(function (line) {
      line.removeAttribute("aria-label");
    });
  });
}

/**
 * Persist + apply a host choice.
 */
function setProjectHost(host) {
  if (!isValidProjectHost(host)) return getStoredProjectHost();
  setStoredProjectHost(host);
  syncHostSwitcher(host);
  applyProjectUrls(host);
  return host;
}

/**
 * Wire host radiogroup(s). Mobile sheet + desktop section may both exist;
 * state stays in sync via setProjectHost / syncHostSwitcher.
 * Safe when absent (legal pages).
 */
function initProjectHost() {
  var switchers = document.querySelectorAll(".host-switcher");
  if (!switchers.length) {
    /* Still apply URLs if project cards exist without the control */
    applyProjectHostMode();
    return;
  }

  var disclosure = document.querySelector(".project-host--section");
  var trigger = disclosure && disclosure.querySelector(".lang-picker__trigger");
  var menu = disclosure && disclosure.querySelector(".host-switcher");
  function openDisclosure() {
    if (!menu || !isDesktopControls()) return;
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    disclosure.classList.toggle("is-open", true);
    var selected = menu.querySelector('[aria-checked="true"]');
    if (selected) selected.focus({ preventScroll: true });
  }
  function closeDisclosure(restoreFocus) {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    disclosure.classList.toggle("is-open", false);
    if (restoreFocus) trigger.focus({ preventScroll: true });
  }
  if (disclosure) {
    trigger.addEventListener("click", function () {
      if (menu.hidden) openDisclosure();
      else closeDisclosure(true);
    });
    trigger.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openDisclosure();
      }
    });
    document.addEventListener("click", function (event) {
      if (!disclosure.contains(event.target)) closeDisclosure(false);
    });
    disclosure.addEventListener("focusout", function (event) {
      /* Safari may blur the trigger without focusing a clicked button. */
      if (event.relatedTarget && !disclosure.contains(event.relatedTarget)) closeDisclosure(false);
    });
    disclosure.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !menu.hidden) {
        event.preventDefault();
        event.stopPropagation();
        closeDisclosure(true);
      }
    });
    var viewport = window.matchMedia("(min-width: 768px)");
    function onViewportChange() { closeDisclosure(false); }
    if (viewport.addEventListener) viewport.addEventListener("change", onViewportChange);
    else if (viewport.addListener) viewport.addListener(onViewportChange);
  }
  window.addEventListener("storage", function (event) {
    if (event.key !== PROJECT_HOST_KEY && event.key !== null) return;
    activeProjectHost = isValidProjectHost(event.newValue) ? event.newValue : DEFAULT_PROJECT_HOST;
    syncHostSwitcher(activeProjectHost);
    applyProjectUrls(activeProjectHost);
  });
  switchers.forEach(function (switcher) {
    switcher.addEventListener("click", function (e) {
      var btn = e.target.closest(".host-option[data-host]");
      if (!btn || !switcher.contains(btn)) return;
      e.preventDefault();
      setProjectHost(btn.getAttribute("data-host"));
      if (switcher === menu) closeDisclosure(true);
    });

    switcher.addEventListener("keydown", function (e) {
      var options = Array.prototype.slice.call(
        switcher.querySelectorAll(".host-option[data-host]")
      );
      if (!options.length) return;
      var current = document.activeElement;
      var idx = options.indexOf(current);
      if (idx < 0) return;

      var next = -1;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        next = (idx + 1) % options.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        next = (idx - 1 + options.length) % options.length;
      } else if (e.key === "Home") {
        next = 0;
      } else if (e.key === "End") {
        next = options.length - 1;
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setProjectHost(options[idx].getAttribute("data-host"));
        if (switcher === menu) closeDisclosure(true);
        return;
      } else {
        return;
      }

      e.preventDefault();
      options[next].focus();
      setProjectHost(options[next].getAttribute("data-host"));
    });
  });
}
