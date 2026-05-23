// src/settings.js

import { DEFAULT_CONFIG } from "./data.js";
import { getCredentials, saveCredentials, testConnection, saveAndPush, sync } from "./github.js";

let config = null;
let localWallpaperBase64 = "";

const SECURE_TOKEN_MASK = "••••••••••••••••••••••••••••••••";

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  const stored = await chrome.storage.local.get("config");
  config = stored.config || structuredClone(DEFAULT_CONFIG);

  // Apply font and theme immediately to settings page
  applyGlobalFont(config.settings.fontFamily, config.settings.customFont);
  applyGlobalTheme(config.settings.theme);

  await loadGhFields();
  loadAppearanceFields();
  loadSearchField();
  renderFolderList();

  // Setup sidebar navigation switching
  setupSidebarNavigation();

  // Setup custom features (password toggle, file upload zones)
  setupPasswordToggle();
  setupWallpaperUpload();

  // Wire event handlers
  bindAll();

  // Draw initial live preview
  updateMockPreview();
}

// ── Sidebar Navigation ─────────────────────────────────────────────────────
function setupSidebarNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const panels = document.querySelectorAll(".settings-panel");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetPanelId = "panel-" + item.dataset.panel;

      // Toggle active classes on nav tabs
      navItems.forEach(nav => nav.classList.remove("active"));
      item.classList.add("active");

      // Toggle active classes on content panels
      panels.forEach(panel => {
        if (panel.id === targetPanelId) {
          panel.classList.add("active");
        } else {
          panel.classList.remove("active");
        }
      });
    });
  });
}

// ── Password Show/Hide Toggle ──────────────────────────────────────────────
function setupPasswordToggle() {
  const btn = document.getElementById("gh-token-toggle");
  const input = document.getElementById("gh-token");
  const eye = document.getElementById("eye-icon");
  const eyeOff = document.getElementById("eye-off-icon");
  
  if (!btn || !input) return;

  btn.addEventListener("click", () => {
    const isPass = input.type === "password";
    input.type = isPass ? "text" : "password";
    eye.style.display = isPass ? "none" : "";
    eyeOff.style.display = isPass ? "" : "none";
  });
}

// ── Wallpaper Drag & Drop Handler ──────────────────────────────────────────
function setupWallpaperUpload() {
  const zone = document.getElementById("upload-zone");
  const fileInput = document.getElementById("bg-upload-file");

  if (!zone || !fileInput) return;

  zone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", e => {
    handleWallpaperFile(e.target.files[0]);
  });

  zone.addEventListener("dragover", e => {
    e.preventDefault();
    zone.classList.add("dragover");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("dragover");
  });

  zone.addEventListener("drop", e => {
    e.preventDefault();
    zone.classList.remove("dragover");
    handleWallpaperFile(e.dataTransfer.files[0]);
  });
}

function handleWallpaperFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  
  const status = document.getElementById("upload-status");
  status.textContent = "Compressing & reading image...";

  const reader = new FileReader();
  reader.onload = e => {
    localWallpaperBase64 = e.target.result;
    
    const preview = document.getElementById("upload-preview");
    preview.src = localWallpaperBase64;
    preview.style.display = "block";
    
    status.innerHTML = `Loaded: <strong>${file.name}</strong>`;
    updateMockPreview();
  };
  reader.readAsDataURL(file);
}

// ── Security Shielded GitHub Sync ──────────────────────────────────────────
async function loadGhFields() {
  const creds = await getCredentials();
  if (!creds) return;
  document.getElementById("gh-token").value = creds.token ? SECURE_TOKEN_MASK : "";
  document.getElementById("gh-owner").value = creds.owner;
  document.getElementById("gh-repo").value  = creds.repo;
  document.getElementById("gh-path").value  = creds.filePath || "dials.json";
}

async function saveGithub() {
  const tokenInput = document.getElementById("gh-token").value.trim();
  const owner = document.getElementById("gh-owner").value.trim();
  const repo  = document.getElementById("gh-repo").value.trim();
  const path  = document.getElementById("gh-path").value.trim() || "dials.json";
  const status = document.getElementById("gh-status");

  if (!tokenInput || !owner || !repo) {
    showStatus(status, "error", "All fields are required.");
    return;
  }

  let token = tokenInput;
  const creds = await getCredentials();
  
  // If user didn't change the masked token field, keep the original raw token
  if (tokenInput === SECURE_TOKEN_MASK && creds) {
    token = creds.token;
  }

  try {
    showStatus(status, "", "Testing connection…");
    const username = await testConnection(token);
    await saveCredentials({ token, owner, repo, filePath: path });
    
    // Mask token again
    document.getElementById("gh-token").value = SECURE_TOKEN_MASK;
    showStatus(status, "success", `Connected as @${username} ✓`);
  } catch (err) {
    showStatus(status, "error", err.message);
  }
}

async function clearGithub() {
  const status = document.getElementById("gh-status");
  if (!confirm("Clear saved GitHub credentials and turn off syncing?")) return;

  await chrome.storage.local.remove(["gh_token", "gh_owner", "gh_repo", "gh_path", "gh_sha", "last_sync", "sync_error"]);
  
  document.getElementById("gh-token").value = "";
  document.getElementById("gh-owner").value = "";
  document.getElementById("gh-repo").value  = "";
  document.getElementById("gh-path").value  = "dials.json";

  showStatus(status, "success", "Credentials cleared safely.");
}

async function syncNow() {
  const btn = document.getElementById("sync-now-btn");
  const status = document.getElementById("gh-status");
  btn.disabled = true;
  btn.textContent = "Syncing...";
  try {
    showStatus(status, "", "Syncing…");
    const merged = await sync(config);
    config = merged;
    await chrome.storage.local.set({ config, last_sync: Date.now(), sync_error: "" });
    showStatus(status, "success", "Sync complete ✓");
    
    loadAppearanceFields();
    renderFolderList();
    updateMockPreview();
  } catch (err) {
    showStatus(status, "error", err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Sync now";
  }
}

// ── Appearance & Design Engine ─────────────────────────────────────────────
function loadAppearanceFields() {
  const s = config.settings;
  document.getElementById("show-search").checked = s.showSearch !== false;
  document.getElementById("show-labels").checked = s.showLabels !== false;
  document.getElementById("theme-select").value  = s.theme || "auto";
  document.getElementById("favicon-service").value = s.faviconService || "google";

  // Fonts loader
  const fontFamily = s.fontFamily || "Georgia";
  document.getElementById("font-select").value = fontFamily;
  toggleFontFields(fontFamily);
  if (s.customFont) document.getElementById("custom-font-name").value = s.customFont;
  applyGlobalFont(fontFamily, s.customFont);

  // Card size slider
  const cardSize = s.cardSize || 1;
  document.getElementById("card-size-slider").value = cardSize;
  document.getElementById("card-size-val").textContent = cardSize.toFixed(2) + "×";

  // Text size slider
  const textSize = s.textSize || 14;
  document.getElementById("text-size-slider").value = textSize;
  document.getElementById("text-size-val").textContent = textSize + "px";

  // Columns chips
  document.querySelectorAll(".col-chip").forEach(chip => {
    chip.classList.toggle("active", Number(chip.dataset.cols) === (s.columns || 6));
  });

  // Background values
  const bgType = s.backgroundType || "default";
  document.getElementById("bg-type").value = bgType;
  toggleBgFields(bgType);
  if (s.backgroundColor) document.getElementById("bg-color").value = s.backgroundColor;
  if (s.backgroundGradient) document.getElementById("bg-gradient").value = s.backgroundGradient;
  
  // Custom Wallpapers
  if (s.backgroundType === "wallpaper") {
    if (s.wallpaperSource && s.wallpaperSource.startsWith("data:image")) {
      localWallpaperBase64 = s.wallpaperSource;
      const preview = document.getElementById("upload-preview");
      preview.src = localWallpaperBase64;
      preview.style.display = "block";
      document.getElementById("upload-status").innerHTML = "Local Wallpaper <strong>Loaded ✓</strong>";
    } else if (s.wallpaperSource) {
      document.getElementById("bg-wallpaper-url").value = s.wallpaperSource;
    }
  }

  // Wallpaper Sliders
  const blur = s.wallpaperBlur !== undefined ? s.wallpaperBlur : 0;
  document.getElementById("bg-blur-slider").value = blur;
  document.getElementById("bg-blur-val").textContent = blur + "px";

  const dim = s.wallpaperDim !== undefined ? s.wallpaperDim : 20;
  document.getElementById("bg-dim-slider").value = dim;
  document.getElementById("bg-dim-val").textContent = dim + "%";
}

function toggleBgFields(type) {
  document.getElementById("bg-color-field").style.display      = type === "color" ? "" : "none";
  document.getElementById("bg-gradient-field").style.display   = type === "gradient" ? "" : "none";
  document.getElementById("bg-wallpaper-url-field").style.display = type === "wallpaper" ? "" : "none";
  document.getElementById("bg-wallpaper-upload-field").style.display = type === "wallpaper" ? "" : "none";
  document.getElementById("bg-blur-field").style.display       = type === "wallpaper" ? "" : "none";
  document.getElementById("bg-dim-field").style.display        = type === "wallpaper" ? "" : "none";
}

function toggleFontFields(font) {
  document.getElementById("custom-font-field").style.display = font === "custom" ? "" : "none";
}

function applyGlobalFont(fontFamily, customFontName) {
  const fontToUse = fontFamily === "custom" ? customFontName : fontFamily;
  
  if (!fontToUse) return;

  // Load stylesheet dynamically
  if (fontFamily !== "Georgia") {
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

  document.documentElement.style.setProperty("--font-family", `"${fontToUse}", Georgia, serif`);
}

function applyGlobalTheme(theme) {
  const dark =
    theme === "dark" ||
    (theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

async function saveAppearance() {
  const status = document.getElementById("appearance-status");
  const selectedCols = document.querySelector(".col-chip.active");

  config.settings.showSearch      = document.getElementById("show-search").checked;
  config.settings.showLabels      = document.getElementById("show-labels").checked;
  config.settings.theme           = document.getElementById("theme-select").value;
  config.settings.faviconService  = document.getElementById("favicon-service").value;
  config.settings.columns         = selectedCols ? Number(selectedCols.dataset.cols) : 6;
  config.settings.cardSize        = parseFloat(document.getElementById("card-size-slider").value);
  config.settings.textSize        = parseInt(document.getElementById("text-size-slider").value, 10);
  config.settings.backgroundType  = document.getElementById("bg-type").value;
  config.settings.backgroundColor = document.getElementById("bg-color").value;
  config.settings.backgroundGradient = document.getElementById("bg-gradient").value;

  // Font fields
  config.settings.fontFamily      = document.getElementById("font-select").value;
  config.settings.customFont      = document.getElementById("custom-font-name").value.trim();

  // Wallpaper fields
  config.settings.wallpaperBlur   = parseInt(document.getElementById("bg-blur-slider").value, 10);
  config.settings.wallpaperDim    = parseInt(document.getElementById("bg-dim-slider").value, 10);

  if (config.settings.backgroundType === "wallpaper") {
    const urlSource = document.getElementById("bg-wallpaper-url").value.trim();
    // Prioritize base64 uploaded image, fallback to URL
    config.settings.wallpaperSource = localWallpaperBase64 || urlSource;
  } else {
    config.settings.wallpaperSource = "";
  }

  const result = await saveAndPush(config);
  showStatus(status, result.ok ? "success" : "error",
    result.ok ? "Saved ✓" : "Saved locally, sync failed: " + result.error);

  // Apply adjustments instantly
  applyGlobalFont(config.settings.fontFamily, config.settings.customFont);
  applyGlobalTheme(config.settings.theme);
  updateMockPreview();
}

// ── Live Preview Controller ────────────────────────────────────────────────
function updateMockPreview() {
  const previewDevice = document.getElementById("preview-device");
  if (!previewDevice) return;

  // 1. Get current form states
  const showSearch = document.getElementById("show-search").checked;
  const showLabels = document.getElementById("show-labels").checked;
  const cardSize = parseFloat(document.getElementById("card-size-slider").value) || 1.0;
  const textSize = parseInt(document.getElementById("text-size-slider").value, 10) || 14;
  const selectedCols = document.querySelector(".col-chip.active");
  const cols = selectedCols ? Number(selectedCols.dataset.cols) : 6;
  const theme = document.getElementById("theme-select").value;
  const bgType = document.getElementById("bg-type").value;
  const bgColor = document.getElementById("bg-color").value;
  const bgGradient = document.getElementById("bg-gradient").value;
  
  // Font preview
  const fontSelect = document.getElementById("font-select").value;
  const customFont = document.getElementById("custom-font-name").value.trim();
  const fontName = fontSelect === "custom" ? customFont : fontSelect;

  // Wallpaper parameters
  const blurVal = parseInt(document.getElementById("bg-blur-slider").value, 10) || 0;
  const dimVal = parseInt(document.getElementById("bg-dim-slider").value, 10) || 0;
  const urlVal = document.getElementById("bg-wallpaper-url").value.trim();

  // 2. Set theme state on mock device
  let isDark = theme === "dark";
  if (theme === "auto") {
    isDark = matchMedia("(prefers-color-scheme: dark)").matches;
  }
  previewDevice.setAttribute("data-theme", isDark ? "dark" : "light");

  // 3. Set custom variables on mock device for scales & fonts
  previewDevice.style.setProperty("--mock-card-size", cardSize);
  previewDevice.style.setProperty("--mock-text-size", textSize + "px");
  previewDevice.style.setProperty("--mock-cols", cols);
  if (fontName) {
    // Inject preview font stylesheet
    if (fontSelect !== "Georgia") {
      let previewLink = document.getElementById("google-preview-font");
      if (!previewLink) {
        previewLink = document.createElement("link");
        previewLink.id = "google-preview-font";
        previewLink.rel = "stylesheet";
        document.head.appendChild(previewLink);
      }
      previewLink.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
    } else {
      document.getElementById("google-preview-font")?.remove();
    }
    previewDevice.style.fontFamily = `"${fontName}", Georgia, serif`;
  }

  // 4. Toggle search box
  const mockSearch = document.getElementById("mock-search-box");
  if (mockSearch) {
    mockSearch.style.display = showSearch ? "" : "none";
  }

  // 5. Toggle labels
  document.querySelectorAll(".device-dial-label").forEach(el => {
    el.style.display = showLabels ? "" : "none";
  });
  document.querySelectorAll(".device-dial").forEach(el => {
    el.style.gap = showLabels ? "calc(4px * var(--mock-card-size, 1))" : "0";
  });

  // 6. Set background style on preview canvas
  if (bgType === "color") {
    previewDevice.style.background = bgColor;
    // reset dim layer on preview device
    previewDevice.style.boxShadow = "none";
  } else if (bgType === "gradient") {
    previewDevice.style.background = bgGradient || "radial-gradient(circle at center, #351356 0%, #170525 100%)";
    previewDevice.style.boxShadow = "none";
  } else if (bgType === "wallpaper") {
    // Custom Wallpaper image setting on preview
    const imageToUse = localWallpaperBase64 || urlVal;
    if (imageToUse) {
      previewDevice.style.background = `linear-gradient(rgba(0,0,0,${dimVal/100}), rgba(0,0,0,${dimVal/100})), url("${imageToUse}")`;
      previewDevice.style.backgroundSize = "cover";
      previewDevice.style.backgroundPosition = "center";
      // Simulate blur using backdrop filter or simple overlay
    } else {
      previewDevice.style.background = isDark ? "#220a37" : "#f5f5f7";
    }
  } else {
    // default theme styles
    previewDevice.style.background = isDark ? "#220a37" : "#f5f5f7";
  }
}

// ── Search section ─────────────────────────────────────────────────────────
function loadSearchField() {
  document.getElementById("search-engine").value =
    config.settings.searchEngine || "https://www.google.com/search?q=";
}

async function saveSearch() {
  const status = document.getElementById("search-status");
  config.settings.searchEngine = document.getElementById("search-engine").value.trim();
  const result = await saveAndPush(config);
  showStatus(status, result.ok ? "success" : "error", result.ok ? "Saved ✓" : result.error);
}

// ── Folders section ────────────────────────────────────────────────────────
function renderFolderList() {
  const list = document.getElementById("folder-list");
  list.innerHTML = "";
  config.folders.forEach((folder, idx) => {
    const row = document.createElement("div");
    row.className = "folder-row";

    const input = document.createElement("input");
    input.type  = "text";
    input.value = folder.name;
    input.addEventListener("input", e => { config.folders[idx].name = e.target.value; });

    const del = document.createElement("button");
    del.className = "del-folder";
    del.title     = "Remove folder";
    del.innerHTML = `<svg viewBox="0 0 16 16" fill="none">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
    del.addEventListener("click", () => {
      if (folder.id === "root") { alert("Cannot delete the root folder."); return; }
      const hasDials = config.dials.some(d => d.folder === folder.id);
      if (hasDials) {
        if (!confirm(`"${folder.name}" has dials in it. They will move to Root. Continue?`)) return;
        config.dials.filter(d => d.folder === folder.id).forEach(d => { d.folder = "root"; });
      }
      config.folders.splice(idx, 1);
      renderFolderList();
    });

    row.appendChild(input);
    row.appendChild(del);
    list.appendChild(row);
  });
}

function addFolder() {
  const id = "f" + Date.now();
  config.folders.push({ id, name: "New folder", index: config.folders.length });
  renderFolderList();
  // Focus the new input
  const inputs = document.querySelectorAll(".folder-row input");
  inputs[inputs.length - 1]?.focus();
  inputs[inputs.length - 1]?.select();
}

async function saveFolders() {
  const status = document.getElementById("folders-status");
  const result = await saveAndPush(config);
  showStatus(status, result.ok ? "success" : "error", result.ok ? "Saved ✓" : result.error);
}

// ── Import / Export ────────────────────────────────────────────────────────
function exportConfig() {
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "dials.json";
  a.click();
  URL.revokeObjectURL(url);
}

function showImportArea() {
  document.getElementById("import-area").style.display = "";
  document.getElementById("import-confirm-row").style.display = "";
  document.getElementById("import-area").focus();
}

function hideImportArea() {
  document.getElementById("import-area").style.display = "none";
  document.getElementById("import-confirm-row").style.display = "none";
  document.getElementById("import-area").value = "";
}

async function importConfig() {
  const status = document.getElementById("import-status");
  const raw    = document.getElementById("import-area").value.trim();
  if (!raw) return;

  try {
    let parsed = JSON.parse(raw);

    // Handle YASD export format
    if (parsed.yasd) {
      parsed = convertYasdExport(parsed.yasd);
    }

    // Basic validation
    if (!parsed.dials || !Array.isArray(parsed.dials)) {
      throw new Error("Invalid format — expected a config with a dials array.");
    }

    config = { ...structuredClone(DEFAULT_CONFIG), ...parsed };
    const result = await saveAndPush(config);
    hideImportArea();
    loadAppearanceFields();
    renderFolderList();
    updateMockPreview();
    showStatus(status, result.ok ? "success" : "error",
      result.ok ? `Imported ${config.dials.length} dials ✓` : result.error);
  } catch (err) {
    showStatus(status, "error", "Parse error: " + err.message);
  }
}

/** Convert a YASD export object to our config format */
function convertYasdExport(yasd) {
  const folders = [{ id: "root", name: "Root", index: 0 }];
  (yasd.folders || []).forEach((f, i) => {
    folders.push({ id: "f_" + f.id, name: f.title, index: i + 1 });
  });

  const dials = (yasd.bookmarks || []).map((bm, i) => ({
    id:         "d_" + bm.id,
    title:      bm.title,
    url:        bm.url,
    folder:     bm.folderid ? "f_" + bm.folderid : "root",
    index:      bm.index ?? i,
    pinned:     false,
    customIcon: ""
  }));

  return { ...structuredClone(DEFAULT_CONFIG), folders, dials };
}

// ── Reset ──────────────────────────────────────────────────────────────────
async function resetToDefaults() {
  const status = document.getElementById("reset-status");
  if (!confirm("Reset all dials to defaults? Your GitHub copy will be overwritten.")) return;
  config = structuredClone(DEFAULT_CONFIG);
  const result = await saveAndPush(config);
  
  // Wipe base64 local states
  localWallpaperBase64 = "";
  const preview = document.getElementById("upload-preview");
  if (preview) {
    preview.src = "";
    preview.style.display = "none";
  }
  document.getElementById("upload-status").innerHTML = `Drag & drop your wallpaper image here, or <span style="color:var(--accent);text-decoration:underline;">browse files</span>`;

  loadAppearanceFields();
  renderFolderList();
  updateMockPreview();
  showStatus(status, result.ok ? "success" : "error",
    result.ok ? "Reset to defaults ✓" : result.error);
}

// ── Helpers ────────────────────────────────────────────────────────────────
function showStatus(el, type, msg) {
  el.textContent = msg;
  el.className   = "status-msg" + (type ? " " + type : "");
  el.style.display = "block";
  if (type === "success") setTimeout(() => { el.style.display = "none"; }, 4000);
}

// ── Events ─────────────────────────────────────────────────────────────────
function bindAll() {
  // Back link
  document.getElementById("back-link").addEventListener("click", e => {
    if (window.innerWidth < 540) {
      e.preventDefault();
      window.close();
    }
  });

  // GitHub
  document.getElementById("save-gh-btn").addEventListener("click", saveGithub);
  document.getElementById("clear-gh-btn").addEventListener("click", clearGithub);
  document.getElementById("sync-now-btn").addEventListener("click", syncNow);

  // Appearance controls - Save button
  document.getElementById("save-appearance-btn").addEventListener("click", saveAppearance);

  // Appearance controls - Real-time changes trigger Mock Preview updates
  document.getElementById("show-search").addEventListener("change", updateMockPreview);
  document.getElementById("show-labels").addEventListener("change", updateMockPreview);
  document.getElementById("theme-select").addEventListener("change", updateMockPreview);
  document.getElementById("bg-type").addEventListener("change", e => {
    toggleBgFields(e.target.value);
    updateMockPreview();
  });
  document.getElementById("bg-color").addEventListener("input", updateMockPreview);
  document.getElementById("bg-gradient").addEventListener("input", updateMockPreview);
  document.getElementById("bg-wallpaper-url").addEventListener("input", updateMockPreview);
  
  // Font selectors
  document.getElementById("font-select").addEventListener("change", e => {
    toggleFontFields(e.target.value);
    updateMockPreview();
  });
  document.getElementById("custom-font-name").addEventListener("input", updateMockPreview);

  document.querySelectorAll(".col-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".col-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      updateMockPreview();
    });
  });

  // Card size slider — live label & preview updates
  document.getElementById("card-size-slider").addEventListener("input", e => {
    document.getElementById("card-size-val").textContent = parseFloat(e.target.value).toFixed(2) + "×";
    updateMockPreview();
  });

  // Text size slider — live label & preview updates
  document.getElementById("text-size-slider").addEventListener("input", e => {
    document.getElementById("text-size-val").textContent = e.target.value + "px";
    updateMockPreview();
  });

  // Wallpaper Sliders
  document.getElementById("bg-blur-slider").addEventListener("input", e => {
    document.getElementById("bg-blur-val").textContent = e.target.value + "px";
    updateMockPreview();
  });

  document.getElementById("bg-dim-slider").addEventListener("input", e => {
    document.getElementById("bg-dim-val").textContent = e.target.value + "%";
    updateMockPreview();
  });

  // Search engine presets
  document.querySelectorAll("[data-engine]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("search-engine").value = btn.dataset.engine;
    });
  });
  document.getElementById("save-search-btn").addEventListener("click", saveSearch);

  // Folders
  document.getElementById("add-folder-btn").addEventListener("click", addFolder);
  document.getElementById("save-folders-btn").addEventListener("click", saveFolders);

  // Import / Export
  document.getElementById("export-btn").addEventListener("click", exportConfig);
  document.getElementById("import-trigger").addEventListener("click", showImportArea);
  document.getElementById("import-confirm-btn").addEventListener("click", importConfig);
  document.getElementById("import-cancel-btn").addEventListener("click", hideImportArea);

  // Reset
  document.getElementById("reset-btn").addEventListener("click", resetToDefaults);
}

init();
