/* Eight-second featured Notes carousel. Native scrolling is the fallback. */
(function () {
  "use strict";
  var frame = document.querySelector('[data-notes-carousel]');
  if (!frame) return;
  var track = frame.querySelector('.notes-carousel__track');
  var slides = Array.from(frame.querySelectorAll('[data-note-slide]'));
  var controls = frame.querySelector('.notes-carousel__controls');
  var dots = frame.querySelector('[data-note-dots]');
  var previous = frame.querySelector('[data-note-prev]');
  var next = frame.querySelector('[data-note-next]');
  var status = frame.querySelector('[data-note-carousel-status]');
  var motion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var lightweight = window.SiteRuntime && window.SiteRuntime.lightweight;
  var active = [], index = 0, timer = 0, remaining = 8000, started = 0;
  var visible = false, focused = false, touching = false, touchStart = null;
  var buttons = [], observer = null;
  function now() { return window.performance ? window.performance.now() : Date.now(); }
  function words() {
    var lang = document.documentElement.getAttribute('data-language') || 'en';
    return (TRANSLATIONS[lang] || TRANSLATIONS.en).notes;
  }
  function label(i) { return words().slideLabel.replace('{number}', i + 1).replace('{total}', active.length); }
  function allowed() {
    return active.length > 1 && visible && !document.hidden && !focused && !touching &&
      !document.documentElement.classList.contains('page-scroll-locked') && !lightweight && !(motion && motion.matches);
  }
  function progress(value, duration) {
    var button = buttons[index];
    if (!button) return;
    button.style.setProperty('--note-progress-time', duration + 'ms');
    button.style.setProperty('--note-progress', value);
  }
  function stop() {
    if (timer) { remaining = Math.max(0, remaining - (now() - started)); clearTimeout(timer); timer = 0; }
    progress(1 - remaining / 8000, 0);
  }
  function run() {
    if (!allowed() || timer) return;
    started = now();
    progress(1, remaining);
    timer = setTimeout(function () { timer = 0; move(index + 1, false); }, Math.max(0, remaining));
  }
  function move(nextIndex, manual) {
    if (!active.length) return;
    stop(); remaining = 8000;
    index = (nextIndex + active.length) % active.length;
    active.forEach(function (slide, i) {
      var current = i === index;
      slide.setAttribute('aria-hidden', String(!current));
      slide.inert = !current;
      slide.querySelector('a').tabIndex = current ? 0 : -1;
    });
    track.style.transform = 'translateX(' + (-index * 100) + '%)';
    buttons.forEach(function (button, i) {
      if (i === index) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current');
      button.style.setProperty('--note-progress-time', '0ms');
      button.style.setProperty('--note-progress', '0');
    });
    if (manual) status.textContent = label(index);
    // Commit the reset before starting the CSS-only progress transition.
    if (buttons[index]) void buttons[index].offsetWidth;
    run();
  }
  function refresh() {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var featured = slides.filter(function (slide) {
      var until = slide.getAttribute('data-note-highlight-until');
      return slide.getAttribute('data-note-featured') === 'true' && (!until || new Date(until + 'T23:59:59') >= today);
    });
    var selected = featured.length ? featured : [slides.filter(function (slide) { return slide.getAttribute('data-note-featured') === 'false'; })[0] || slides[0]];
    var changed = selected.length !== active.length || selected.some(function (slide, i) { return slide !== active[i]; });
    if (changed) {
      stop(); active = selected; index = 0;
      slides.forEach(function (slide) { slide.hidden = active.indexOf(slide) < 0; });
      dots.textContent = ''; buttons = [];
      active.forEach(function (_, i) {
        var button = document.createElement('button');
        button.type = 'button'; button.className = 'notes-carousel__dot';
        var indicator = document.createElement('span');
        indicator.className = 'notes-carousel__indicator';
        indicator.setAttribute('aria-hidden', 'true');
        button.appendChild(indicator);
        button.addEventListener('click', function () { move(i, true); });
        dots.appendChild(button); buttons.push(button);
      });
      controls.hidden = active.length < 2;
      move(0, false);
    }
    buttons.forEach(function (button, i) { button.setAttribute('aria-label', label(i)); });
    previous.setAttribute('aria-label', words().previousSlide);
    next.setAttribute('aria-label', words().nextSlide);
    frame.setAttribute('aria-label', words().featuredNotes);
  }
  previous.addEventListener('click', function () { move(index - 1, true); });
  next.addEventListener('click', function () { move(index + 1, true); });
  frame.addEventListener('focusin', function (event) {
    // Mouse clicks keep autoplay running; keyboard focus keeps its place.
    focused = true;
    try { if (event && event.target && event.target.matches) focused = event.target.matches(':focus-visible'); } catch (_) {}
    if (focused) stop(); else run();
  });
  frame.addEventListener('focusout', function (event) { if (!frame.contains(event.relatedTarget)) { focused = false; run(); } });
  frame.addEventListener('keydown', function (event) {
    if (!event.target.closest('.notes-carousel__controls')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(index + (event.key === 'ArrowRight' ? 1 : -1), true); }
  });
  frame.addEventListener('pointerdown', function (event) {
    if (event.pointerType === 'mouse' || event.target.closest('button')) return;
    touchStart = { x: event.clientX, y: event.clientY }; touching = true; stop();
  }, {passive:true});
  var swipeUntil = 0;
  frame.addEventListener('pointerup', function (event) {
    if (!touchStart) return;
    var dx = event.clientX - touchStart.x, dy = event.clientY - touchStart.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) { swipeUntil = now() + 400; move(index + (dx < 0 ? 1 : -1), true); }
    touchStart = null; touching = false; run();
  }, {passive:true});
  frame.addEventListener('pointercancel', function () { touchStart = null; touching = false; run(); }, {passive:true});
  frame.addEventListener('click', function (event) { if (now() < swipeUntil) { event.preventDefault(); swipeUntil = 0; } }, true);
  frame.classList.add('is-enhanced');
  refresh();
  if (window.IntersectionObserver) {
    observer = new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; if (visible) { refresh(); run(); } else stop(); }, {threshold:0.2});
    observer.observe(frame);
  } else visible = true;
  if (motion && motion.addEventListener) motion.addEventListener('change', function () { stop(); run(); });
  document.addEventListener('visibilitychange', function () { stop(); if (!document.hidden) { refresh(); run(); } });
  window.addEventListener('pagehide', function () { stop(); if (observer) observer.disconnect(); });
  window.addEventListener('pageshow', function () { refresh(); if (observer) observer.observe(frame); run(); });
  if (window.MutationObserver && !lightweight) new MutationObserver(function () { if (allowed()) run(); else stop(); }).observe(document.documentElement, {attributes:true,attributeFilter:['class']});
  window.NotesCarousel = { refresh: refresh };
  run();
}());
