import PhotoSwipe from "./vendor/photoswipe-5.4.4.mjs";

export function loadStyle() {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL("../css/vendor/photoswipe-5.4.4.css", import.meta.url).href;
    link.onload = resolve;
    link.onerror = () => {
      link.remove();
      reject(new Error("PhotoSwipe styles could not be loaded."));
    };
    document.head.append(link);
  });
}

export function createPhotoSwipe(viewer, image, tools, caption, updateZoom, onDestroy) {
  const padding = {};
  function measure() {
    const style = getComputedStyle(viewer);
    padding.top = parseFloat(style.paddingTop) + tools.offsetHeight + 8;
    padding.right = parseFloat(style.paddingRight);
    padding.bottom = parseFloat(style.paddingBottom) + (caption.hidden ? 0 : caption.offsetHeight + 8);
    padding.left = parseFloat(style.paddingLeft);
    const clip = [padding.top, padding.right, padding.bottom, padding.left];
    viewer.style.setProperty("--note-photo-inset", clip.map(value => value + "px").join(" "));
  }
  const lightbox = new PhotoSwipe({
    appendToEl: viewer,
    mainClass: "note-image-viewer__photoswipe",
    dataSource: [{ src: image.src, width: image.naturalWidth, height: image.naturalHeight, alt: image.alt }],
    getViewportSizeFn: () => ({ x: viewer.clientWidth, y: viewer.clientHeight }),
    padding,
    maxZoomLevel: levels => Math.min(1, levels.fit * 3),
    secondaryZoomLevel: levels => Math.min(1, levels.fit * 2),
    close: false, zoom: false, arrowPrev: false, arrowNext: false, counter: false, preloader: false,
    trapFocus: false, returnFocus: false, escKey: false,
    loop: false, allowPanToNext: false, closeOnVerticalDrag: false, pinchToClose: false,
    clickToCloseNonZoomable: false, imageClickAction: "zoom", bgClickAction: () => viewer.close(),
    tapAction: (_point, event) => {
      if (!event.target.closest(".pswp__img")) viewer.close();
    },
    doubleTapAction: "zoom", bgOpacity: 0, showHideAnimationType: "none",
  });
  let lastZoom, lastFit, lastLimit;
  lightbox.on("beforeResize", measure);
  lightbox.on("zoomPanUpdate", ({ slide }) => {
    const { initial, max } = slide.zoomLevels;
    if (lastZoom === slide.currZoomLevel && lastFit === initial && lastLimit === max) return;
    lastZoom = slide.currZoomLevel;
    lastFit = initial;
    lastLimit = max;
    updateZoom(slide);
  });
  lightbox.on("keydown", event => {
    // The native dialog owns focus. Leave the caption's scrolling keys alone.
    if (event.originalEvent.key === "Tab" || event.originalEvent.target === caption) event.preventDefault();
  });
  lightbox.on("loadComplete", event => {
    if (event.isError) lightbox.destroy();
  });
  lightbox.on("destroy", () => {
    viewer.classList.remove("has-photoswipe");
    viewer.style.removeProperty("--note-photo-inset");
    onDestroy();
  });
  viewer.classList.add("has-photoswipe");
  measure();
  lightbox.init();
  lightbox.element.removeAttribute("role");
  lightbox.element.removeAttribute("tabindex");
  lightbox.scrollWrap.removeAttribute("aria-roledescription");
  return lightbox;
}
