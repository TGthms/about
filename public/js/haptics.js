(function () {
  "use strict";

  var ua = navigator.userAgent || "";
  var platform = navigator.platform || "";
  var isiOS = /iPhone|iPad|iPod/.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);

  function vibrateAvailable() {
    return typeof navigator.vibrate === "function";
  }

  // Overlay path applies on iOS where the Vibration API is missing.
  function iosOverlaySupported() {
    if (!isiOS || vibrateAvailable() || !window.MutationObserver) return false;
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
      // The switch is the tap target: rendered and covering the control,
      // fully transparent, never display:none (iOS ignores taps on
      // non-rendered controls and won't play its tick).
      style.textContent =
        ".wx-tick{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:inherit}";

      var tick = document.createElement("input");
      tick.className = "wx-tick";
      tick.type = "checkbox";
      tick.setAttribute("switch", "");
      tick.tabIndex = -1;
      tick.setAttribute("aria-hidden", "true");

      var gesture = null;
      tick.addEventListener("pointerdown", function (event) {
        gesture = {
          id: event.pointerId,
          x: event.clientX, y: event.clientY,
          cancelled: event.isPrimary === false,
        };
      }, { passive: true });
      tick.addEventListener("pointermove", function (event) {
        if (gesture && gesture.id === event.pointerId &&
            Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 12) {
          gesture.cancelled = true;
        }
      }, { passive: true });
      tick.addEventListener("pointercancel", function () {
        if (gesture) gesture.cancelled = true;
      }, { passive: true });
      tick.addEventListener("click", function (event) {
        var cancelled = gesture && gesture.cancelled;
        gesture = null;
        // Scrolls or unusable controls: swallow the tap — no tick, no action.
        if (cancelled || !event.isTrusted || !usable(control)) {
          event.preventDefault();
          event.stopPropagation();
          // Undo the toggle so the switch stays in a clean state.
          try { tick.checked = !tick.checked; } catch (_) {}
          return;
        }
        // Valid tap: the native switch already toggled from this real user
        // tap, so iOS played its tick. Let the click bubble to the control
        // underneath — it owns the action (navigation, modal, etc.).
        try { control.focus({ preventScroll: true }); } catch (_) {}
      });

      root.append(style, tick);
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
