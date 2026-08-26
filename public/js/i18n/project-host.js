/**
 * Tim G Personal Hub - Project Host.
 * Split from the former monolithic i18n.js module.
 */
/* -------------------------------------------------------------------------- */
/* Project host — Cloudflare (main) / GitHub (backup)                          */
/* en/es/ja: single CTA, preference in settings (localStorage)                 */
/* zh: both lines visible on each project card; settings control hidden        */
/* -------------------------------------------------------------------------- */

function isValidProjectHost(value) {
  return value === HOST_CLOUDFLARE || value === HOST_GITHUB;
}

function getStoredProjectHost() {
  try {
    var v = localStorage.getItem(PROJECT_HOST_KEY);
    if (isValidProjectHost(v)) return v;
  } catch (_) {
    /* private mode */
  }
  return DEFAULT_PROJECT_HOST;
}

function setStoredProjectHost(value) {
  if (!isValidProjectHost(value)) return;
  try {
    localStorage.setItem(PROJECT_HOST_KEY, value);
  } catch (_) {
    /* ignore */
  }
}

function isDualProjectLinks(lang) {
  return lang === "zh";
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

  var dual =
    document.documentElement.getAttribute("data-project-links") === "dual";

  document.querySelectorAll(".host-option[data-host]").forEach(function (btn) {
    var on = btn.getAttribute("data-host") === preferred;
    btn.classList.toggle("is-selected", on);
    btn.setAttribute("aria-checked", on ? "true" : "false");
    if (dual || !isHostPlacementActive(btn)) {
      btn.setAttribute("tabindex", "-1");
    } else {
      btn.setAttribute("tabindex", on ? "0" : "-1");
    }
  });
}

/**
 * Dual vs single presentation + host control visibility.
 * Call whenever language changes (and on init).
 */
function applyProjectHostMode(lang) {
  var dual = isDualProjectLinks(lang);
  document.documentElement.setAttribute(
    "data-project-links",
    dual ? "dual" : "single"
  );

  document.querySelectorAll("[data-host-pref]").forEach(function (hostSection) {
    hostSection.hidden = dual;
    hostSection.setAttribute("aria-hidden", dual ? "true" : "false");
  });

  /* Prevent focusing hidden targets (display:none is not enough for all ATs) */
  document.querySelectorAll("[data-project]").forEach(function (card) {
    var repoOnly = card.getAttribute("data-project-kind") === "repo";
    var single = card.querySelector("[data-project-single]");
    var lines = card.querySelector("[data-project-lines]");
    if (single) {
      if (dual && !repoOnly) {
        single.setAttribute("tabindex", "-1");
        single.setAttribute("aria-hidden", "true");
      } else {
        single.removeAttribute("tabindex");
        single.removeAttribute("aria-hidden");
      }
    }
    if (lines) {
      lines.setAttribute("aria-hidden", dual ? "false" : "true");
      lines.querySelectorAll("a").forEach(function (a) {
        if (dual) {
          a.removeAttribute("tabindex");
          a.removeAttribute("aria-hidden");
        } else {
          a.setAttribute("tabindex", "-1");
          a.setAttribute("aria-hidden", "true");
        }
      });
    }
  });

  /* Dual mode still sets stable hrefs; single mode uses preferred host */
  var preferred = getStoredProjectHost();
  /* data-project-links must be set before syncHostSwitcher (tabindex) */
  syncHostSwitcher(preferred);
  applyProjectUrls(preferred);

  /* Dual lines: richer accessible names (line + project title) */
  document.querySelectorAll("[data-project]").forEach(function (card) {
    var titleEl = card.querySelector(".featured-card__title");
    var title = titleEl && titleEl.textContent ? titleEl.textContent.trim() : "";
    card.querySelectorAll("[data-project-line]").forEach(function (line) {
      if (!dual) {
        line.removeAttribute("aria-label");
        return;
      }
      var kicker = line.querySelector(".project-line__kicker");
      var name = line.querySelector(".project-line__name");
      var parts = [];
      if (kicker && kicker.textContent) parts.push(kicker.textContent.trim());
      if (name && name.textContent) parts.push(name.textContent.trim());
      if (title) parts.push(title);
      if (parts.length) line.setAttribute("aria-label", parts.join(" — "));
    });
  });
}

/**
 * Persist + apply a host choice (ignored while dual-mode Chinese is active).
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
    applyProjectHostMode(
      document.documentElement.lang === "zh-Hans" ? "zh" : "en"
    );
    return;
  }

  switchers.forEach(function (switcher) {
    switcher.addEventListener("click", function (e) {
      var btn = e.target.closest(".host-option[data-host]");
      if (!btn || !switcher.contains(btn)) return;
      e.preventDefault();
      setProjectHost(btn.getAttribute("data-host"));
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
