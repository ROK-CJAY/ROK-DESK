import { readFile } from "node:fs/promises";
import path from "node:path";

const FILL = `
<style>html,body{opacity:1!important;width:1920px;height:1080px;margin:0;overflow:hidden}</style>
<script>
(function () {
  function esc(value) {
    return String(value == null ? "" : value).split("&").join("&" + "amp;").split("<").join("&" + "lt;").split(">").join("&" + "gt;").split('"').join("&" + "quot;");
  }
  function paint(selector, value) {
    var text = value == null ? "" : String(value);
    var next = '<div class="text">' + esc(text) + "</div>";
    document.querySelectorAll(selector).forEach(function (node) {
      if (node.getAttribute("data-rok") === text) return;
      node.setAttribute("data-rok", text);
      node.innerHTML = next;
      node.classList.toggle("text_empty", text.trim() === "");
    });
  }
  function characterUrl(person) {
    var character = person && person.character && person.character["1"];
    var icon = character && character.assets && character.assets["base_files/icon"];
    return (icon && icon.asset) || "";
  }
  function side(data, key, mark) {
    var score = data.score && data.score["1"];
    var team = (score && score.team && score.team[key]) || {};
    var person = (team.player && team.player["1"]) || {};
    var name = [person.team, person.name].filter(Boolean).join(" ");
    paint(".p" + mark + " .name, .p" + mark + ".name", name);
    paint(".p" + mark + " .score", team.score);
    paint(".p" + mark + " .real_name", person.real_name);
    paint(".p" + mark + " .twitter", person.twitter);
    paint(".p" + mark + " .pronoun", person.pronoun);
    paint(".p" + mark + " .seed", person.seed);
    var character = person.character && person.character["1"];
    paint(".p" + mark + " .character_name", character && character.name);
    var url = characterUrl(person);
    document.querySelectorAll(".p" + mark + " .character, .p" + mark + ".character, .p" + mark + " .character_container").forEach(function (node) {
      if ((node.getAttribute("data-rok") || "") === url) return;
      node.setAttribute("data-rok", url);
      node.innerHTML = url ? '<img alt="" src="' + esc(url) + '" style="max-width:100%;max-height:100%;object-fit:contain">' : "";
    });
  }
  function commentators(data) {
    var list = data.commentary ? Object.values(data.commentary) : [];
    var box = document.querySelector("body > .container");
    if (box && !box.children.length && list.length) {
      box.innerHTML = list.map(function (_, index) {
        return '<div class="commentator_container commentator' + index + '"><div class="name"></div><div class="pronoun"></div><div class="real_name"></div><div class="twitter"></div></div>';
      }).join("");
    }
    list.forEach(function (person, index) {
      paint(".commentator" + index + " .name", [person.team, person.name].filter(Boolean).join(" "));
      paint(".commentator" + index + " .pronoun", person.pronoun);
      paint(".commentator" + index + " .real_name", person.real_name);
      paint(".commentator" + index + " .twitter", person.twitter);
    });
  }
  function draw() {
    fetch("/api/fgc/program-state").then(function (res) { return res.json(); }).then(function (data) {
      var score = (data.score && data.score["1"]) || {};
      var info = data.tournamentInfo || {};
      paint(".tournament_name, .tournament", info.tournamentName);
      paint(".event_name, .event", info.eventName);
      paint(".match", score.match);
      paint(".phase", score.phase);
      paint(".best_of", score.best_of_text);
      side(data, "1", "1");
      side(data, "2", "2");
      commentators(data);
    }).catch(function () {});
  }
  draw();
  setInterval(draw, 1000);
})();
</script>`;

export function tshLayoutHref(file: string) {
  return `/api/fgc/tsh-layout?path=${encodeURIComponent(file)}`;
}

export function renderTshDocument(html: string, baseHref: string) {
  const clean = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const base = `<base href="${baseHref}">`;
  const withBase = /<head[^>]*>/i.test(clean) ? clean.replace(/<head[^>]*>/i, (tag) => `${tag}${base}`) : `<head>${base}</head>${clean}`;
  return /<\/body>/i.test(withBase) ? withBase.replace(/<\/body>/i, `${FILL}</body>`) : `${withBase}${FILL}`;
}

export async function readTshLayout(file: string) {
  const safe = file.replace(/\\/g, "/");
  if (!/^[a-zA-Z0-9_./-]+\.html$/i.test(safe) || safe.includes("..")) return null;
  const roots = [path.join(process.cwd(), "public/tsh/layout"), path.join(process.cwd(), ".output/public/tsh/layout"), "/workspace/public/tsh/layout"];
  for (const root of roots) {
    try {
      return await readFile(path.join(root, safe), "utf8");
    } catch {
      // try the next place the published app keeps public files
    }
  }
  return null;
}
