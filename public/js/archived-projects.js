/* Archived project shelf dialog. */
(function () {
  "use strict";

  var openButton = document.getElementById("archived-projects-open");
  var modal = document.getElementById("archived-projects-modal");

  if (!openButton || !modal) return;

  var lastFocus = null;
  var isOpen = false;

  function focusable() {
    return Array.prototype.slice.call(
      modal.querySelectorAll(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )
    );
  }

  function open() {
    if (isOpen) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("archived-projects-open");
    openButton.setAttribute("aria-expanded", "true");
    isOpen = true;
    if (typeof lockPageScroll === "function") lockPageScroll();
    if (typeof setBackgroundInert === "function") setBackgroundInert(modal, true);

    var closeButton = modal.querySelector(".archived-projects-modal__close");
    if (closeButton) closeButton.focus();
  }

  function close() {
    if (!isOpen) return;

    modal.hidden = true;
    document.body.classList.remove("archived-projects-open");
    openButton.setAttribute("aria-expanded", "false");
    isOpen = false;
    if (typeof unlockPageScroll === "function") unlockPageScroll();
    if (typeof setBackgroundInert === "function") setBackgroundInert(modal, false);

    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  openButton.addEventListener("click", open);

  modal.querySelectorAll("[data-archived-close]").forEach(function (element) {
    element.addEventListener("click", close);
  });

  document.addEventListener("keydown", function (event) {
    if (!isOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== "Tab") return;

    var nodes = focusable();
    if (!nodes.length) return;

    if (event.shiftKey && document.activeElement === nodes[0]) {
      event.preventDefault();
      nodes[nodes.length - 1].focus();
    } else if (!event.shiftKey && document.activeElement === nodes[nodes.length - 1]) {
      event.preventDefault();
      nodes[0].focus();
    }
  });
})();
