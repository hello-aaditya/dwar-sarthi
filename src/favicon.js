// src/favicon.js — favicon resolution

/**
 * Returns a favicon URL for a given site URL.
 * Uses Google's favicon service by default (fast, cached).
 * Falls back to DuckDuckGo if preferred (more privacy-friendly).
 */
export function faviconUrl(siteUrl, service = "google", size = 64) {
  try {
    const origin = new URL(siteUrl).origin;
    if (service === "duckduckgo") {
      return `https://icons.duckduckgo.com/ip3/${new URL(siteUrl).hostname}.ico`;
    }
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=${size}`;
  } catch (e) {
    return "";
  }
}

/**
 * Returns an SVG data URI with the first letter of the title.
 * Used as fallback when favicon fails to load.
 */
export function letterIcon(title, bgColor = "#6c63ff") {
  const letter = (title || "?").trim()[0].toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
    <rect width='64' height='64' rx='12' fill='${bgColor}'/>
    <text x='32' y='44' font-size='32' font-family='sans-serif'
      fill='white' text-anchor='middle' font-weight='600'>${letter}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Cycle of accessible colors for letter icons
const PALETTE = [
  "#5c6bc0","#26a69a","#ef5350","#ab47bc",
  "#42a5f5","#66bb6a","#ffa726","#8d6e63"
];

export function paletteColor(str) {
  let hash = 0;
  for (const ch of str) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
