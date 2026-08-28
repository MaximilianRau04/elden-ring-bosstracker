// ═══════════════════════════════════════════════════════════════════════════
//  RANKING, CHART (Chart.js) and the full area/boss-row RENDER pipeline
//  (processData → renderAreas), plus the custom tooltip. Reads state from
//  js/state.js and hands DOM update work back to js/actions.js.
// ═══════════════════════════════════════════════════════════════════════════

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
      ? I18N.tf("ranking.subtitle", top.length, doneBossCount)
      : I18N.t("ranking.empty");
  }

  var listEl = document.getElementById("ranking-list");
  if (!listEl) return;

  if (top.length === 0) {
    listEl.innerHTML = '<div class="ranking-empty">' + escHtml(I18N.t("ranking.empty")) + '</div>';
    return;
  }

  var medals = ["🥇", "🥈", "🥉"];
  var numLocale = I18N.getLang() === "de" ? "de-DE" : "en-US";

  listEl.innerHTML = top.map(function(b, i) {
    var pct        = maxDeaths > 0 ? (b.deaths / maxDeaths * 100) : 0;
    var isMain     = MAIN_BOSSES.has(b.boss);
    var rankLabel  = i < 3 ? medals[i] : "#" + (i + 1);
    var rankClass  = i === 0 ? "top1" : (i === 1 ? "top2" : (i === 2 ? "top3" : ""));
    var entryClass = i === 0 ? "rank-entry-1" : (i === 1 ? "rank-entry-2" : "");
    var delayStyle = "animation-delay:" + (i * 55) + "ms";
    var bossLabel  = I18N.bossLabel(b.boss);

    return '<div class="ranking-entry ' + entryClass + '" style="' + delayStyle + '">'
      + '<span class="rank-number ' + rankClass + '">' + rankLabel + '</span>'
      + '<div class="rank-bar-wrap">'
      + '<span class="boss-name' + (isMain ? " main" : "") + '" data-tip="' + escHtml(bossLabel) + '">' + escHtml(bossLabel) + '</span>'
      + '<div class="rank-bar-row">'
      + '<div class="rank-bar-bg"><div class="rank-bar-fill" style="width:' + pct + '%"></div></div>'
      + '<span class="rank-deaths">' + b.deaths.toLocaleString(numLocale) + '<span class="unit"> †</span></span>'
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

  var dates = Object.keys(byDate).sort(); // ISO (YYYY-MM-DD) sorts correctly as plain strings

  if (dates.length === 0) {
    document.getElementById("chart-section").style.display = "none";
    return;
  }

  document.getElementById("chart-section").style.display = "block";
  var dayCount  = dates.length;
  var bossCount = allBosses.filter(function(b){ return b.done && b.date; }).length;
  document.getElementById("chart-subtitle").textContent = I18N.tf(
    "chart.subtitle",
    dayCount, I18N.t(dayCount === 1 ? "chart.day" : "chart.days"),
    bossCount, I18N.t(bossCount === 1 ? "chart.bossDone" : "chart.bossesDone")
  );

  var counts   = dates.map(function(d) { return byDate[d].length; });
  var bossList = dates.map(function(d) { return byDate[d]; });
  var labels   = dates.map(formatDate);

  var ctx = document.getElementById("boss-chart").getContext("2d");
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: I18N.t("chart.legendLabel"),
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
              var noun = I18N.t(list.length > 1 ? "chart.tooltipBosses" : "chart.tooltipBoss");
              return ["† " + list.length + " " + noun + ":"]
                .concat(list.map(function(n){ return "  · " + I18N.bossLabel(n); }));
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
  document.getElementById("val-deaths").textContent = globalDeaths.toLocaleString(I18N.getLang() === "de" ? "de-DE" : "en-US");
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
        + '<span class="pinned-name' + (isMain ? " main-boss" : "") + '">' + escHtml(I18N.bossLabel(b.boss)) + '</span>'
        + '<span class="boss-edit-hint" data-tip="' + escHtml(I18N.t("editHint")) + '" data-tip-always="1">✏</span>';
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

    var areaDisplay = I18N.areaLabel(areaName);
    card.innerHTML = '<div class="area-header" onclick="toggleArea(\'' + escAttr(areaName) + '\')">'
      + '<div class="area-header-left">'
      + '<span class="area-toggle-icon">▼</span>'
      + '<span class="area-name" data-tip="' + escHtml(areaDisplay) + '">' + escHtml(areaDisplay) + dlcLabel + '</span>'
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
  var bossDisplay = I18N.bossLabel(b.boss);

  return '<div class="boss-row' + (b.done ? " done" : "") + ' editable"'
    + ' data-boss="' + escHtml(b.boss) + '"'
    + ' data-area="' + escHtml(areaName) + '"'
    + ' onclick="openBossMenu(event,\'' + escAttr(areaName) + '\',\'' + escAttr(b.boss) + '\')">'
    + '<span class="boss-deaths' + deathClass + '">' + (b.deaths > 0 ? "†" + b.deaths : "†-") + '</span>'
    + '<span class="boss-name' + (isMain ? " main" : "") + '" data-tip="' + escHtml(bossDisplay) + '">' + escHtml(bossDisplay) + '</span>'
    + '<span class="boss-check">✓</span>'
    + '<span class="boss-edit-hint" data-tip="' + escHtml(I18N.t("editHint")) + '" data-tip-always="1">✏</span>'
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
