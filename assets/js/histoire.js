/* Partie 5 — L'histoire de l'Univers
   1. Les données des événements (partagées avec la frise 3D, frise3d.js).
   2. Le calendrier cosmique.
   3. L'expansion, du Big Bang à aujourd'hui. */

(function () {
  "use strict";

  var AGE = 13.8e9;
  var reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function nf(v, dec) { return v.toLocaleString("fr-FR", { maximumFractionDigits: dec == null ? 0 : dec }); }
  function graine(a) { return function () { a = (a * 16807) % 2147483647; return a / 2147483647; }; }

  var EVENEMENTS = [
    { t: 0, nom: "Le Big Bang", court: "Big Bang",
      texte: "L'Univers commence, extrêmement chaud et dense. Ce n'est pas une explosion dans l'espace : c'est l'espace lui-même qui se met à se dilater." },
    { t: 380000, nom: "Les premiers atomes", court: "Premiers atomes",
      texte: "L'Univers a refroidi jusqu'à environ 3 000 °C : les électrons s'attachent aux noyaux et forment les premiers atomes. La lumière peut enfin voyager librement : c'est le fond diffus cosmologique, la plus vieille lumière observable." },
    { t: 200e6, nom: "Les premières étoiles", court: "Premières étoiles",
      texte: "Les nuages de gaz s'effondrent sous l'effet de la gravitation et s'allument : les premières étoiles brillent. Dans leur cœur, elles fabriquent de nouveaux éléments chimiques." },
    { t: 300e6, nom: "Les premières galaxies", court: "Premières galaxies",
      texte: "Les étoiles se regroupent en galaxies. Le télescope spatial James Webb observe des galaxies dont la lumière est partie moins de 300 millions d'années après le Big Bang." },
    { t: 1e9, nom: "La Voie lactée se forme", court: "Voie lactée",
      texte: "Notre galaxie commence à prendre forme. Ses plus vieilles étoiles ont plus de 13 milliards d'années." },
    { t: 9.2e9, nom: "La naissance du Soleil", court: "Soleil",
      texte: "Dans un nuage de gaz et de poussières de la Voie lactée, une nouvelle étoile s'allume : le Soleil. Les planètes se forment autour de lui." },
    { t: 9.26e9, nom: "La formation de la Terre", court: "Terre", scene: "jeune",
      texte: "La Terre se forme à partir des poussières et des roches qui tournent autour du jeune Soleil. Au début, c'est une boule brûlante couverte de roches en fusion." },
    { t: 9.3e9, nom: "La formation de la Lune", court: "Lune", scene: "lune",
      texte: "Un astre de la taille de Mars percute la jeune Terre. Les débris projetés dans l'espace se rassemblent et forment la Lune. C'est l'explication la plus admise aujourd'hui." },
    { t: 10.0e9, nom: "Les premières traces de vie", court: "Vie", scene: "terre",
      texte: "Dans les océans apparaissent les premières formes de vie, des êtres vivants microscopiques." },
    { t: 13.57e9, nom: "L'apparition des dinosaures", court: "Dinosaures", scene: "terre",
      texte: "Les dinosaures apparaissent. Ils vont dominer la vie sur les continents pendant plus de 160 millions d'années." },
    { t: AGE - 66e6, nom: "L'extinction des dinosaures", court: "Fin des dinosaures", scene: "meteorite",
      texte: "Un astéroïde d'environ 10 km de diamètre frappe la Terre, au Mexique actuel. Le climat est bouleversé et la plupart des espèces disparaissent, dont les dinosaures (sauf les ancêtres des oiseaux)." },
    { t: AGE - 3e5, nom: "Les premiers humains modernes", court: "Homo sapiens", scene: "terre",
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

  // données partagées avec la frise 3D (frise3d.js)
  window.HistoireUnivers = { EVENEMENTS: EVENEMENTS, AGE: AGE, duree: duree, calendrier: calendrier, nf: nf };

  /* ================= Calendrier cosmique (tableau) ================= */
  function initCalendrier() {
    var corps = document.getElementById("cal-corps");
    if (!corps) return;
    corps.innerHTML = EVENEMENTS.filter(function (e) { return e.court !== "3 minutes"; }).map(function (e) {
      return "<tr><td>" + e.nom + "</td><td class=\"nombre\">" + (e.t >= AGE ? "aujourd'hui" : "il y a " + duree(AGE - e.t)) + "</td><td class=\"nombre\"><strong>" + calendrier(e.t) + "</strong></td></tr>";
    }).join("");
  }

  /* ================= 3. L'expansion, du Big Bang à aujourd'hui ================= */
  function initExpansion() {
    var c2 = document.getElementById("expansion");
    if (!c2) return;
    var x2 = c2.getContext("2d"), W2, H2, d2 = 1, te = AGE, ref = 0, anim = null;
    var DIR = 20 * Math.PI / 180;
    var NOMMEES = [
      { nom: "Voie lactée", court: "Nous", x: 0, y: 0, c: "#FF8FA0" },
      { nom: "Galaxie A", court: "A", x: 0.45 * Math.cos(DIR), y: 0.45 * Math.sin(DIR), c: "#45D3C6" },
      { nom: "Galaxie B", court: "B", x: 0.9 * Math.cos(DIR), y: 0.9 * Math.sin(DIR), c: "#F5C451" },
      { nom: "Galaxie C", court: "C", x: 1.35 * Math.cos(DIR), y: 1.35 * Math.sin(DIR), c: "#A98BFF" }
    ];
    var AUTRES = (function () {
      var r = graine(31), g = [];
      for (var i = 0; i < 90; i++) {
        var px = r() * 4.4 - 1.6, py = r() * 2.6 - 1.1, ok = true;
        NOMMEES.forEach(function (n) { if (Math.hypot(n.x - px, n.y - py) < 0.16) ok = false; });
        if (ok) g.push({ x: px, y: py, ang: r() * 3.14, inc: 0.4 + r() * 0.5 });
      }
      return g;
    })();
    var UNITE = 100 / 0.45; // millions d'al aujourd'hui par unité
    // facteur d'échelle simplifié : distances = distances actuelles × (t / âge)^(2/3)
    function facteur(tt) { return Math.pow(Math.max(0, tt) / AGE, 2 / 3); }

    function redim() { var r = c2.getBoundingClientRect(); d2 = Math.min(2, window.devicePixelRatio || 1); W2 = r.width; H2 = r.height; c2.width = Math.round(W2 * d2); c2.height = Math.round(H2 * d2); }
    function galaxie(x, y, rg, ang, inc, coul, alpha) {
      x2.save(); x2.translate(x, y); x2.rotate(ang); x2.scale(1, inc);
      var g = x2.createRadialGradient(0, 0, 0, 0, 0, rg);
      g.addColorStop(0, "rgba(255,250,235," + alpha + ")"); g.addColorStop(0.4, "rgba(" + coul + "," + (alpha * 0.6) + ")"); g.addColorStop(1, "rgba(" + coul + ",0)");
      x2.fillStyle = g; x2.beginPath(); x2.arc(0, 0, rg, 0, 2 * Math.PI); x2.fill(); x2.restore();
    }
    function texte(t2, x, y, c, gras) {
      x2.font = (gras ? "700 " : "400 ") + (W2 < 520 ? "11px" : "13px") + " \"Atkinson Hyperlegible\", \"Segoe UI\", sans-serif"; x2.textAlign = "center"; x2.textBaseline = "middle";
      x2.lineWidth = 3; x2.strokeStyle = "rgba(7,10,30,0.85)"; x2.strokeText(t2, x, y); x2.fillStyle = c; x2.fillText(t2, x, y);
    }
    function dessiner(ms) {
      x2.setTransform(d2, 0, 0, d2, 0, 0);
      var a = facteur(te), petit = W2 < 520;
      var R = NOMMEES[ref], K = W2 * 0.55, ox = ref === 0 ? W2 * 0.1 : W2 * 0.5, oy = H2 * 0.64;
      function P(g) { return [ox + (g.x - R.x) * a * K, oy - (g.y - R.y) * a * K]; }
      // fond : chaud au début, froid ensuite
      x2.fillStyle = "#070A1E"; x2.fillRect(0, 0, W2, H2);
      var chaleur = te < 380000 ? 1 : Math.max(0, 1 - te / 400e6);
      if (chaleur > 0) {
        var g = x2.createRadialGradient(ox, oy, 0, ox, oy, Math.max(30, W2 * (0.15 + 0.5 * Math.min(1, te / 400e6))));
        g.addColorStop(0, "rgba(255,245,210," + (0.95 * chaleur) + ")"); g.addColorStop(0.4, "rgba(255,160,70," + (0.6 * chaleur) + ")"); g.addColorStop(1, "rgba(200,60,30,0)");
        x2.fillStyle = g; x2.fillRect(0, 0, W2, H2);
      }
      var galaxiesNees = Math.min(1, Math.max(0, (te - 250e6) / 300e6));
      AUTRES.forEach(function (g) {
        var p = P(g);
        if (p[0] < -10 || p[0] > W2 + 10 || p[1] < -10 || p[1] > H2 + 10) return;
        if (galaxiesNees < 1) { x2.fillStyle = "rgba(160,170,230," + (0.35 * (1 - galaxiesNees)) + ")"; x2.fillRect(p[0], p[1], 2, 2); }
        if (galaxiesNees > 0) galaxie(p[0], p[1], 6, g.ang, g.inc, "190,200,255", 0.75 * galaxiesNees);
      });
      NOMMEES.forEach(function (g, k) {
        var p = P(g);
        if (galaxiesNees > 0) galaxie(p[0], p[1], 12, 0.5, 0.6, k === 0 ? "255,180,190" : "220,220,255", galaxiesNees);
        else { x2.fillStyle = g.c; x2.beginPath(); x2.arc(p[0], p[1], 2.5, 0, 2 * Math.PI); x2.fill(); }
      });
      if (te > 0) {
        // étiquettes seulement quand les galaxies sont assez écartées
        var ecart = 0.45 * a * K;
        NOMMEES.forEach(function (g, k) {
          var p = P(g);
          if (ecart > 34 || k === ref) texte(petit ? g.court : g.nom + (k === 0 ? " (nous)" : ""), p[0], p[1] - (petit ? 17 : 22), g.c, true);
          if (k !== ref && ecart > 34) texte(nf(Math.hypot(g.x - R.x, g.y - R.y) * UNITE * a, 0) + (petit ? "" : " M al"), p[0], p[1] + (petit ? 17 : 22), "#ECE9F7", false);
        });
      } else texte("Toute la matière est rassemblée, très chaude et très dense", W2 / 2, H2 * 0.18, "#FFE1A8", true);
      x2.strokeStyle = "#FF5D72"; x2.lineWidth = 2; x2.beginPath(); x2.arc(ox, oy, 18, 0, 2 * Math.PI); x2.stroke(); x2.lineWidth = 1;
    }
    function majTexte() {
      var a = facteur(te), R = NOMMEES[ref];
      document.getElementById("exp-temps").textContent = te <= 0 ? "Big Bang" : te >= AGE ? "Aujourd'hui (13,8 milliards d'années)" : duree(te) + " après le Big Bang";
      document.getElementById("exp-pourcent").textContent = nf(a * 100, a < 0.1 ? 1 : 0) + " %";
      document.getElementById("exp-corps").innerHTML = NOMMEES.map(function (g, k) {
        if (k === ref) return "";
        var d = Math.hypot(g.x - R.x, g.y - R.y) * UNITE;
        return "<tr><td style=\"color:" + g.c + "\">" + g.nom + "</td><td class=\"nombre\"><strong>" + nf(d * a) + "</strong></td><td class=\"nombre\">" + nf(d) + "</td></tr>";
      }).join("");
      document.getElementById("exp-titre").textContent = ref === 0 ? "Vu depuis la Voie lactée" : "Vu depuis la galaxie B";
      var m;
      if (te <= 0) m = "Au Big Bang, toutes ces distances étaient nulles : <strong>tout l'espace observable était concentré</strong>, extrêmement chaud et dense.";
      else if (te < 250e6) m = "L'espace grandit déjà et se refroidit, mais il n'y a pas encore de galaxies : seulement du gaz chaud.";
      else if (ref === 0) m = "Toutes les distances augmentent. <strong>Plus une galaxie est loin, plus sa distance augmente vite</strong> : celle de C grandit trois fois plus vite que celle de A.";
      else m = "Depuis B, on observe exactement la même chose : tout s'éloigne. <strong>L'Univers n'a pas de centre</strong> : c'est l'espace entre les galaxies qui grandit.";
      document.getElementById("exp-message").innerHTML = m;
    }
    var curseur = document.getElementById("exp-curseur");
    function depuisCurseur() { te = Number(curseur.value) / 1000 * AGE; }
    function versCurseur() { curseur.value = String(Math.round(te / AGE * 1000)); }
    curseur.addEventListener("input", function () { anim = null; depuisCurseur(); majTexte(); });
    var bouton = document.getElementById("exp-animer");
    bouton.addEventListener("click", function () {
      if (reduit) { te = AGE; versCurseur(); majTexte(); return; }
      te = 0; versCurseur(); anim = performance.now();
    });
    var vue = document.getElementById("exp-vue");
    vue.addEventListener("click", function () {
      ref = ref === 0 ? 2 : 0;
      vue.textContent = ref === 0 ? "Se placer sur la galaxie B" : "Revenir sur la Voie lactée";
      vue.setAttribute("aria-pressed", ref === 2 ? "true" : "false");
      majTexte();
    });
    (function boucle2(ms) {
      if (anim != null) {
        var p = Math.min(1, (ms - anim) / 12000);
        te = p * AGE; versCurseur(); majTexte();
        if (p >= 1) anim = null;
      }
      dessiner(ms);
      requestAnimationFrame(boucle2);
    })(0);
    redim(); window.addEventListener("resize", redim);
    versCurseur(); majTexte();
  }

  document.addEventListener("DOMContentLoaded", function () { initCalendrier(); initExpansion(); });
})();
