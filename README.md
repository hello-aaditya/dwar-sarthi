# Dwar Sarthi — Premium Personal Speed Dial

A fast, beautifully styled, and private browser speed dial that replaces your blank "New Tab" page and syncs your custom bookmarks via your own GitHub repository. No databases, no paid subscriptions, no middle-man servers, and absolute privacy.

Designed with an elegant Georgia-based typography system, glassmorphism containers, smooth animations, and a powerful live-preview customization panel.

---

## Key Features

- **Draggable Cards**: Custom grid of beautiful bookmark tiles with live card-scaling and text-size configurations.
- **Draggable Folder Tabs**: Seamlessly categorize your dials (e.g. Root, AI Tools, Dev, Job Hunt) and drag-and-drop the tabs to rearrange their order.
- **Customizable Appearance**: Change layouts, solid canvas colors, custom CSS gradients, and dark/light themes side-by-side with an interactive real-time **Live Preview**.
- **Integrated Search**: A clean search bar pointing to Google, DuckDuckGo, Brave, or Bing (can be toggled on/off).
- **GitHub API Synchronization**: Auto-syncs your speed dial config to a single file in your GitHub repository. Saves every update as a secure git commit—giving you free version history.
- **Privacy First**: Choose between Google or privacy-focused DuckDuckGo favicon endpoints.

---

## 🚀 Beginner's Quick Setup (5 Minutes)

You don't need any programming skills to install and use **Dwar Sarthi**. Just follow these simple steps:

### Step 1: Download the Extension
Make sure you have downloaded or cloned this folder (`dwar-sarthi/`) to your computer.

### Step 2: Load it into your Browser (Chrome, Brave, Edge)
1. Open your browser and navigate to the extensions page:
   - **Chrome**: Go to `chrome://extensions/`
   - **Brave**: Go to `brave://extensions/`
   - **Edge**: Go to `edge://extensions/`
2. At the top right of the page, turn on the **Developer mode** toggle.
3. Click the **Load unpacked** button that appears on the top left.
4. Select the `dwar-sarthi` folder that contains this project.

*The settings page will automatically launch on install to help you set up syncing.*

### Step 3: Create a Repository on GitHub
To sync your bookmarks between devices:
1. Log in to your GitHub account (or sign up at [github.com](https://github.com/)).
2. Go to [github.com/new](https://github.com/new).
3. Name your repository (e.g., `my-speed-dial-sync`).
4. You can set it to **Private** (recommended) or **Public**. Leave other options unchecked and click **Create repository**.

### Step 4: Generate a Personal Access Token
To authorize the extension to update your bookmarks file securely:
1. Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new?scopes=public_repo&description=speed-dial-sync).
2. Set a **Note** (e.g., `Dwar Sarthi Sync`).
3. Set **Expiration** to **No expiration** (or your preferred duration).
4. Under **Select scopes**:
   - If your repository is **Public**: check only the `public_repo` scope.
   - If your repository is **Private**: check the full `repo` scope.
5. Scroll to the bottom and click **Generate token**.
6. **Important**: Copy the generated token immediately. You will not be able to see it again.

### Step 5: Configure the Settings
1. Go back to your browser, click on the **Dwar Sarthi** action icon (or click the Settings gear in the top right of your New Tab page).
2. Go to the **GitHub Sync** tab.
3. Enter your details:
   - **Personal Access Token**: Paste the token you copied in Step 4.
   - **GitHub Username**: Enter your GitHub username.
   - **Repository Name**: Enter the name of the repository you created in Step 3 (e.g., `my-speed-dial-sync`).
   - **File Path in Repository**: Leave this exactly as `dials.json`.
4. Click **Save & Test Connection**. When it turns green and says `Connected as @username ✓`, you are ready!
5. Open a new browser tab and enjoy your new dashboard!

---

## 🛠️ Sync Troubleshooting

### Why are there two files (`dials.json` and `dials..json`) on my GitHub?
If you see both `dials.json` and a double-dot `dials..json` on your GitHub repository, this is caused by a simple configuration typo:
1. **The Cause**: At some point during setup, the **File Path in Repository** field in settings was saved with a typo containing a double dot (`dials..json`). When a sync took place, the extension successfully pushed the file under that name. When you corrected the field to `dials.json`, the extension synced to the new file, but GitHub kept the old `dials..json` file in your repository.
2. **How to fix it**:
   - Open your browser, go to your Dwar Sarthi settings, and under the **GitHub Sync** tab check **File Path in Repository**. Ensure it is exactly `dials.json` (no extra dots) and click **Save**.
   - Go to your repository on `github.com`.
   - Click on the `dials..json` file to open it.
   - Click the **...** (three dots menu) on the top right of the file view, and click **Delete file**.
   - Commit the deletion. Your repository will now stay perfectly clean with only `dials.json`!

---

## 📂 File Structure

```
dwar-sarthi/
├── manifest.json        # Extension configuration (Manifest V3)
├── newtab.html          # HTML structure of the New Tab page
├── newtab.css           # Styling system (Draggable tabs, grid alignment)
├── settings.html        # Settings dashboard with responsive sidebar & live-preview
├── .gitignore           # Ignores local backups & API credentials
├── README.md            # Installation & usage guide
├── icons/               # Brand assets & extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── src/
    ├── data.js          # Preloaded default bookmarks config
    ├── favicon.js       # Dynamic letter icon & favicon scraper api
    ├── github.js        # GitHub REST API interface
    ├── background.js    # Service worker (Automatic background periodic syncs)
    ├── newtab.js        # New tab interactive controller
    └── settings.js      # Settings dashboard panel routing & preview drivers
```

---

## 💾 dials.json Format (Reference)

Your repository stores all elements inside `dials.json` in this structured format:

```json
{
  "version": 1,
  "settings": {
    "theme": "dark",
    "columns": 6,
    "showLabels": true,
    "showSearch": true,
    "cardSize": 1.0,
    "textSize": 14,
    "backgroundType": "gradient",
    "backgroundColor": "#220a37",
    "backgroundGradient": "radial-gradient(circle at center, #351356 0%, #170525 100%)",
    "searchEngine": "https://www.google.com/search?q=",
    "faviconService": "google"
  },
  "folders": [
    { "id": "root", "name": "Root", "index": 0 },
    { "id": "ai", "name": "AI Tools", "index": 1 }
  ],
  "dials": [
    {
      "id": "d1",
      "title": "YouTube",
      "url": "https://youtube.com/",
      "folder": "root",
      "index": 0,
      "pinned": false,
      "customIcon": ""
    }
  ]
}
```

---

## 📂 Importing & Portability
If you are migrating from another speed dial (like **Yet Another Speed Dial / YASD**), head to **Settings** → **Import / Export** → click **Import JSON** and paste your exported config. Dwar Sarthi will automatically parse and convert YASD structures on the fly!
