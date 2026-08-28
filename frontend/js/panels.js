// ═══════════════════════════════════════════════════════════════════════════
//  BOSS LEVEL PANEL, EDITOR TOOLBOX (Timer + Filter, local only) and the
//  BOSS CONTEXT MENU. Depends on the state/utils declared in js/state.js.
// ═══════════════════════════════════════════════════════════════════════════

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
  if (subtitle) subtitle.textContent = I18N.tf("bossLevel.subtitle", done.length);

  if (done.length === 0) {
    list.innerHTML = '<div class="boss-level-empty">' + escHtml(I18N.t("bossLevel.empty")) + '</div>';
    return;
  }

  list.innerHTML = done.map(function(b, i) {
    var isMain = MAIN_BOSSES.has(b.boss);
    var displayLevel = String(b.level).split("/")[0].trim();
    var levelLabel   = (b.isDLC ? I18N.t("bossLevel.scaduLvlBadge") : I18N.t("bossLevel.lvlBadge")) + '&nbsp;';
    var bossLabel  = I18N.bossLabel(b.boss);
    var areaLabel  = I18N.areaLabel(b.area);

    return '<div class="boss-level-entry' + (isMain ? " main" : "") + '">'
      + '<span class="boss-level-rank">' + (i + 1) + '</span>'
      + '<span class="boss-level-badge' + (b.isDLC ? ' dlc' : '') + '">' + levelLabel + escHtml(displayLevel) + '</span>'
      + '<div class="boss-level-info">'
      + '<span class="boss-level-name' + (isMain ? " main" : "") + '" data-tip="' + escHtml(bossLabel) + '" data-tip-always="1">' + escHtml(bossLabel) + '</span>'
      + '<span class="boss-level-area">' + escHtml(areaLabel) + '</span>'
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
  showToast(I18N.tf("toast.timerSet", fmtTime(ms)), 2000);
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
  if (t) t.textContent = timerVisible ? I18N.t("timer.hide") : I18N.t("timer.show");
}

function toolboxSyncBossTimerVisBtn() {
  toolboxSetBtnActive('etb-btn-BO1', bossTimerVisible);
  var btn = document.getElementById("etb-btn-BO1");
  if (!btn) return;
  var t = btn.querySelector(".etb-btn-text");
  if (t) t.textContent = bossTimerVisible ? I18N.t("timer.hide") : I18N.t("timer.show");
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
  if (textEl) textEl.textContent = running ? I18N.t("timer.pause") : I18N.t("timer.start");
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
  showToast(I18N.tf("toast.bossTimerSet", fmtTime(ms)), 2000);
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
  if (textEl) textEl.textContent = running ? I18N.t("timer.pause") : I18N.t("timer.start");
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

  document.getElementById("menu-boss-name").textContent = I18N.bossLabel(bossName);
  document.getElementById("menu-area-name").textContent = I18N.areaLabel(areaName);
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
    doneLabel.textContent = I18N.t("menu.markOpen");
  } else {
    doneBtn.className     = "boss-menu-action-btn";
    doneIcon.textContent  = "☐";
    doneLabel.textContent = I18N.t("menu.markDone");
  }

  var pinBtn   = document.getElementById("menu-pin-btn");
  var pinIcon  = document.getElementById("menu-pin-icon");
  var pinLabel = document.getElementById("menu-pin-label");
  if (menuState.pinned) {
    pinBtn.className     = "boss-menu-action-btn active-pin";
    pinIcon.textContent  = "📍";
    pinLabel.textContent = I18N.t("menu.unpin");
  } else {
    pinBtn.className     = "boss-menu-action-btn";
    pinIcon.textContent  = "📌";
    pinLabel.textContent = I18N.t("menu.pin");
  }

  var activeBtn   = document.getElementById("menu-active-btn");
  var activeLabel = document.getElementById("menu-active-label");
  var isActive    = activeBoss.boss === menuState.boss && activeBoss.area === menuState.area;
  if (activeBtn) {
    activeBtn.className     = "boss-menu-action-btn" + (isActive ? " active" : "");
    activeLabel.textContent = isActive ? I18N.t("menu.clearActive") : I18N.t("menu.setActive");
  }
}

function menuToggleActive() {
  var isActive = activeBoss.boss === menuState.boss && activeBoss.area === menuState.area;
  if (isActive) {
    setActiveBoss(null, null);
    showToast(I18N.t("toast.activeCleared"), 2000);
  } else {
    setActiveBoss(menuState.area, menuState.boss);
    showToast(I18N.tf("toast.activeSet", I18N.bossLabel(menuState.boss)), 2000);
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
