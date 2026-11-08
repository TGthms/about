(function () {
  "use strict";
  var viewer = document.querySelector(".note-image-viewer");
  if (!viewer || typeof viewer.showModal !== "function") return;

  var root = document.documentElement;
  var image = viewer.querySelector("img");
  var close = viewer.querySelector("button");
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
      viewer.showModal();
      root.classList.add("note-image-open");
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
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  });
  document.addEventListener("noteexpired", function () {
    if (viewer.open) viewer.close();
  });
}());
