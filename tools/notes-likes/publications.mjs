const manifestUrls = [
  "https://t-g.pages.dev/notes/reactions.json",
  "https://raw.githubusercontent.com/TGthms/about/main/public/notes/reactions.json"
];
let manifest;
let refreshAt = 0;

export async function publications() {
  if (Date.now() >= refreshAt) {
    for (const url of manifestUrls) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const data = await response.json();
        if (!data || typeof data !== "object" || Array.isArray(data)) continue;
        manifest = data;
        refreshAt = Date.now() + 30_000;
        return manifest;
      } catch { /* Try the other public copy of the release manifest. */ }
    }
    throw new Error("Publication list unavailable");
  }
  return manifest;
}

export async function published(note) {
  const list = await publications();
  if (!Object.hasOwn(list, note)) return false;
  const value = list[note];
  // Accept the original likes manifest while the static hosts roll out a release.
  const expiry = value && typeof value === "object" ? value.expires : value;
  return expiry === null || Date.parse(expiry) > Date.now();
}
