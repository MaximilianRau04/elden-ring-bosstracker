// ═══════════════════════════════════════════════════════════════════════════
//  DATA MUTATION, FIELD DEATHS, TIMER display, TOGGLE CONTROLS and SEARCH.
//  Writes to PROGRESS/localStorage (js/state.js) and patches the DOM that
//  js/render.js builds, without a full re-render.
// ═══════════════════════════════════════════════════════════════════════════

function applyBossChange(area, boss, field, value) {
  var p = getBossProgress(area, boss);
  var oldDone = p.done;

  if (field === "done") {
    p.done = value;
    p.date = value ? (p.date || todayISO()) : null;
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
    showToast(I18N.tf("toast.bossDefeated", I18N.bossLabel(boss)));
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
  if (labelEl) labelEl.textContent = timerLabel ? timerLabel + ":" : I18N.t("timer.defaultLabel");
}

function startTimerTick() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateTimerDisplay, 1000);
}

// Boss timer: shows time spent on the currently ACTIVE boss (persisted
// timeSpent plus the live running session, see js/init.js setActiveBoss).
function updateBossTimerDisplay() {
  var chip = document.getElementById("boss-timer-chip");
  if (!chip) return;
  if (!bossTimerVisible || !activeBoss.boss) { chip.style.display = "none"; return; }
  chip.style.display = "flex";
  var p = getBossProgress(activeBoss.area, activeBoss.boss);
  var elapsed = (p.timeSpent || 0) + (activeBossSessionStartTs > 0 ? Date.now() - activeBossSessionStartTs : 0);
  document.getElementById("val-boss-timer").textContent = fmtTime(elapsed);
  var labelEl = document.getElementById("val-boss-timer-label");
  if (labelEl) labelEl.textContent = I18N.bossLabel(activeBoss.boss) + ":";
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
      var bossName = I18N.bossLabel(row.dataset.boss || "");
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
    countEl.textContent = I18N.tf("search.results", totalMatches);
    countEl.classList.add("visible");
  } else {
    countEl.classList.remove("visible");
    countEl.textContent = "";
    grid.querySelectorAll(".boss-row[data-boss]").forEach(function(row) {
      var nameEl = row.querySelector(".boss-name");
      if (nameEl) nameEl.innerHTML = escHtml(I18N.bossLabel(row.dataset.boss || ""));
    });
  }
}
