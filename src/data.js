// src/data.js  — default config shipped with the extension
// This is what loads on first install, before any GitHub sync.

export const DEFAULT_CONFIG = {
  version: 1,
  settings: {
    theme: "dark",          // default to dark mode
    columns: 6,             // grid columns
    showLabels: true,
    cardSize: 1,            // scale factor: 0.7 – 1.5
    textSize: 14,           // label font size in px: 10 – 24
    backgroundType: "gradient", 
    backgroundColor: "#0a0a0c",    
    backgroundGradient: "radial-gradient(circle at center, #16161a 0%, #0a0a0c 100%)",
    backgroundImage: "",
    searchEngine: "https://www.google.com/search?q=",
    showSearch: true,
    faviconService: "google", // "google" | "duckduckgo"
    fontFamily: "Outfit",
    customFont: "",
    wallpaperSource: "",
    wallpaperBlur: 0,
    wallpaperDim: 20
  },
  folders: [
    { id: "root",   name: "Home",            index: 0 },
    { id: "dev",    name: "Development",     index: 1 },
    { id: "career", name: "Career",          index: 2 }
  ],
  dials: [
    // ── Home Folder (root) ──────────────────────────────────────────────────
    {
      id: "h1", title: "Speedtest", url: "https://www.speedtest.net/",
      folder: "root", index: 0, pinned: false, customIcon: ""
    },
    {
      id: "h2", title: "YouTube", url: "https://www.youtube.com/",
      folder: "root", index: 1, pinned: false, customIcon: ""
    },
    {
      id: "h3", title: "Gmail", url: "https://mail.google.com/",
      folder: "root", index: 2, pinned: false, customIcon: ""
    },
    {
      id: "h4", title: "Drive", url: "https://drive.google.com/",
      folder: "root", index: 3, pinned: false, customIcon: ""
    },
    {
      id: "h5", title: "LinkedIn", url: "https://www.linkedin.com/",
      folder: "root", index: 4, pinned: false, customIcon: ""
    },
    {
      id: "h6", title: "GitHub", url: "https://github.com/",
      folder: "root", index: 5, pinned: false, customIcon: ""
    },
    {
      id: "h7", title: "Notion", url: "https://www.notion.so/",
      folder: "root", index: 6, pinned: false, customIcon: ""
    },
    {
      id: "h8", title: "ChatGPT", url: "https://chatgpt.com/",
      folder: "root", index: 7, pinned: false, customIcon: ""
    },
    {
      id: "h9", title: "Claude", url: "https://claude.ai/",
      folder: "root", index: 8, pinned: false, customIcon: ""
    },
    {
      id: "h10", title: "DeepSeek", url: "https://chat.deepseek.com/",
      folder: "root", index: 9, pinned: false, customIcon: ""
    },
    {
      id: "h11", title: "Mistral AI", url: "https://chat.mistral.ai/",
      folder: "root", index: 10, pinned: false, customIcon: ""
    },
    {
      id: "h12", title: "Gemini", url: "https://gemini.google.com/",
      folder: "root", index: 11, pinned: false, customIcon: ""
    },
    {
      id: "h13", title: "LeetCode", url: "https://leetcode.com/",
      folder: "root", index: 12, pinned: false, customIcon: ""
    },
    {
      id: "h14", title: "Draw.io", url: "https://app.diagrams.net/",
      folder: "root", index: 13, pinned: false, customIcon: ""
    },
    {
      id: "h15", title: "Excalidraw", url: "https://excalidraw.com/",
      folder: "root", index: 14, pinned: false, customIcon: ""
    },
    {
      id: "h16", title: "Overleaf", url: "https://www.overleaf.com/",
      folder: "root", index: 15, pinned: false, customIcon: ""
    },
    {
      id: "h17", title: "Reddit", url: "https://www.reddit.com/",
      folder: "root", index: 16, pinned: false, customIcon: ""
    },
    {
      id: "h18", title: "Discord", url: "https://discord.com/",
      folder: "root", index: 17, pinned: false, customIcon: ""
    },
    {
      id: "h19", title: "Pastebin", url: "https://pastebin.com/",
      folder: "root", index: 18, pinned: false, customIcon: ""
    },

    // ── In Development Folder (dev) ─────────────────────────────────────────
    {
      id: "d1", title: "Spring Initializr", url: "https://start.spring.io/",
      folder: "dev", index: 0, pinned: false, customIcon: ""
    },
    {
      id: "d2", title: "Maven Repository", url: "https://mvnrepository.com/",
      folder: "dev", index: 1, pinned: false, customIcon: ""
    },
    {
      id: "d3", title: "Docker Hub", url: "https://hub.docker.com/",
      folder: "dev", index: 2, pinned: false, customIcon: ""
    },
    {
      id: "d4", title: "LeetCode", url: "https://leetcode.com/",
      folder: "dev", index: 3, pinned: false, customIcon: ""
    },
    {
      id: "d5", title: "HackerRank", url: "https://www.hackerrank.com/",
      folder: "dev", index: 4, pinned: false, customIcon: ""
    },
    {
      id: "d6", title: "CodeChef", url: "https://www.codechef.com/",
      folder: "dev", index: 5, pinned: false, customIcon: ""
    },
    {
      id: "d7", title: "InterviewBit", url: "https://www.interviewbit.com/",
      folder: "dev", index: 6, pinned: false, customIcon: ""
    },
    {
      id: "d8", title: "Excalidraw", url: "https://excalidraw.com/",
      folder: "dev", index: 7, pinned: false, customIcon: ""
    },
    {
      id: "d9", title: "Overleaf", url: "https://www.overleaf.com/",
      folder: "dev", index: 8, pinned: false, customIcon: ""
    },

    // ── Career Folder (career) ──────────────────────────────────────────────
    {
      id: "c1", title: "LinkedIn", url: "https://www.linkedin.com/",
      folder: "career", index: 0, pinned: false, customIcon: ""
    },
    {
      id: "c2", title: "Naukri", url: "https://www.naukri.com/",
      folder: "career", index: 1, pinned: false, customIcon: ""
    },
    {
      id: "c3", title: "Indeed", url: "https://www.indeed.com/",
      folder: "career", index: 2, pinned: false, customIcon: ""
    },
    {
      id: "c4", title: "Glassdoor", url: "https://www.glassdoor.com/",
      folder: "career", index: 3, pinned: false, customIcon: ""
    },
    {
      id: "c5", title: "Wellfound", url: "https://wellfound.com/",
      folder: "career", index: 4, pinned: false, customIcon: ""
    },
    {
      id: "c6", title: "Internshala", url: "https://internshala.com/",
      folder: "career", index: 5, pinned: false, customIcon: ""
    }
  ]
};
