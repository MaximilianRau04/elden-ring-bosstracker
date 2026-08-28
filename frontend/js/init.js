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
  showToast(I18N.t("toast.activeClearedFieldDeath"), 2200);
}

// Show/hide the active-boss bar at the top.
function updateActiveBossDisplay() {
  var bar = document.getElementById("active-boss-bar");
  if (!bar) return;
  if (activeBoss.boss) {
    bar.style.display = "flex";
    var nameEl = document.getElementById("active-boss-name");
    if (nameEl) {
      nameEl.textContent = I18N.bossLabel(activeBoss.boss);
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
    showToast(I18N.tf("toast.deathPlus1", I18N.bossLabel(activeBoss.boss)), 2000);
  } else {
    var type = showDLC && !showBase ? "dlc" : "base";
    adjustFieldDeaths(type, 1);
    showToast(I18N.tf("toast.fieldDeathPlus1", type), 2000);
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
    if (confirm(I18N.t("confirm.resetAll"))) {
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
        showToast(I18N.tf("toast.activeSet", I18N.bossLabel(t.boss)), 2000);
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
      showToast(I18N.tf("toast.bossKilled", I18N.bossLabel(p ? p.boss : msg.boss)), 2500);
    }
  }
});

function init() {
  loadProgress();

  I18N.applyStaticI18n();
  syncLangButton();

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
