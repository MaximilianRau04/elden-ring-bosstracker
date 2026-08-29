// ═══════════════════════════════════════════════════════════════════════════
//  ELDEN RING BOSS TRACKER - local version
//  No external services (no Twitch, no Google Sheet, no Bingo).
//  Boss list: bosses.js (window.BOSS_DATA)
//  Progress:  localStorage (see PROGRESS / saveProgress / loadProgress)
//
//  Hooks for later automation:
//    - registerDeath()            → increments deaths of the active boss
//    - registerBossKill(name)     → marks a boss as defeated
//    - setActiveBoss(area, boss)  → sets which boss is "active"
//  These functions are defined in js/init.js (AUTOMATION-API section).
//
//  This file: shared state, localStorage/server persistence, small utils,
//  and the language toggle. Loaded first - every other js/*.js file relies
//  on the globals declared here.
// ═══════════════════════════════════════════════════════════════════════════

const RANKING_TOP_N = 10;
const STORAGE_KEY = "er_bosstracker_v1";

// Story / demigod "main" bosses - list lives in data/bosses.js (shared with the
// overlay), loaded before this file. Kept as a Set for fast .has() lookups.
const MAIN_BOSSES = new Set(window.MAIN_BOSSES || []);

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

var localCollapsed      = {};
var showBase            = true;
var showDLC             = true;
var showOnlyMain        = false;
var showOnlyDone        = false;
var showOnlyOpen        = false;
var prevDeaths          = null;
var prevDoneBosses      = null;

var currentAreas   = {};
var searchQuery    = "";
var prevRankingSnapshot = "";
var prevChartSnapshot = "";

var fieldDeaths = { base: 0, dlc: 0 };
var bossLevelData = []; // { boss, level, area, deaths, done, isMain, isDLC }

// Timer (allgemein)
var timerStartTs  = 0;
var timerElapsed  = 0;
var timerVisible  = false;
var timerInterval = null;
var timerLabel    = "";

// Boss-Timer: shows time spent on the currently ACTIVE boss (see activeBoss
// below). Automatic - starts/stops as activeBoss changes (js/init.js), the
// accumulated time per boss is stored on that boss's progress record
// (getBossProgress().timeSpent). bossTimerVisible only toggles the widget.
var bossTimerVisible       = false;
var bossTimerInterval      = null;
var activeBossSessionStartTs = 0; // Date.now() while a boss is active, else 0

// Active boss (for automation: deaths/kills get assigned to it)
var activeBoss = { area: null, boss: null };

// Overlay widget visibility (configured in the toolbox, read by the overlay)
var overlayCfg = { deaths: true, progress: true, pinned: true, list: true, victory: true };

// Boss menu state
var menuState = { area: null, boss: null, deaths: 0, done: false, pinned: false };
var menuOpen  = false;

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCE (localStorage)
//   PROGRESS.bosses["Area|Boss"] = { done, deaths, pinned, level, date }
// ═══════════════════════════════════════════════════════════════════════════

var PROGRESS = {
  bosses: {},
  fieldDeaths: { base: 0, dlc: 0 },
  ui: { showBase: true, showDLC: true, showOnlyMain: false, showOnlyDone: false, showOnlyOpen: false },
  collapsed: {},
  timer: { startTs: 0, elapsed: 0, visible: false, label: "" },
  bossTimer: { visible: false },
  activeBossSessionStartTs: 0,
  activeBoss: { area: null, boss: null },
  overlay: { deaths: true, progress: true, pinned: true, list: true, victory: true }
};

function loadProgress() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      PROGRESS = Object.assign(PROGRESS, parsed);
      PROGRESS.bosses      = parsed.bosses      || {};
      PROGRESS.fieldDeaths = parsed.fieldDeaths || { base: 0, dlc: 0 };
      PROGRESS.ui          = parsed.ui          || PROGRESS.ui;
      PROGRESS.collapsed   = parsed.collapsed   || {};
      PROGRESS.timer       = parsed.timer       || PROGRESS.timer;
      PROGRESS.bossTimer   = parsed.bossTimer   || PROGRESS.bossTimer;
      PROGRESS.activeBossSessionStartTs = parsed.activeBossSessionStartTs || 0;
      PROGRESS.activeBoss  = parsed.activeBoss  || { area: null, boss: null };
      PROGRESS.overlay     = Object.assign({ deaths: true, progress: true, pinned: true, list: true, victory: true }, parsed.overlay || {});
    }
  } catch (e) { console.error("[Progress] Laden fehlgeschlagen:", e); }

  // apply loaded state
  fieldDeaths    = { base: PROGRESS.fieldDeaths.base || 0, dlc: PROGRESS.fieldDeaths.dlc || 0 };
  showBase       = PROGRESS.ui.showBase     !== false;
  showDLC        = PROGRESS.ui.showDLC      !== false;
  showOnlyMain   = !!PROGRESS.ui.showOnlyMain;
  showOnlyDone   = !!PROGRESS.ui.showOnlyDone;
  showOnlyOpen   = !!PROGRESS.ui.showOnlyOpen;
  localCollapsed = Object.assign({}, PROGRESS.collapsed);
  timerStartTs   = PROGRESS.timer.startTs || 0;
  timerElapsed   = PROGRESS.timer.elapsed || 0;
  timerVisible   = !!PROGRESS.timer.visible;
  timerLabel     = PROGRESS.timer.label || "";
  bossTimerVisible  = !!PROGRESS.bossTimer.visible;
  activeBossSessionStartTs = PROGRESS.activeBossSessionStartTs || 0;
  activeBoss     = PROGRESS.activeBoss || { area: null, boss: null };
  overlayCfg     = Object.assign({ deaths: true, progress: true, pinned: true, list: true, victory: true }, PROGRESS.overlay || {});

  if (migrateLegacyDates()) saveProgress();
}

function saveProgress() {
  PROGRESS.fieldDeaths = fieldDeaths;
  PROGRESS.ui = { showBase: showBase, showDLC: showDLC, showOnlyMain: showOnlyMain, showOnlyDone: showOnlyDone, showOnlyOpen: showOnlyOpen };
  PROGRESS.collapsed = localCollapsed;
  PROGRESS.timer     = { startTs: timerStartTs, elapsed: timerElapsed, visible: timerVisible, label: timerLabel };
  PROGRESS.bossTimer = { visible: bossTimerVisible };
  PROGRESS.activeBossSessionStartTs = activeBossSessionStartTs;
  PROGRESS.activeBoss = activeBoss;
  PROGRESS.overlay = overlayCfg;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(PROGRESS));
  } catch (e) { console.error("[Progress] Speichern fehlgeschlagen:", e); }
  syncToServer(); // mirror to the on-disk store when the local server is running
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVER STORAGE (optional backend/server.py → progress.json on disk)
//   localStorage stays the offline cache; when the local server is reachable
//   it is the source of truth and every save is mirrored to disk.
// ═══════════════════════════════════════════════════════════════════════════

var serverAvailable = false;
var serverPushTimer = null;

// Debounced POST of the whole PROGRESS object to the disk store.
function syncToServer() {
  if (!serverAvailable) return;
  if (serverPushTimer) clearTimeout(serverPushTimer);
  serverPushTimer = setTimeout(function() {
    serverPushTimer = null;
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(PROGRESS)
    }).catch(function() { /* offline → localStorage keeps the data */ });
  }, 400);
}

// On startup: prefer the disk store when the server is up; otherwise fall back
// to localStorage. Seeds the disk store from localStorage on first run.
function bootstrapStorage() {
  return fetch("/api/progress", { cache: "no-store" })
    .then(function(r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function(remote) {
      serverAvailable = true;
      if (remote && remote.bosses && typeof remote.bosses === "object") {
        // disk store wins → refresh the local cache from it before loading
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)); } catch (e) {}
      } else {
        // empty disk store → seed it from whatever is in localStorage
        var local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          fetch("/api/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: local
          }).catch(function() {});
        }
      }
    })
    .catch(function() { serverAvailable = false; }); // static hosting / offline
}

function getBossProgress(area, boss) {
  var key = area + "|" + boss;
  if (!PROGRESS.bosses[key]) {
    PROGRESS.bosses[key] = { done: false, deaths: 0, pinned: false, level: null, date: null, timeSpent: 0 };
  }
  return PROGRESS.bosses[key];
}

// Rolls the current active-boss session into that boss's timeSpent. Called
// before activeBoss changes (js/init.js setActiveBoss) so the elapsed time
// is booked to the boss that was actually being fought.
function flushActiveBossTime() {
  if (activeBoss.boss && activeBoss.area && activeBossSessionStartTs > 0) {
    var p = getBossProgress(activeBoss.area, activeBoss.boss);
    p.timeSpent = (p.timeSpent || 0) + (Date.now() - activeBossSessionStartTs);
  }
  activeBossSessionStartTs = 0;
}

// This build is always "Editor" (local single-user).
function isAuthorized() { return true; }

// ═══════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════

function fmtTime(ms) {
  var s   = Math.floor(ms / 1000);
  var h   = String(Math.floor(s / 3600)).padStart(2, "0");
  var m   = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  var sec = String(s % 60).padStart(2, "0");
  return h + ":" + m + ":" + sec;
}

// Stored date format is always ISO (YYYY-MM-DD) - unambiguous and sorts
// correctly as a plain string, regardless of UI language. Only the DISPLAY
// (formatDate below) changes with the language toggle.
function todayISO() {
  var d = new Date();
  return d.getFullYear() + "-" +
         String(d.getMonth() + 1).padStart(2, "0") + "-" +
         String(d.getDate()).padStart(2, "0");
}

var MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ISO date ("YYYY-MM-DD") -> localized display string.
function formatDate(iso) {
  var parts = String(iso).split("-");
  if (parts.length !== 3) return iso; // defensive: unexpected/legacy format
  var y = parts[0], m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
  if (I18N.getLang() === "en") {
    return MONTH_ABBR[m - 1] + " " + d + ", " + y;
  }
  return String(d).padStart(2, "0") + "." + String(m).padStart(2, "0") + "." + y;
}

// One-time migration: older versions stored the "date defeated" as
// German-formatted DD.MM.YYYY. Convert any leftovers to ISO so sorting
// (renderChart) and formatDate() above work correctly.
function migrateLegacyDates() {
  var changed = false;
  Object.keys(PROGRESS.bosses).forEach(function(key) {
    var p = PROGRESS.bosses[key];
    if (p && p.date && /^\d{2}\.\d{2}\.\d{4}$/.test(p.date)) {
      var parts = p.date.split(".");
      p.date = parts[2] + "-" + parts[1] + "-" + parts[0];
      changed = true;
    }
  });
  return changed;
}

// ═══════════════════════════════════════════════════════════════════════════
// LANGUAGE TOGGLE (see data/i18n.js)
// ═══════════════════════════════════════════════════════════════════════════

function syncLangButton() {
  var label = document.getElementById("etb-lang-label");
  if (label) label.textContent = I18N.getLang().toUpperCase();
}

function toggleLanguage() {
  I18N.setLang(I18N.getLang() === "de" ? "en" : "de");
  syncLangButton();
  I18N.applyStaticI18n();
  toolboxSyncTimerVisBtn();
  toolboxSyncBossTimerVisBtn();
  toolboxSyncTimerUI();
  updateTimerDisplay();
  updateBossTimerDisplay();
  updateActiveBossDisplay();
  updateMenuDisplay();
  // force ranking/chart to re-render even though the underlying data didn't change
  prevRankingSnapshot = "";
  prevChartSnapshot   = "";
  processData();
  if (document.getElementById("boss-level-modal").classList.contains("open")) {
    renderBossLevelPanel();
  }
}

function showToast(msg, duration) {
  duration = duration || 3500;
  var el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(function() { el.classList.remove("show"); }, duration);
}

function pulseEl(el) {
  if (!el) return;
  el.classList.remove("stat-pulse");
  void el.offsetWidth;
  el.classList.add("stat-pulse");
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Select all text in a contenteditable element (so a click overwrites the value).
function selectAllText(el) {
  var range = document.createRange();
  range.selectNodeContents(el);
  var sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}
