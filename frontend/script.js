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
//  These functions are defined below in the AUTOMATION-API section.
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

// Boss-Timer
var bossTimerStartTs  = 0;
var bossTimerElapsed  = 0;
var bossTimerVisible  = false;
var bossTimerInterval = null;
var bossTimerLabel    = "";
var bossToolboxTick   = null;

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
  bossTimer: { startTs: 0, elapsed: 0, visible: false, label: "" },
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
  bossTimerStartTs  = PROGRESS.bossTimer.startTs || 0;
  bossTimerElapsed  = PROGRESS.bossTimer.elapsed || 0;
  bossTimerVisible  = !!PROGRESS.bossTimer.visible;
  bossTimerLabel    = PROGRESS.bossTimer.label || "";
  activeBoss     = PROGRESS.activeBoss || { area: null, boss: null };
  overlayCfg     = Object.assign({ deaths: true, progress: true, pinned: true, list: true, victory: true }, PROGRESS.overlay || {});
}

function saveProgress() {
  PROGRESS.fieldDeaths = fieldDeaths;
  PROGRESS.ui = { showBase: showBase, showDLC: showDLC, showOnlyMain: showOnlyMain, showOnlyDone: showOnlyDone, showOnlyOpen: showOnlyOpen };
  PROGRESS.collapsed = localCollapsed;
  PROGRESS.timer     = { startTs: timerStartTs,     elapsed: timerElapsed,     visible: timerVisible,     label: timerLabel };
  PROGRESS.bossTimer = { startTs: bossTimerStartTs, elapsed: bossTimerElapsed, visible: bossTimerVisible, label: bossTimerLabel };
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
    PROGRESS.bosses[key] = { done: false, deaths: 0, pinned: false, level: null, date: null };
  }
  return PROGRESS.bosses[key];
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

function todayStr() {
  var d = new Date();
  return String(d.getDate()).padStart(2, "0") + "." +
         String(d.getMonth() + 1).padStart(2, "0") + "." +
         d.getFullYear();
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

// ═══════════════════════════════════════════════════════════════════════════
// BOSS LEVEL PANEL
// ═══════════════════════════════════════════════════════════════════════════

function openBossLevelPanel() {
  document.getElementById("boss-level-backdrop").classList.add("open");
  document.getElementById("boss-level-modal").classList.add("open");
  document.body.style.overflow = "hidden";
  renderBossLevelPanel();
}

function closeBossLevelPanel() {
  document.getElementById("boss-level-backdrop").classList.remove("open");
  document.getElementById("boss-level-modal").classList.remove("open");
  document.body.style.overflow = "";
}

function renderBossLevelPanel() {
  var list = document.getElementById("boss-level-list");
  if (!list) return;

  function parseLevel(raw) {
    if (!raw) return null;
    var parts = String(raw).split("/");
    var p = parseInt(parts[0], 10);
    var s = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    return isNaN(p) ? null : { primary: p, secondary: isNaN(s) ? 0 : s };
  }

  var done = bossLevelData.filter(function(b) {
    return b.done && b.level !== null && parseLevel(b.level) !== null;
  });

  done.sort(function(a, b) {
    var pa = parseLevel(a.level), pb = parseLevel(b.level);
    if (pa.primary !== pb.primary) return pa.primary - pb.primary;
    return pa.secondary - pb.secondary;
  });

  var subtitle = document.getElementById("boss-level-subtitle");
  if (subtitle) subtitle.textContent = done.length + " Bosse mit Level besiegt";

  if (done.length === 0) {
    list.innerHTML = '<div class="boss-level-empty">Noch keine Bosse mit Level-Eintrag besiegt.</div>';
    return;
  }

  list.innerHTML = done.map(function(b, i) {
    var isMain = MAIN_BOSSES.has(b.boss);
    var displayLevel = String(b.level).split("/")[0].trim();
    var levelLabel   = b.isDLC ? 'Scadu-Lvl.&nbsp;' : 'Lvl&nbsp;';

    return '<div class="boss-level-entry' + (isMain ? " main" : "") + '">'
      + '<span class="boss-level-rank">' + (i + 1) + '</span>'
      + '<span class="boss-level-badge' + (b.isDLC ? ' dlc' : '') + '">' + levelLabel + escHtml(displayLevel) + '</span>'
      + '<div class="boss-level-info">'
      + '<span class="boss-level-name' + (isMain ? " main" : "") + '" data-tip="' + escAttr(b.boss) + '" data-tip-always="1">' + escHtml(b.boss) + '</span>'
      + '<span class="boss-level-area">' + escHtml(b.area) + '</span>'
      + '</div>'
      + '<span class="boss-level-deaths' + (b.deaths === 0 ? " nodeath" : "") + '">'
      + (b.deaths > 0 ? '†' + b.deaths : '†-')
      + '</span>'
      + '</div>';
  }).join("");
}

// ═══════════════════════════════════════════════════════════════════════════
// EDITOR TOOLBOX (Timer + Filter, local only)
// ═══════════════════════════════════════════════════════════════════════════

var toolboxTimerTick = null;

function toolboxInit() {
  var box = document.getElementById("editor-toolbox");
  if (!box) return;
  box.style.display = "flex";
  document.body.classList.add("editor-mode");
}

function toolboxOpenPanel(name) {
  var panels = ['timer', 'filter', 'overlay'];
  var wasOpen = false;
  panels.forEach(function(p) {
    var item = document.getElementById('etb-item-' + p);
    if (!item) return;
    if (p === name && item.classList.contains('open')) wasOpen = true;
    item.classList.toggle('open', p === name && !item.classList.contains('open'));
    if (p !== name) item.classList.remove('open');
  });

  if (!wasOpen) {
    var item   = document.getElementById('etb-item-' + name);
    var panel  = document.getElementById('etb-panel-' + name);
    var tb     = document.getElementById('editor-toolbox');
    if (item && panel && tb) {
      var margin     = 10;
      var viewH      = window.innerHeight;
      var maxH       = viewH - 2 * margin;
      var btnCenterY = item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2;
      // clamp so panel (worst-case: maxH tall, centered) stays within viewport
      var top = Math.max(margin + maxH / 2, Math.min(viewH - margin - maxH / 2, btnCenterY));
      var left = tb.getBoundingClientRect().right + 4;
      panel.style.left      = left + 'px';
      panel.style.top       = top + 'px';
      panel.style.transform = 'translateY(-50%)';
      panel.style.maxHeight = maxH + 'px';
    }
  }

  if (name === 'timer' && !wasOpen) toolboxFillTimeInputs();
}

function toolboxFillTimeInputs() {
  var ms  = timerStartTs > 0 ? timerElapsed + (Date.now() - timerStartTs) : timerElapsed;
  var s   = Math.floor(ms / 1000);
  var h   = Math.floor(s / 3600);
  var m   = Math.floor((s % 3600) / 60);
  var sec = s % 60;
  var hEl = document.getElementById('etb-elapsed-h');
  var mEl = document.getElementById('etb-elapsed-m');
  var sEl = document.getElementById('etb-elapsed-s');
  if (hEl) hEl.value = h > 0 ? h : '';
  if (mEl) mEl.value = m > 0 ? m : '';
  if (sEl) sEl.value = sec > 0 ? sec : '';

  var lEl = document.getElementById('etb-general-label');
  if (lEl && document.activeElement !== lEl) lEl.value = timerLabel;

  var bms  = bossTimerStartTs > 0 ? bossTimerElapsed + (Date.now() - bossTimerStartTs) : bossTimerElapsed;
  var bs   = Math.floor(bms / 1000);
  var bh   = Math.floor(bs / 3600);
  var bm   = Math.floor((bs % 3600) / 60);
  var bsec = bs % 60;
  var bhEl = document.getElementById('etb-boss-elapsed-h');
  var bmEl = document.getElementById('etb-boss-elapsed-m');
  var bsEl = document.getElementById('etb-boss-elapsed-s');
  if (bhEl) bhEl.value = bh > 0 ? bh : '';
  if (bmEl) bmEl.value = bm > 0 ? bm : '';
  if (bsEl) bsEl.value = bsec > 0 ? bsec : '';

  var blEl = document.getElementById('etb-boss-label');
  if (blEl && document.activeElement !== blEl) blEl.value = bossTimerLabel;
}

function toolboxSetElapsed() {
  var h   = Math.max(0, parseInt(document.getElementById('etb-elapsed-h').value) || 0);
  var m   = Math.max(0, Math.min(59, parseInt(document.getElementById('etb-elapsed-m').value) || 0));
  var s   = Math.max(0, Math.min(59, parseInt(document.getElementById('etb-elapsed-s').value) || 0));
  var ms  = (h * 3600 + m * 60 + s) * 1000;

  timerElapsed = ms;
  if (timerStartTs > 0) timerStartTs = Date.now();

  saveProgress();
  updateTimerDisplay();
  toolboxSyncTimerUI();
  showToast("⏱ Timer gesetzt: " + fmtTime(ms), 2000);
}

document.addEventListener('click', function(e) {
  var toolbox = document.getElementById('editor-toolbox');
  if (toolbox && !toolbox.contains(e.target)) {
    ['timer','filter','overlay'].forEach(function(p) {
      var item = document.getElementById('etb-item-' + p);
      if (item) item.classList.remove('open');
    });
  }
});

function toolboxSetBtnActive(btnId, active) {
  var btn = document.getElementById(btnId);
  if (btn) btn.classList.toggle("active", active);
}

// Toolbox buttons:
//   O1 = show timer | R1 = Base | R2 = DLC | T1 = open only | T2 = done only
function toolboxToggleCell(cell, btnId) {
  if (cell === 'O1') {
    timerVisible = !timerVisible;
    updateTimerDisplay();
    if (timerVisible && timerStartTs > 0) startTimerTick();
    else if (!timerVisible && timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    toolboxSyncTimerVisBtn();
    saveProgress();
    return;
  }
  if (cell === 'BO1') {
    bossTimerVisible = !bossTimerVisible;
    updateBossTimerDisplay();
    if (bossTimerVisible && bossTimerStartTs > 0) startBossTimerTick();
    else if (!bossTimerVisible && bossTimerInterval) { clearInterval(bossTimerInterval); bossTimerInterval = null; }
    toolboxSyncBossTimerVisBtn();
    saveProgress();
    return;
  }
  var flagMap = { R1: 'base', R2: 'dlc', T1: 'open', T2: 'done' };
  if (flagMap[cell]) toggleFlag(flagMap[cell]);
}

function timerLabelChanged(val) {
  timerLabel = val.trim();
  updateTimerDisplay();
  saveProgress();
}

function bossTimerLabelChanged(val) {
  bossTimerLabel = val.trim();
  updateBossTimerDisplay();
  saveProgress();
}

function toolboxSyncFilterButtons() {
  toolboxSetBtnActive('etb-btn-R1', showBase);
  toolboxSetBtnActive('etb-btn-R2', showDLC);
  toolboxSetBtnActive('etb-btn-T1', showOnlyOpen);
  toolboxSetBtnActive('etb-btn-T2', showOnlyDone);
  toolboxSyncTimerVisBtn();
}

// Overlay widget toggles (read by the OBS overlay via PROGRESS.overlay).
var OVERLAY_TOGGLE_IDS = {
  deaths:   'etb-ov-deaths',
  progress: 'etb-ov-progress',
  pinned:   'etb-ov-pinned',
  list:     'etb-ov-list',
  victory:  'etb-ov-victory'
};

function toolboxToggleOverlay(key, btnId) {
  overlayCfg[key] = !overlayCfg[key];
  toolboxSetBtnActive(btnId, overlayCfg[key]);
  saveProgress();
}

function toolboxSyncOverlayButtons() {
  Object.keys(OVERLAY_TOGGLE_IDS).forEach(function(key) {
    toolboxSetBtnActive(OVERLAY_TOGGLE_IDS[key], overlayCfg[key] !== false);
  });
}

function toolboxSyncTimerVisBtn() {
  toolboxSetBtnActive('etb-btn-O1', timerVisible);
  var btn = document.getElementById("etb-btn-O1");
  if (!btn) return;
  var t = btn.querySelector(".etb-btn-text");
  if (t) t.textContent = timerVisible ? "Ausblenden" : "Einblenden";
}

function toolboxSyncBossTimerVisBtn() {
  toolboxSetBtnActive('etb-btn-BO1', bossTimerVisible);
  var btn = document.getElementById("etb-btn-BO1");
  if (!btn) return;
  var t = btn.querySelector(".etb-btn-text");
  if (t) t.textContent = bossTimerVisible ? "Ausblenden" : "Einblenden";
}

function toolboxToggleTimer() {
  if (timerStartTs > 0) {
    timerElapsed += Date.now() - timerStartTs;
    timerStartTs = 0;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  } else {
    timerStartTs = Date.now();
    startTimerTick();
  }
  saveProgress();
  updateTimerDisplay();
  toolboxSyncTimerUI();
}

function toolboxTimerReset() {
  timerStartTs = 0;
  timerElapsed = 0;
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  saveProgress();
  updateTimerDisplay();
  toolboxSyncTimerUI();
}

function toolboxSyncTimerUI() {
  var btn  = document.getElementById("etb-btn-L1");
  var disp = document.getElementById("etb-timer-display");
  if (!btn || !disp) return;
  var running = timerStartTs > 0;
  btn.classList.toggle("timer-running", running);
  var iconEl = btn.querySelector(".etb-btn-icon");
  var textEl = btn.querySelector(".etb-btn-text");
  if (iconEl) iconEl.textContent = running ? "⏸" : "▶";
  if (textEl) textEl.textContent = running ? "Pause" : "Start";
  disp.classList.toggle("running", running);
  if (toolboxTimerTick) clearInterval(toolboxTimerTick);
  if (running) toolboxTimerTick = setInterval(toolboxUpdateTimerDisplay, 500);
  toolboxUpdateTimerDisplay();
}

function toolboxUpdateTimerDisplay() {
  var disp = document.getElementById("etb-timer-display");
  if (!disp) return;
  var ms = timerStartTs > 0 ? timerElapsed + (Date.now() - timerStartTs) : timerElapsed;
  disp.textContent = fmtTime(ms);
}

// Boss-Timer toolbox functions
function toolboxToggleBossTimer() {
  if (bossTimerStartTs > 0) {
    bossTimerElapsed += Date.now() - bossTimerStartTs;
    bossTimerStartTs = 0;
    if (bossTimerInterval) { clearInterval(bossTimerInterval); bossTimerInterval = null; }
  } else {
    bossTimerStartTs = Date.now();
    startBossTimerTick();
  }
  saveProgress();
  updateBossTimerDisplay();
  toolboxSyncBossTimerUI();
}

function toolboxBossTimerReset() {
  bossTimerStartTs = 0;
  bossTimerElapsed = 0;
  if (bossTimerInterval) { clearInterval(bossTimerInterval); bossTimerInterval = null; }
  saveProgress();
  updateBossTimerDisplay();
  toolboxSyncBossTimerUI();
}

function toolboxSetBossElapsed() {
  var h   = Math.max(0, parseInt(document.getElementById('etb-boss-elapsed-h').value) || 0);
  var m   = Math.max(0, Math.min(59, parseInt(document.getElementById('etb-boss-elapsed-m').value) || 0));
  var s   = Math.max(0, Math.min(59, parseInt(document.getElementById('etb-boss-elapsed-s').value) || 0));
  var ms  = (h * 3600 + m * 60 + s) * 1000;
  bossTimerElapsed = ms;
  if (bossTimerStartTs > 0) bossTimerStartTs = Date.now();
  saveProgress();
  updateBossTimerDisplay();
  toolboxSyncBossTimerUI();
  showToast("⏱ Boss-Timer gesetzt: " + fmtTime(ms), 2000);
}

function toolboxSyncBossTimerUI() {
  var btn  = document.getElementById("etb-btn-BL1");
  var disp = document.getElementById("etb-boss-timer-display");
  if (!btn || !disp) return;
  var running = bossTimerStartTs > 0;
  btn.classList.toggle("timer-running", running);
  var iconEl = btn.querySelector(".etb-btn-icon");
  var textEl = btn.querySelector(".etb-btn-text");
  if (iconEl) iconEl.textContent = running ? "⏸" : "▶";
  if (textEl) textEl.textContent = running ? "Pause" : "Start";
  disp.classList.toggle("running", running);
  if (bossToolboxTick) clearInterval(bossToolboxTick);
  if (running) bossToolboxTick = setInterval(toolboxUpdateBossTimerDisplay, 500);
  toolboxUpdateBossTimerDisplay();
}

function toolboxUpdateBossTimerDisplay() {
  var disp = document.getElementById("etb-boss-timer-display");
  if (!disp) return;
  var ms = bossTimerStartTs > 0 ? bossTimerElapsed + (Date.now() - bossTimerStartTs) : bossTimerElapsed;
  disp.textContent = fmtTime(ms);
}

// ═══════════════════════════════════════════════════════════════════════════
// BOSS CONTEXT MENU
// ═══════════════════════════════════════════════════════════════════════════

function openBossMenu(e, areaName, bossName) {
  e.stopPropagation();

  var area = currentAreas[areaName];
  if (!area) return;
  var bossData = null;
  for (var i = 0; i < area.bosses.length; i++) {
    if (area.bosses[i].boss === bossName) { bossData = area.bosses[i]; break; }
  }
  if (!bossData) return;

  menuState = {
    area:   areaName,
    boss:   bossName,
    deaths: bossData.deaths,
    done:   bossData.done,
    pinned: bossData.pinned
  };

  document.getElementById("menu-boss-name").textContent = bossName;
  document.getElementById("menu-area-name").textContent = areaName;
  updateMenuDisplay();
  positionMenu(e);

  document.querySelectorAll(".boss-row.menu-open, .pinned-card.menu-open").forEach(function(r) {
    r.classList.remove("menu-open");
  });
  e.currentTarget.classList.add("menu-open");

  document.getElementById("boss-menu").classList.add("open");
  menuOpen = true;
}

function positionMenu(e) {
  var menu = document.getElementById("boss-menu");
  menu.style.display = "block";
  var mw = 240, mh = 280;
  var vw = window.innerWidth, vh = window.innerHeight;
  var touch = e.changedTouches && e.changedTouches[0];
  var cx = touch ? touch.clientX : e.clientX;
  var cy = touch ? touch.clientY : e.clientY;
  var left = cx + 10, top = cy + 4;
  if (left + mw > vw - 12) left = cx - mw - 10;
  if (top  + mh > vh - 12) top  = cy - mh - 4;
  if (left < 8) left = 8;
  if (top  < 8) top  = 8;
  menu.style.left = left + "px";
  menu.style.top  = top  + "px";
}

function closeBossMenu() {
  document.getElementById("boss-menu").classList.remove("open");
  menuOpen = false;
  document.querySelectorAll(".boss-row.menu-open, .pinned-card.menu-open").forEach(function(r) {
    r.classList.remove("menu-open");
  });
}

function updateMenuDisplay() {
  document.getElementById("menu-deaths-val").textContent = menuState.deaths;

  var doneBtn   = document.getElementById("menu-done-btn");
  var doneIcon  = document.getElementById("menu-done-icon");
  var doneLabel = document.getElementById("menu-done-label");
  if (menuState.done) {
    doneBtn.className     = "boss-menu-action-btn active";
    doneIcon.textContent  = "☑";
    doneLabel.textContent = "Als nicht besiegt markieren";
  } else {
    doneBtn.className     = "boss-menu-action-btn";
    doneIcon.textContent  = "☐";
    doneLabel.textContent = "Als besiegt markieren";
  }

  var pinBtn   = document.getElementById("menu-pin-btn");
  var pinIcon  = document.getElementById("menu-pin-icon");
  var pinLabel = document.getElementById("menu-pin-label");
  if (menuState.pinned) {
    pinBtn.className     = "boss-menu-action-btn active-pin";
    pinIcon.textContent  = "📍";
    pinLabel.textContent = "Anpinnung entfernen";
  } else {
    pinBtn.className     = "boss-menu-action-btn";
    pinIcon.textContent  = "📌";
    pinLabel.textContent = "Anpinnen";
  }

  var activeBtn   = document.getElementById("menu-active-btn");
  var activeLabel = document.getElementById("menu-active-label");
  var isActive    = activeBoss.boss === menuState.boss && activeBoss.area === menuState.area;
  if (activeBtn) {
    activeBtn.className     = "boss-menu-action-btn" + (isActive ? " active" : "");
    activeLabel.textContent = isActive ? "Ist aktiver Boss (aufheben)" : "Als aktiven Boss setzen";
  }
}

function menuToggleActive() {
  var isActive = activeBoss.boss === menuState.boss && activeBoss.area === menuState.area;
  if (isActive) {
    setActiveBoss(null, null);
    showToast("🎯 Aktiver Boss aufgehoben", 2000);
  } else {
    setActiveBoss(menuState.area, menuState.boss);
    showToast("🎯 Aktiver Boss: " + menuState.boss, 2000);
  }
  updateMenuDisplay();
}

function menuAdjustDeaths(delta) {
  var newDeaths = Math.max(0, menuState.deaths + delta);
  menuState.deaths = newDeaths;
  updateMenuDisplay();
  applyBossChange(menuState.area, menuState.boss, "deaths", newDeaths);
}

// Direct entry: typing a number into the editable death count.
function menuSetDeaths(value) {
  var n = parseInt(value, 10);
  if (isNaN(n) || n < 0) n = 0;
  menuState.deaths = n;
  updateMenuDisplay();
  applyBossChange(menuState.area, menuState.boss, "deaths", n);
}

function menuToggleDone() {
  var newDone = !menuState.done;
  menuState.done = newDone;
  updateMenuDisplay();
  applyBossChange(menuState.area, menuState.boss, "done", newDone);
}

function menuTogglePin() {
  var newPinned = !menuState.pinned;
  menuState.pinned = newPinned;
  updateMenuDisplay();
  applyBossChange(menuState.area, menuState.boss, "pinned", newPinned);
}

document.addEventListener("click", function(e) {
  if (!menuOpen) return;
  var menu = document.getElementById("boss-menu");
  if (!menu.contains(e.target)) closeBossMenu();
});

document.addEventListener("touchend", function(e) {
  var row = e.target.closest(".boss-row[data-boss]");
  if (!row) return;
  e.preventDefault();
  openBossMenu(e, row.dataset.area, row.dataset.boss);
}, { passive: false });

document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    closeBossLevelPanel();
    closeBossMenu();
    if (searchQuery) clearSearch();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key === "f") {
    var searchInput = document.getElementById("search-input");
    if (searchInput) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    return;
  }

  if (menuOpen) {
    var tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
        || (e.target && e.target.isContentEditable)) return;
    if (e.key === "+" || e.key === "=") { e.preventDefault(); menuAdjustDeaths(1);  return; }
    if (e.key === "-" || e.key === "_") { e.preventDefault(); menuAdjustDeaths(-1); return; }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DATA MUTATION (writes to PROGRESS + localStorage, updates UI)
// ═══════════════════════════════════════════════════════════════════════════

function applyBossChange(area, boss, field, value) {
  var p = getBossProgress(area, boss);
  var oldDone = p.done;

  if (field === "done") {
    p.done = value;
    p.date = value ? (p.date || todayStr()) : null;
    if (!value) p.level = p.level; // keep the level
  } else if (field === "deaths") {
    p.deaths = Math.max(0, value);
  } else if (field === "pinned") {
    p.pinned = value;
  } else if (field === "level") {
    p.level = value;
  }
  saveProgress();

  // update the local currentAreas model
  if (currentAreas[area]) {
    var bossData = currentAreas[area].bosses.find(function(b) { return b.boss === boss; });
    if (bossData) {
      bossData.done   = p.done;
      bossData.deaths = p.deaths;
      bossData.pinned = p.pinned;
      bossData.level  = p.level;
      currentAreas[area].done = currentAreas[area].bosses.filter(function(b) { return b.done; }).length;
      updateBossRow(area, boss, bossData);
      updateAreaHeader(area);
      updatePinnedCard(area, boss, bossData);
    }
  }

  if (field === "done" && value === true && !oldDone && MAIN_BOSSES.has(boss)) {
    showToast("✔ " + boss + " besiegt!");
  }

  // A defeated boss is no longer the one you're fighting → release it.
  if (field === "done" && value === true && activeBoss.boss === boss && activeBoss.area === area) {
    setActiveBoss(null, null);
  }

  // rebuild the pinned section when pin status changes
  if (field === "pinned") renderAreas(currentAreas);

  recomputeStats();
}

function updateBossRow(areaName, bossName, bossData) {
  var row = document.querySelector(
    '.boss-row[data-area="' + CSS.escape(areaName) + '"][data-boss="' + CSS.escape(bossName) + '"]'
  );
  if (!row) return;
  var isDone = bossData.done;
  var isMain = MAIN_BOSSES.has(bossName);
  row.className = "boss-row" + (isDone ? " done" : "") + " editable";
  var deathsEl = row.querySelector(".boss-deaths");
  var nameEl   = row.querySelector(".boss-name");
  if (deathsEl) deathsEl.textContent = bossData.deaths > 0 ? "†" + bossData.deaths : "†-";
  if (nameEl)   nameEl.className     = "boss-name" + (isMain ? " main" : "");
}

function updatePinnedCard(areaName, bossName, bossData) {
  var card = document.querySelector(
    '.pinned-card[data-area="' + CSS.escape(areaName) + '"][data-boss="' + CSS.escape(bossName) + '"]'
  );
  if (!card) return;
  card.classList.toggle("done", bossData.done);
  var deathsEl = card.querySelector(".pinned-deaths");
  if (deathsEl) deathsEl.textContent = "📌 " + (bossData.deaths > 0 ? bossData.deaths : "-");
}

function updateAreaHeader(areaName) {
  var data = currentAreas[areaName];
  if (!data) return;
  var card = document.querySelector('.area-card[data-area="' + CSS.escape(areaName) + '"]');
  if (!card) return;
  var fraction = card.querySelector(".area-fraction");
  var fillEl   = card.querySelector(".area-progress-fill");
  var pct      = data.total > 0 ? (data.done / data.total) * 100 : 0;
  var complete = data.done === data.total && data.total > 0;
  if (fraction) fraction.textContent = data.done + "/" + data.total;
  if (fillEl) {
    fillEl.style.width = pct + "%";
    fillEl.classList.toggle("complete", complete);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FIELD DEATHS (misc deaths)
// ═══════════════════════════════════════════════════════════════════════════

function adjustFieldDeaths(type, delta) {
  var newVal = Math.max(0, fieldDeaths[type] + delta);
  fieldDeaths[type] = newVal;
  document.getElementById("fdeath-val-" + type).textContent = newVal;
  saveProgress();
  recomputeStats();
}

// Direct entry: typing a number into an editable field-death count.
function setFieldDeaths(type, value) {
  var n = parseInt(value, 10);
  if (isNaN(n) || n < 0) n = 0;
  fieldDeaths[type] = n;
  document.getElementById("fdeath-val-" + type).textContent = n;
  saveProgress();
  recomputeStats();
}

function updateFieldDeathsVisibility() {
  var chipBase = document.getElementById("fdeath-chip-base");
  var chipDlc  = document.getElementById("fdeath-chip-dlc");
  var divider  = document.getElementById("fdeath-divider");
  if (!chipBase || !chipDlc) return;
  chipBase.style.display = showBase ? "" : "none";
  chipDlc.style.display  = showDLC  ? "" : "none";
  if (divider) divider.style.display = (showBase && showDLC) ? "" : "none";
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMER
// ═══════════════════════════════════════════════════════════════════════════

function updateTimerDisplay() {
  var timerChip = document.getElementById("timer-chip");
  if (!timerChip) return;
  if (!timerVisible) { timerChip.style.display = "none"; return; }
  timerChip.style.display = "flex";
  var elapsed = timerStartTs > 0 ? timerElapsed + (Date.now() - timerStartTs) : timerElapsed;
  document.getElementById("val-timer").textContent = fmtTime(elapsed);
  var labelEl = document.getElementById("val-timer-label");
  if (labelEl) labelEl.textContent = timerLabel ? timerLabel + ":" : "Timer:";
}

function startTimerTick() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateTimerDisplay, 1000);
}

function updateBossTimerDisplay() {
  var chip = document.getElementById("boss-timer-chip");
  if (!chip) return;
  if (!bossTimerVisible) { chip.style.display = "none"; return; }
  chip.style.display = "flex";
  var elapsed = bossTimerStartTs > 0 ? bossTimerElapsed + (Date.now() - bossTimerStartTs) : bossTimerElapsed;
  document.getElementById("val-boss-timer").textContent = fmtTime(elapsed);
  var labelEl = document.getElementById("val-boss-timer-label");
  if (labelEl) labelEl.textContent = bossTimerLabel ? bossTimerLabel + ":" : "Boss:";
}

function startBossTimerTick() {
  if (bossTimerInterval) clearInterval(bossTimerInterval);
  bossTimerInterval = setInterval(updateBossTimerDisplay, 1000);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOGGLE CONTROLS
// ═══════════════════════════════════════════════════════════════════════════

function toggleFlag(flag) {
  if (flag === "base") {
    showBase = !showBase;
    document.getElementById("btn-basegame").classList.toggle("active", showBase);
  } else if (flag === "dlc") {
    showDLC = !showDLC;
    document.getElementById("btn-dlc").classList.toggle("active", showDLC);
  } else if (flag === "main") {
    showOnlyMain = !showOnlyMain;
    document.getElementById("btn-mainbosses").classList.toggle("active", showOnlyMain);
  } else if (flag === "done") {
    showOnlyDone = !showOnlyDone;
    if (showOnlyDone) { showOnlyOpen = false; document.getElementById("btn-open").classList.remove("active"); }
    document.getElementById("btn-done").classList.toggle("active", showOnlyDone);
  } else if (flag === "open") {
    showOnlyOpen = !showOnlyOpen;
    if (showOnlyOpen) { showOnlyDone = false; document.getElementById("btn-done").classList.remove("active"); }
    document.getElementById("btn-open").classList.toggle("active", showOnlyOpen);
    document.body.classList.toggle("filter-open", showOnlyOpen);
  }
  updateFieldDeathsVisibility();
  toolboxSyncFilterButtons();
  saveProgress();
  processData();
}

function setAllCollapsed(val) {
  Object.keys(currentAreas).forEach(function(k) { localCollapsed[k] = val; });
  saveProgress();
  renderAreas(currentAreas);
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════════════════

function onSearchInput(val) {
  searchQuery = val.trim().toLowerCase();
  document.getElementById("search-clear").classList.toggle("visible", searchQuery.length > 0);
  document.body.classList.toggle("searching", searchQuery.length > 0);
  applySearch();
}

function clearSearch() {
  searchQuery = "";
  document.getElementById("search-input").value = "";
  document.getElementById("search-clear").classList.remove("visible");
  document.getElementById("search-result-count").classList.remove("visible");
  document.getElementById("search-result-count").textContent = "";
  document.body.classList.remove("searching");
  applySearch();
}

function highlightMatch(text, query) {
  if (!query) return escHtml(text);
  var idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return escHtml(text);
  return escHtml(text.substring(0, idx))
    + "<mark>" + escHtml(text.substring(idx, idx + query.length)) + "</mark>"
    + escHtml(text.substring(idx + query.length));
}

function applySearch() {
  var query   = searchQuery;
  var countEl = document.getElementById("search-result-count");
  var grid    = document.getElementById("areas-grid");
  if (!grid) return;

  var totalMatches = 0;

  grid.querySelectorAll(".area-card[data-area]").forEach(function(card) {
    var rows = card.querySelectorAll(".boss-row[data-boss]");
    var areaMatches = 0;

    rows.forEach(function(row) {
      var bossName = row.dataset.boss || "";
      var matches  = !query || bossName.toLowerCase().indexOf(query) !== -1;
      row.classList.toggle("search-nomatch", !matches);
      var nameEl = row.querySelector(".boss-name");
      if (matches) {
        areaMatches++;
        if (nameEl) nameEl.innerHTML = highlightMatch(bossName, query);
      } else {
        if (nameEl) nameEl.innerHTML = escHtml(bossName);
      }
    });

    var hidden = query.length > 0 && areaMatches === 0;
    card.classList.toggle("search-hidden", hidden);
    if (!hidden) totalMatches += areaMatches;
  });

  if (query.length > 0) {
    countEl.textContent = totalMatches + " Treffer";
    countEl.classList.add("visible");
  } else {
    countEl.classList.remove("visible");
    countEl.textContent = "";
    grid.querySelectorAll(".boss-row[data-boss]").forEach(function(row) {
      var nameEl = row.querySelector(".boss-name");
      if (nameEl) nameEl.innerHTML = escHtml(row.dataset.boss || "");
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RANKING
// ═══════════════════════════════════════════════════════════════════════════

var rankingCollapsed = false;

function toggleRanking() {
  rankingCollapsed = !rankingCollapsed;
  document.getElementById("ranking-panel").classList.toggle("collapsed", rankingCollapsed);
}

function renderRanking(allBosses) {
  var withDeaths = allBosses.filter(function(b) { return b.deaths > 0; });
  withDeaths.sort(function(a, b) { return b.deaths - a.deaths; });
  var top = withDeaths.slice(0, RANKING_TOP_N);

  var maxDeaths       = top.length > 0 ? top[0].deaths : 1;
  var totalDeaths     = allBosses.reduce(function(s, b) { return s + b.deaths; }, 0);
  var bossesAttempted = allBosses.filter(function(b) { return b.done; }).length;
  var avgDeaths       = bossesAttempted > 0 ? (totalDeaths / bossesAttempted).toFixed(1) : "-";

  document.getElementById("val-avg").textContent = avgDeaths === "-" ? "-" : avgDeaths + " †";

  var subtitle = document.getElementById("ranking-subtitle");
  if (subtitle) {
    var doneBossCount = allBosses.filter(function(b) { return b.done; }).length;
    subtitle.textContent = top.length > 0
      ? "- Top " + top.length + " von " + doneBossCount + " erledigten Bossen"
      : "- noch keine Tode erfasst.";
  }

  var listEl = document.getElementById("ranking-list");
  if (!listEl) return;

  if (top.length === 0) {
    listEl.innerHTML = '<div class="ranking-empty">Noch keine Tode erfasst.</div>';
    return;
  }

  var medals = ["🥇", "🥈", "🥉"];

  listEl.innerHTML = top.map(function(b, i) {
    var pct        = maxDeaths > 0 ? (b.deaths / maxDeaths * 100) : 0;
    var isMain     = MAIN_BOSSES.has(b.boss);
    var rankLabel  = i < 3 ? medals[i] : "#" + (i + 1);
    var rankClass  = i === 0 ? "top1" : (i === 1 ? "top2" : (i === 2 ? "top3" : ""));
    var entryClass = i === 0 ? "rank-entry-1" : (i === 1 ? "rank-entry-2" : "");
    var delayStyle = "animation-delay:" + (i * 55) + "ms";

    return '<div class="ranking-entry ' + entryClass + '" style="' + delayStyle + '">'
      + '<span class="rank-number ' + rankClass + '">' + rankLabel + '</span>'
      + '<div class="rank-bar-wrap">'
      + '<span class="boss-name' + (isMain ? " main" : "") + '" data-tip="' + escAttr(b.boss) + '">' + escHtml(b.boss) + '</span>'
      + '<div class="rank-bar-row">'
      + '<div class="rank-bar-bg"><div class="rank-bar-fill" style="width:' + pct + '%"></div></div>'
      + '<span class="rank-deaths">' + b.deaths.toLocaleString("de-DE") + '<span class="unit"> †</span></span>'
      + '</div></div></div>';
  }).join("");
}

// ═══════════════════════════════════════════════════════════════════════════
// CHART (bosses per day)
// ═══════════════════════════════════════════════════════════════════════════

var chartCollapsed = false;
var chartInstance  = null;

function toggleChart() {
  chartCollapsed = !chartCollapsed;
  document.getElementById("chart-panel").classList.toggle("collapsed", chartCollapsed);
  document.getElementById("chart-toggle-icon").style.transform = chartCollapsed ? "rotate(-90deg)" : "";
}

function renderChart(allBosses) {
  var byDate = {};
  allBosses.forEach(function(b) {
    if (!b.done || !b.date) return;
    if (!byDate[b.date]) byDate[b.date] = [];
    byDate[b.date].push(b.boss);
  });

  var dates = Object.keys(byDate).sort(function(a, b) {
    var pa = a.split("."); var pb = b.split(".");
    return new Date(pa[2], pa[1]-1, pa[0]) - new Date(pb[2], pb[1]-1, pb[0]);
  });

  if (dates.length === 0) {
    document.getElementById("chart-section").style.display = "none";
    return;
  }

  document.getElementById("chart-section").style.display = "block";
  var dayCount  = dates.length;
  var bossCount = allBosses.filter(function(b){ return b.done && b.date; }).length;
  document.getElementById("chart-subtitle").textContent =
    "- " + dayCount + (dayCount === 1 ? " Tag, " : " Tage, ") + bossCount + (bossCount === 1 ? " Boss erledigt" : " Bosse erledigt");

  var counts   = dates.map(function(d) { return byDate[d].length; });
  var bossList = dates.map(function(d) { return byDate[d]; });

  var ctx = document.getElementById("boss-chart").getContext("2d");
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: dates,
      datasets: [{
        label: "Bosse besiegt",
        data: counts,
        backgroundColor: "rgba(201, 164, 74, 0.35)",
        borderColor: "rgba(201, 164, 74, 0.85)",
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: "rgba(227, 184, 115, 0.5)",
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(14, 11, 7, 0.97)",
          borderColor: "rgba(201, 164, 74, 0.4)",
          borderWidth: 1,
          titleColor: "#e3b873",
          bodyColor: "#e6dcc8",
          titleFont: { family: "Cinzel, serif", size: 12 },
          bodyFont: { family: "Crimson Pro, Georgia, serif", size: 13 },
          padding: 12,
          callbacks: {
            title: function(items) { return items[0].label; },
            label: function(item) {
              var list = bossList[item.dataIndex];
              return ["† " + list.length + " Boss" + (list.length > 1 ? "e" : "") + ":"]
                .concat(list.map(function(n){ return "  · " + n; }));
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: "#a89880", font: { family: "Crimson Pro, serif", size: 12 } }, grid: { color: "rgba(201,164,74,0.07)" } },
        y: { beginAtZero: true, ticks: { color: "#a89880", stepSize: 1, font: { family: "Cinzel, serif", size: 11 } }, grid: { color: "rgba(201,164,74,0.07)" } }
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD & RENDER DATA (from BOSS_DATA + PROGRESS)
// ═══════════════════════════════════════════════════════════════════════════

function processData() {
  var areas     = {};
  var allBosses = [];

  (window.BOSS_DATA || []).forEach(function(areaDef) {
    var area  = areaDef.area;
    var isDLC = !!areaDef.isDLC;
    if (isDLC && !showDLC) return;
    if (!isDLC && !showBase) return;

    areaDef.bosses.forEach(function(boss) {
      if (showOnlyMain && !MAIN_BOSSES.has(boss)) return;
      var p = getBossProgress(area, boss);
      if (showOnlyDone && !p.done) return;
      if (showOnlyOpen && p.done)  return;

      if (!areas[area]) {
        var collapsed = (area in localCollapsed) ? localCollapsed[area]
                       : (area in PROGRESS.collapsed ? PROGRESS.collapsed[area] : false);
        areas[area] = { total: 0, done: 0, bosses: [], collapsed: collapsed, isDLC: isDLC };
      }
      areas[area].total++;
      if (p.done) areas[area].done++;
      areas[area].bosses.push({ boss: boss, done: p.done, deaths: p.deaths, pinned: p.pinned, level: p.level });
      allBosses.push({ boss: boss, deaths: p.deaths, done: p.done, area: area, date: p.date, level: p.level, isDLC: isDLC });
    });
  });

  currentAreas  = areas;
  bossLevelData = allBosses;

  renderAreas(areas);
  recomputeStats(allBosses);

  var rankingSnapshot = JSON.stringify(allBosses.map(function(b) { return b.boss + "|" + b.deaths + "|" + b.done; }));
  if (rankingSnapshot !== prevRankingSnapshot) {
    prevRankingSnapshot = rankingSnapshot;
    renderRanking(allBosses);
  }

  var chartSnapshot = JSON.stringify(allBosses.filter(function(b) { return b.done && b.date; }).map(function(b) { return b.boss + "|" + b.date; }));
  if (chartSnapshot !== prevChartSnapshot) {
    prevChartSnapshot = chartSnapshot;
    renderChart(allBosses);
  }

  if (document.getElementById("boss-level-modal").classList.contains("open")) {
    renderBossLevelPanel();
  }
}

// Recompute the stats bar. allBosses optional - otherwise derived from PROGRESS.
function recomputeStats(allBosses) {
  if (!allBosses) {
    allBosses = [];
    (window.BOSS_DATA || []).forEach(function(areaDef) {
      var isDLC = !!areaDef.isDLC;
      if (isDLC && !showDLC) return;
      if (!isDLC && !showBase) return;
      areaDef.bosses.forEach(function(boss) {
        if (showOnlyMain && !MAIN_BOSSES.has(boss)) return;
        var p = getBossProgress(areaDef.area, boss);
        allBosses.push({ boss: boss, deaths: p.deaths, done: p.done, isDLC: isDLC });
      });
    });
  }

  // total deaths = boss deaths + field deaths (depending on filter)
  var bossDeaths = allBosses.reduce(function(s, b) { return s + b.deaths; }, 0);
  var fd = 0;
  if (showOnlyMain) fd = 0;
  else {
    if (showBase) fd += fieldDeaths.base;
    if (showDLC)  fd += fieldDeaths.dlc;
  }
  var globalDeaths = bossDeaths + fd;

  if (prevDeaths !== null && globalDeaths !== prevDeaths) {
    var el = document.getElementById("stat-deaths");
    pulseEl(el);
    el.classList.remove("death-flash");
    void el.offsetWidth;
    el.classList.add("death-flash");
  }
  document.getElementById("val-deaths").textContent = globalDeaths.toLocaleString("de-DE");
  prevDeaths = globalDeaths;

  var totalBosses = allBosses.length;
  var doneBosses  = allBosses.filter(function(b) { return b.done; }).length;

  if (prevDoneBosses !== null && doneBosses !== prevDoneBosses) {
    pulseEl(document.getElementById("stat-bosses"));
    pulseEl(document.getElementById("stat-percent"));
  }
  if (showOnlyDone || showOnlyOpen) {
    document.getElementById("val-bosses").textContent = totalBosses;
  } else {
    document.getElementById("val-bosses").textContent = doneBosses + " / " + totalBosses;
  }
  var pct = totalBosses > 0 ? Math.round((doneBosses / totalBosses) * 100) : 0;
  document.getElementById("val-percent").textContent = pct + "%";
  prevDoneBosses = doneBosses;

  document.getElementById("stat-percent").style.display = (showOnlyOpen || showOnlyDone) ? "none" : "";
  document.getElementById("stat-avg").style.display     = showOnlyOpen ? "none" : "";

  // avg deaths/boss
  var bossesAttempted = doneBosses;
  var avg = bossesAttempted > 0 ? (bossDeaths / bossesAttempted).toFixed(1) : "-";
  document.getElementById("val-avg").textContent = avg === "-" ? "-" : avg + " †";
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER AREAS
// ═══════════════════════════════════════════════════════════════════════════

function renderAreas(areas) {
  var grid = document.getElementById("areas-grid");

  var allPinned = [];
  Object.keys(areas).forEach(function(areaName) {
    areas[areaName].bosses.forEach(function(b) {
      if (b.pinned) allPinned.push(Object.assign({}, b, { area: areaName }));
    });
  });

  var pinnedSection = document.getElementById("pinned-section");
  var pinnedList    = document.getElementById("pinned-list");
  if (allPinned.length > 0) {
    pinnedSection.style.display = "block";
    pinnedList.innerHTML = "";
    allPinned.forEach(function(b) {
      var isMain = MAIN_BOSSES.has(b.boss);
      var card   = document.createElement("div");
      card.className    = "pinned-card" + (b.done ? " done" : "") + " editable";
      card.dataset.boss = b.boss;
      card.dataset.area = b.area;
      card.addEventListener("click", function(e) { openBossMenu(e, b.area, b.boss); });
      card.addEventListener("touchend", function(e) { e.preventDefault(); openBossMenu(e, b.area, b.boss); });
      card.innerHTML = '<span class="pinned-deaths">📌 ' + (b.deaths > 0 ? b.deaths : "-") + '</span>'
        + '<span class="pinned-name' + (isMain ? " main-boss" : "") + '">' + escHtml(b.boss) + '</span>'
        + '<span class="boss-edit-hint" data-tip="Bearbeiten" data-tip-always="1">✏</span>';
      pinnedList.appendChild(card);
    });
  } else {
    pinnedSection.style.display = "none";
  }

  var existingCards = {};
  grid.querySelectorAll(".area-card[data-area]").forEach(function(el) {
    existingCards[el.dataset.area] = el;
  });

  var newKeys = Object.keys(areas);
  Object.keys(existingCards).forEach(function(k) {
    if (!areas[k]) existingCards[k].remove();
  });

  newKeys.forEach(function(areaName, idx) {
    var data = areas[areaName];
    var card = existingCards[areaName];

    if (!card) {
      card = document.createElement("div");
      card.className    = "area-card";
      card.dataset.area = areaName;
    }

    if (!(areaName in localCollapsed)) localCollapsed[areaName] = data.collapsed;
    var collapsed = localCollapsed[areaName];
    card.classList.toggle("collapsed", collapsed);

    var pct      = data.total > 0 ? (data.done / data.total) * 100 : 0;
    var complete = data.done === data.total && data.total > 0;
    var dlcLabel = data.isDLC
      ? ' <span style="font-size:11px;color:var(--gold-dim);font-family:\'Crimson Pro\',serif;font-style:italic;">DLC</span>'
      : "";

    card.innerHTML = '<div class="area-header" onclick="toggleArea(\'' + escAttr(areaName) + '\')">'
      + '<div class="area-header-left">'
      + '<span class="area-toggle-icon">▼</span>'
      + '<span class="area-name" data-tip="' + escAttr(areaName) + '">' + escHtml(areaName) + dlcLabel + '</span>'
      + '</div>'
      + '<div class="area-progress-wrap">'
      + '<span class="area-fraction">' + data.done + '/' + data.total + '</span>'
      + '<div class="area-progress-bar">'
      + '<div class="area-progress-fill' + (complete ? " complete" : "") + '" style="width:' + pct + '%"></div>'
      + '</div></div></div>'
      + '<div class="boss-list">'
      + data.bosses.map(function(b) { return renderBossRow(b, areaName); }).join("")
      + '</div>';

    var children     = Array.from(grid.children);
    var currentIndex = children.indexOf(card);
    if (currentIndex !== idx) {
      if (idx >= grid.children.length) grid.appendChild(card);
      else grid.insertBefore(card, grid.children[idx]);
    }
  });

  if (searchQuery) applySearch();
}

function renderBossRow(b, areaName) {
  var isMain     = MAIN_BOSSES.has(b.boss);
  var deathClass = b.deaths === 0 ? " boss-deaths-zero" : "";

  return '<div class="boss-row' + (b.done ? " done" : "") + ' editable"'
    + ' data-boss="' + escAttr(b.boss) + '"'
    + ' data-area="' + escAttr(areaName) + '"'
    + ' onclick="openBossMenu(event,\'' + escAttr(areaName) + '\',\'' + escAttr(b.boss) + '\')">'
    + '<span class="boss-deaths' + deathClass + '">' + (b.deaths > 0 ? "†" + b.deaths : "†-") + '</span>'
    + '<span class="boss-name' + (isMain ? " main" : "") + '" data-tip="' + escAttr(b.boss) + '">' + escHtml(b.boss) + '</span>'
    + '<span class="boss-check">✓</span>'
    + '<span class="boss-edit-hint" data-tip="Bearbeiten" data-tip-always="1">✏</span>'
    + '</div>';
}

function toggleArea(areaName) {
  localCollapsed[areaName] = !localCollapsed[areaName];
  saveProgress();
  var card = document.querySelector('.area-card[data-area="' + CSS.escape(areaName) + '"]');
  if (card) card.classList.toggle("collapsed", localCollapsed[areaName]);
}

// ─── CUSTOM TOOLTIP ───
(function() {
  var tip = document.getElementById("custom-tooltip");
  var offset = 14;

  document.addEventListener("mouseover", function(e) {
    var el = e.target.closest("[data-tip]");
    if (!el) return;
    if (!el.dataset.tipAlways && el.scrollWidth <= el.offsetWidth) return;
    tip.textContent = el.dataset.tip;
    tip.classList.add("visible");
  });

  document.addEventListener("mouseout", function(e) {
    var el = e.target.closest("[data-tip]");
    if (!el) return;
    tip.classList.remove("visible");
  });

  document.addEventListener("mousemove", function(e) {
    if (!tip.classList.contains("visible")) return;
    var x = e.clientX + offset;
    var y = e.clientY + offset;
    if (x + tip.offsetWidth > window.innerWidth - 8) x = e.clientX - tip.offsetWidth - offset;
    if (y + tip.offsetHeight > window.innerHeight - 8) y = e.clientY - tip.offsetHeight - offset;
    tip.style.left = x + "px";
    tip.style.top  = y + "px";
  });
})();

// ═══════════════════════════════════════════════════════════════════════════
// AUTOMATION-API
//   Hook points for later automatic detection (screen reader / save-file
//   parser). An external tool can call these functions
//   (e.g. via window.ERTracker.* from a local server / WebSocket bridge).
// ═══════════════════════════════════════════════════════════════════════════

function setActiveBoss(area, boss) {
  activeBoss = { area: area, boss: boss };
  saveProgress();
  updateActiveBossDisplay();
}

function clearActiveBoss() {
  setActiveBoss(null, null);
  showToast("🎯 Aktiver Boss aufgehoben - Tode zählen als Feldtod", 2200);
}

// Show/hide the active-boss bar at the top.
function updateActiveBossDisplay() {
  var bar = document.getElementById("active-boss-bar");
  if (!bar) return;
  if (activeBoss.boss) {
    bar.style.display = "flex";
    var nameEl = document.getElementById("active-boss-name");
    if (nameEl) {
      nameEl.textContent = activeBoss.boss;
      nameEl.className = "active-boss-name" + (MAIN_BOSSES.has(activeBoss.boss) ? " main" : "");
    }
  } else {
    bar.style.display = "none";
  }
}

// "You died" detected → attribute the death to the active boss (else field death).
function registerDeath() {
  if (activeBoss.boss && activeBoss.area) {
    var p = getBossProgress(activeBoss.area, activeBoss.boss);
    applyBossChange(activeBoss.area, activeBoss.boss, "deaths", p.deaths + 1);
    showToast("💀 Tod +1: " + activeBoss.boss, 2000);
  } else {
    var type = showDLC && !showBase ? "dlc" : "base";
    adjustFieldDeaths(type, 1);
    showToast("💀 Feldtod +1 (" + type + ")", 2000);
  }
}

// Boss kill detected. If a name is passed, the matching boss is looked up.
function registerBossKill(bossName) {
  var target = bossName ? findBoss(bossName) : (activeBoss.boss ? { area: activeBoss.area, boss: activeBoss.boss } : null);
  if (!target) { console.warn("[Automation] Boss nicht gefunden:", bossName); return false; }
  // Already defeated → no-op (avoids re-rendering everything on a repeat detection).
  if (getBossProgress(target.area, target.boss).done) return true;
  applyBossChange(target.area, target.boss, "done", true);
  return true;
}

// Finds a boss by (possibly fuzzy) name. Returns {area, boss}.
function findBoss(name) {
  if (!name) return null;
  var needle = name.toLowerCase().trim();
  var exact = null, partial = null;
  (window.BOSS_DATA || []).forEach(function(areaDef) {
    areaDef.bosses.forEach(function(boss) {
      var hay = boss.toLowerCase();
      if (hay === needle && !exact) exact = { area: areaDef.area, boss: boss };
      else if (!partial && (hay.indexOf(needle) !== -1 || needle.indexOf(hay) !== -1)) {
        partial = { area: areaDef.area, boss: boss };
      }
    });
  });
  return exact || partial;
}

// public bridge for external tools
window.ERTracker = {
  registerDeath:    registerDeath,
  registerBossKill: registerBossKill,
  setActiveBoss:    setActiveBoss,
  findBoss:         findBoss,
  resetAll: function() {
    if (confirm("Wirklich allen Fortschritt löschen?")) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// AUTOMATION BRIDGE (local helper tool → ERTracker)
//   - death-detector (backend/death_detector, port 8777): screen OCR →
//       deaths, the active boss (health-bar name) and boss kills (the golden
//       "…GEGNER GEFALLEN" banner, credited to the active boss).
//   Optional. When the tool isn't running the bridge just keeps retrying
//   quietly every few seconds - no errors, nothing happens.
// ═══════════════════════════════════════════════════════════════════════════

// Generic auto-reconnecting WebSocket bridge.
function makeBridge(url, onMessage) {
  var socket = null, retry = null;

  function connect() {
    try { socket = new WebSocket(url); }
    catch (e) { schedule(); return; }

    socket.onopen    = function() { console.log("[Bridge] connected to " + url); };
    socket.onmessage = function(ev) {
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      onMessage(msg);
    };
    socket.onclose   = function() { schedule(); };
    socket.onerror   = function() { try { socket.close(); } catch (e) {} };
  }

  function schedule() {
    if (retry) return;
    retry = setTimeout(function() { retry = null; connect(); }, 4000);
  }

  return { connect: connect };
}

var detectorBridge = makeBridge("ws://127.0.0.1:8777", function(msg) {
  if (!msg) return;
  if (msg.type === "death") {
    registerDeath();
  } else if (msg.type === "active_boss") {
    if (msg.boss) {
      // boss health-bar name OCR → set the active boss automatically
      var t = findBoss(msg.boss);
      if (t && !(activeBoss.boss === t.boss && activeBoss.area === t.area)) {
        setActiveBoss(t.area, t.boss);
        showToast("🎯 Aktiver Boss: " + t.boss, 2000);
      }
    } else if (activeBoss.boss) {
      // health bar gone (kill or left the arena) → deaths count as field deaths
      clearActiveBoss();
    }
  } else if (msg.type === "kill" && msg.boss) {
    // "…GEGNER GEFALLEN" banner → mark the active boss as defeated
    var p = findBoss(msg.boss);
    var fresh = p && !getBossProgress(p.area, p.boss).done;
    if (registerBossKill(msg.boss) && fresh) {
      showToast("⚔️ Boss besiegt: " + (p ? p.boss : msg.boss), 2500);
    }
  }
});

function init() {
  loadProgress();

  document.getElementById("btn-basegame").classList.toggle("active", showBase);
  document.getElementById("btn-dlc").classList.toggle("active", showDLC);
  document.getElementById("btn-mainbosses").classList.toggle("active", showOnlyMain);
  document.getElementById("btn-done").classList.toggle("active", showOnlyDone);
  document.getElementById("btn-open").classList.toggle("active", showOnlyOpen);
  document.body.classList.toggle("filter-open", showOnlyOpen);

  document.getElementById("field-deaths-bar").style.display = "flex";
  document.getElementById("fdeath-val-base").textContent = fieldDeaths.base;
  document.getElementById("fdeath-val-dlc").textContent  = fieldDeaths.dlc;
  updateFieldDeathsVisibility();

  toolboxInit();
  (function centerToolbox() {
    var tb = document.getElementById('editor-toolbox');
    if (tb) tb.style.marginTop = (-tb.offsetHeight / 2) + 'px';
  })();
  toolboxSyncFilterButtons();
  toolboxSyncOverlayButtons();
  toolboxSyncTimerUI();
  toolboxSyncBossTimerUI();
  toolboxSyncBossTimerVisBtn();

  updateTimerDisplay();
  if (timerVisible && timerStartTs > 0) startTimerTick();

  updateBossTimerDisplay();
  if (bossTimerVisible && bossTimerStartTs > 0) startBossTimerTick();

  updateActiveBossDisplay();

  detectorBridge.connect();

  processData();

  document.getElementById("loading-overlay").style.display = "none";
  document.getElementById("areas-grid").style.display      = "grid";
}

// Load the disk store (if the local server is running) before rendering, then init.
bootstrapStorage().then(init);
