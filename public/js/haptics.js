/**
 * Tactile feedback for user interactions.
 *
 * iOS Safari lacks the Vibration API. On iOS, each button receives an
 * invisible native switch overlay via shadow DOM; tapping the overlay
 * toggles the switch, producing the system's haptic tick, and the tap
 * forwards to the underlying button. Other platforms use
 * navigator.vibrate() where available.
 */
(function () {
  "use strict";
  if (window.SiteRuntime && window.SiteRuntime.lightweight) return;

  var ua = navigator.userAgent || "";
  var platform = navigator.platform || "";
  var isiOS = /iPhone|iPad|iPod/.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);

  function vibrateAvailable() {
    return typeof navigator.vibrate === "function";
  }

  function iosOverlaySupported() {
    if (!isiOS || vibrateAvailable() || !window.MutationObserver) return false;
    var probe = document.createElement("input");
    if (!("switch" in probe)) return false;
    var host = document.createElement("span");
    return typeof host.attachShadow === "function";
  }

  function tickVibrate() {
    if (!vibrateAvailable()) return;
    try { navigator.vibrate(10); } catch (_) {}
  }

  function installVibrateDelegation() {
    document.addEventListener("click", function (event) {
      if (!event.isTrusted || event.detail === 0) return;
      var target = event.target;
      if (!target || !target.closest) return;
      var control = target.closest("button, a[href]");
      if (!control || control.id === "theme-toggle") return;
      tickVibrate();
    }, true);
  }

  function usable(button) {
    return button.isConnected && !button.disabled
      && button.getAttribute("aria-disabled") !== "true"
      && !button.closest("[inert], [aria-hidden='true']");
  }

  function installIosOverlays() {
    var hosts = new WeakMap();

    function mount(button, surface) {
      var previous = hosts.get(surface);
      if (previous && previous.parentElement === surface) return;
      if (getComputedStyle(surface).position === "static") {
        surface.classList.add("wx-ios-haptic-relative");
      }
      var host = document.createElement("span");
      host.className = "wx-ios-haptic-hit";
      host.setAttribute("aria-hidden", "true");
      var root = host.attachShadow({ mode: "open" });

      var style = document.createElement("style");
      style.textContent = "label{position:absolute;inset:0;display:block;cursor:inherit}input{display:none!important}";

      var label = document.createElement("label");
      label.htmlFor = "tick";
      label.setAttribute("aria-hidden", "true");

      var tick = document.createElement("input");
      tick.id = "tick";
      tick.type = "checkbox";
      tick.setAttribute("switch", "");
      tick.hidden = true;
      tick.tabIndex = -1;
      tick.setAttribute("aria-hidden", "true");

      var gesture = null;
      label.addEventListener("pointerdown", function (event) {
        gesture = {
          id: event.pointerId,
          x: event.clientX, y: event.clientY,
          cancelled: event.isPrimary === false,
        };
      }, { passive: true });
      label.addEventListener("pointermove", function (event) {
        if (gesture && gesture.id === event.pointerId &&
            Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 12) {
          gesture.cancelled = true;
        }
      }, { passive: true });
      label.addEventListener("pointercancel", function () {
        if (gesture) gesture.cancelled = true;
      }, { passive: true });
      label.addEventListener("click", function (event) {
        var cancelled = gesture && gesture.cancelled;
        gesture = null;
        if (event.defaultPrevented || cancelled || !event.isTrusted || !usable(button)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        try { button.focus({ preventScroll: true }); } catch (_) {}
      });
      tick.addEventListener("click", function (event) {
        event.stopPropagation();
      });

      root.append(style, label, tick);
      surface.appendChild(host);
      hosts.set(surface, host);
    }

    function arm(button) {
      if (!button.isConnected) return;
      if (button.parentElement && button.parentElement.closest("button")) return;
      if (button.querySelector("input,select,textarea,[contenteditable='true'],[role='slider']")) return;
      if (button.id === "theme-toggle") return;
      mount(button, button);
    }

    function scan(scope, out) {
      if (scope.nodeType !== 1 || scope.classList.contains("wx-ios-haptic-hit")) return;
      var owner = scope.closest ? scope.closest("button") : null;
      if (owner) out.add(owner);
      scope.querySelectorAll("button").forEach(function (el) { out.add(el); });
    }

    function armAll() {
      var out = new Set();
      scan(document.documentElement, out);
      out.forEach(arm);
    }

    armAll();
    new MutationObserver(function (records) {
      var out = new Set();
      records.forEach(function (record) {
        scan(record.target, out);
        record.addedNodes.forEach(function (node) { scan(node, out); });
      });
      out.forEach(arm);
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (iosOverlaySupported()) {
    installIosOverlays();
  } else if (vibrateAvailable()) {
    installVibrateDelegation();
  }
})();
