/**
 * Tim G Personal Hub - Controls.
 * Split from the former monolithic i18n.js module.
 */
/**
 * Close mobile preferences bottom sheet immediately (no exit animation).
 */
function closeControlsPanel() {
  const cluster = document.querySelector("[data-controls]");
  const trigger = document.getElementById("controls-trigger");
  const panel = document.getElementById("controls-panel");
  const backdrop = document.getElementById("controls-backdrop");
  if (cluster) cluster.classList.remove("is-open");
  if (trigger) trigger.setAttribute("aria-expanded", "false");
  if (panel && !isDesktopControls()) {
    panel.classList.remove("is-raised", "is-dragging");
    panel.hidden = true;
    panel.style.transform = "";
    panel.style.transition = "";
    panel.removeAttribute("aria-modal");
    if (panel.getAttribute("data-default-role")) {
      panel.setAttribute("role", panel.getAttribute("data-default-role"));
    }
    var surface = panel.querySelector(".controls-panel__surface");
    if (surface) {
      surface.style.transform = "";
      surface.style.transition = "";
    }
  }
  if (backdrop) {
    backdrop.classList.remove("is-visible");
    backdrop.hidden = true;
    backdrop.style.opacity = "";
    backdrop.style.transition = "";
  }
  document.body.classList.remove("controls-open");
}

/**
 * Wire mobile preferences: bottom sheet + backdrop + iOS-style drag dismiss.
 */
function initControlsPanel() {
  const cluster = document.querySelector("[data-controls]");
  const trigger = document.getElementById("controls-trigger");
  const panel = document.getElementById("controls-panel");
  const backdrop = document.getElementById("controls-backdrop");
  /* Entire drag zone (grabber + Preferences title) dismisses the sheet */
  const grab = panel && panel.querySelector("[data-sheet-grab]");
  const surface =
    panel &&
    (panel.querySelector(".controls-panel__surface") || panel);
  if (!cluster || !trigger || !panel) return;

  function sheetHeight() {
    return (surface || panel).getBoundingClientRect().height || 400;
  }

  /*
   * Mobile: hoist backdrop + panel to <body> so position:fixed is viewport-true
   * (not trapped inside the short fixed .top-bar). Desktop: keep in cluster.
   */
  function syncSheetLayerParent() {
    if (!document.body) return;
    var layers = [backdrop, panel].filter(Boolean);
    if (isDesktopControls()) {
      layers.forEach(function (el) {
        if (el.parentElement !== cluster) cluster.appendChild(el);
      });
    } else {
      layers.forEach(function (el) {
        if (el.parentElement !== document.body) document.body.appendChild(el);
      });
    }
  }
  syncSheetLayerParent();

  /* Store non-dialog role for desktop; mobile open uses dialog */
  if (!panel.getAttribute("data-default-role")) {
    panel.setAttribute("data-default-role", panel.getAttribute("role") || "region");
  }

  var sheetGen = 0;
  /* Live sheet offset (px). Positive = dragged down toward dismiss. */
  var sheetY = 0;
  var springRaf = 0;
  var lastFocus = null;

  function prefersSheetReduceMotion() {
    return Boolean(
      window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function cancelSheetSpring() {
    if (springRaf) {
      window.cancelAnimationFrame(springRaf);
      springRaf = 0;
    }
  }

  /**
   * Apply sheet drag offset — the ENTIRE menu moves as one unit.
   * y > 0 → dismiss down (dimmed page shows above the sheet).
   * y < 0 → rubber-band up; cream ::after on the panel fills the gap below
   *          (same --bg-card). Backdrop above the sheet is unchanged.
   */
  function applySheetY(y) {
    if (Math.abs(y) < 0.15) y = 0;
    sheetY = y;
    /* Never translate the inner surface alone — that felt like in-menu scroll */
    if (surface) {
      surface.style.transform = "";
      surface.style.transition = "";
    }
    if (y === 0) {
      panel.style.transform = "";
    } else {
      panel.style.transform = "translate3d(0, " + y + "px, 0)";
    }
  }

  function resetSheetInlineStyles() {
    cancelSheetSpring();
    sheetY = 0;
    panel.style.transform = "";
    panel.style.transition = "";
    panel.classList.remove("is-dragging");
    if (surface) {
      surface.style.transform = "";
      surface.style.transition = "";
    }
    if (backdrop) {
      backdrop.style.opacity = "";
      backdrop.style.transition = "";
    }
  }

  function setSheetDialogMode(isDialog) {
    if (isDialog) {
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
    } else {
      panel.setAttribute("role", panel.getAttribute("data-default-role") || "region");
      panel.removeAttribute("aria-modal");
    }
  }

  function focusableInSheet() {
    return Array.prototype.slice
      .call(
        panel.querySelectorAll(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      )
      .filter(function (el) {
        return !el.hidden && el.getAttribute("aria-hidden") !== "true";
      });
  }

  function focusSheet() {
    var nodes = focusableInSheet();
    var target = nodes[0] || panel;
    if (target === panel && !panel.hasAttribute("tabindex")) panel.setAttribute("tabindex", "-1");
    try {
      target.focus({ preventScroll: true });
    } catch (_) {
      target.focus();
    }
  }

  function restoreFocus() {
    var target = lastFocus && typeof lastFocus.focus === "function" ? lastFocus : trigger;
    if (!target || target.hidden || target.disabled) target = trigger;
    if (target && typeof target.focus === "function") {
      try {
        target.focus({ preventScroll: true });
      } catch (_) {
        target.focus();
      }
    }
    lastFocus = null;
  }

  function syncForViewport() {
    sheetGen += 1;
    resetSheetInlineStyles();
    panel.classList.remove("is-raised");
    if (backdrop) backdrop.classList.remove("is-visible");
    syncSheetLayerParent();

    if (isDesktopControls()) {
      panel.hidden = false;
      if (backdrop) backdrop.hidden = true;
      cluster.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      document.body.classList.remove("controls-open");
      setSheetDialogMode(false);
    } else {
      panel.hidden = true;
      if (backdrop) backdrop.hidden = true;
      cluster.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      document.body.classList.remove("controls-open");
      setSheetDialogMode(false);
    }
  }

  function setOpen(open) {
    if (isDesktopControls()) return;
    sheetGen += 1;
    var gen = sheetGen;

    cluster.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("controls-open", open);

    if (open) {
      lastFocus = document.activeElement;
      setSheetDialogMode(true);
      panel.hidden = false;
      if (backdrop) {
        backdrop.hidden = false;
        backdrop.classList.remove("is-visible");
      }
      panel.classList.remove("is-raised", "is-dragging");
      resetSheetInlineStyles();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (gen !== sheetGen) return;
          panel.classList.add("is-raised");
          if (backdrop) backdrop.classList.add("is-visible");
          focusSheet();
        });
      });
      return;
    }

    /* Close: CSS drops .is-raised → slides down (unless drag left an inline transform) */
    setSheetDialogMode(false);
    panel.classList.remove("is-dragging");
    if (backdrop) backdrop.classList.remove("is-visible");

    var reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var closeMs = reduce ? 0 : 380;

    if (panel.style.transform) {
      panel.style.transition =
        "transform " + closeMs + "ms cubic-bezier(0.32, 0.72, 0, 1)";
      panel.style.transform = "translate3d(0, 100%, 0)";
      panel.classList.remove("is-raised");
    } else {
      panel.style.transition = "";
      panel.classList.remove("is-raised");
    }

    window.setTimeout(function () {
      if (gen !== sheetGen) return;
      panel.hidden = true;
      resetSheetInlineStyles();
      if (backdrop) backdrop.hidden = true;
      restoreFocus();
    }, closeMs);
  }

  /** Finalize after drag-dismiss animation (panel already off-screen). */
  function finishDragClose() {
    sheetGen += 1;
    cluster.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("controls-open");
    setSheetDialogMode(false);
    panel.classList.remove("is-raised", "is-dragging");
    panel.hidden = true;
    resetSheetInlineStyles();
    if (backdrop) {
      backdrop.classList.remove("is-visible");
      backdrop.hidden = true;
    }
    restoreFocus();
  }

  syncForViewport();

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isDesktopControls()) return;
    const open = trigger.getAttribute("aria-expanded") === "true";
    setOpen(!open);
  });

  if (backdrop) {
    backdrop.addEventListener("click", function () {
      setOpen(false);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (document.body.classList.contains("qr-modal-open")) return;
    if (isDesktopControls()) return;
    if (trigger.getAttribute("aria-expanded") !== "true") return;

    if (e.key === "Escape") {
      e.preventDefault();
      if (document.body.classList.contains("lang-picker-open")) return;
      setOpen(false);
      return;
    }

    if (e.key !== "Tab") return;
    var nodes = focusableInSheet();
    if (!nodes.length) return;
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /*
   * Drag top block (grabber + title) — iOS sheet:
   * 1:1 down, rubber-band up, velocity handoff, spring settle, interruptible.
   */
  if (grab) {
    var drag = {
      active: false,
      fingerStart: 0,
      yAtGrab: 0,
      samples: [],
    };

    function clientY(e) {
      if (e.touches && e.touches[0]) return e.touches[0].clientY;
      if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0].clientY;
      return e.clientY;
    }

    /** Progressive resistance past the open edge (Apple rubber-band). */
    function rubberband(overshoot, dimension, constant) {
      var c = constant == null ? 0.55 : constant;
      var d = Math.max(1, dimension);
      return (overshoot * d * c) / (d + c * Math.abs(overshoot));
    }

    /** Map unconstrained offset → visual Y (px). */
    function mapDragY(desired, reduce) {
      if (desired >= 0) return desired;
      if (reduce) return 0;
      var h = sheetHeight();
      var dim = Math.max(120, h * 0.45);
      return -rubberband(-desired, dim, 0.55);
    }

    function recordSample(y) {
      var t = performance.now();
      drag.samples.push({ t: t, y: y });
      if (drag.samples.length > 6) drag.samples.shift();
    }

    /** Release velocity in px/ms (positive = downward). */
    function sampleVelocity() {
      if (drag.samples.length < 2) return 0;
      var a = drag.samples[0];
      var b = drag.samples[drag.samples.length - 1];
      var dt = b.t - a.t;
      if (dt < 8) return 0;
      return (b.y - a.y) / dt;
    }

    function updateBackdropForY(y) {
      if (!backdrop) return;
      if (y <= 0) {
        backdrop.style.opacity = "";
        backdrop.classList.add("is-visible");
        return;
      }
      backdrop.style.opacity = String(Math.max(0.12, 1 - y / 280));
    }

    /**
     * Spring animate sheetY → open (target 0) with initial velocity (px/ms).
     * Underdamped (ζ < 1) yields a light iOS-style bounce when momentum warrants it.
     */
    function springSheetTo(target, velocityPxMs, opts) {
      opts = opts || {};
      cancelSheetSpring();
      panel.style.transition = "none";
      panel.classList.remove("is-dragging");

      var reduce = prefersSheetReduceMotion();
      var gen = sheetGen;
      var pos = sheetY;
      var vel = velocityPxMs || 0;
      var lastT = performance.now();

      /* response ≈ settle feel; dampingRatio < 1 → overshoot / bounce */
      var response = reduce ? 0.22 : opts.response != null ? opts.response : 0.32;
      var dampingRatio = reduce
        ? 1
        : opts.dampingRatio != null
          ? opts.dampingRatio
          : 0.86;
      var omega = (2 * Math.PI) / Math.max(0.12, response);
      var onDone = opts.onDone;
      var maxMs = opts.maxMs || 900;
      var startT = lastT;

      if (reduce) {
        applySheetY(target);
        updateBackdropForY(target);
        panel.classList.add("is-raised");
        if (typeof onDone === "function") onDone();
        return;
      }

      function frame(now) {
        if (gen !== sheetGen) {
          springRaf = 0;
          return;
        }
        var dt = Math.min(0.032, Math.max(0.001, (now - lastT) / 1000));
        lastT = now;

        var x = pos - target;
        /* m = 1: a = −ω²x − 2ζω v */
        var accel = -omega * omega * x - 2 * dampingRatio * omega * vel;
        vel += accel * dt;
        pos += vel * dt;

        applySheetY(pos);
        updateBackdropForY(pos);

        if (Math.abs(pos - target) < 0.4 && Math.abs(vel) < 0.05) {
          springRaf = 0;
          applySheetY(target);
          updateBackdropForY(target);
          panel.style.transition = "";
          panel.classList.add("is-raised");
          if (backdrop) {
            backdrop.style.transition = "";
            backdrop.style.opacity = "";
            backdrop.classList.add("is-visible");
          }
          if (typeof onDone === "function") onDone();
          return;
        }

        if (now - startT > maxMs) {
          springRaf = 0;
          applySheetY(target);
          updateBackdropForY(target);
          panel.classList.add("is-raised");
          if (typeof onDone === "function") onDone();
          return;
        }

        springRaf = window.requestAnimationFrame(frame);
      }

      springRaf = window.requestAnimationFrame(frame);
    }

    function onDragStart(e) {
      if (isDesktopControls() || panel.hidden) return;
      if (trigger.getAttribute("aria-expanded") !== "true") return;

      /* Interrupt mid-settle: continue from live presented offset */
      cancelSheetSpring();
      panel.style.transition = "none";
      panel.classList.add("is-dragging", "is-raised");

      drag.active = true;
      drag.fingerStart = clientY(e);
      drag.yAtGrab = sheetY;
      drag.samples = [];
      recordSample(sheetY);

      if (e.pointerId != null && grab.setPointerCapture) {
        try {
          grab.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
      if (e.cancelable) e.preventDefault();
    }

    function onDragMove(e) {
      if (!drag.active) return;
      var reduce = prefersSheetReduceMotion();
      var raw = clientY(e) - drag.fingerStart;
      var desired = drag.yAtGrab + raw;
      var y = mapDragY(desired, reduce);
      applySheetY(y);
      recordSample(y);
      updateBackdropForY(y);
      if (e.cancelable) e.preventDefault();
    }

    function onDragEnd() {
      if (!drag.active) return;
      drag.active = false;
      panel.classList.remove("is-dragging");

      var y = sheetY;
      var v = sampleVelocity(); /* px/ms */
      var h = sheetHeight();
      var reduce = prefersSheetReduceMotion();

      /*
       * Dismiss: large downward offset, or projected endpoint / flick.
       * project uses px/s form from Apple fluid interfaces.
       */
      var vPxS = v * 1000;
      var projected = y + (vPxS / 1000) * (0.998 / (1 - 0.998));
      var shouldClose =
        y > Math.min(120, h * 0.28) ||
        (y > 40 && v > 0.45) ||
        projected > Math.min(160, h * 0.38);

      if (shouldClose && y > 8) {
        /* Kinetic dismiss (accelerate off-screen) — no bounce needed */
        cancelSheetSpring();
        panel.classList.remove("is-raised", "is-dragging");
        panel.style.transition = "none";
        if (backdrop) {
          backdrop.classList.remove("is-visible");
          backdrop.style.transition = "opacity 0.22s ease-out";
        }
        var gen = sheetGen;
        var pos = y;
        var vel = Math.max(v, reduce ? 1.2 : 0.55); /* px/ms */
        var lastT = performance.now();
        var startT = lastT;

        function dismissFrame(now) {
          if (gen !== sheetGen) {
            springRaf = 0;
            return;
          }
          var dt = Math.min(32, Math.max(1, now - lastT));
          lastT = now;
          if (!reduce) vel += 0.0028 * dt; /* ease into a fall */
          pos += vel * dt;
          applySheetY(pos);
          if (backdrop) {
            backdrop.style.opacity = String(
              Math.max(0, 1 - pos / Math.max(160, h * 0.55))
            );
          }
          if (pos >= h || now - startT > 700) {
            springRaf = 0;
            finishDragClose();
            return;
          }
          springRaf = window.requestAnimationFrame(dismissFrame);
        }
        springRaf = window.requestAnimationFrame(dismissFrame);
      } else {
        /* Settle open — rubber-band release + light bounce with momentum */
        var hasMomentum = Math.abs(v) > 0.12 || y < -6;
        springSheetTo(0, v, {
          dismiss: false,
          dampingRatio: reduce ? 1 : hasMomentum ? 0.78 : 0.9,
          response: reduce ? 0.2 : hasMomentum ? 0.28 : 0.34,
          maxMs: 900,
        });
      }

      drag.samples = [];
    }

    if (window.PointerEvent) {
      grab.addEventListener("pointerdown", onDragStart);
      grab.addEventListener("pointermove", onDragMove);
      grab.addEventListener("pointerup", onDragEnd);
      grab.addEventListener("pointercancel", onDragEnd);
    } else {
      grab.addEventListener("touchstart", onDragStart, { passive: false });
      grab.addEventListener("touchmove", onDragMove, { passive: false });
      grab.addEventListener("touchend", onDragEnd);
      grab.addEventListener("touchcancel", onDragEnd);
    }
  }

  if (window.matchMedia) {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = function () {
      syncForViewport();
      /* Refresh host radiogroup tab stops when sheet ↔ section placement swaps */
      if (typeof syncHostSwitcher === "function") {
        syncHostSwitcher(
          typeof getStoredProjectHost === "function"
            ? getStoredProjectHost()
            : "cloudflare"
        );
      }
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
}
