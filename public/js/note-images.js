(function () {
  "use strict";
  var viewer = document.querySelector(".note-image-viewer");
  if (!viewer || typeof viewer.showModal !== "function") return;

  var root = document.documentElement;
  var frame = viewer.querySelector(".note-image-viewer__frame");
  frame.tabIndex = -1;
  frame.setAttribute("autofocus", "");
  var image = viewer.querySelector("img");
  var close = viewer.querySelector("button");
  close.removeAttribute("autofocus");
  close.className = "note-image-viewer__close";
  var tools = document.createElement("div");
  tools.className = "note-image-viewer__tools";
  close.before(tools);
  var zoomLabels = {
    en: ["Zoom out", "Zoom in"], es: ["Alejar", "Acercar"], zh: ["缩小图片", "放大图片"],
    "zh-Hant": ["縮小圖片", "放大圖片"], ja: ["画像を縮小", "画像を拡大"], ko: ["이미지 축소", "이미지 확대"]
  };
  var labels = zoomLabels[root.lang] || zoomLabels.en;
  var percent = new Intl.NumberFormat(root.lang || "en", { style: "percent" });
  function zoomButton(direction, label) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "note-image-viewer__zoom-" + direction;
    button.setAttribute("aria-label", label);
    return button;
  }
  var zoomOut = zoomButton("out", labels[0]);
  var zoomIn = zoomButton("in", labels[1]);
  var level = document.createElement("span");
  level.className = "note-image-viewer__level";
  level.setAttribute("role", "status");
  var zoomControls = document.createElement("div");
  zoomControls.className = "note-image-viewer__zoom";
  zoomControls.append(zoomOut, level, zoomIn);
  tools.append(zoomControls, close);

  var viewport = document.createElement("div");
  viewport.className = "note-image-viewer__viewport";
  image.before(viewport);
  viewport.append(image);
  image.draggable = false;
  var caption = document.createElement("p");
  caption.className = "note-image-viewer__caption";
  caption.id = "note-image-caption";
  caption.hidden = true;
  viewport.after(caption);

  function updateCaption(source) {
    caption.textContent = source ? source.textContent.trim() : "";
    caption.hidden = !caption.textContent;
    if (caption.hidden) viewer.removeAttribute("aria-describedby");
    else viewer.setAttribute("aria-describedby", caption.id);
  }
  function updateCaptionFocus() {
    if (!viewer.open || caption.hidden) return;
    caption.tabIndex = caption.scrollHeight > caption.clientHeight ? 0 : -1;
  }
  var zoomSteps = [1], zoomIndex = 0, fitWidth = 0, fitHeight = 0;
  function updateZoomControls() {
    var label = percent.format(zoomSteps[zoomIndex]);
    if (level.textContent !== label) level.textContent = label;
    zoomOut.setAttribute("aria-disabled", String(zoomIndex === 0));
    zoomIn.setAttribute("aria-disabled", String(zoomIndex === zoomSteps.length - 1));
  }
  function resetZoom() {
    zoomIndex = 0;
    viewport.classList.remove("is-zoomed");
    viewport.removeAttribute("tabindex");
    viewport.style.removeProperty("width");
    viewport.style.removeProperty("height");
    image.style.removeProperty("width");
    var bounds = image.getBoundingClientRect();
    fitWidth = bounds.width;
    fitHeight = bounds.height;
    var limit = viewer.open && image.complete && fitWidth ? Math.min(3, image.naturalWidth / fitWidth) : 1;
    zoomSteps = [1, 1.25, 1.5, 2, 2.5].filter(function (step) { return step === 1 || step < limit - .06; });
    if (limit > 1.06) zoomSteps.push(limit);
    updateZoomControls();
  }
  resetZoom();
  function changeZoom(direction) {
    var next = zoomIndex + direction;
    if (next < 0 || next >= zoomSteps.length) return;
    if (next === 0) {
      resetZoom();
      return;
    }
    var x = zoomIndex ? (viewport.scrollLeft + viewport.clientWidth / 2) / image.clientWidth : .5;
    var y = zoomIndex ? (viewport.scrollTop + viewport.clientHeight / 2) / image.clientHeight : .5;
    zoomIndex = next;
    viewport.style.width = fitWidth + "px";
    viewport.style.height = fitHeight + "px";
    image.style.width = fitWidth * zoomSteps[next] + "px";
    viewport.classList.add("is-zoomed");
    viewport.tabIndex = 0;
    viewport.scrollLeft = x * image.clientWidth - viewport.clientWidth / 2;
    viewport.scrollTop = y * image.clientHeight - viewport.clientHeight / 2;
    updateZoomControls();
  }
  zoomOut.addEventListener("click", function () { changeZoom(-1); });
  zoomIn.addEventListener("click", function () { changeZoom(1); });
  var drag;
  viewport.addEventListener("pointerdown", function (event) {
    if (event.pointerType !== "mouse" || event.button || !viewport.classList.contains("is-zoomed") || event.target !== image) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    viewport.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  viewport.addEventListener("pointermove", function (event) {
    if (!drag || event.pointerId !== drag.id) return;
    viewport.scrollLeft = drag.left + drag.x - event.clientX;
    viewport.scrollTop = drag.top + drag.y - event.clientY;
  });
  viewport.addEventListener("lostpointercapture", function () { drag = null; });

  var opener;
  var backdropPressed = false;
  document.querySelectorAll("[data-note-image]").forEach(function (link) {
    link.setAttribute("aria-haspopup", "dialog");
    link.addEventListener("click", function (event) {
      if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      backdropPressed = false;
      image.alt = link.querySelector("img").alt;
      image.src = link.getAttribute("href");
      updateCaption(link.parentElement.querySelector("figcaption"));
      viewer.showModal();
      (event.detail === 0 ? close : frame).focus({ preventScroll: true });
      root.classList.add("note-image-open");
      updateCaptionFocus();
      resetZoom();
    });
  });

  close.addEventListener("click", function () { viewer.close(); });
  viewer.addEventListener("pointerdown", function (event) {
    backdropPressed = event.target === viewer;
  });
  viewer.addEventListener("click", function (event) {
    if (event.target === viewer && backdropPressed) viewer.close();
  });
  viewer.addEventListener("close", function () {
    if (viewer.open) return;
    root.classList.remove("note-image-open");
    image.removeAttribute("src");
    updateCaption(null);
    resetZoom();
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  });
  document.addEventListener("noteexpired", function () {
    if (viewer.open) viewer.close();
  });
  image.addEventListener("load", function () { updateCaptionFocus(); resetZoom(); });
  image.addEventListener("error", resetZoom);
  window.addEventListener("resize", function () {
    if (!viewer.open) return;
    resetZoom();
    updateCaptionFocus();
  });
}());
