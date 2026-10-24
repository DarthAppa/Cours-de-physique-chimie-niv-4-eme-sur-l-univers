/* Partie 2 — Le système solaire
   1. Planétaire : orbites circulaires parcourues à vitesse constante (modèle du programme de 4e),
      périodes de révolution réelles, distances à l'échelle ou resserrées.
   2. Maquette : le système solaire à l'échelle d'un objet du quotidien. */

(function () {
  "use strict";

  var UA_KM = 149.6e6, C_KMS = 299792.458, SOLEIL_D = 1392700;
  var PLANETES = [
    { nom: "Mercure", temp: 167, temp2: "de -180 °C la nuit à 430 °C le jour", nature: "Rocheuse, avec une surface solide", a: 0.387, d: 4879, j: 88, lunes: 0, type: "tellurique", c: "#B9B2A8", ang: 40,
      texte: "La plus petite et la plus proche du Soleil. Sans atmosphère, elle passe de 430 °C le jour à -180 °C la nuit." },
    { nom: "Vénus", temp: 464, nature: "Rocheuse, avec une surface solide", a: 0.723, d: 12104, j: 225, lunes: 0, type: "tellurique", c: "#E8CB8A", ang: 150,
      texte: "Presque aussi grande que la Terre, mais couverte de nuages épais. C'est la planète la plus chaude : environ 465 °C." },
    { nom: "Terre", temp: 15, nature: "Rocheuse, avec une surface solide", a: 1.0, d: 12742, j: 365.25, lunes: 1, type: "tellurique", c: "#5DA9FF", ang: 0,
      texte: "Notre planète : la seule connue où l'eau est liquide en surface et où la vie existe." },
    { nom: "Mars", temp: -65, nature: "Rocheuse, avec une surface solide", a: 1.524, d: 6779, j: 687, lunes: 2, type: "tellurique", c: "#E0714F", ang: 220,
      texte: "La planète rouge, couleur due à la rouille (oxyde de fer) de son sol. Elle a deux petits satellites, Phobos et Déimos." },
    { nom: "Jupiter", temp: -110, nuages: true, nature: "Gazeuse (hydrogène et hélium), sans surface solide", a: 5.20, d: 139820, j: 4333, lunes: 115, type: "géante gazeuse", c: "#D9B38C", ang: 120,
      texte: "La plus grande planète : 11 Terres côte à côte. Sa Grande Tache rouge est une tempête plus grande que la Terre." },
    { nom: "Saturne", temp: -140, nuages: true, nature: "Gazeuse (hydrogène et hélium), sans surface solide", a: 9.54, d: 116460, j: 10759, lunes: 293, type: "géante gazeuse", c: "#E9D49B", ang: 300, anneaux: true,
      texte: "Célèbre pour ses anneaux de glace et de roche. C'est la planète qui a le plus de satellites connus." },
    { nom: "Uranus", temp: -195, nuages: true, nature: "Gaz et glaces (eau, ammoniac, méthane), sans surface solide", a: 19.19, d: 50724, j: 30687, lunes: 29, type: "géante de glace", c: "#9FE3E8", ang: 30,
      texte: "Elle tourne couchée sur le côté. Sa couleur bleu-vert vient du méthane de son atmosphère." },
    { nom: "Neptune", temp: -200, nuages: true, nature: "Gaz et glaces (eau, ammoniac, méthane), sans surface solide", a: 30.07, d: 49244, j: 60190, lunes: 16, type: "géante de glace", c: "#6E8CFF", ang: 205,
      texte: "La plus lointaine. Ses vents sont les plus rapides du système solaire : plus de 2 000 km/h." }
  ];

  function nf(v, dec) { return v.toLocaleString("fr-FR", { maximumFractionDigits: dec == null ? 0 : dec, minimumFractionDigits: 0 }); }
  function duree(jours) {
    if (jours < 400) return nf(jours, 2) + " jours";
    return nf(jours / 365.25, 1) + " ans";
  }
  function lumiere(km) {
    var s = km / C_KMS;
    if (s < 3600) { var m = Math.floor(s / 60); return m + " min " + Math.round(s - m * 60) + " s"; }
    var h = Math.floor(s / 3600); return h + " h " + Math.round((s - h * 3600) / 60) + " min";
  }
  function lunes(n) { return n === 0 ? "aucun" : n === 1 ? "1 (la Lune)" : nf(n); }

  /* ================= Planétaire ================= */
  var cv, ctx, W, H, dpr = 1, echelleReelle = false, joursParSeconde = 30, enPause = false;
  var jours = 0, dernier = 0, choisie = 2, positions = [];
  var reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CEINTURE = (function () {
    var s = 12345, out = [];
    function r() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    for (var i = 0; i < 700; i++) out.push(2.2 + r() * 1.1, r() * 2 * Math.PI, 0.3 + r() * 0.5);
    return out;
  })();
  var KUIPER = (function () {
    var s = 999, out = [];
    function r() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    for (var i = 0; i < 900; i++) out.push(30 + r() * 20, r() * 2 * Math.PI);
    return out;
  })();

  function rayonOrbite(a, Rmax) { return echelleReelle ? Rmax * a / 32 : 34 + (Rmax - 34) * Math.sqrt(a / 32); }
  function taillePlanete(p) { return 2.5 + 2.4 * Math.log(p.d / 4000) / Math.LN2 * 0.55; }

  function texte(t, x, y, opt) {
    opt = opt || {};
    ctx.save();
    ctx.font = (opt.gras ? "700 " : "400 ") + (opt.taille || 12) + 'px "Atkinson Hyperlegible", "Segoe UI", sans-serif';
    ctx.textAlign = opt.align || "left"; ctx.textBaseline = "middle";
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(7,10,30,0.85)"; ctx.strokeText(t, x, y);
    ctx.fillStyle = opt.couleur || "#ECE9F7"; ctx.fillText(t, x, y);
    ctx.restore();
  }

  function dessiner() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#070A1E"; ctx.fillRect(0, 0, W, H);
    var cx = W / 2, cy = H / 2, Rmax = Math.min(W, H) / 2 - 18;
    var i, p;

    // étoiles de fond
    var s = 7;
    for (i = 0; i < 180; i++) {
      s = (s * 16807) % 2147483647; var x = (s / 2147483647) * W;
      s = (s * 16807) % 2147483647; var y = (s / 2147483647) * H;
      ctx.fillStyle = i % 5 === 0 ? "rgba(255,220,180,0.45)" : "rgba(200,210,255,0.35)";
      ctx.fillRect(x, y, 1, 1);
    }

    // ceinture d'astéroïdes et de Kuiper
    ctx.fillStyle = "rgba(200,185,160,0.55)";
    for (i = 0; i < CEINTURE.length; i += 3) {
      var ra = rayonOrbite(CEINTURE[i], Rmax), an = CEINTURE[i + 1] + jours * 2 * Math.PI / (365.25 * Math.pow(CEINTURE[i], 1.5));
      ctx.fillRect(cx + ra * Math.cos(an), cy - ra * Math.sin(an), CEINTURE[i + 2] * 2, CEINTURE[i + 2] * 2);
    }
    ctx.fillStyle = "rgba(160,190,255,0.35)";
    for (i = 0; i < KUIPER.length; i += 2) {
      var rk = rayonOrbite(KUIPER[i], Rmax);
      if (rk > Rmax * 1.6) continue;
      ctx.fillRect(cx + rk * Math.cos(KUIPER[i + 1]), cy - rk * Math.sin(KUIPER[i + 1]), 1, 1);
    }

    // orbites
    PLANETES.forEach(function (pl, k) {
      ctx.strokeStyle = k === choisie ? "rgba(255,93,114,0.75)" : "rgba(93,106,184,0.55)";
      ctx.lineWidth = k === choisie ? 1.6 : 1;
      ctx.beginPath(); ctx.arc(cx, cy, rayonOrbite(pl.a, Rmax), 0, 2 * Math.PI); ctx.stroke();
    });

    // Soleil
    var rs = echelleReelle ? 7 : 18;
    var gs = ctx.createRadialGradient(cx, cy, 0, cx, cy, rs);
    gs.addColorStop(0, "rgba(255,245,200,1)"); gs.addColorStop(0.4, "rgba(255,205,90,0.95)"); gs.addColorStop(1, "rgba(255,140,40,0)");
    ctx.fillStyle = gs; ctx.beginPath(); ctx.arc(cx, cy, rs, 0, 2 * Math.PI); ctx.fill();

    // planètes
    positions = [];
    PLANETES.forEach(function (pl, k) {
      var R = rayonOrbite(pl.a, Rmax);
      var an = pl.ang * Math.PI / 180 + jours * 2 * Math.PI / pl.j;
      var X = cx + R * Math.cos(an), Y = cy - R * Math.sin(an), t = taillePlanete(pl);
      positions.push([X, Y, t]);
      if (pl.anneaux) {
        ctx.save(); ctx.strokeStyle = "rgba(233,212,155,0.8)"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(X, Y, t * 2.1, t * 0.75, -0.4, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
      }
      var g = ctx.createRadialGradient(X - t * 0.35, Y - t * 0.35, 0, X, Y, t);
      g.addColorStop(0, "#ffffff"); g.addColorStop(0.25, pl.c); g.addColorStop(1, "rgba(20,25,60,1)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, t, 0, 2 * Math.PI); ctx.fill();
      if (k === choisie) {
        ctx.strokeStyle = "#FF5D72"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(X, Y, t + 5, 0, 2 * Math.PI); ctx.stroke();
      }
      var visible = R > 40 || k === choisie;
      if (visible && X > -20 && X < W + 20 && Y > -20 && Y < H + 20) texte(pl.nom, X + t + 5, Y - t - 3, { gras: k === choisie, couleur: k === choisie ? "#FF8FA0" : "#ECE9F7" });
    });

    if (!echelleReelle) texte("Ceinture d'astéroïdes", cx + rayonOrbite(2.75, Rmax) * 0.71 + 4, cy + rayonOrbite(2.75, Rmax) * 0.71 + 4, { taille: 11, couleur: "#D8C9A8" });

    document.getElementById("pl-temps").textContent = jours < 730 ? nf(jours) + " jours" : nf(jours / 365.25, 1) + " ans";
  }

  function majFiche() {
    var p = PLANETES[choisie];
    document.getElementById("pl-nom").textContent = p.nom;
    document.getElementById("pl-type").textContent = "Planète " + p.type;
    document.getElementById("pl-texte").textContent = p.texte;
    document.getElementById("pl-distance").textContent = nf(p.a, 2) + " ua, soit " + nf(p.a * UA_KM / 1e6) + " millions de km";
    document.getElementById("pl-diametre").textContent = nf(p.d) + " km" + (p.nom === "Terre" ? "" : ", soit " + nf(p.d / 12742, p.d < 12742 ? 2 : 1) + " fois la Terre");
    document.getElementById("pl-revolution").textContent = duree(p.j);
    document.getElementById("pl-lumiere").textContent = lumiere(p.a * UA_KM);
    document.getElementById("pl-lunes").textContent = lunes(p.lunes);
    document.getElementById("pl-nature").textContent = p.nature;
    document.getElementById("pl-temp-titre").textContent = p.nuages ? "Température au sommet des nuages" : "Température moyenne de surface";
    document.getElementById("pl-temperature").textContent = (p.temp > 0 ? "" : "") + nf(p.temp) + " °C" + (p.temp2 ? " (" + p.temp2 + ")" : "");
    document.querySelectorAll("#pl-choix button").forEach(function (b, k) { b.setAttribute("aria-pressed", k === choisie ? "true" : "false"); });
  }

  function boucle(t) {
    var dt = dernier ? Math.min(0.1, (t - dernier) / 1000) : 0;
    dernier = t;
    if (!enPause && !reduit) jours += joursParSeconde * dt;
    dessiner();
    requestAnimationFrame(boucle);
  }

  function redimensionner() {
    var r = cv.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }

  function initPlanetaire() {
    cv = document.getElementById("planetaire");
    if (!cv) return;
    ctx = cv.getContext("2d");
    var choix = document.getElementById("pl-choix");
    PLANETES.forEach(function (p, k) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = p.nom;
      b.addEventListener("click", function () { choisie = k; majFiche(); });
      choix.appendChild(b);
    });
    cv.addEventListener("click", function (e) {
      var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = -1, dmin = 1e9;
      positions.forEach(function (q, k) { var d = Math.hypot(q[0] - x, q[1] - y); if (d < dmin) { dmin = d; best = k; } });
      if (best >= 0 && dmin < 22) { choisie = best; majFiche(); }
    });
    document.getElementById("pl-vitesse").addEventListener("change", function (e) { joursParSeconde = Number(e.target.value); });
    var pause = document.getElementById("pl-pause");
    pause.addEventListener("click", function () {
      enPause = !enPause;
      pause.textContent = enPause ? "Reprendre" : "Pause";
      pause.setAttribute("aria-pressed", enPause ? "true" : "false");
    });
    if (reduit) { enPause = true; pause.textContent = "Reprendre"; reduit = false; }
    document.querySelectorAll('input[name="pl-echelle"]').forEach(function (r) {
      r.addEventListener("change", function () { echelleReelle = document.querySelector('input[name="pl-echelle"]:checked').value === "reelle"; });
    });
    redimensionner();
    window.addEventListener("resize", redimensionner);
    majFiche();
    requestAnimationFrame(boucle);
  }

  /* ================= Maquette à l'échelle ================= */
  function longueur(m) {
    if (m < 0.01) return nf(m * 1000, 1) + " mm";
    if (m < 1) return nf(m * 100, 1) + " cm";
    if (m < 1000) return nf(m, m < 10 ? 1 : 0) + " m";
    return nf(m / 1000, m < 10000 ? 1 : 0) + " km";
  }
  function comparaison(m) {
    if (m < 0.00025) return "un grain de poussière";
    if (m < 0.0012) return "un grain de sable";
    if (m < 0.003) return "une tête d'épingle";
    if (m < 0.012) return "un petit pois";
    if (m < 0.03) return "une bille";
    if (m < 0.08) return "une balle de tennis";
    return "un melon";
  }
  function trajet(m) {
    if (m < 10) return "dans la même salle";
    if (m < 60) return "de l'autre côté de la cour";
    if (m < 1000) { var n = m / 100; return "à " + nf(n, n < 3 ? 1 : 0) + " terrain" + (n >= 2 ? "s" : "") + " de foot"; }
    return "à " + nf(m / 1000, 1) + " km du collège";
  }
  function initMaquette() {
    var sel = document.getElementById("maq-objet");
    if (!sel) return;
    function calcul() {
      var dSoleil = Number(sel.value);         // diamètre de l'objet en mètres
      var f = dSoleil / SOLEIL_D;               // mètres par km
      var lignes = PLANETES.map(function (p) {
        var taille = p.d * f, dist = p.a * UA_KM * f;
        return "<tr><td>" + p.nom + "</td><td><strong>" + longueur(taille) + "</strong><br><span class=\"texte-doux\">" + comparaison(taille) +
          "</span></td><td><strong>" + longueur(dist) + "</strong><br><span class=\"texte-doux\">" + trajet(dist) + "</span></td></tr>";
      }).join("");
      document.getElementById("maq-corps").innerHTML = lignes;
      var prox = 4.24 * 9.4607e12 * f;
      var nep = 30.07 * UA_KM * f;
      document.getElementById("maq-bilan").innerHTML =
        "Avec ce Soleil, la Terre est à <strong>" + longueur(UA_KM * f) + "</strong> et Neptune à <strong>" + longueur(nep) +
        "</strong>. Et l'étoile la plus proche, Proxima du Centaure, serait à <strong>" + longueur(prox) + "</strong> : " +
        (prox >= 5800000 ? "plus loin que Paris – New York (5 800 km)." : prox >= 690000 ? "plus loin que Nice – Paris (environ 690 km)." : "à plusieurs centaines de kilomètres.");
    }
    sel.addEventListener("change", calcul);
    calcul();
  }

  document.addEventListener("DOMContentLoaded", function () { initPlanetaire(); initMaquette(); });
})();
