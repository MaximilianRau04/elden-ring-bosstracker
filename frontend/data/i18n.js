// ═══════════════════════════════════════════════════════════════════════════
//  I18N — UI language toggle (German / English)
//  Boss names: canonical is English (bosses.js), German comes from
//  window.BOSS_ALIASES. Area names: canonical is German (bosses.js), English
//  comes from AREA_EN below. Only the DISPLAYED text changes with the
//  language — localStorage progress keys ("Area|Boss") always use the
//  canonical (German area / English boss) strings, never the display label.
//  Shared by the tracker (js/*.js) and the overlay (overlay.js).
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  var LANG_KEY = "er_bosstracker_lang";

  var AREA_EN = {
    "Halbinsel der Tränen": "Weeping Peninsula",
    "Liurnia": "Liurnia of the Lakes",
    "Berg Gelmir": "Mt. Gelmir",
    "Leyndell, Royale Hauptstadt": "Leyndell, Royal Capital",
    "Berggipfel der Riesen": "Mountaintops of the Giants",
    "Siofra": "Siofra River",
    "Ainsel": "Ainsel River",
    "Zerfallendes Farum Azula": "Crumbling Farum Azula",
    "Verbotene Lande": "Forbidden Lands",
    "Nokron, Ewige Stadt": "Nokron, Eternal City",
    "Tiefenwurzel-Tiefen": "Deeproot Depths",
    "Fäulnissee": "Lake of Rot",
    "Geweihtes Schneefeld": "Consecrated Snowfield",
    "Haligbaum": "Haligtree",
    "Leyndell, Aschene Hauptstadt": "Leyndell, Ashen Capital",
    "Eldenthron": "Elden Throne"
    // Areas not listed here (Limgrave, Caelid, Altus Plateau, and every DLC
    // area) are already the same string in both languages.
  };

  var STRINGS = {
    de: {
      "subtitle": "Boss Tracker &amp; Fortschrittsübersicht",
      "toolbox.timer": "Timer",
      "toolbox.filter": "Filter",
      "toolbox.overlay": "Overlay",
      "timer.title": "Timer",
      "timer.general": "Allgemein",
      "timer.labelPlaceholder": "Label…",
      "timer.start": "Start",
      "timer.pause": "Pause",
      "timer.reset": "Reset",
      "timer.show": "Einblenden",
      "timer.hide": "Ausblenden",
      "timer.setTip": "Timer auf diese Zeit setzen",
      "timer.boss": "Boss",
      "timer.bossLabelPlaceholder": "Bossname…",
      "timer.bossSetTip": "Boss-Timer auf diese Zeit setzen",
      "timer.defaultLabel": "Timer:",
      "timer.bossDefaultLabel": "Boss:",
      "filter.title": "Filter",
      "filter.openOnly": "Nur Offen",
      "filter.doneOnly": "Nur Erledigt",
      "filter.baseGame": "Base Game",
      "filter.dlc": "DLC",
      "overlayPanel.title": "Overlay",
      "overlayPanel.deaths": "Tode",
      "overlayPanel.progress": "Fortschritt",
      "overlayPanel.pinned": "Angepinnte",
      "overlayPanel.list": "Bossliste",
      "overlayPanel.victory": "Sieg-Animation",
      "stats.deaths": "Tode:",
      "stats.bossesTip": "Besiegte Bosse nach Level sortiert anzeigen",
      "stats.bosses": "Bosse:",
      "stats.completion": "Abschluss:",
      "stats.avgDeaths": "Ø Tode/Boss:",
      "fieldDeaths.label": "Sonstige Tode:",
      "fieldDeaths.base": "⚔ Base Game",
      "fieldDeaths.dlc": "🌑 DLC",
      "activeBoss.label": "🎯 Aktiver Boss:",
      "activeBoss.hint": "erkannte Tode werden hier gezählt",
      "activeBoss.clearTip": "Aktiven Boss aufheben (Tode zählen dann als Feldtod)",
      "controls.show": "Anzeige:",
      "controls.baseGame": "Base Game",
      "controls.dlc": "Shadow of the Erdtree DLC",
      "controls.mainBosses": "Main Bosse",
      "controls.expandAll": "Alle aufklappen",
      "controls.collapseAll": "Alle zuklappen",
      "controls.done": "✓ Erledigt",
      "controls.open": "○ Offen",
      "ranking.title": "☠ Tode-Ranking",
      "ranking.subtitleDefault": "- die härtesten Begegnungen",
      "ranking.subtitle": "- Top {0} von {1} erledigten Bossen",
      "ranking.empty": "Noch keine Tode erfasst.",
      "search.placeholder": "Boss suchen… z.B. Malenia, Margit, Mohg",
      "search.clearTip": "Suche leeren",
      "search.shortcutTip": "Tastenkürzel: Strg+F = Suche, Esc = Schließen, +/− = Tode (im Boss-Menü)",
      "search.results": "{0} Treffer",
      "pinned.title": "📌 Angepinnte Bosse",
      "loading": "Lade Daten aus den Archiven…",
      "chart.title": "📅 Bosse pro Tag",
      "chart.subtitleDefault": "- Fortschritt im Zeitverlauf",
      "chart.subtitle": "- {0} {1}, {2} {3}",
      "chart.day": "Tag",
      "chart.days": "Tage",
      "chart.bossDone": "Boss erledigt",
      "chart.bossesDone": "Bosse erledigt",
      "chart.legendLabel": "Bosse besiegt",
      "chart.tooltipBoss": "Boss",
      "chart.tooltipBosses": "Bosse",
      "footer": "Elden Ring Boss Tracker &bull; lokal &amp; offline - Fortschritt im Browser gespeichert",
      "menu.deaths": "Tode",
      "menu.deathMinusTip": "−1 Tod",
      "menu.deathPlusTip": "+1 Tod",
      "menu.actions": "Aktionen",
      "menu.markDone": "Als besiegt markieren",
      "menu.markOpen": "Als nicht besiegt markieren",
      "menu.pin": "Anpinnen",
      "menu.unpin": "Anpinnung entfernen",
      "menu.setActive": "Als aktiven Boss setzen",
      "menu.clearActive": "Ist aktiver Boss (aufheben)",
      "bossLevel.closeTip": "Schließen",
      "bossLevel.ariaLabel": "Besiegte Bosse nach Level",
      "bossLevel.title": "Besiegte Bosse in Reihenfolge",
      "bossLevel.subtitleLoading": "wird geladen…",
      "bossLevel.subtitle": "{0} Bosse mit Level besiegt",
      "bossLevel.empty": "Noch keine Bosse mit Level-Eintrag besiegt.",
      "bossLevel.level": "Level",
      "bossLevel.boss": "Boss",
      "bossLevel.deaths": "Tode",
      "bossLevel.lvlBadge": "Lvl",
      "bossLevel.scaduLvlBadge": "Scadu-Lvl.",
      "editHint": "Bearbeiten",
      "toast.timerSet": "⏱ Timer gesetzt: {0}",
      "toast.bossTimerSet": "⏱ Boss-Timer gesetzt: {0}",
      "toast.activeCleared": "🎯 Aktiver Boss aufgehoben",
      "toast.activeSet": "🎯 Aktiver Boss: {0}",
      "toast.bossDefeated": "✔ {0} besiegt!",
      "toast.activeClearedFieldDeath": "🎯 Aktiver Boss aufgehoben - Tode zählen als Feldtod",
      "toast.deathPlus1": "💀 Tod +1: {0}",
      "toast.fieldDeathPlus1": "💀 Feldtod +1 ({0})",
      "toast.bossKilled": "⚔️ Boss besiegt: {0}",
      "confirm.resetAll": "Wirklich allen Fortschritt löschen?",
      "overlay.deaths": "💀 Tode: {0}",
      "overlay.bosses": "🏆 Bosse: {0} / {1}",
      "overlay.topTitle": "💀 TOP 10 - MEISTE TODE",
      "overlay.victoryText": "BOSS ERLEDIGT",
      "overlay.timerLabel": "Timer",
      "overlay.bossLabel": "Boss"
    },
    en: {
      "subtitle": "Boss Tracker &amp; Progress Overview",
      "toolbox.timer": "Timer",
      "toolbox.filter": "Filter",
      "toolbox.overlay": "Overlay",
      "timer.title": "Timer",
      "timer.general": "General",
      "timer.labelPlaceholder": "Label…",
      "timer.start": "Start",
      "timer.pause": "Pause",
      "timer.reset": "Reset",
      "timer.show": "Show",
      "timer.hide": "Hide",
      "timer.setTip": "Set timer to this time",
      "timer.boss": "Boss",
      "timer.bossLabelPlaceholder": "Boss name…",
      "timer.bossSetTip": "Set boss timer to this time",
      "timer.defaultLabel": "Timer:",
      "timer.bossDefaultLabel": "Boss:",
      "filter.title": "Filter",
      "filter.openOnly": "Open Only",
      "filter.doneOnly": "Done Only",
      "filter.baseGame": "Base Game",
      "filter.dlc": "DLC",
      "overlayPanel.title": "Overlay",
      "overlayPanel.deaths": "Deaths",
      "overlayPanel.progress": "Progress",
      "overlayPanel.pinned": "Pinned",
      "overlayPanel.list": "Boss List",
      "overlayPanel.victory": "Victory Animation",
      "stats.deaths": "Deaths:",
      "stats.bossesTip": "Show defeated bosses sorted by level",
      "stats.bosses": "Bosses:",
      "stats.completion": "Completion:",
      "stats.avgDeaths": "Avg deaths/boss:",
      "fieldDeaths.label": "Other Deaths:",
      "fieldDeaths.base": "⚔ Base Game",
      "fieldDeaths.dlc": "🌑 DLC",
      "activeBoss.label": "🎯 Active Boss:",
      "activeBoss.hint": "detected deaths are counted here",
      "activeBoss.clearTip": "Clear active boss (deaths will then count as field deaths)",
      "controls.show": "Show:",
      "controls.baseGame": "Base Game",
      "controls.dlc": "Shadow of the Erdtree DLC",
      "controls.mainBosses": "Main Bosses",
      "controls.expandAll": "Expand All",
      "controls.collapseAll": "Collapse All",
      "controls.done": "✓ Done",
      "controls.open": "○ Open",
      "ranking.title": "☠ Death Ranking",
      "ranking.subtitleDefault": "- the toughest encounters",
      "ranking.subtitle": "- Top {0} of {1} defeated bosses",
      "ranking.empty": "No deaths recorded yet.",
      "search.placeholder": "Search boss… e.g. Malenia, Margit, Mohg",
      "search.clearTip": "Clear search",
      "search.shortcutTip": "Shortcuts: Ctrl+F = search, Esc = close, +/− = deaths (in boss menu)",
      "search.results": "{0} results",
      "pinned.title": "📌 Pinned Bosses",
      "loading": "Loading data from the archives…",
      "chart.title": "📅 Bosses per Day",
      "chart.subtitleDefault": "- progress over time",
      "chart.subtitle": "- {0} {1}, {2} {3}",
      "chart.day": "day",
      "chart.days": "days",
      "chart.bossDone": "boss defeated",
      "chart.bossesDone": "bosses defeated",
      "chart.legendLabel": "Bosses defeated",
      "chart.tooltipBoss": "boss",
      "chart.tooltipBosses": "bosses",
      "footer": "Elden Ring Boss Tracker &bull; local &amp; offline - progress saved in your browser",
      "menu.deaths": "Deaths",
      "menu.deathMinusTip": "−1 Death",
      "menu.deathPlusTip": "+1 Death",
      "menu.actions": "Actions",
      "menu.markDone": "Mark as defeated",
      "menu.markOpen": "Mark as not defeated",
      "menu.pin": "Pin",
      "menu.unpin": "Remove pin",
      "menu.setActive": "Set as active boss",
      "menu.clearActive": "Is active boss (clear)",
      "bossLevel.closeTip": "Close",
      "bossLevel.ariaLabel": "Defeated bosses by level",
      "bossLevel.title": "Defeated Bosses in Order",
      "bossLevel.subtitleLoading": "loading…",
      "bossLevel.subtitle": "{0} bosses with a level defeated",
      "bossLevel.empty": "No bosses with a level entry defeated yet.",
      "bossLevel.level": "Level",
      "bossLevel.boss": "Boss",
      "bossLevel.deaths": "Deaths",
      "bossLevel.lvlBadge": "Lvl",
      "bossLevel.scaduLvlBadge": "Scadu Lvl.",
      "editHint": "Edit",
      "toast.timerSet": "⏱ Timer set: {0}",
      "toast.bossTimerSet": "⏱ Boss timer set: {0}",
      "toast.activeCleared": "🎯 Active boss cleared",
      "toast.activeSet": "🎯 Active boss: {0}",
      "toast.bossDefeated": "✔ {0} defeated!",
      "toast.activeClearedFieldDeath": "🎯 Active boss cleared - deaths count as field deaths",
      "toast.deathPlus1": "💀 Death +1: {0}",
      "toast.fieldDeathPlus1": "💀 Field death +1 ({0})",
      "toast.bossKilled": "⚔️ Boss defeated: {0}",
      "confirm.resetAll": "Really delete all progress?",
      "overlay.deaths": "💀 Deaths: {0}",
      "overlay.bosses": "🏆 Bosses: {0} / {1}",
      "overlay.topTitle": "💀 TOP 10 - MOST DEATHS",
      "overlay.victoryText": "BOSS DEFEATED",
      "overlay.timerLabel": "Timer",
      "overlay.bossLabel": "Boss"
    }
  };

  function getLang() {
    try {
      var v = localStorage.getItem(LANG_KEY);
      if (v === "de" || v === "en") return v;
    } catch (e) {}
    return "de";
  }

  function setLang(lang) {
    if (lang !== "de" && lang !== "en") return;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  }

  // t("key") → translated string. tf("key", a, b, …) → same, with {0},{1},…
  // placeholders replaced by the given arguments.
  function t(key) {
    var lang = getLang();
    var dict = STRINGS[lang] || STRINGS.de;
    return (key in dict) ? dict[key] : (STRINGS.de[key] || key);
  }

  function tf(key) {
    var args = Array.prototype.slice.call(arguments, 1);
    return t(key).replace(/\{(\d+)\}/g, function (m, i) {
      return args[i] !== undefined ? args[i] : m;
    });
  }

  // Canonical boss name (English, from bosses.js) → the name to display.
  function bossLabel(canonical) {
    if (!canonical) return canonical;
    if (getLang() === "de") {
      var aliases = (window.BOSS_ALIASES || {})[canonical];
      if (aliases && aliases.length) return aliases[0];
    }
    return canonical;
  }

  // Canonical area name (German, from bosses.js) → the name to display.
  function areaLabel(canonical) {
    if (!canonical) return canonical;
    if (getLang() === "en") {
      return AREA_EN[canonical] || canonical;
    }
    return canonical;
  }

  // Walk every element with a data-i18n / data-i18n-tip / data-i18n-ph
  // attribute and apply the current-language string. Static markup only —
  // dynamically generated content (boss rows, toasts, …) is translated at
  // the point it's rendered via t()/tf()/bossLabel()/areaLabel().
  function applyStaticI18n(root) {
    (root || document).querySelectorAll("[data-i18n]").forEach(function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n"));
    });
    (root || document).querySelectorAll("[data-i18n-tip]").forEach(function (el) {
      el.setAttribute("data-tip", t(el.getAttribute("data-i18n-tip")));
    });
    (root || document).querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
    });
    (root || document).querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
    document.documentElement.lang = getLang();
  }

  window.I18N = {
    getLang: getLang,
    setLang: setLang,
    t: t,
    tf: tf,
    bossLabel: bossLabel,
    areaLabel: areaLabel,
    applyStaticI18n: applyStaticI18n
  };
})();
