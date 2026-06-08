const VICTORY_DELAY = 2000;
const PARTICLE_COUNT = 50;

let previousBossStates = {};
let autoScrollPaused = false;
let topDeathsModeActive = false;

let lastGlobalDeaths = 0;
let lastDoneBosses = 0;
let lastTotalBosses = 0;

// Shared with the tracker; defined in data/bosses.js (loaded before this file).
const MAIN_BOSSES = window.MAIN_BOSSES || [];

const STORAGE_KEY = "er_bosstracker_v1";

// ─── Config via URL params ────────────────────────────────────────────────
// Display mode and per-widget visibility are chosen via URL params, so you can
// add several OBS browser sources with different layouts. Content and filters
// always mirror the tracker (read from the shared progress store).
//
//   mode=top        Top-10 most-died bosses
//   view=simple     compact view (header + pinned only)
//   deaths=0        hide the total-deaths counter
//   progress=0      hide the boss-progress counter
//   timer=0         hide the timer
//   pinned=0        hide the pinned-bosses section
//   list=0          hide the scrolling boss list
//   victory=0       disable the boss-kill victory animation
const _params = new URLSearchParams(location.search);
const _mode   = (_params.get("mode") || "").toLowerCase();
const SIMPLE_VIEW = (_params.get("view") || "").toLowerCase() === "simple";
topDeathsModeActive = _mode === "top" || _mode === "topdeaths";

// A URL param, if present, overrides the tracker's setting (per-OBS-source).
// Returns undefined when the param is absent.
function _urlFlag(name) {
  if (!_params.has(name)) return undefined;
  return !["0", "false", "off", "no"].includes((_params.get(name) || "").toLowerCase());
}
const URL_CFG = {
  deaths:   _urlFlag("deaths"),
  progress: _urlFlag("progress"),
  timer:    _urlFlag("timer"),
  pinned:   _urlFlag("pinned"),
  list:     _urlFlag("list"),
  victory:  _urlFlag("victory"),
};

// Effective widget visibility, recomputed each load from PROGRESS.overlay
// (set in the tracker toolbox); a URL param takes precedence when given.
let activeConfig = { deaths: true, progress: true, timer: true, bossTimer: true, pinned: true, list: true, victory: true };

function computeConfig(overlaySettings) {
  const ov = overlaySettings || {};
  const pick = key => URL_CFG[key] !== undefined ? URL_CFG[key] : (ov[key] !== false);
  return {
    deaths: pick("deaths"), progress: pick("progress"),
    timer: pick("timer"), bossTimer: pick("bossTimer"),
    pinned: pick("pinned"), list: pick("list"), victory: pick("victory"),
  };
}

function applyHeaderConfig() {
  const d = document.getElementById("total-deaths");
  const p = document.getElementById("total-boss-progress");
  if (d) d.style.display = activeConfig.deaths   ? "" : "none";
  if (p) p.style.display = activeConfig.progress ? "" : "none";
  const header = document.querySelector(".header-stats");
  if (header) header.style.display = (activeConfig.deaths || activeConfig.progress) ? "flex" : "none";
}

// Read the shared progress: prefer the on-disk store (server), fall back to the
// localStorage copy (the overlay is the same origin as the tracker).
function readLocalProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}
function fetchProgress() {
  return fetch("/api/progress", { cache: "no-store" })
    .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(p => (p && p.bosses) ? p : readLocalProgress())
    .catch(readLocalProgress);
}

/* ================= TIMER ENGINE ================= */

let generalTimerStartTs = 0;
let generalTimerElapsed = 0;
let generalTimerVisible = false;
let generalTimerLabel   = "Timer";

let bossTimerStartTs = 0;
let bossTimerElapsed = 0;
let bossTimerVisible = false;
let bossTimerLabel   = "Boss";

function fmtOverlayTime(ms) {
  const diff    = Math.floor(ms / 1000);
  const hours   = String(Math.floor(diff / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
  const seconds = String(diff % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function updateTimerDisplays() {
  const genEl  = document.getElementById("general-timer");
  const bossEl = document.getElementById("boss-timer");

  if (genEl) {
    const show = activeConfig.timer && generalTimerVisible;
    genEl.style.display = show ? "block" : "none";
    if (show) {
      const ms = generalTimerStartTs > 0
        ? generalTimerElapsed + (Date.now() - generalTimerStartTs)
        : generalTimerElapsed;
      genEl.innerText = `⏱ ${generalTimerLabel}: ${fmtOverlayTime(ms)}`;
    }
  }

  if (bossEl) {
    const show = activeConfig.bossTimer && bossTimerVisible;
    bossEl.style.display = show ? "block" : "none";
    if (show) {
      const ms = bossTimerStartTs > 0
        ? bossTimerElapsed + (Date.now() - bossTimerStartTs)
        : bossTimerElapsed;
      bossEl.innerText = `⏳ ${bossTimerLabel}: ${fmtOverlayTime(ms)}`;
    }
  }
}

setInterval(updateTimerDisplays, 1000);

/* ================= TOP-DEATHS RENDER ================= */

function renderTopDeaths(allBosses) {
  const container = document.getElementById("top-deaths-container");
  const list      = document.getElementById("top-deaths-list");

  const sorted = allBosses
    .filter(b => b.deaths > 0)
    .sort((a, b) => b.deaths - a.deaths)
    .slice(0, 10);

  const maxDeaths = sorted.length > 0 ? sorted[0].deaths : 1;

  const normalize = str => str.trim().toLowerCase().replace(/\s+/g, " ");

  list.innerHTML = "";
  sorted.forEach((b, i) => {
    const rank     = i + 1;
    const isMain   = MAIN_BOSSES.map(normalize).includes(normalize(b.boss));
    const rankClass = rank === 1 ? "top-rank-1" : rank === 2 ? "top-rank-2" : rank === 3 ? "top-rank-3" : "";
    const barPct   = Math.round((b.deaths / maxDeaths) * 100);

    const li = document.createElement("li");
    li.innerHTML = `
      <span class="top-rank ${rankClass}">#${rank}</span>
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:center;">
          <span class="top-deaths-count">† ${b.deaths}</span>
          <span class="top-boss-name${isMain ? " is-main" : ""}${b.done ? " is-done" : ""}">${b.boss}</span>
        </div>
        <div class="top-deaths-bar-wrap">
          <div class="top-deaths-bar" style="width:${barPct}%"></div>
        </div>
      </div>
    `;
    list.appendChild(li);
  });

  container.style.display = "flex";
}

/* ================= DATA LOAD ================= */

async function loadData() {
  const pinnedArea   = document.getElementById("pinned-area");
  const content      = document.getElementById("content");
  const wrapper      = document.querySelector(".wrapper");
  const topContainer = document.getElementById("top-deaths-container");

  const progress     = await fetchProgress();
  const bossesData   = window.BOSS_DATA      || [];
  const prog         = progress.bosses       || {};
  const ui           = progress.ui           || {};
  const fieldD       = progress.fieldDeaths  || { base: 0, dlc: 0 };
  const timer        = progress.timer        || {};
  const bossTimer    = progress.bossTimer    || {};
  const collapsedMap = progress.collapsed    || {};

  // widget visibility: tracker toolbox settings, URL params win when present
  activeConfig = computeConfig(progress.overlay);
  applyHeaderConfig();

  // filters mirror the tracker UI
  const baseGameFlag = ui.showBase !== false;
  const dlcFlag      = ui.showDLC  !== false;
  const onlyOpen     = !!ui.showOnlyOpen;
  const onlyDone     = !!ui.showOnlyDone;
  const onlyMain     = !!ui.showOnlyMain;
  const simpleView   = SIMPLE_VIEW;

  // timers mirror the tracker
  generalTimerStartTs = Number(timer.startTs) || 0;
  generalTimerElapsed = Number(timer.elapsed) || 0;
  generalTimerVisible = !!timer.visible;
  generalTimerLabel   = (timer.label || "").trim() || "Timer";

  bossTimerStartTs = Number(bossTimer.startTs) || 0;
  bossTimerElapsed = Number(bossTimer.elapsed) || 0;
  bossTimerVisible = !!bossTimer.visible;
  bossTimerLabel   = (bossTimer.label || "").trim() || "Boss";

  const normalize  = str => str.trim().toLowerCase().replace(/\s+/g, " ");
  const isMainBoss = name => MAIN_BOSSES.map(normalize).includes(normalize(name));

  const areas = {};
  let globalTotalBosses = 0;
  let globalDoneBosses  = 0;
  let bossDeaths        = 0;
  const allBossesFlat   = [];

  // Walk the canonical boss list (areas in order) and look up progress per boss.
  bossesData.forEach(areaDef => {
    const area  = areaDef.area;
    const isDLC = !!areaDef.isDLC;
    if (isDLC && !dlcFlag) return;
    if (!isDLC && !baseGameFlag) return;

    (areaDef.bosses || []).forEach(boss => {
      if (onlyMain && !isMainBoss(boss)) return;

      const p      = prog[area + "|" + boss] || {};
      const done   = !!p.done;
      const deaths = Number(p.deaths) || 0;
      const pinned = !!p.pinned;
      const key    = area + "|" + boss;

      // victory animation on a fresh main-boss kill
      if (!(key in previousBossStates)) {
        previousBossStates[key] = done;
      } else if (!previousBossStates[key] && done && isMainBoss(boss)) {
        setTimeout(() => {
          document.querySelectorAll(".boss").forEach(el => {
            if (el.querySelector(".boss-name")?.innerText === boss) triggerVictory(el);
          });
        }, 100);
      }
      previousBossStates[key] = done;

      globalTotalBosses++;
      if (done) globalDoneBosses++;
      bossDeaths += deaths;

      allBossesFlat.push({ boss, done, deaths, pinned });

      if (!areas[area]) {
        areas[area] = { total: 0, done: 0, bosses: [], collapsed: !!collapsedMap[area] };
      }
      areas[area].total++;
      if (done) areas[area].done++;
      areas[area].bosses.push({ boss, done, deaths, pinned });
    });
  });

  // total deaths = boss deaths + field deaths (matches the tracker)
  let fd = 0;
  if (!onlyMain) {
    if (baseGameFlag) fd += Number(fieldD.base) || 0;
    if (dlcFlag)      fd += Number(fieldD.dlc)  || 0;
  }
  const globalDeaths = bossDeaths + fd;

  // ================================
  // HEADER
  // ================================
  const deathEl = document.getElementById("total-deaths");
  if (globalDeaths !== lastGlobalDeaths) {
    deathEl.classList.remove("death-animate");
    void deathEl.offsetWidth;
    deathEl.classList.add("death-animate");
  }
  deathEl.innerText = `💀 Tode: ${globalDeaths}`;
  lastGlobalDeaths = globalDeaths;

  const bossEl = document.getElementById("total-boss-progress");
  if (globalDoneBosses !== lastDoneBosses || globalTotalBosses !== lastTotalBosses) {
    bossEl.classList.remove("boss-animate");
    void bossEl.offsetWidth;
    bossEl.classList.add("boss-animate");
  }
  bossEl.innerText = `🏆 Bosse: ${globalDoneBosses} / ${globalTotalBosses}`;
  lastDoneBosses = globalDoneBosses;
  lastTotalBosses = globalTotalBosses;

  // ================================
  // TOP-DEATHS MODE
  // ================================
  if (topDeathsModeActive) {
    content.style.display = "none";
    pinnedArea.style.display = "none";
    wrapper.classList.remove("simple-mode");
    renderTopDeaths(allBossesFlat);
    return;
  }

  // normal mode: hide the top-deaths panel
  topContainer.style.display = "none";

  // ================================
  // SIMPLE VIEW
  // ================================
  if (simpleView) {
    content.style.display = "none";
    wrapper.classList.add("simple-mode");
  } else {
    content.style.display = activeConfig.list ? "block" : "none";
    wrapper.classList.remove("simple-mode");
  }

  // ================================
  // BOSS FILTER
  // ================================
  function bossPassesFilter(b) {
    if (onlyOpen && !onlyDone) return !b.done;
    if (onlyDone && !onlyOpen) return b.done;
    return true;
  }

  // ================================
  // RENDER PINNED BOSSES
  // ================================
  if (!activeConfig.pinned) {
    pinnedArea.innerHTML = "";
    pinnedArea.style.display = "none";
  } else {
    pinnedArea.innerHTML = "";
    let hasPinned = false;

    const allPinned = [];
    Object.values(areas).forEach(areaData => {
      areaData.bosses.forEach(b => {
        if (b.pinned && bossPassesFilter(b)) allPinned.push(b);
      });
    });

    if (allPinned.length > 0) {
      hasPinned = true;
      allPinned.forEach(b => {
        const bossDiv = document.createElement("div");
        const isMain = MAIN_BOSSES.map(normalize).includes(normalize(b.boss));
        bossDiv.className = "boss pinned-boss" + (b.done ? " done" : "") + (isMain ? " main-boss" : "");
        bossDiv.innerHTML = `<span class="deaths">💀 ${b.deaths}</span><span class="boss-name"><span class="ticker-inner">${b.boss}</span></span>`;
        pinnedArea.appendChild(bossDiv);
      });
    }
    pinnedArea.style.display = hasPinned ? "block" : "none";
  }

  // ================================
  // RENDER NORMAL AREAS
  // ================================
  content.innerHTML = "";
  if (!activeConfig.list) return;

  Object.entries(areas).forEach(([area, data]) => {
    const visibleBosses = data.bosses.filter(bossPassesFilter);
    if (visibleBosses.length === 0) return;

    const areaDiv = document.createElement("div");
    areaDiv.className = "area";

    areaDiv.innerHTML = `
      <div class="area-title">${data.collapsed ? "▶" : "▼"} ${area}</div>
      <div class="area-progress">${data.done} / ${data.total}</div>
    `;

    if (!data.collapsed) {
      visibleBosses.forEach(b => {
        const bossDiv = document.createElement("div");
        const isMain = MAIN_BOSSES.includes(b.boss);
        bossDiv.className = "boss" + (b.done ? " done" : "") + (isMain ? " main-boss" : "");
        bossDiv.innerHTML = `<span class="deaths">† ${b.deaths}</span><span class="boss-name">${b.boss}</span>`;
        areaDiv.appendChild(bossDiv);
      });
    }
    content.appendChild(areaDiv);
  });
}

/* ================= TICKER ENGINE ================= */

let tickerState = {};

function runTickers() {
  document.querySelectorAll('.pinned-boss .boss-name').forEach(containerEl => {
    const inner = containerEl.querySelector('.ticker-inner');
    if (!inner) return;

    const key = inner.textContent.trim();

    if (!tickerState[key]) {
      tickerState[key] = { pos: 0, dir: 1, pause: 80 };
    }
    const s = tickerState[key];

    const innerW     = inner.getBoundingClientRect().width;
    const containerW = containerEl.getBoundingClientRect().width;
    const maxScroll  = innerW - containerW;

    if (maxScroll <= 0) {
      inner.style.transform = "translateX(0)";
      return;
    }

    if (s.pause > 0) { s.pause--; return; }

    s.pos += s.dir * 0.5;

    if (s.pos >= maxScroll) {
      s.pos = maxScroll;
      s.dir = -1;
      s.pause = 80;
    } else if (s.pos <= 0) {
      s.pos = 0;
      s.dir = 1;
      s.pause = 80;
    }

    inner.style.transform = `translateX(${-s.pos}px)`;
  });
}

setInterval(runTickers, 16);

/* ================= VICTORY SYSTEM ================= */

function triggerVictory(el) {
  if (!activeConfig.victory) return;
  autoScrollPaused = true;
  const container = document.getElementById("content");
  container.scrollTo({ top: el.offsetTop - container.clientHeight / 2, behavior: "smooth" });

  setTimeout(() => {
    showOverlay();
    spawnParticles();
    el.style.transition = "all .4s ease";
    el.style.transform = "scale(1.15)";
    el.style.boxShadow = "0 0 25px #c9a44a";
    setTimeout(() => {
      el.style.transform = "scale(1)";
      el.style.boxShadow = "none";
      autoScrollPaused = false;
    }, 2500);
  }, VICTORY_DELAY);
}

function showOverlay() {
  const overlay = document.getElementById("victoryOverlay");
  const text    = document.getElementById("victoryText");
  overlay.classList.add("victory-show");
  text.classList.add("victory-text-show");
  setTimeout(() => {
    overlay.classList.remove("victory-show");
    text.classList.remove("victory-text-show");
  }, 3000);
}

function spawnParticles() {
  const wrapper = document.querySelector(".wrapper");
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const angle    = Math.random() * 2 * Math.PI;
    const distance = 120 + Math.random() * 80;
    p.style.left = "50%";
    p.style.top  = "50%";
    p.style.setProperty("--x", Math.cos(angle) * distance + "px");
    p.style.setProperty("--y", Math.sin(angle) * distance + "px");
    wrapper.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}

applyHeaderConfig();
loadData();
setInterval(loadData, 1500);

/* ================= SMOOTH 60FPS SCROLL WITH END PAUSES ================= */

const SCROLL_SPEED   = 0.5;
const PAUSE_DURATION = 2500;

let scrollPos     = 0;
let scrollDir     = 1;
let isPaused      = false;
let pauseUntil    = 0;
let lastTimestamp = null;

function smoothScroll(timestamp) {
  requestAnimationFrame(smoothScroll);

  if (autoScrollPaused || topDeathsModeActive) {
    lastTimestamp = null;
    return;
  }

  if (lastTimestamp === null) {
    lastTimestamp = timestamp;
    return;
  }

  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  if (isPaused) {
    if (timestamp < pauseUntil) return;
    isPaused = false;
  }

  const el = document.getElementById("content");
  if (!el) return;

  const maxScroll = el.scrollHeight - el.clientHeight;
  if (maxScroll <= 0) return;

  scrollPos += scrollDir * SCROLL_SPEED * (delta / (1000 / 60));

  if (scrollPos >= maxScroll) {
    scrollPos  = maxScroll;
    scrollDir  = -1;
    isPaused   = true;
    pauseUntil = timestamp + PAUSE_DURATION;
  }

  if (scrollPos <= 0) {
    scrollPos  = 0;
    scrollDir  = 1;
    isPaused   = true;
    pauseUntil = timestamp + PAUSE_DURATION;
  }

  el.scrollTop = scrollPos;
}

requestAnimationFrame(smoothScroll);

/* ================= RESIZE HANDLE ================= */

const SCALE_KEY = "er_overlay_scale";
const SCALE_MIN = 0.4;
const SCALE_MAX = 2.5;

let currentScale = parseFloat(localStorage.getItem(SCALE_KEY)) || 1.0;

function applyScale() {
  const wrapper = document.querySelector(".wrapper");
  if (!wrapper) return;
  wrapper.style.transform       = `scale(${currentScale})`;
  wrapper.style.transformOrigin = "top left";
}

/* ─── position ─── */
const POS_KEY    = "er_overlay_pos";
let currentPos   = JSON.parse(localStorage.getItem(POS_KEY)) || null;

function applyPosition() {
  const wrapper = document.querySelector(".wrapper");
  if (!wrapper) return;
  if (!currentPos) {
    currentPos = { x: window.innerWidth - wrapper.offsetWidth, y: 0 };
  }
  wrapper.style.left = currentPos.x + "px";
  wrapper.style.top  = currentPos.y + "px";
}

(function initDragMove() {
  const wrapper = document.querySelector(".wrapper");
  const handle  = document.getElementById("resize-handle");

  wrapper.addEventListener("mousedown", e => {
    if (handle.contains(e.target)) return;
    e.preventDefault();
    const startX = e.clientX - currentPos.x;
    const startY = e.clientY - currentPos.y;
    wrapper.classList.add("is-dragging");

    function onMove(e) {
      currentPos = { x: e.clientX - startX, y: e.clientY - startY };
      applyPosition();
    }
    function onUp() {
      wrapper.classList.remove("is-dragging");
      localStorage.setItem(POS_KEY, JSON.stringify(currentPos));
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  });
})();

/* ─── resize ─── */
(function initResizeHandle() {
  const handle = document.getElementById("resize-handle");
  let dragStartX, dragStartY, dragStartScale;

  handle.addEventListener("mousedown", e => {
    e.preventDefault();
    e.stopPropagation();
    dragStartX     = e.clientX;
    dragStartY     = e.clientY;
    dragStartScale = currentScale;
    handle.classList.add("dragging");

    function onMove(e) {
      const dx    = e.clientX - dragStartX;
      const dy    = e.clientY - dragStartY;
      const delta = (dy - dx) / 300;
      currentScale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, dragStartScale + delta));
      applyScale();
    }

    function onUp() {
      handle.classList.remove("dragging");
      localStorage.setItem(SCALE_KEY, currentScale);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  });
})();

applyPosition();
applyScale();
