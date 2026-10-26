// Global variable containing current data red from out/program_state.json
var data = {};
document.addEventListener("DOMContentLoaded", function () {
  if (document.body) document.body.style.opacity = "1";
  fitTshStage();
});
window.addEventListener("resize", fitTshStage);

function fitTshStage() {
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  const root = document.documentElement;
  root.style.overflow = "hidden";
  root.style.width = "1920px";
  root.style.height = "1080px";
  root.style.transformOrigin = "top left";
  root.style.transform = scale > 0 && Math.abs(scale - 1) > 0.01 ? "scale(" + scale + ")" : "";
}
function tshAsset(asset) {
  if (!asset) return "";
  if (/^(https?:|data:|\/)/.test(asset)) return asset;
  return "../../" + asset;
}


// Global variable containing previous data red from out/program_state.json
// Used for comparing what changed since last update
var oldData = {};
var tshFitting = false;

// Global variable that tracks the max delta index that has been applied.
// Used as a failsafe to prevent stale state-changes from being processed.
var maxAppliedDeltaIdx = -1;

// Global variable containing settings red from settings.json
// The settings under /layout/settings.json (global) are merged with /layout/<directory>/settings.json (local),
// where the local settings have priority over global ones
var tsh_settings = {};

// This is called once after initialization. Layouts should reimplement this function.
var Start = async () => {
  console.log("Start(): Implement me");
};

// This is called each time data changes. Layouts should reimplement this function.
var Update = async (event) => {
  console.log("Update(): Implement me");
};

var tshPainted = false;
var paintedUpdate = null;

// Wrapper for the update call
async function UpdateWrapper(event) {
  const painting = Update;
  try {
    await Update(event);
    paintedUpdate = painting;
  } catch (e) {
    console.log(e);
  }
  tshPainted = true;

  // If initialization wasn't done yet, call Start()
  // We use gsap.globalTimeline.timeScale as 0 for animation to not play before this
  if (gsap.globalTimeline.timeScale() == 0) {
    gsap.globalTimeline.timeScale(1);
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      Start();
    };
    window.requestAnimationFrame(() => {
      const timer = setTimeout(reveal, 1200);
      try {
        $(document).waitForImages(() => {
          clearTimeout(timer);
          reveal();
        });
      } catch (e) {
        clearTimeout(timer);
        reveal();
      }
    });
  }
}

function applyTournamentLogo(program) {
  var icon = program && program.tournamentInfo && program.tournamentInfo.logo;
  if (!icon) return;
  var image = 'url("' + String(icon).replace(/"/g, "%22") + '")';
  var nodes = document.querySelectorAll(".logo, img.tournament_logo");
  for (var i = 0; i < nodes.length; i += 1) {
    var el = nodes[i];
    if (el.tagName === "IMG") el.src = icon;
    else el.style.backgroundImage = image;
  }
}

// Gets current program state,
// Dispatch "tsh_update" event if data has changed
// This function is called in a high frequency
async function UpdateData() {
  try {
    oldData = data;
    data = await getData();
    applyTournamentLogo(data);

    if (tshPainted && paintedUpdate === Update && data.timestamp === oldData.timestamp) {
      return;
    }

    let event = new CustomEvent("tsh_update");
    event.data = data;
    event.oldData = oldData;

    console.log(data);
    document.dispatchEvent(event);
  } catch (e) {
    console.log(e);
  }
}

// Gets current program state using SocketIO,
// Dispatch "tsh_update" event if data has changed
// This function is called in a high frequency.
// Similar to UpdateData() except for SocketIO support
// which requires being on HTTP/HTTPS
async function UpdateData_SocketIO() {
  try {
    // Connect to Socket.io. Valid: websocket, webtransport, polling
    // Python threading with Qt is weird so put in polling method if
    // really absolutely necessary.
    const socket = io(
      window.location.protocol + "//" + window.location.host + "/",
      {
        transports: ["websocket", "webtransport"],
        timeout: 500,
        reconnectionDelay: 500,
        reconnectionDelayMax: 1500,
      },
    );

    socket.on("connect", () => {
      console.log("socket.io connected");
    });

    socket.on("disconnect", () => {
      // call program_state.json initially in case it's a
      // websocket issue and not with web server being gone
      // e.g. TSH being closed
      console.log("socket.io disconnected");
      UpdateData();
    });

    socket.io.on("reconnect", () => {
      console.log("socket.io reconnected");
    });

    socket.io.on("reconnect_attempt", (attempt_number) => {
      // every 1-2 seconds, it will attempt to reconnect to
      // the websocket. before that happens, call UpdateData
      // in case it's an issue with the websocket and not
      // with the web server being gone
      UpdateData();
    });

    socket.io.on("reconnect_failed", () => {
      // reconnect_failed, if max retries are reached,
      // will fall back to file loading program_state.json
      setInterval(async () => {
        await UpdateData();
      }, 64);
    });

    socket.on("error", (err) => {
      console.log(err);
    });

    socket.on("program_state", (message) => {
      oldData = data;
      data = message["state"];

      // Fine to reset the max applied index here, since we know that we've
      // received a complete valid state for a point in time.
      maxAppliedDeltaIdx = message["delta_index"];

      let event = new CustomEvent("tsh_update");
      event.data = data;
      event.oldData = oldData;

      console.log(data);
      document.dispatchEvent(event);
    });

    socket.on("program_state_update", (message) => {
      try {
        console.log("Handling state delta: ", message);
        HandleTSHStateUpdateMessage(message);
      } catch (e) {
        // We failed to handle the program state, so request a new update.
        socket.emit("program_state", {});
      }
    });
  } catch (e) {
    console.log(e);
  }
}

// Load libraries sequentially (to respect dependencies)
// Then call InitAll
async function LoadEverything() {
  let libPath = "../include/";
  let scripts = [
    "jquery-3.7.1.min.js",
    "gsap.min.js",
    "he.js",
    "lodash.min.js",
    "kuroshiro.min.js",
    "kuroshiro-analyzer-kuromoji.min.js",
    "jquery.waitforimages.min.js",
    "color-thief.min.js",
    "assetUtils.js",
    "socket.io.min.js",
  ];

  scripts = scripts.filter((name) => !/kuroshiro|socket\.io/.test(name));
  const urlParams = new URLSearchParams(window.location.search);
  window.scoreboardNumber = 1;

  /*
    Read URL params (<url>?var=val&var2=val2...)
    Options:
      scoreboardNumber
  */
  for (let [k, v] of urlParams.entries()) {
    window[k] = v;
  }

  for (let i = 0; i < scripts.length; i += 1) {
    const script = scripts[i];
    const src = libPath + script;
    try {
      await new Promise((resolve, reject) => {
        const scriptElement = document.createElement("script");
        scriptElement.src = src;
        scriptElement.onload = resolve;
        scriptElement.onerror = reject;
        document.head.appendChild(scriptElement);
      });
      console.log(`Loaded script: ${src}`);
    } catch (error) {
      console.error(`Error loading script: ${src}`, error);
      throw error;
    }
  }

  console.log("== Loading complete ==");

  await InitAll();
}

// Initialize libraries
async function InitAll() {
  await LoadSettings();

  if (tsh_settings.automatic_theme) {
    GetLogoColors();
  }

  document.addEventListener("tsh_update", UpdateWrapper);
  if (window.gsap) gsap.globalTimeline.timeScale(0);

  setInterval(async () => {
    await UpdateData();
  }, 500);
  await UpdateData();
  // The layout assigns Update only after LoadEverything finishes.
  // The first paint hits the empty placeholder, so paint again once the real one exists.
  const unboundUpdate = Update;
  let attempts = 0;
  const waitForLayout = setInterval(() => {
    attempts += 1;
    if (Update === unboundUpdate && attempts < 40) return;
    clearInterval(waitForLayout);
    tshPainted = false;
    paintedUpdate = null;
    oldData = {};
    UpdateData().then(() => Start());
  }, 25);

  try {
    await LoadKuroshiro();
  } catch (e) {
    console.log(e);
  }

  // await UpdateData();

  $(document).ready(() => {
    console.log("== Init complete ==");
    document.dispatchEvent(new CustomEvent("tsh_init"));

    // Set up listener to regrab data and rerun intro animations on OBS scene switch
    initOnBrowserActive(
      () => {
        // hide function - nothing right now
        console.log("Hidden");
      },
      () => {
        UpdateData().then(() => {
          Start();
        });
      },
    );
  });
}

function deskProgram() {
  try {
    var raw = localStorage.getItem("rok-fgc");
    if (!raw) return null;
    var fgc = JSON.parse(raw);
    var sets = fgc.sets || [];
    var set = null;
    for (var i = 0; i < sets.length; i += 1) {
      if (sets[i] && sets[i].id === fgc.streamSetId) set = sets[i];
    }
    if (!set) set = sets[0] || {};
    function characterOf(player) {
      if (!player || !player.character) return {};
      var libraries = fgc.libraries || [];
      var gameName = (fgc.event && fgc.event.game) || "";
      var library = null;
      for (var i = 0; i < libraries.length; i += 1) {
        if (libraries[i] && libraries[i].game === gameName) library = libraries[i];
      }
      if (!library && libraries.length) library = libraries[0];
      var names = [player.character, player.character2].filter(Boolean);
      var skins = [player.skin || 0, player.skin2 || 0];
      var out = {};
      for (var n = 0; n < names.length; n += 1) {
        var known = null;
        var chars = (library && library.characters) || [];
        for (var c = 0; c < chars.length; c += 1) {
          if (chars[c] && chars[c].name && chars[c].name.toLowerCase() === String(names[n]).toLowerCase()) known = chars[c];
        }
        var code = (known && known.code) || String(names[n]).toLowerCase().replace(/[^a-z0-9]+/g, "");
        var game = (library && library.code) || "";
        var root = fgc.assetBase ? String(fgc.assetBase).replace(/\/$/, "") : "https://cdn.jsdelivr.net/gh/joaorb64/StreamHelperAssets@main";
        var asset = game ? root + "/games/" + game + "/website/" + code + "_" + (skins[n] || 0) + ".png" : "";
        out[String(n + 1)] = {
          name: names[n],
          codename: code,
          assets: asset ? { "base_files/icon": { asset: asset, average_size: { x: 512, y: 512 } } } : {},
        };
      }
      return out;
    }
    function person(player) {
      player = player || {};
      var name = [player.prefix, player.tag].filter(Boolean).join(" | ") || player.realName || "";
      return {
        name: name,
        team: player.prefix || "",
        twitter: player.twitter || "",
        pronoun: player.pronouns || "",
        real_name: player.realName || "",
        seed: player.seed || "",
        sponsor_logo: "",
        avatar: "",
        online_avatar: "",
        country: { asset: "", code: player.country || "" },
        state: { asset: "", code: player.region || "" },
        character: characterOf(player),
      };
    }
    function side(which) {
      var player = which === "1" ? set.p1 : set.p2;
      var partner = which === "1" ? set.p1b : set.p2b;
      var players = { "1": person(player) };
      if (partner && partner.tag) players["2"] = person(partner);
      return {
        score: which === "1" ? set.score1 || 0 : set.score2 || 0,
        losers: which === "1" ? !!set.losers1 : !!set.losers2,
        name: which === "1" ? set.teamName1 || "" : set.teamName2 || "",
        player: players,
      };
    }
    function roundKey(item) {
      if (item.roundNum) return item.roundNum;
      var text = String(item.round || "").toLowerCase();
      var losers = text.indexOf("loser") >= 0;
      var sign = losers ? -1 : 1;
      if (text.indexOf("reset") >= 0) return 100;
      if (text.indexOf("grand") >= 0) return sign * 90;
      if (text.indexOf("semi") >= 0) return sign * 80;
      if (text.indexOf("quarter") >= 0) return sign * 70;
      var match = text.match(/round\s+(\d+)/);
      if (match) return sign * Number(match[1]);
      return losers ? -1 : 1;
    }
    var roster = fgc.roster || { count: 8, slots: [], showScores: false, playersPerSlot: 1 };
    var listSlots = {};
    var listCount = Math.max(1, roster.count || 8);
    for (var s = 1; s <= listCount; s += 1) {
      var entry = (roster.slots || [])[s - 1] || { players: [] };
      var slotPlayers = { "1": person(entry.players && entry.players[0]) };
      if ((roster.playersPerSlot || 1) > 1 && entry.players && entry.players[1] && entry.players[1].tag) slotPlayers["2"] = person(entry.players[1]);
      listSlots[String(s)] = { name: entry.teamName || "", score: roster.showScores ? entry.score || 0 : "", player: slotPlayers };
    }
    var view = fgc.bracketView || {};
    var bracketSets = (fgc.sets || []).filter(function (item) { return (item.p1 && item.p1.tag) || (item.p2 && item.p2.tag); });
    if (view.phase) bracketSets = bracketSets.filter(function (item) { return item.phase === view.phase; });
    if (view.group) bracketSets = bracketSets.filter(function (item) { return item.group === view.group; });
    if (view.winnersOnly) bracketSets = bracketSets.filter(function (item) { return roundKey(item) > 0; });
    if (view.losersOnly) bracketSets = bracketSets.filter(function (item) { return roundKey(item) < 0; });
    var grouped = {};
    bracketSets.forEach(function (item) {
      var key = String(roundKey(item));
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    function rank(id) {
      var text = String(id || "").trim();
      var numeric = Number(text);
      if (text && !isNaN(numeric)) return numeric;
      var value = 0;
      var upper = text.toUpperCase();
      for (var i = 0; i < upper.length; i += 1) {
        var code = upper.charCodeAt(i);
        if (code < 65 || code > 90) continue;
        value = value * 26 + (code - 64);
      }
      return value || 9999;
    }
    function sortSets(list) {
      return list.slice().sort(function (a, b) {
        return rank(a.identifier) - rank(b.identifier);
      });
    }
    function linkIndex(index, fromCount, toCount) {
      if (!toCount) return 0;
      if (toCount * 2 === fromCount) return Math.floor(index / 2);
      if (toCount === fromCount) return index;
      return Math.min(toCount - 1, Math.floor((index * toCount) / fromCount));
    }
    var roundKeys = Object.keys(grouped).map(Number);
    if (view.top > 0) {
      var winners = roundKeys.filter(function (key) { return key > 0; }).sort(function (a, b) { return a - b; });
      var keepFrom = null;
      for (var w = 0; w < winners.length; w += 1) {
        if (grouped[String(winners[w])].length <= view.top / 2) { keepFrom = winners[w]; break; }
      }
      if (keepFrom != null) {
        var kept = roundKeys.filter(function (key) { return key < 0 ? Math.abs(key) >= Math.max(1, keepFrom - 1) : key >= keepFrom; });
        if (kept.length) roundKeys = kept;
      }
    }
    var winnerKeys = roundKeys.filter(function (key) { return key > 0; }).sort(function (a, b) { return a - b; });
    var loserKeys = roundKeys.filter(function (key) { return key < 0; }).sort(function (a, b) { return b - a; });
    var ordered = winnerKeys.concat(loserKeys);
    var bracketPlayers = {};
    var bracketIds = {};
    var nextPid = 1;
    function pid(player) {
      if (!player || !player.tag) return -1;
      var id = player.id || player.tag;
      if (bracketIds[id]) return bracketIds[id];
      bracketIds[id] = nextPid;
      bracketPlayers[String(nextPid)] = { name: "", score: 0, player: { "1": person(player) } };
      nextPid += 1;
      return bracketIds[id];
    }
    var rounds = {};
    ordered.forEach(function (key) {
      var list = sortSets(grouped[String(key)] || []);
      var pool = key > 0 ? winnerKeys : loserKeys;
      var at = pool.indexOf(key);
      var nextRound = at >= 0 && at < pool.length - 1 ? pool[at + 1] : null;
      var nextList = nextRound == null ? [] : sortSets(grouped[String(nextRound)] || []);
      var setsBody = {};
      list.forEach(function (item, index) {
        setsBody[String(index)] = {
          playerId: [pid(item.p1), pid(item.p2)],
          score: [item.score1 || 0, item.score2 || 0],
          completed: item.state === "done",
          nextWin: nextRound == null ? null : [nextRound, linkIndex(index, list.length, nextList.length)],
        };
      });
      rounds[String(key)] = { name: (list[0] && list[0].round) || ("Round " + key), sets: setsBody };
    });
    var event = fgc.event || {};
    var library = null;
    var libraries = fgc.libraries || [];
    for (var g = 0; g < libraries.length; g += 1) {
      if (libraries[g] && libraries[g].game === event.game) library = libraries[g];
    }
    if (!library && libraries.length) library = libraries[0];
    var body = {
      tournamentInfo: { tournamentName: event.tournamentName || "", eventName: event.name || "", logo: event.icon || "" },
      game: { name: event.game || "", codename: (library && library.code) || "" },
      score: {
        "1": {
          team: { "1": side("1"), "2": side("2") },
          match: set.round || "",
          phase: set.phase || "",
          best_of: set.bestOf || 0,
          best_of_text: set.bestOf ? "Best of " + set.bestOf : "",
          stage: set.stage || "",
          score_left: set.score1 || 0,
          score_right: set.score2 || 0,
        },
      },
      commentary: {},
      player_list: { slot: listSlots },
      bracket: {
        phase: view.phase || "",
        phaseGroup: view.group || "",
        players: { slot: bracketPlayers },
        bracket: {
          rounds: rounds,
          progressionsIn: view.progressionsIn || 0,
          progressionsOut: view.progressionsOut || 0,
          winnersOnlyProgressions: !!view.winnersOnly,
        },
      },
    };
    var stamp = 2166136261;
    var key = JSON.stringify(body);
    for (var n = 0; n < key.length; n += 1) {
      stamp ^= key.charCodeAt(n);
      stamp = Math.imul(stamp, 16777619);
    }
    body.timestamp = (stamp >>> 0) || 1;
    var named = body.score["1"].team["1"].player["1"].name || body.score["1"].team["2"].player["1"].name;
    var listed = (roster.slots || []).some(function (slot) { return slot.players && slot.players[0] && slot.players[0].tag; });
    return named || listed || bracketSets.length ? body : null;
  } catch (e) {
    return null;
  }
}

// Read program_state.json
function getData() {
  var local = deskProgram();
  if (local) return Promise.resolve(local);
  return $.ajax({
    dataType: "json",
    url: tshPreviewMode() ? "/api/fgc/program-state?preview=1" : "/api/fgc/program-state",
    cache: false,
  });
}

// Loads settings.json from /layout/ and /layout/<folder>/
// /layout/<folder>/settings.json (local) has priority over /layout/settings.json (global)
async function LoadSettings() {
  let global_settings = {};
  try {
    global_settings = await $.ajax({
      dataType: "json",
      url: "../settings.json",
      cache: false,
    });
  } catch (e) {
    console.log("Could not load global settings.json");
    console.log(e);
  }

  let file_settings = {};
  try {
    file_settings = await $.ajax({
      dataType: "json",
      url: "./settings.json",
      cache: false,
    });
  } catch (e) {
    console.log("Could not load local settings.json");
    console.log(e);
  }

  tsh_settings = _.defaultsDeep(
    window.settings,
    file_settings,
    global_settings,
  );
}

// Registers element for content fitting inside div if the div is resized
function RegisterFit(element) {
  if (!$(element).hasClass("tsh-fit-content")) {
    if ($(element).get(0)) {
      $(element).addClass("tsh-fit-content");
      divResizeObserver.observe($(element).get(0));
    }
  }
}

function tshPreviewMode() {
  try {
    return new URLSearchParams(window.location.search).has("preview");
  } catch (e) {
    return false;
  }
}

// Scale content to fit div
function FitText(target) {
  if (tshFitting || target == null) return;
  document.fonts.ready.then(() => {
    if (tshFitting || target == null) return;
    if (target.css("font-size") == null) return;
    const targetWidth = target.width();
    if (!targetWidth) return;

    let textElement = target.find(".text");
    if (!textElement.length || !textElement[0]) return;
    RegisterFit(target);

    if (textElement.text().trim().toLowerCase() == "undefined") {
      textElement.html("");
    }

    if (target.data("tshFitWidth") === targetWidth && textElement.data("tshFit")) return;

    tshFitting = true;
    textElement.css("transform", "");
    textElement.css("font-size", "");

    if (target.hasClass("font-scale-fit")) {
      const originalFontSize = parseFloat(
        window.getComputedStyle(textElement[0]).fontSize
      );

      let fontSize = originalFontSize;
      let steps = 0;

      while (
        textElement[0].scrollWidth > targetWidth &&
        fontSize > 1 &&
        steps < 40
      ) {
        fontSize -= 1;
        steps += 1;
        textElement.css("font-size", fontSize + "px");
      }
    } else {
      let scaleX = 1;

      if (textElement[0].scrollWidth * scaleX > targetWidth) {
        scaleX = targetWidth / textElement[0].scrollWidth;
        textElement.css("transform", "scaleX(" + scaleX + ")");
      }
    }
    target.data("tshFitWidth", targetWidth);
    textElement.data("tshFit", 1);
    requestAnimationFrame(() => { tshFitting = false; });
  });
}

// Load Kuroshiro, the Japanese transcription library
async function LoadKuroshiro() {
  if (tshPreviewMode() || !window.Kuroshiro || !window.KuromojiAnalyzer) return;
  const probe = await fetch("../include/kuromoji/cc.dat.gz");
  const type = (probe.headers.get("content-type") || "").toLowerCase();
  if (!probe.ok || type.includes("text/html")) return;
  window.kuroshiro = new Kuroshiro.default();
  await window.kuroshiro.init(
    new KuromojiAnalyzer({
      dictPath: "../include/kuromoji",
    }),
  );
}

// Transcribes Japanese text to Roman characters using Kuroshiro
async function Transcript(text) {
  let settings = _.defaultsDeep(tsh_settings.japanese_transcription, {
    enabled: true,
    to: "romaji",
    mode: "normal",
    romajiSystem: "nippon",
  });

  if (text == null || text.length == 0 || !settings.enabled || !window.Kuroshiro) return text;

  try {
    if (window.Kuroshiro.default.Util.hasJapanese(text)) {
      return window.kuroshiro
        .convert(text, {
          mode: settings.mode,
          to: settings.to,
          romajiSystem: settings.romajiSystem,
        })
        .then((res) => {
          return `
            <div class="tsh_transcript">
              <span class="original">
                ${text}
              </span>
              <span class="transcript">
                ${res}
              </span>
            </div>
          `.trim();
        });
    } else {
      return text;
    }
  } catch (e) {
    console.log(e);
    return text;
  }
}

// Sets an element's inner HTML
// Sequence: runs anim_out > changes content > runs anim_in
// Uses FitText to scale div contents to fit
async function SetInnerHtml(element, html, settings = {}) {
  // Extract settings
  let { force, fadeTime = 0.5, middleFunction } = settings;

  if (element == null) return;
  if (force === false) return;

  // Fade out/in animations
  let anim_in = {
    autoAlpha: 1,
    duration: fadeTime,
    stagger: 0.1,
    ...settings.anim_in,
  };
  let anim_out = {
    autoAlpha: 0,
    duration: fadeTime,
    stagger: 0.1,
    overwrite: true,
    ...settings.anim_out,
  };

  if (html == null || html === undefined) html = "";

  html = String(html);

  let firstRun = element.find(".text").length === 0;

  // First run, no need for smooth fade out
  if (firstRun) {
    // Put any text inside the div just so the font loading is triggered
    element.html("<div class='text' style='opacity: 0;'>&nbsp;</div>");
    force = true;
  }

  // Wait for font to load before calculating sizes
  await document.fonts.ready;

  // Normalize HTML by parsing through DOM to ensure consistent formatting
  const normalizeHtml = (str) => {
    const temp = document.createElement('div');
    temp.innerHTML = String(str);
    return temp.innerHTML;
  };
  const currentText = normalizeHtml(element.find(".text").html());
  const newText = normalizeHtml(html);

  if (force === true || currentText !== newText) {
    const updateElement = (element, html, firstRun) => {
      element.find(".text").html(html);

      if (html.trim().length === 0) {
        element.find(".text").addClass("text_empty");
        element.addClass("text_empty");
      } else {
        element.find(".text").removeClass("text_empty");
        element.removeClass("text_empty");
      }

      FitText(element);

      if (middleFunction) {
        middleFunction();
      }

      if (document.hidden) {
        gsap.killTweensOf(element.find(".text"));
        element.find(".text").css({ opacity: 1, visibility: "inherit" });
        return;
      }

      if (firstRun) {
        gsap.set(element.find(".text"), anim_in);
      } else {
        anim_out.onComplete = null;
        gsap.fromTo(element.find(".text"), anim_out, anim_in);
      }
    };

    if (document.hidden) {
      updateElement(element, html, firstRun);
      return;
    }

    if (!firstRun) {
      anim_out.onComplete = () => updateElement(element, html, firstRun);
      await gsap.to(element.find(".text"), anim_out);
    } else {
      anim_out.onComplete = () => updateElement(element, html, firstRun);
      await gsap.set(element.find(".text"), anim_out);
    }
  }
}

const degrees_to_radians = (deg) => (deg * Math.PI) / 180.0;

// Given a number of characters, returns an array os positions (0-1) for their eyesights
// Used for "smart" positioning of multiple characters in a container without dividers
function GenerateMulticharacterPositions(
  character_number,
  center = [0.5, 0.5],
  radius = 0.3,
) {
  let positions = [];

  // For 1 character, just center it
  if (character_number == 1) radius = 0;

  let angle_rad = degrees_to_radians(90);

  if (character_number == 2) angle_rad = degrees_to_radians(45);

  let pendulum = 1;

  for (let i = 0; i < character_number; i += 1) {
    let j = i;
    if (i > 1) {
      if (i % 2 == 0) {
        pendulum *= -1;
      } else {
        pendulum *= -1;
        pendulum += 1;
      }
      j = pendulum;
    }
    angle = angle_rad + degrees_to_radians(360 / character_number) * j;
    pos = [
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius,
    ];
    positions.push(pos);
  }

  return positions;
}

// Use a HTML canvas to resize an image
// Only needed when downscaling images, to avoid bad image quality
// Detect div size changes for character images
var imageResizeObserver = new ResizeObserver((entries) => {
  if (tshFitting) return;
  for (const entry of entries) {
    if (entry.contentRect.width < 2) continue;
    CenterImageDo(entry.target);
  }
});

// Detect div size changes for text elements
var divResizeObserver = new ResizeObserver((entries) => {
  if (tshFitting) return;
  for (const entry of entries) {
    if (entry.contentRect.width < 2) continue;
    FitText($(entry.target));
  }
});

// Prepare element for character image display
// Call function to center image
var tshFrameCache = {};

function tshFrame(assetData) {
  try {
    if (!assetData || assetData.eyesight || !assetData.asset) return Promise.resolve(assetData);
    var match = String(assetData.asset).match(/\/games\/([^/]+)\/([^/]+)\/(.+)_(\d+)\.(?:png|webp|jpe?g)/i);
    if (!match) return Promise.resolve(assetData);
    var game = match[1];
    var folder = match[2];
    var code = match[3];
    var skin = String(Number(match[4]));
    var key = game + "/" + folder;
    if (!tshFrameCache[key]) {
      var root = String(assetData.asset).slice(0, String(assetData.asset).indexOf("/games/"));
      tshFrameCache[key] = fetch(root + "/games/" + game + "/" + folder + "/config.json")
        .then(function (res) { return res.ok ? res.json() : null; })
        .catch(function () { return null; });
    }
    return tshFrameCache[key].then(function (config) {
      var eyes = config && config.eyesights && config.eyesights[code] && (config.eyesights[code][skin] || config.eyesights[code]["0"]);
      if (!eyes) return assetData;
      var scale = 1;
      if (config.rescaling_factor && config.rescaling_factor[code]) {
        scale = config.rescaling_factor[code][skin] || config.rescaling_factor[code]["0"] || 1;
      }
      return Object.assign({}, assetData, {
        eyesight: eyes,
        average_size: config.average_size || assetData.average_size,
        uncropped_edge: config.uncropped_edge || assetData.uncropped_edge,
        rescaling_factor: scale,
      });
    });
  } catch (e) {
    return Promise.resolve(assetData);
  }
}

async function CenterImage(element, assetData, options = {}) {
  try {
    options = _.defaultsDeep(options, {
      custom_zoom: 1,
      custom_center: [0.5, 0.5],
      scale_based_on_parent: false,
      scale_fill_x: false,
      scale_fill_y: false,
    });

    if (!assetData) {
      reject();
    }

    options.asset_data = await tshFrame(assetData);

    $(element).data(options);

    await CenterImageDo($(element)).then(() => {
      if (!$(element).hasClass("tsh-center-image")) {
        $(element).addClass("tsh-center-image");
        imageResizeObserver.observe($(element).get(0));
      }
    });
  } catch (e) {
    console.log(e);
  }
}

// If the character asset is a video, this is called for setting its content
async function CenterVideo(element, assetData, options = {}) {
  function loadImage() {
    return new Promise((resolve) => {
      var video = $("<video />", {
        src: tshAsset(assetData.asset),
        muted: true,
        autoplay: true,
      });

      $(element).css({
        position: "relative",
      });

      video.css({
        height: "100%",
        "min-width": 0,
        "min-height": 0,
        position: "absolute",
      });

      video.muted = true;
      video.autoplay = true;

      video.appendTo($(element)).unwrap();

      video.on("loadedmetadata", async () => {
        $(video)[0].muted = true;
        await $(video)[0].play();
        resolve();
      });

      video[0].load();
    });
  }

  await loadImage();
}

// Center character images based on settings (div data)
async function CenterImageDo(element) {
  try {
    let data = $(element).data();

    let assetData = data.asset_data;
    let customZoom = data.custom_zoom;
    let customCenter = data.custom_center;
    let scale_based_on_parent = data.scale_based_on_parent;
    let scale_fill_x = data.scale_fill_x;
    let scale_fill_y = data.scale_fill_y;

    let customElement = null;

    if (scale_based_on_parent) {
      customElement = element.parent().parent();
    }

    if (typeof assetData == "string") {
      assetData = JSON.parse(assetData);
    }
    if (!assetData) return;

    let image = 'url("' + tshAsset(assetData.asset) + '")';

    if (image != undefined && image.includes("url(")) {
      function loadImage() {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = tshAsset(assetData.asset);
          img.onload = async () => {
            let eyesight = assetData.eyesight;

            if (!eyesight) {
              eyesight = {
                x: img.naturalWidth / 2,
                y: 0,
              };
            }

            if (!customElement) customElement = element;

            let containerWidth = 0;
            let containerHeight = 0;

            if (!customElement) {
              // customElement = $(element).get(0);
              let referenceElement = element.parent();
              containerWidth = $(referenceElement).innerWidth();
              containerHeight = $(referenceElement).innerHeight();
            } else {
              containerWidth = $(customElement).innerWidth();
              containerHeight = $(customElement).innerHeight();
            }

            let proportional_zoom = 1;
            if (assetData.average_size) {
              proportional_zoom = 0;
              proportional_zoom = Math.max(
                proportional_zoom,
                ($(customElement).innerWidth() / assetData.average_size.x) *
                  1.2,
              );
              proportional_zoom = Math.max(
                proportional_zoom,
                ($(customElement).innerHeight() / assetData.average_size.y) *
                  1.2,
              );
            }

            // For cropped assets, zoom to fill
            // Calculate max zoom
            zoom_x = $(customElement).innerWidth() / img.naturalWidth;
            zoom_y = $(customElement).innerHeight() / img.naturalHeight;

            let minZoom = 1;

            let rescalingFactor = 1;

            if (assetData.rescaling_factor)
              rescalingFactor = assetData.rescaling_factor;

            let uncropped_edge = assetData.uncropped_edge;

            if (
              !uncropped_edge ||
              uncropped_edge == "undefined" ||
              uncropped_edge.length == 0
            ) {
              if (zoom_x > zoom_y) {
                minZoom = zoom_x * rescalingFactor;
              } else {
                minZoom = zoom_y * rescalingFactor;
              }
            } else {
              if (
                uncropped_edge.includes("u") &&
                uncropped_edge.includes("d") &&
                uncropped_edge.includes("l") &&
                uncropped_edge.includes("r")
              ) {
                minZoom = customZoom * proportional_zoom * rescalingFactor;
              } else if (
                !uncropped_edge.includes("l") &&
                !uncropped_edge.includes("r")
              ) {
                minZoom = zoom_x * rescalingFactor;
              } else if (
                !uncropped_edge.includes("u") &&
                !uncropped_edge.includes("d")
              ) {
                minZoom = zoom_y * rescalingFactor;
              } else {
                minZoom = customZoom * proportional_zoom * rescalingFactor;
              }
            }

            if (scale_fill_x && !scale_fill_y) {
              minZoom = zoom_x;
            } else if (scale_fill_y && !scale_fill_x) {
              minZoom = zoom_y;
            } else if (scale_fill_x && scale_fill_y) {
              minZoom = Math.max(zoom_x, zoom_y);
            }

            zoom = Math.max(minZoom, customZoom * minZoom);

            // Centering
            let xx = 0;
            let yy = 0;

            if (!customCenter) {
              xx = -eyesight.x * zoom + $(element).innerWidth() / 2;
            } else {
              xx =
                -eyesight.x * zoom + $(element).innerWidth() * customCenter[0];
            }

            let maxMoveX = $(element).innerWidth() - img.naturalWidth * zoom;

            if (!uncropped_edge || !uncropped_edge.includes("l")) {
              if (xx > 0) xx = 0;
            } else {
              if (xx > containerWidth * 0.1) xx = containerWidth * 0.1;
            }
            if (!uncropped_edge || !uncropped_edge.includes("r")) {
              if (xx < maxMoveX) xx = maxMoveX;
            } else {
              if (xx < maxMoveX - containerWidth * 0.1)
                xx = maxMoveX - containerWidth * 0.1;
            }

            if (!customCenter) {
              yy = -eyesight.y * zoom + $(element).innerHeight() / 2;
            } else {
              yy =
                -eyesight.y * zoom + $(element).innerHeight() * customCenter[1];
            }

            let maxMoveY = $(element).innerHeight() - img.naturalHeight * zoom;

            if (!uncropped_edge || !uncropped_edge.includes("u")) {
              if (yy > 0) yy = 0;
            } else {
              if (yy > containerHeight * 0.1) yy = containerHeight * 0.1;
            }
            if (!uncropped_edge || !uncropped_edge.includes("d")) {
              if (yy < maxMoveY) yy = maxMoveY;
            } else {
              if (yy < maxMoveY - containerHeight * 0.1)
                yy = maxMoveY - containerHeight * 0.1;
            }

            if (data.use_dividers === false) {
              $(element).parent().css("position", "absolute");
            }

            if (data.z_index) {
              $(element).parent().css("z-index", data.z_index);
            } else {
              $(element).parent().css("z-index", 0);
            }

            $(element).css({ position: "relative" });
            $(element).find("img.tsh-img").remove();
            const $img = $("<img>").addClass("tsh-img").css({
              position: "absolute",
              left: `${xx}px`,
              top: `${yy}px`,
              width: `${img.naturalWidth * zoom}px`,
              height: `${img.naturalHeight * zoom}px`,
            }).attr("src", tshAsset(assetData.asset));
            $(element).append($img);

            resolve();
          };
        });
      }

      await loadImage();
    }
  } catch (e) {
    console.log(e);
  }
}

async function FindImages(folder = "") {
  let flag = true;
  let counter = 1;
  const files = [];

  while (flag) {
    const filename = `${folder}/${counter}.png`;
    try {
      await $.get(filename);
      files.push(filename);
      counter += 1;
    } catch (e) {
      flag = false;
    }
  }

  return files;
}

function powerOf2(v) {
  return v && !(v & (v - 1));
}

function nextPow2(v) {
  var p = 2;
  while ((v >>= 1)) {
    p <<= 1;
  }
  return p;
}

/**
 * Stores content to be added to the DOM with SetInnerHtml later
 */
class ContentResolver {
  constructor() {
    this.list = [];
  }

  add(selector, value) {
    this.list.push({ s: selector, v: value });
    return "";
  }

  resolve() {
    for (let element of this.list) {
      SetInnerHtml($(element.s), element.v);
    }
  }
}

function HandleTSHStateUpdateMessage(message) {
  const deltaIdx = message["delta_index"];
  const deltas = message["delta"];

  if (deltaIdx < maxAppliedDeltaIdx) {
    throw Error(
      `Received out of order delta ${deltaIdx} (applied: ${maxAppliedDeltaIdx}`,
    );
  }

  let event = new CustomEvent("tsh_update");
  // Ancient jutsu to deep-clone an object. We will be modifying
  event.oldData = JSON.parse(JSON.stringify(data));

  applyDeltas(data, deltas);
  event.data = data;
  maxAppliedDeltaIdx = Math.max(deltaIdx, maxAppliedDeltaIdx);
  console.log(data);

  // it's fine if this doesn't fire because we threw an exception earlier, because
  // that means state wasn't applied and we've requested new program state.
  document.dispatchEvent(event);
}

/**
 * Takes a single delta operation, and modifies the data object.
 *
 * @param {Object} data
 * @param {Delta} delta
 */
function applyDelta(data, delta) {
  const pathPieces = delta.path;
  /** @type {DeltaOpType} */ const deltaOp = delta.action;
  const newValue = delta.value;
  const lastPiece = pathPieces[pathPieces.length - 1];

  let currentData = data;
  for (let i = 0; i < pathPieces.length - 1; i += 1) {
    if (!currentData.hasOwnProperty(pathPieces[i])) {
      currentData[pathPieces[i]] = {};
    }

    currentData = currentData[pathPieces[i]];
  }

  if (deltaOp === "dictionary_item_removed") {
    if (currentData.hasOwnProperty(lastPiece)) {
      delete currentData[lastPiece];
    } else {
      console.warn(`Couldn't find data to delete for path: ${pathPieces}`);
    }
  } else {
    currentData[lastPiece] = newValue;
  }
}

/**
 * @param {Object} data
 * @param {Delta[]} deltas python deep-diff delta object.
 */
function applyDeltas(data, deltas) {
  for (let delta of deltas) {
    applyDelta(data, delta);
  }

  return data;
}

// taken from https://github.com/Readek/RoA-Stream-Tool/blob/master/Stream%20Tool/Resources/Scripts/Utils/On%20Transition%20Event.mjs

/**
 * Starts an event listener fired every time browser becomes "active"
 * @param {() => {void}} hide - hideElements() function
 * @param {() => {void}} show - showElements() function
 */
function initOnBrowserActive(hide, show) {
  // if browser is on OBS
  if (window.obsstudio) {
    // every time the browser source becomes active
    window.addEventListener("obsSourceActiveChanged", (event) => {
      if (event.detail.active) {
        // when its show time
        show();
      } else {
        // when browser goes to the backstage
        hide();
      }
    });
  } else {
    // this is here for regular browsers for better developer experiece
    // this will trigger every time the browser goes out of view (or back to view)
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) UpdateData();
    });
  }
}

/**
 * Generates HTML for player name presentation following the player_presentation strategy:
 * - For singles: sponsor name + transcribed player name
 * - For doubles: team name (and player names if they differ from team name)
 * @param {Object} player - Player object (for singles)
 * @param {Object} team - Team object (for singles or doubles)
 * @param {Boolean} isTeams - Whether this is a doubles match
 * @returns {Promise<String>} HTML string for the name presentation
 */
/** Determines if the browser view is currently active/visible */
function isBrowserActive() {
  if (window.obsstudio) {
    return true; // theres no way to get active state without the event listener :(
  } else {
    return document.visibilityState;
  }
}
