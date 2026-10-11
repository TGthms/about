/**
 * Small, optional tactile ticks for direct user activation.
 * iOS Safari has no general Vibration API. Native checkbox switches provide
 * Apple's supported switch tick; older iOS versions also get a best-effort
 * switch fallback. Android uses the Vibration API when available.
 */
(function () {
  "use strict";

  var ua = navigator.userAgent || "";
  var platform = navigator.platform || "";
  var isiOS = /iPhone|iPad|iPod/.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var versionMatch = ua.match(/(?:iPhone|iPad|iPod).*?OS (\d+)[_.](\d+)/);
  var iosMajor = versionMatch ? Number(versionMatch[1]) : 0;
  var iosMinor = versionMatch ? Number(versionMatch[2]) : 0;
  var nativeSwitchAvailable = isiOS && (iosMajor > 18 || (iosMajor === 18 && iosMinor >= 0));
  var modernIOSNeedsDirectTap = isiOS && (iosMajor > 26 || (iosMajor === 26 && iosMinor >= 5) || !versionMatch);
  var legacySwitch = null;

  function getLegacySwitch() {
    if (legacySwitch) return legacySwitch;
    legacySwitch = document.createElement("input");
    legacySwitch.type = "checkbox";
    legacySwitch.setAttribute("switch", "");
    legacySwitch.setAttribute("aria-hidden", "true");
    legacySwitch.tabIndex = -1;
    legacySwitch.style.cssText = "position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(legacySwitch);
    return legacySwitch;
  }

  function tick(target) {
    if (target && target.id === "theme-toggle" && nativeSwitchAvailable) return;

    if (typeof navigator.vibrate === "function") {
      try { navigator.vibrate(10); } catch (_) {}
      return;
    }

    // Synthetic switch activation works in older iOS Safari. Newer Safari
    // requires the user to tap a real switch directly, so leave it alone there.
    if (isiOS && nativeSwitchAvailable && !modernIOSNeedsDirectTap) {
      try { getLegacySwitch().click(); } catch (_) {}
    }
  }

  document.addEventListener("click", function (event) {
    if (!event.isTrusted || event.detail === 0) return;
    var target = event.target;
    if (!target || !target.closest) return;
    var control = target.closest("button, a[href], [role='button'], [role='option'], [role='radio'], input[type='checkbox'][switch]");
    if (!control) return;
    tick(control);
  }, true);
})();
