// src/github.js — GitHub API sync layer

const GH_API = "https://api.github.com";

/**
 * Read saved GitHub credentials from chrome.storage.local
 * Returns { token, owner, repo, filePath } or null if not configured.
 */
export async function getCredentials() {
  const data = await chrome.storage.local.get(["gh_token", "gh_owner", "gh_repo", "gh_path"]);
  if (!data.gh_token || !data.gh_owner || !data.gh_repo) return null;
  return {
    token:    data.gh_token,
    owner:    data.gh_owner,
    repo:     data.gh_repo,
    filePath: data.gh_path || "dials.json"
  };
}

/**
 * Save GitHub credentials to chrome.storage.local
 */
export async function saveCredentials({ token, owner, repo, filePath = "dials.json" }) {
  await chrome.storage.local.set({
    gh_token: token,
    gh_owner: owner,
    gh_repo:  repo,
    gh_path:  filePath
  });
}

/**
 * Build headers for GitHub API requests
 */
function headers(token) {
  return {
    "Authorization": `Bearer ${token}`,
    "Accept":        "application/vnd.github+json",
    "Content-Type":  "application/json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

/**
 * Fetch dials.json from GitHub.
 * Returns { config, sha } where sha is needed for the next PUT.
 * Returns null if file doesn't exist yet.
 */
export async function fetchFromGitHub() {
  const creds = await getCredentials();
  if (!creds) throw new Error("GitHub not configured");

  const url = `${GH_API}/repos/${creds.owner}/${creds.repo}/contents/${creds.filePath}`;
  const res  = await fetch(url, { headers: headers(creds.token) });

  if (res.status === 404) return null; // file doesn't exist yet — first push will create it
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`GitHub fetch failed: ${res.status} — ${body.message || "unknown error"}`);
  }

  const data    = await res.json();
  const decoded = atob(data.content.replace(/\n/g, ""));
  const config  = JSON.parse(decoded);
  return { config, sha: data.sha };
}

/**
 * Push config object to GitHub as dials.json.
 * Pass sha = null to create a new file, or the sha string to update an existing one.
 */
export async function pushToGitHub(config, sha = null) {
  const creds = await getCredentials();
  if (!creds) throw new Error("GitHub not configured");

  const url     = `${GH_API}/repos/${creds.owner}/${creds.repo}/contents/${creds.filePath}`;
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(config, null, 2))));

  const body = {
    message: `sync: update dials ${new Date().toISOString()}`,
    content,
    ...(sha ? { sha } : {})
  };

  const res = await fetch(url, {
    method:  "PUT",
    headers: headers(creds.token),
    body:    JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub push failed: ${res.status} — ${err.message || "unknown error"}`);
  }

  const data = await res.json();
  return data.content.sha; // return new sha for next update
}

/**
 * Full sync: pull from GitHub, merge with local, push back if changed.
 * Strategy: GitHub is source of truth. Local changes are merged on top.
 * Returns the final config.
 */
export async function sync(localConfig) {
  const remote = await fetchFromGitHub();

  if (!remote) {
    // No file on GitHub yet — push local config as initial state
    await pushToGitHub(localConfig, null);
    await chrome.storage.local.set({ gh_sha: null });
    return localConfig;
  }

  // Store sha for next push
  await chrome.storage.local.set({ gh_sha: remote.sha });

  // Simple merge: remote wins (it may have edits from another device)
  // In a future version this could do a smarter 3-way merge
  const merged = remote.config;
  return merged;
}

/**
 * Save config locally AND push to GitHub.
 * Call this whenever the user makes a change.
 */
export async function saveAndPush(config) {
  // Always save locally first (instant, offline-safe)
  await chrome.storage.local.set({ config });

  // Then try to push to GitHub
  const shaData = await chrome.storage.local.get("gh_sha");
  const sha     = shaData.gh_sha || null;

  try {
    const newSha = await pushToGitHub(config, sha);
    await chrome.storage.local.set({ gh_sha: newSha, last_sync: Date.now(), sync_error: "" });
    return { ok: true };
  } catch (err) {
    await chrome.storage.local.set({ sync_error: err.message });
    return { ok: false, error: err.message };
  }
}

/**
 * Test that credentials work by hitting /user endpoint
 */
export async function testConnection(token) {
  const res = await fetch(`${GH_API}/user`, {
    headers: headers(token)
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const user = await res.json();
  return user.login; // returns GitHub username
}
