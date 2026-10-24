/* Partie 5 — L'histoire de l'Univers
   1. Le film de l'Univers : du Big Bang à aujourd'hui, avec le calendrier cosmique.
   2. L'expansion : les galaxies s'éloignent les unes des autres. */

(function () {
  "use strict";

  var AGE = 13.8e9;
  var reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function nf(v, dec) { return v.toLocaleString("fr-FR", { maximumFractionDigits: dec == null ? 0 : dec }); }
  function graine(a) { return function () { a = (a * 16807) % 2147483647; return a / 2147483647; }; }

  var EVENEMENTS = [
    { t: 0, nom: "Le Big Bang", court: "Big Bang",
      texte: "L'Univers commence, extrêmement chaud et dense. Ce n'est pas une explosion dans l'espace : c'est l'espace lui-même qui se met à se dilater." },
    { t: 5.7e-6, nom: "Les premiers noyaux", court: "3 minutes",
      texte: "En quelques minutes se forment les premiers noyaux d'atomes : ceux de l'hydrogène et de l'hélium, les deux éléments les plus légers." },
    { t: 380000, nom: "Les premiers atomes", court: "Premiers atomes",
      texte: "L'Univers a refroidi jusqu'à environ 3 000 °C : les électrons s'attachent aux noyaux et forment les premiers atomes. La lumière peut enfin voyager librement : c'est le fond diffus cosmologique, la plus vieille lumière observable." },
    { t: 50e6, nom: "Les âges sombres", court: "Âges sombres",
      texte: "Pas encore d'étoiles : seulement un gaz froid d'hydrogène et d'hélium. Lentement, la gravitation rassemble la matière en nuages de plus en plus denses." },
    { t: 200e6, nom: "Les premières étoiles", court: "Premières étoiles",
      texte: "Les nuages de gaz s'effondrent sous l'effet de la gravitation et s'allument : les premières étoiles brillent. Dans leur cœur, elles fabriquent de nouveaux éléments chimiques." },
    { t: 300e6, nom: "Les premières galaxies", court: "Premières galaxies",
      texte: "Les étoiles se regroupent en galaxies. Le télescope spatial James Webb observe des galaxies dont la lumière est partie moins de 300 millions d'années après le Big Bang." },
    { t: 1e9, nom: "La Voie lactée se forme", court: "Voie lactée",
      texte: "Notre galaxie commence à prendre forme. Ses plus vieilles étoiles ont plus de 13 milliards d'années." },
    { t: 9.2e9, nom: "La naissance du Soleil", court: "Soleil",
      texte: "Dans un nuage de gaz et de poussières de la Voie lactée, une nouvelle étoile s'allume : le Soleil. Les planètes se forment autour de lui." },
    { t: 9.26e9, nom: "La formation de la Terre", court: "Terre",
      texte: "La Terre se forme à partir des poussières et des roches qui tournent autour du jeune Soleil." },
    { t: 10.0e9, nom: "Les premières traces de vie", court: "Vie",
      texte: "Dans les océans apparaissent les premières formes de vie, des êtres vivants microscopiques." },
    { t: 13.57e9, nom: "Les dinosaures", court: "Dinosaures",
      texte: "Les dinosaures apparaissent. Ils disparaîtront il y a 66 millions d'années, le 30 décembre du calendrier cosmique." },
    { t: AGE - 3e5, nom: "Les premiers humains modernes", court: "Homo sapiens",
      texte: "Homo sapiens, notre espèce, apparaît en Afrique. Dans le calendrier cosmique, c'est le 31 décembre, onze minutes avant minuit." },
    { t: AGE, nom: "Aujourd'hui", court: "Aujourd'hui",
      texte: "13,8 milliards d'années après le Big Bang, l'Univers continue de se dilater. Il est très froid : environ -270 °C entre les galaxies." }
  ];

  function duree(ans) {
    if (ans <= 0) return "0";
    if (ans < 1) { var mn = ans * 525960; return mn < 60 ? nf(Math.max(1, mn), 0) + " minutes" : nf(mn / 60, 0) + " heures"; }
    if (ans < 1e6) return nf(ans) + " ans";
    if (ans < 1e9) return nf(ans / 1e6, 0) + " millions d'années";
    return nf(ans / 1e9, 2).replace(/,?0+$/, "") + " milliards d'années";
  }
  var MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  var JOURS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function calendrier(t) {
    var jours = t / AGE * 365, idx = Math.floor(jours);
    if (idx >= 365) return "31 décembre, minuit";
    var heures = (jours - idx) * 24;
    if (idx === 0 && heures < 1) {
      var mn = heures * 60;
      return mn < 1 ? "1er janvier, juste après minuit" : "1er janvier à 0 h " + String(Math.round(mn)).padStart(2, "0");
    }
    var m = 0, d = idx;
    while (d >= JOURS[m]) { d -= JOURS[m]; m++; }
    var date = (d === 0 ? "1er" : String(d + 1)) + " " + MOIS[m];
    if (idx === 364) {
      var h = Math.floor(heures), mi = Math.round((heures - h) * 60);
      if (mi === 60) { h++; mi = 0; }
      date += " à " + h + " h " + String(mi).padStart(2, "0");
    }
    return date;
  }

  /* ================= 1. Le film de l'Univers ================= */
  var cv, ctx, W, H, dpr = 1, t = 0, lecture = false, prog = 0, dernier = 0, actuel = -1;
  var POINTS = (function () {
    var r = graine(5), p = [];
    for (var i = 0; i < 2600; i++) p.push(r() * 3.2 - 1.6, r() * 3.2 - 1.6, r());
    return p;
  })();
  var GALAXIES = (function () {
    var r = graine(9), g = [];
    for (var i = 0; i < 34; i++) g.push({ x: i === 0 ? 0.08 : r() * 3 - 1.5, y: i === 0 ? 0.05 : r() * 3 - 1.5, ang: r() * Math.PI, inc: 0.35 + r() * 0.6, teinte: r() });
    return g;
  })();

  function echelle() { return 0.22 + 0.78 * Math.pow(t / AGE, 0.55); }

  function dessinerFilm(ms) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cx = W / 2, cy = H / 2, s = echelle(), K = Math.max(W, H) * 0.5 * s, i, x, y;
    var L = 3.2 * K, nx = Math.ceil(W / 2 / L) + 1, ny = Math.ceil(H / 2 / L) + 1;
    function pave(px, py, marge, cb) {
      for (var a = -nx; a <= nx; a++) for (var b = -ny; b <= ny; b++) {
        var X = cx + px * K + a * L, Y = cy + py * K + b * L;
        if (X > -marge && X < W + marge && Y > -marge && Y < H + marge) cb(X, Y, a === 0 && b === 0);
      }
    }
    if (t < 380000) {
      var chaud = t < 1e-5 ? 1 : 0.75;
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.75);
      g.addColorStop(0, chaud === 1 ? "#FFFFFF" : "#FFF0C8");
      g.addColorStop(0.45, chaud === 1 ? "#FFE7A8" : "#FFB45C");
      g.addColorStop(1, chaud === 1 ? "#FF9A3C" : "#C2501E");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = chaud === 1 ? "rgba(255,190,90,0.5)" : "rgba(255,255,230,0.6)";
      for (i = 0; i < POINTS.length; i += 3) {
        var j = reduit ? 0 : Math.sin(ms / 90 + i) * 1.5;
        pave(POINTS[i], POINTS[i + 1], 2, function (X, Y) { ctx.fillRect(X + j, Y - j, 1.5, 1.5); });
      }
      return;
    }
    ctx.fillStyle = "#04050E"; ctx.fillRect(0, 0, W, H);
    // lueur résiduelle du fond diffus
    if (t < 80e6) {
      var lueur = 1 - t / 80e6;
      ctx.fillStyle = "rgba(255,110,60," + (0.22 * lueur) + ")"; ctx.fillRect(0, 0, W, H);
    }
    var etoiles = Math.min(1, Math.max(0, (t - 150e6) / 100e6));
    for (i = 0; i < POINTS.length; i += 3) pave(POINTS[i], POINTS[i + 1], 6, function (x, y) { point(i, x, y); });
    function point(i, x, y) {
      var star = (i / 3) % 6 === 0 && etoiles > 0;
      if (star) {
        var sc = reduit ? 1 : 0.75 + 0.25 * Math.sin(ms / 400 + i);
        var rg = 2.6 * sc;
        var gr = ctx.createRadialGradient(x, y, 0, x, y, rg * 2);
        gr.addColorStop(0, "rgba(235,242,255," + etoiles + ")"); gr.addColorStop(1, "rgba(150,180,255,0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rg * 2, 0, 2 * Math.PI); ctx.fill();
      } else {
        ctx.fillStyle = "rgba(140,150,215," + (0.32 - 0.18 * Math.min(1, t / 3e9)) + ")";
        ctx.fillRect(x, y, 1.2, 1.2);
      }
    }
    // galaxies
    if (t >= 300e6) {
      var n = Math.round(6 + 28 * Math.min(1, (t - 300e6) / 4e9));
      var taille = 5 + 11 * Math.min(1, t / 6e9);
      for (i = 0; i < n; i++) pave(GALAXIES[i].x, GALAXIES[i].y, 30, (function (G) { return function (x, y) { dessinerGalaxie(G, x, y); }; })(GALAXIES[i]));
      function dessinerGalaxie(G, x, y) {
        var jeune = Math.max(0, 1 - t / 6e9);
        var coul = G.teinte < 0.5 ? [190, 205, 255] : [255, 222, 170];
        coul = [coul[0] * (1 - jeune) + 160 * jeune, coul[1] * (1 - jeune) + 190 * jeune, coul[2] * (1 - jeune) + 255 * jeune];
        ctx.save(); ctx.translate(x, y); ctx.rotate(G.ang); ctx.scale(1, G.inc);
        var gg = ctx.createRadialGradient(0, 0, 0, 0, 0, taille);
        gg.addColorStop(0, "rgba(255,250,235,0.95)");
        gg.addColorStop(0.35, "rgba(" + coul.map(Math.round).join(",") + ",0.6)");
        gg.addColorStop(1, "rgba(" + coul.map(Math.round).join(",") + ",0)");
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, taille, 0, 2 * Math.PI); ctx.fill();
        ctx.restore();
      }
      if (t >= 1e9) {
        var V = GALAXIES[0]; x = cx + V.x * K; y = cy + V.y * K;
        ctx.strokeStyle = "#FF5D72"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, taille + 8, 0, 2 * Math.PI); ctx.stroke();
        etiquette("Voie lactée", x + taille + 12, y - 8, "#FF8FA0");
        if (t >= 9.2e9) {
          ctx.fillStyle = "#F5C451"; ctx.beginPath(); ctx.arc(x + taille * 0.45, y + taille * 0.2, 2.5, 0, 2 * Math.PI); ctx.fill();
          etiquette("Soleil", x + taille + 12, y + 10, "#F5C451");
        }
      }
    }
    function etiquette(txt, ex, ey, c) {
      ctx.font = '700 13px "Atkinson Hyperlegible", "Segoe UI", sans-serif'; ctx.textBaseline = "middle"; ctx.textAlign = "left";
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(4,5,14,0.85)"; ctx.strokeText(txt, ex, ey);
      ctx.fillStyle = c; ctx.fillText(txt, ex, ey);
    }
  }

  function majPanneau() {
    var k = 0;
    for (var i = 0; i < EVENEMENTS.length; i++) if (EVENEMENTS[i].t <= t + 1e-9) k = i;
    if (k === actuel) return;
    actuel = k;
    var e = EVENEMENTS[k];
    document.getElementById("film-nom").textContent = e.nom;
    document.getElementById("film-texte").textContent = e.texte;
    document.getElementById("film-apres").textContent = e.t === 0 ? "Le tout début" : duree(e.t);
    document.getElementById("film-ilya").textContent = e.t >= AGE ? "Maintenant" : duree(AGE - e.t);
    document.getElementById("film-calendrier").textContent = calendrier(e.t);
    document.getElementById("film-num").textContent = "Étape " + (k + 1) + " sur " + EVENEMENTS.length;
    document.querySelectorAll("#film-choix button").forEach(function (b, j) { b.setAttribute("aria-current", j === k ? "true" : "false"); });
    cv.setAttribute("aria-label", e.nom + ". " + e.texte);
  }

  function tempsDepuisProgression(p) {
    if (p < 0.4) return Math.pow(10, -6 + (p / 0.4) * 15);
    return 1e9 + (p - 0.4) / 0.6 * (AGE - 1e9);
  }

  function boucleFilm(ms) {
    var dt = dernier ? Math.min(0.1, (ms - dernier) / 1000) : 0;
    dernier = ms;
    var curseur = document.getElementById("film-curseur");
    if (lecture) {
      prog += dt / 40;
      if (prog >= 1) { prog = 1; arreter(); }
      t = prog >= 1 ? AGE : tempsDepuisProgression(prog);
      curseur.value = String(Math.round(t / AGE * 1000));
    }
    dessinerFilm(ms);
    majPanneau();
    requestAnimationFrame(boucleFilm);
  }
  function arreter() {
    lecture = false;
    var b = document.getElementById("film-lecture");
    if (b) b.textContent = "Lancer le film (40 s)";
  }
  function redimFilm() {
    var r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }
  function initFilm() {
    cv = document.getElementById("film");
    if (!cv) return;
    ctx = cv.getContext("2d");
    var choix = document.getElementById("film-choix"), curseur = document.getElementById("film-curseur");
    EVENEMENTS.forEach(function (e, k) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = e.court;
      b.addEventListener("click", function () { arreter(); t = e.t; curseur.value = String(Math.round(t / AGE * 1000)); });
      choix.appendChild(b);
    });
    curseur.addEventListener("input", function () { arreter(); t = Number(curseur.value) / 1000 * AGE; });
    var lb = document.getElementById("film-lecture");
    lb.addEventListener("click", function () {
      if (lecture) { arreter(); return; }
      prog = 0; t = 0; lecture = true; lb.textContent = "Pause";
    });
    redimFilm(); window.addEventListener("resize", redimFilm);
    requestAnimationFrame(boucleFilm);
  }

  /* ================= Calendrier cosmique (tableau) ================= */
  function initCalendrier() {
    var corps = document.getElementById("cal-corps");
    if (!corps) return;
    corps.innerHTML = EVENEMENTS.filter(function (e) { return e.court !== "3 minutes" && e.court !== "Âges sombres"; }).map(function (e) {
      return "<tr><td>" + e.nom + "</td><td class=\"nombre\">" + (e.t >= AGE ? "aujourd'hui" : "il y a " + duree(AGE - e.t)) + "</td><td class=\"nombre\"><strong>" + calendrier(e.t) + "</strong></td></tr>";
    }).join("");
  }

  /* ================= 2. L'expansion ================= */
  function initExpansion() {
    var c2 = document.getElementById("expansion");
    if (!c2) return;
    var x2 = c2.getContext("2d"), W2, H2, d2 = 1, a = 1, ref = 0, anim = null;
    var DIR = 20 * Math.PI / 180;
    var NOMMEES = [
      { nom: "Voie lactée", court: "nous", x: 0, y: 0, c: "#FF8FA0" },
      { nom: "Galaxie A", court: "A", x: 0.45 * Math.cos(DIR), y: 0.45 * Math.sin(DIR), c: "#45D3C6" },
      { nom: "Galaxie B", court: "B", x: 0.9 * Math.cos(DIR), y: 0.9 * Math.sin(DIR), c: "#F5C451" },
      { nom: "Galaxie C", court: "C", x: 1.35 * Math.cos(DIR), y: 1.35 * Math.sin(DIR), c: "#A98BFF" }
    ];
    var AUTRES = (function () {
      var r = graine(31), g = [];
      for (var i = 0; i < 70; i++) {
        var px = r() * 5 - 2.2, py = r() * 3.4 - 1.7, ok = true;
        NOMMEES.forEach(function (n) { if (Math.hypot(n.x - px, n.y - py) < 0.22) ok = false; });
        if (ok) g.push({ x: px, y: py, ang: r() * 3.14, inc: 0.4 + r() * 0.5 });
      }
      return g;
    })();
    var UNITE = 100 / 0.45; // millions d'al par unité

    function redim() { var r = c2.getBoundingClientRect(); d2 = Math.min(2, window.devicePixelRatio || 1); W2 = r.width; H2 = r.height; c2.width = Math.round(W2 * d2); c2.height = Math.round(H2 * d2); }
    function galaxie(x, y, rg, ang, inc, coul, alpha) {
      x2.save(); x2.translate(x, y); x2.rotate(ang); x2.scale(1, inc);
      var g = x2.createRadialGradient(0, 0, 0, 0, 0, rg);
      g.addColorStop(0, "rgba(255,250,235," + alpha + ")"); g.addColorStop(0.4, "rgba(" + coul + "," + (alpha * 0.6) + ")"); g.addColorStop(1, "rgba(" + coul + ",0)");
      x2.fillStyle = g; x2.beginPath(); x2.arc(0, 0, rg, 0, 2 * Math.PI); x2.fill(); x2.restore();
    }
    function texte(t2, x, y, c, gras, al) {
      x2.font = (gras ? "700 " : "400 ") + (W2 < 520 ? "11px" : "13px") + " \"Atkinson Hyperlegible\", \"Segoe UI\", sans-serif"; x2.textAlign = al || "center"; x2.textBaseline = "middle";
      x2.lineWidth = 3; x2.strokeStyle = "rgba(7,10,30,0.85)"; x2.strokeText(t2, x, y); x2.fillStyle = c; x2.fillText(t2, x, y);
    }
    function dessiner() {
      x2.setTransform(d2, 0, 0, d2, 0, 0);
      x2.fillStyle = "#070A1E"; x2.fillRect(0, 0, W2, H2);
      var petit = W2 < 520;
      var R = NOMMEES[ref], K = W2 * (petit ? 0.3 : 0.2), ox = ref === 0 ? W2 * (petit ? 0.1 : 0.2) : W2 * 0.5, oy = H2 * 0.62;
      function P(g, ech) { return [ox + (g.x - R.x) * ech * K, oy - (g.y - R.y) * ech * K]; }
      AUTRES.forEach(function (g) { var p = P(g, a); galaxie(p[0], p[1], 7, g.ang, g.inc, "190,200,255", 0.7); });
      NOMMEES.forEach(function (g, k) {
        var p0 = P(g, 1), p = P(g, a);
        if (k !== ref) {
          x2.strokeStyle = "rgba(255,255,255,0.25)"; x2.setLineDash([3, 4]);
          x2.beginPath(); x2.arc(p0[0], p0[1], 9, 0, 2 * Math.PI); x2.stroke(); x2.setLineDash([]);
          if (a > 1.02) {
            x2.strokeStyle = g.c; x2.lineWidth = 2.5; x2.beginPath(); x2.moveTo(p0[0], p0[1]); x2.lineTo(p[0], p[1]); x2.stroke();
            var ang = Math.atan2(p[1] - p0[1], p[0] - p0[0]);
            x2.fillStyle = g.c; x2.beginPath(); x2.moveTo(p[0] + Math.cos(ang) * 4, p[1] + Math.sin(ang) * 4);
            x2.lineTo(p[0] - Math.cos(ang - 0.5) * 11, p[1] - Math.sin(ang - 0.5) * 11);
            x2.lineTo(p[0] - Math.cos(ang + 0.5) * 11, p[1] - Math.sin(ang + 0.5) * 11); x2.closePath(); x2.fill();
            x2.lineWidth = 1;
          }
        }
        galaxie(p[0], p[1], 13, 0.5, 0.6, k === 0 ? "255,180,190" : "220,220,255", 1);
        texte(petit ? (k === 0 ? "Nous" : g.court) : g.nom + (k === 0 ? " (nous)" : ""), p[0], p[1] - (petit ? 19 : 24), g.c, true);
        if (k !== ref) texte(nf(Math.hypot(g.x - R.x, g.y - R.y) * UNITE * a, 0) + (petit ? "" : " M al"), p[0], p[1] + (petit ? 19 : 24), "#ECE9F7", false);
      });
      x2.strokeStyle = "#FF5D72"; x2.lineWidth = 2; x2.beginPath(); x2.arc(ox, oy, 20, 0, 2 * Math.PI); x2.stroke(); x2.lineWidth = 1;
      if (!petit) texte("Observateur", ox, oy + 42, "#FF8FA0", true);
    }
    function majTableau() {
      var R = NOMMEES[ref];
      var lignes = NOMMEES.map(function (g, k) {
        if (k === ref) return "";
        var d0 = Math.hypot(g.x - R.x, g.y - R.y) * UNITE, d1 = d0 * a;
        return "<tr><td style=\"color:" + g.c + "\">" + g.nom + "</td><td class=\"nombre\">" + nf(d0) + "</td><td class=\"nombre\">" + nf(d1) + "</td><td class=\"nombre\"><strong>+ " + nf(d1 - d0) + "</strong></td></tr>";
      }).join("");
      document.getElementById("exp-corps").innerHTML = lignes;
      document.getElementById("exp-titre").textContent = ref === 0 ? "Vu depuis la Voie lactée" : "Vu depuis la galaxie B";
      document.getElementById("exp-message").innerHTML = a < 1.05
        ? "Fais avancer le temps avec le curseur ou le bouton."
        : (ref === 0
          ? "Toutes les galaxies s'éloignent de nous. <strong>Plus une galaxie est loin, plus elle s'éloigne vite</strong> : C s'est éloignée trois fois plus que A."
          : "Depuis B, on observe exactement la même chose : tout s'éloigne. <strong>L'Univers n'a pas de centre</strong> : c'est l'espace entre les galaxies qui grandit.");
    }
    function maj() { dessiner(); majTableau(); }
    var curseur = document.getElementById("exp-curseur");
    curseur.addEventListener("input", function () { anim = null; a = Number(curseur.value); maj(); });
    document.getElementById("exp-animer").addEventListener("click", function () {
      a = 1; curseur.value = "1";
      if (reduit) { a = 2; curseur.value = "2"; maj(); return; }
      anim = performance.now();
      (function pas(ms) {
        if (anim == null) return;
        var p = Math.min(1, (ms - anim) / 3500); a = 1 + p; curseur.value = String(a); maj();
        if (p < 1) requestAnimationFrame(pas); else anim = null;
      })(anim);
    });
    var vue = document.getElementById("exp-vue");
    vue.addEventListener("click", function () {
      ref = ref === 0 ? 2 : 0;
      vue.textContent = ref === 0 ? "Se placer sur la galaxie B" : "Revenir sur la Voie lactée";
      vue.setAttribute("aria-pressed", ref === 2 ? "true" : "false");
      maj();
    });
    redim(); window.addEventListener("resize", function () { redim(); maj(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(maj);
    maj();
  }

  document.addEventListener("DOMContentLoaded", function () { initFilm(); initCalendrier(); initExpansion(); });
})();
