// src/background.js — MV3 service worker

import { sync, getCredentials } from "./github.js";

const SYNC_INTERVAL_MINUTES = 5;

// ── On extension install / update ──────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === "install") {
    // Open settings on first install so user can enter their GitHub token
    chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
  }
});

// ── Alarm-based periodic sync ──────────────────────────────────────────────
chrome.alarms.create("sync", { periodInMinutes: SYNC_INTERVAL_MINUTES });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "sync") return;
  await runSync();
});

// ── Message handler (called from newtab.js and settings.js) ───────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SYNC_NOW") {
    runSync().then(sendResponse);
    return true; // keep channel open for async response
  }
});

// ── Core sync logic ────────────────────────────────────────────────────────
async function runSync() {
  const creds = await getCredentials();
  if (!creds) return { ok: false, reason: "not_configured" };

  try {
    const local  = await chrome.storage.local.get("config");
    const config = local.config || null;
    const merged = await sync(config);

    await chrome.storage.local.set({
      config:     merged,
      last_sync:  Date.now(),
      sync_error: ""
    });

    return { ok: true };
  } catch (err) {
    console.error("[speed-dial] sync error:", err.message);
    await chrome.storage.local.set({ sync_error: err.message });
    return { ok: false, error: err.message };
  }
}
