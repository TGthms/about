/**
 * Tactile ticks for direct user activation, duskline-style.
 *
 * iOS Safari has no Vibration API. iOS does play a native Taptic Engine tick
 * when the user physically taps a native switch control, so on iOS (where
 * navigator.vibrate is unavailable) every button and link gets an invisible
 * native <input type="checkbox" switch> overlaid via shadow DOM. The user's
 * tap lands on the native control (tick plays), then the tap is forwarded to
 * the real element underneath. Android and other platforms use
 * navigator.vibrate(10) directly.
 *
 * The theme toggle is itself a native switch and already ticks on its own,
 * so it is left alone.
 */
(function () {
  "use strict";

  var ua = navigator.userAgent || "";
  var platform = navigator.platform || "";
  var isiOS = /iPhone|iPad|iPod/.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var versionMatch = ua.match(/(?:iPhone|iPad|iPod).*?OS (\d+)[_.](\d+)/);
  var iosMajor = versionMatch ? Number(versionMatch[1]) : 0;
  var iosMinor = versionMatch ? Number(versionMatch[2]) : 0;

  function vibrateAvailable() {
    return typeof navigator.vibrate === "function";
  }

  // Overlay path applies on iOS where the Vibration API is missing.
  function iosOverlaySupported() {
    if (!isiOS || vibrateAvailable() || !window.MutationObserver) return false;
    if (!("switch" in document.createElement("input"))) return false;
    var host = document.createElement("span");
    return typeof host.attachShadow === "function";
  }

  function tickVibrate() {
    if (!vibrateAvailable()) return;
    try { navigator.vibrate(10); } catch (_) {}
  }

  // --- Non-iOS / vibrate path: delegate clicks on controls ---
  function installVibrateDelegation() {
    document.addEventListener("click", function (event) {
      if (!event.isTrusted || event.detail === 0) return;
      var target = event.target;
      if (!target || !target.closest) return;
      var control = target.closest("button, a[href], [role='button']");
      if (!control || control.id === "theme-toggle") return;
      tickVibrate();
    }, true);
  }

  // --- iOS overlay path: native switch under every control ---
  function usable(el) {
    return el.isConnected && !el.disabled
      && el.getAttribute("aria-disabled") !== "true"
      && !el.closest("[inert], [aria-hidden='true']");
  }

  function installIosOverlays() {
    var hosts = new WeakMap();

    function mount(control) {
      if (hosts.get(control) && hosts.get(control).parentElement === control) return;
      if (getComputedStyle(control).position === "static") {
        control.classList.add("wx-ios-haptic-relative");
      }
      var host = document.createElement("span");
      host.className = "wx-ios-haptic-hit";
      host.setAttribute("aria-hidden", "true");
      var root = host.attachShadow({ mode: "open" });

      var style = document.createElement("style");
      style.textContent = "label{position:absolute;inset:0;display:block;cursor:inherit}input{display:none!important}";

      var label = document.createElement("label");
      label.setAttribute("aria-hidden", "true");
      // Clicking the label toggles the native switch = iOS plays its tick.
      label.htmlFor = "wx-tick-" + Math.random().toString(36).slice(2);

      var tick = document.createElement("input");
      tick.id = label.htmlFor;
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
        // Scrolls, programmatic clicks, or disabled controls: no tick,
        // and don't let the label toggle the switch.
        if (event.defaultPrevented || cancelled || !event.isTrusted || !usable(control)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        // Keep focus behavior natural for keyboard/AT users.
        try { control.focus({ preventScroll: true }); } catch (_) {}
        // The native switch toggles from this real user tap: iOS plays
        // its tick. The original click continues to the control underneath.
      });
      // The switch itself must never act: stop its click from propagating.
      tick.addEventListener("click", function (event) {
        event.stopPropagation();
      });

      root.append(style, label, tick);
      control.appendChild(host);
      hosts.set(control, host);
    }

    function arm(control) {
      if (!control.isConnected) return;
      // Skip nested controls (a button inside a link card would double-tick);
      // the outermost control owns the tap surface.
      if (control !== document.documentElement &&
          control.parentElement && control.parentElement.closest("a[href], button")) return;
      // Skip form fields and editable areas.
      if (control.querySelector("input,select,textarea,[contenteditable='true'],[role='slider']")) return;
      if (control.id === "theme-toggle") return; // already a native switch
      mount(control);
    }

    function scan(scope, out) {
      if (scope.nodeType !== 1 || scope.classList.contains("wx-ios-haptic-hit")) return;
      var sel = "a[href], button";
      if (scope.matches && scope.matches(sel)) out.add(scope);
      scope.querySelectorAll(sel).forEach(function (el) { out.add(el); });
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
  // Elsewhere (desktop, old iOS): no haptics. Everything still works.
})();
