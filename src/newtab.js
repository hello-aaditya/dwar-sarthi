// src/newtab.js — new tab page controller

import { DEFAULT_CONFIG } from "./data.js";
import { faviconUrl, letterIcon, paletteColor } from "./favicon.js";
import { saveAndPush } from "./github.js";

// ── State ──────────────────────────────────────────────────────────────────
let config        = null;
let activeFolderId = "root";
let editingDialId  = null;
let dragSrcIdx     = null;

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  // 1. Load from local storage (instant)
  const stored = await chrome.storage.local.get(["config", "last_sync", "sync_error"]);
  config = stored.config || structuredClone(DEFAULT_CONFIG);

  applyAppearance();
  // renderGreeting();
  renderFolderNav();
  renderGrid();
  renderSyncStatus(stored.last_sync, stored.sync_error);

  // 2. Trigger background sync (non-blocking)
  chrome.runtime.sendMessage({ type: "SYNC_NOW" }, (res) => {
    if (res?.ok) {
      // Reload config from storage after sync
      chrome.storage.local.get("config").then(({ config: updated }) => {
        if (updated) {
          config = updated;
          applyAppearance();
          renderGrid();
          renderSyncStatus(Date.now(), "");
        }
      });
    }
  });

  bindEvents();
}

// ── Appearance ─────────────────────────────────────────────────────────────
function applyAppearance() {
  const s = config?.settings;
  if (!s) return;

  // 1. Apply theme
  const dark =
    s.theme === "dark" ||
    (s.theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");

  const sun  = document.getElementById("theme-icon-sun");
  const moon = document.getElementById("theme-icon-moon");
  if (sun && moon) {
    sun.style.display  = dark ? "none"  : "";
    moon.style.display = dark ? ""      : "none";
  }

  // 2. Apply background if set
  if (s.backgroundType === "color" && s.backgroundColor)
    document.body.style.background = s.backgroundColor;
  else if (s.backgroundType === "gradient" && s.backgroundGradient)
    document.body.style.background = s.backgroundGradient;
  else
    document.body.style.background = "";

  // ── Wallpaper integrations
  const overlay = document.getElementById("wallpaper-overlay");
  const veil = document.getElementById("dim-veil");
  if (s.backgroundType === "wallpaper" && s.wallpaperSource) {
    if (overlay) {
      overlay.style.backgroundImage = `url("${s.wallpaperSource}")`;
      overlay.style.display = "block";
      document.documentElement.style.setProperty("--bg-blur", `${s.wallpaperBlur || 0}px`);
    }
    if (veil) {
      document.documentElement.style.setProperty("--bg-dim", (s.wallpaperDim !== undefined ? s.wallpaperDim : 20) / 100);
    }
  } else {
    if (overlay) {
      overlay.style.backgroundImage = "none";
      overlay.style.display = "none";
    }
    if (veil) {
      document.documentElement.style.setProperty("--bg-dim", "0");
    }
  }

  // ── Font integrations
  const fontFamily = s.fontFamily || "Georgia";
  const fontToUse = fontFamily === "custom" ? s.customFont : fontFamily;
  if (fontToUse && fontFamily !== "Georgia") {
    let link = document.getElementById("google-font-style");
    if (!link) {
      link = document.createElement("link");
      link.id = "google-font-style";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontToUse)}:wght@400;500;600;700&display=swap`;
  } else {
    document.getElementById("google-font-style")?.remove();
  }
  document.documentElement.style.setProperty("--font-family", `"${fontToUse}", Georgia, "Times New Roman", Times, serif`);

  // 3. Apply grid columns count
  const cols = s.columns || 6;
  document.documentElement.style.setProperty("--cols", cols);

  // 4. Apply card size (scale factor)
  const cardSize = s.cardSize || 1;
  document.documentElement.style.setProperty("--card-size", cardSize);

  // 5. Apply text size
  const textSize = (s.textSize || 14) + "px";
  document.documentElement.style.setProperty("--text-size", textSize);

  // 6. Toggle search bar visibility
  const searchForm = document.getElementById("search-form");
  if (searchForm) {
    searchForm.style.display = s.showSearch !== false ? "" : "none";
  }

  // 7. Toggle dial labels visibility
  document.documentElement.classList.toggle("hide-labels", s.showLabels === false);
}

function cycleTheme() {
  const order = ["auto", "light", "dark"];
  const cur   = config.settings.theme || "auto";
  config.settings.theme = order[(order.indexOf(cur) + 1) % order.length];
  applyAppearance();
  persist();
}

// ── Greeting ───────────────────────────────────────────────────────────────
// function renderGreeting() {
//   const h = new Date().getHours();
//   const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
//   document.getElementById("greeting").textContent = g;
// }

// ── Folder nav (draggable for reorder) ───────────────────────────────────────────────────
let dragFolderIdx = null;

function renderFolderNav() {
  const nav = document.getElementById("folder-nav");
  nav.innerHTML = "";
  config.folders.forEach((folder, idx) => {
    const btn = document.createElement("button");
    btn.className  = "folder-tab" + (folder.id === activeFolderId ? " active" : "");
    btn.textContent = folder.name;
    btn.dataset.folderId = folder.id;
    btn.dataset.folderIdx = idx;
    btn.draggable = true;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", folder.id === activeFolderId ? "true" : "false");

    // Click to select
    btn.addEventListener("click", () => {
      activeFolderId = folder.id;
      renderFolderNav();
      renderGrid();
    });

    // Drag to reorder
    btn.addEventListener("dragstart", e => {
      dragFolderIdx = idx;
      btn.classList.add("folder-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", idx);
    });
    btn.addEventListener("dragend", () => {
      btn.classList.remove("folder-dragging");
      dragFolderIdx = null;
    });
    btn.addEventListener("dragover", e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      btn.classList.add("folder-drag-over");
    });
    btn.addEventListener("dragleave", () => {
      btn.classList.remove("folder-drag-over");
    });
    btn.addEventListener("drop", e => {
      e.preventDefault();
      btn.classList.remove("folder-drag-over");
      if (dragFolderIdx === null || dragFolderIdx === idx) return;
      reorderFolders(dragFolderIdx, idx);
      dragFolderIdx = null;
    });

    nav.appendChild(btn);
  });
}

function reorderFolders(fromIdx, toIdx) {
  const moved = config.folders.splice(fromIdx, 1)[0];
  config.folders.splice(toIdx, 0, moved);
  config.folders.forEach((f, i) => { f.index = i; });
  renderFolderNav();
  persist();
}

// ── Grid ───────────────────────────────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById("dial-grid");
  grid.innerHTML = "";

  const dials = config.dials
    .filter(d => d.folder === activeFolderId)
    .sort((a, b) => a.index - b.index);

  dials.forEach((dial, i) => {
    const card = buildDialCard(dial, i, dials.length);
    grid.appendChild(card);
  });
}

function buildDialCard(dial, i, total) {
  const a = document.createElement("a");
  a.className  = "dial-card";
  a.href       = dial.url;
  a.draggable  = true;
  a.dataset.id = dial.id;
  a.dataset.i  = i;
  a.setAttribute("aria-label", dial.title);

  // Favicon — size driven by cardSize setting
  const faviconPx = Math.round(44 * (config.settings.cardSize || 1));
  const img = document.createElement("img");
  img.className = "dial-favicon";
  img.alt       = "";
  img.width     = faviconPx;
  img.height    = faviconPx;
  const fav = dial.customIcon || faviconUrl(dial.url, config.settings.faviconService);
  img.src = fav;
  img.onerror = () => {
    img.src = letterIcon(dial.title, paletteColor(dial.title));
    img.onerror = null;
  };

  // Label
  const label = document.createElement("span");
  label.className   = "dial-label";
  label.textContent = dial.title;

  // Edit button
  const editBtn = document.createElement("button");
  editBtn.className = "dial-edit-btn";
  editBtn.title     = "Edit";
  editBtn.setAttribute("aria-label", `Edit ${dial.title}`);
  editBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="none">
    <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
  </svg>`;
  editBtn.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    openEditModal(dial);
  });

  // Drag-and-drop
  a.addEventListener("dragstart", e => {
    dragSrcIdx = i;
    a.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  a.addEventListener("dragend", () => a.classList.remove("dragging"));
  a.addEventListener("dragover", e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    a.classList.add("drag-over");
  });
  a.addEventListener("dragleave", () => a.classList.remove("drag-over"));
  a.addEventListener("drop", e => {
    e.preventDefault();
    a.classList.remove("drag-over");
    if (dragSrcIdx === null || dragSrcIdx === i) return;
    reorderDials(dragSrcIdx, i);
    dragSrcIdx = null;
  });

  a.appendChild(img);
  a.appendChild(label);
  a.appendChild(editBtn);
  return a;
}

function reorderDials(fromIdx, toIdx) {
  const dials = config.dials
    .filter(d => d.folder === activeFolderId)
    .sort((a, b) => a.index - b.index);
  const moved = dials.splice(fromIdx, 1)[0];
  dials.splice(toIdx, 0, moved);
  dials.forEach((d, i) => { d.index = i; });
  renderGrid();
  persist();
}

// ── Modal — add/edit ────────────────────────────────────────────────────── 
function openAddModal() {
  editingDialId = null;
  document.getElementById("modal-title").textContent = "Add dial";
  document.getElementById("modal-title-input").value = "";
  document.getElementById("modal-url-input").value   = "";
  document.getElementById("modal-delete").style.display = "none";
  populateFolderSelect(activeFolderId);
  document.getElementById("dial-modal").hidden = false;
  document.getElementById("modal-title-input").focus();
}

function openEditModal(dial) {
  editingDialId = dial.id;
  document.getElementById("modal-title").textContent    = "Edit dial";
  document.getElementById("modal-title-input").value    = dial.title;
  document.getElementById("modal-url-input").value      = dial.url;
  document.getElementById("modal-delete").style.display = "";
  populateFolderSelect(dial.folder);
  document.getElementById("dial-modal").hidden = false;
  document.getElementById("modal-title-input").focus();
}

function closeModal() {
  document.getElementById("dial-modal").hidden = true;
  editingDialId = null;
}

function populateFolderSelect(selectedId) {
  const sel = document.getElementById("modal-folder-input");
  sel.innerHTML = "";
  for (const f of config.folders) {
    const opt = document.createElement("option");
    opt.value       = f.id;
    opt.textContent = f.name;
    if (f.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  }
}

function saveModal() {
  const title    = document.getElementById("modal-title-input").value.trim();
  const rawUrl   = document.getElementById("modal-url-input").value.trim();
  const folderId = document.getElementById("modal-folder-input").value;
  if (!title || !rawUrl) return;

  // Auto-prefix https:// if missing
  const url = rawUrl.startsWith("http") ? rawUrl : "https://" + rawUrl;

  if (editingDialId) {
    const dial = config.dials.find(d => d.id === editingDialId);
    if (dial) { dial.title = title; dial.url = url; dial.folder = folderId; }
  } else {
    const sibs  = config.dials.filter(d => d.folder === folderId);
    const maxIdx = sibs.length ? Math.max(...sibs.map(d => d.index)) + 1 : 0;
    config.dials.push({
      id: "d" + Date.now(), title, url, folder: folderId,
      index: maxIdx, pinned: false, customIcon: ""
    });
  }

  closeModal();
  renderGrid();
  persist();
}

function deleteDialFromModal() {
  if (!editingDialId) return;
  config.dials = config.dials.filter(d => d.id !== editingDialId);
  closeModal();
  renderGrid();
  persist();
}

// ── Sync status ────────────────────────────────────────────────────────────
function renderSyncStatus(lastSync, error) {
  const el = document.getElementById("sync-status");
  if (error) {
    el.textContent = "⚠ Sync error: " + error;
    el.className   = "sync-status error";
  } else if (lastSync) {
    const ago  = Math.round((Date.now() - lastSync) / 60000);
    const text = ago < 1 ? "just now" : `${ago}m ago`;
    el.textContent = `Synced with GitHub ${text}`;
    el.className   = "sync-status";
  } else {
    el.textContent = "Not synced yet — open settings to configure GitHub sync";
    el.className   = "sync-status";
  }
}

// ── Persist ────────────────────────────────────────────────────────────────
async function persist() {
  const result = await saveAndPush(config);
  const stored = await chrome.storage.local.get(["last_sync", "sync_error"]);
  renderSyncStatus(stored.last_sync, stored.sync_error);
}

// ── Event bindings ─────────────────────────────────────────────────────────
function bindEvents() {
  // Search
  document.getElementById("search-form").addEventListener("submit", e => {
    e.preventDefault();
    const q = document.getElementById("search-input").value.trim();
    if (!q) return;
    const engine = config.settings.searchEngine || "https://www.google.com/search?q=";
    window.location.href = engine + encodeURIComponent(q);
  });

  // Theme toggle
  document.getElementById("theme-toggle").addEventListener("click", cycleTheme);

  // Sync button
  document.getElementById("sync-btn").addEventListener("click", async () => {
    const btn = document.getElementById("sync-btn");
    btn.classList.add("spinning");
    await chrome.runtime.sendMessage({ type: "SYNC_NOW" });
    const stored = await chrome.storage.local.get(["config", "last_sync", "sync_error"]);
    if (stored.config) { config = stored.config; applyAppearance(); renderGrid(); }
    renderSyncStatus(stored.last_sync, stored.sync_error);
    btn.classList.remove("spinning");
  });

  // Settings button → opens settings page
  document.getElementById("settings-btn").addEventListener("click", () => {
    chrome.runtime.openOptionsPage
      ? chrome.runtime.openOptionsPage()
      : window.open(chrome.runtime.getURL("settings.html"));
  });

  // FAB — add dial
  document.getElementById("add-btn").addEventListener("click", openAddModal);

  // Modal buttons
  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-save").addEventListener("click", saveModal);
  document.getElementById("modal-delete").addEventListener("click", deleteDialFromModal);

  // Close modal on backdrop click
  document.getElementById("dial-modal").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Close modal on Escape
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });

  // Listen for storage changes (e.g. background sync completing)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.config) {
      config = changes.config.newValue;
      applyAppearance();
      renderGrid();
    }
    if (changes.last_sync || changes.sync_error) {
      const ls = changes.last_sync?.newValue;
      const se = changes.sync_error?.newValue;
      renderSyncStatus(ls, se);
    }
  });
}

// ── Boot ───────────────────────────────────────────────────────────────────
init();
