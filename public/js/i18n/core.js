/**
 * Tim G Personal Hub - Shared i18n utilities.
 */
function getNested(obj, path) {
  return path.split(".").reduce(function (current, part) {
    if (current && typeof current === "object" && part in current) return current[part];
    return undefined;
  }, obj);
}

function isDesktopControls() {
  return Boolean(window.matchMedia && window.matchMedia("(min-width: 768px)").matches);
}
