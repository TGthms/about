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
  var zoom = document.createElement("button");
  zoom.type = "button";
  zoom.className = "note-image-viewer__zoom";
  var zoomLabels = { en: "Zoom image", es: "Ampliar imagen", zh: "放大图片", "zh-Hant": "放大圖片", ja: "画像を拡大", ko: "이미지 확대" };
  zoom.setAttribute("aria-label", zoomLabels[root.lang] || zoomLabels.en);
  tools.append(zoom, close);

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
  function updateZoom() {
    var isZoomed = viewport.classList.contains("is-zoomed");
    zoom.textContent = isZoomed ? "−" : "+";
    zoom.setAttribute("aria-pressed", String(isZoomed));
    zoom.disabled = !isZoomed && !(viewer.open && image.complete && image.naturalWidth > image.clientWidth + 2);
  }
  function resetZoom() {
    viewport.classList.remove("is-zoomed");
    viewport.removeAttribute("tabindex");
    viewport.style.removeProperty("width");
    viewport.style.removeProperty("height");
    image.style.removeProperty("width");
    updateZoom();
  }
  resetZoom();
  zoom.addEventListener("click", function () {
    if (viewport.classList.contains("is-zoomed")) {
      resetZoom();
      return;
    }
    var bounds = image.getBoundingClientRect();
    var width = Math.min(image.naturalWidth, Math.round(image.clientWidth * 2.5));
    viewport.style.width = bounds.width + "px";
    viewport.style.height = bounds.height + "px";
    image.style.width = width + "px";
    viewport.classList.add("is-zoomed");
    viewport.tabIndex = 0;
    viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
    viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2;
    updateZoom();
  });
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
      updateZoom();
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
  image.addEventListener("load", function () { updateCaptionFocus(); updateZoom(); });
  image.addEventListener("error", updateZoom);
  window.addEventListener("resize", function () {
    if (!viewer.open) return;
    resetZoom();
    updateCaptionFocus();
  });
}());
