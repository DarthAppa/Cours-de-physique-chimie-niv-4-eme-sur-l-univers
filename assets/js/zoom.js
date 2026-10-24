/* Zoom cosmique à l'échelle réelle
   Tout est dessiné à sa vraie taille relative. La variable s est le logarithme décimal
   de la largeur de la vue en kilomètres : s = 4,5 → 30 000 km ; s = 24 → 10^24 km.
   L'observateur (la Terre) reste au centre de l'écran. */

(function () {
  "use strict";

  var KM_AL = 9.4607e12;      // 1 année-lumière en km
  var UA = 1.496e8;           // 1 unité astronomique en km
  var DEG = Math.PI / 180;

  var NIVEAUX = [
    { s: 4.5, nom: "La Terre", court: "Terre",
      taille: "12 742 km de diamètre",
      lumiere: "0,04 seconde pour la traverser",
      texte: "Notre planète, couverte d'océans et de continents. C'est ici que tu te trouves." },
    { s: 6.05, nom: "La Terre et la Lune", court: "Lune",
      taille: "384 400 km entre la Terre et la Lune",
      lumiere: "1,3 seconde de la Lune à la Terre",
      texte: "La Lune, notre satellite naturel, tourne autour de la Terre. Il faudrait environ 30 Terres alignées pour l'atteindre." },
    { s: 10.05, nom: "Le système solaire", court: "Système solaire",
      taille: "environ 9 milliards de km (orbite de Neptune)",
      lumiere: "environ 8 heures pour le traverser",
      texte: "Le Soleil est une étoile. Huit planètes tournent autour de lui. La Terre en est à 150 millions de km : c'est l'unité astronomique (ua). En orange, la sonde Voyager 1." },
    { s: 14.45, nom: "Les étoiles voisines", court: "Étoiles voisines",
      taille: "Proxima du Centaure à 4,24 al, environ 40 000 milliards de km",
      lumiere: "4 ans et 3 mois depuis Proxima",
      texte: "Le Soleil n'est qu'une étoile parmi d'autres. Les distances deviennent si grandes qu'on les mesure en années-lumière (al)." },
    { s: 18.2, nom: "La Voie lactée", court: "Voie lactée",
      taille: "environ 100 000 al de diamètre",
      lumiere: "100 000 ans pour la traverser",
      texte: "Notre galaxie : un disque de 100 à 400 milliards d'étoiles qui tourne autour de son centre. Le Soleil est dans un bras, à environ 26 000 al du centre." },
    { s: 20.25, nom: "L'amas de galaxies", court: "Amas de galaxies",
      taille: "environ 10 millions d'al",
      lumiere: "2,5 millions d'années depuis Andromède",
      texte: "Une soixantaine de galaxies liées par la gravitation. Les deux plus grandes sont la Voie lactée et la galaxie d'Andromède." },
    { s: 22.1, nom: "Laniakea", court: "Laniakea",
      taille: "environ 520 millions d'al",
      lumiere: "520 millions d'années pour le traverser",
      texte: "Un superamas d'environ 100 000 galaxies, dont la nôtre, en bordure. Son nom vient de l'hawaïen et signifie « ciel immense »." },
    { s: 24.0, nom: "L'Univers observable", court: "Univers observable",
      taille: "environ 93 milliards d'al de diamètre",
      lumiere: "la lumière la plus ancienne voyage depuis 13,8 milliards d'années",
      texte: "Tout ce que nous pouvons observer. Plus loin, la lumière n'a pas encore eu le temps de nous parvenir. Il dépasse 13,8 milliards d'al car l'Univers s'est dilaté pendant le voyage de la lumière." }
  ];
  var S_MIN = 4.3, S_MAX = 24.2;

  // Terre réaliste précalculée (contours Natural Earth, projection orthographique)
  var TERRE_IMG = new Image();
  var terrePrete = false;
  TERRE_IMG.onload = function () { terrePrete = true; };
  TERRE_IMG.src = "assets/img/terre.webp";
  var TERRE_ECHELLE = 512 / 510;           // le disque occupe 510/512 de la demi-largeur de l'image
  var FRANCE = [0.4429, 0.3308];           // position de la France dans l'image (fraction)

  // Voyager 1 : trajectoire simplifiée, en ua (repère du dessin)
  var VOYAGER = (function () {
    var pts = [], i, u, ang, r;
    var A0 = 230, AJ = 370, AS = 420, AF = 475; // angles en degrés (lancement, Jupiter, Saturne, aujourd'hui)
    for (i = 0; i <= 40; i++) { u = i / 40; ang = A0 + (AJ - A0) * u; r = 1 + 4.2 * Math.pow(u, 1.25); pts.push([r * Math.cos(ang * DEG), r * Math.sin(ang * DEG)]); }
    for (i = 1; i <= 25; i++) { u = i / 25; ang = AJ + (AS - AJ) * u; r = 5.2 + 4.34 * u; pts.push([r * Math.cos(ang * DEG), r * Math.sin(ang * DEG)]); }
    var S = pts[pts.length - 1];
    var F = [172 * Math.cos(AF * DEG), 172 * Math.sin(AF * DEG)];
    return {
      courbe: pts, saturne: S, fin: F,
      jupiter: [5.2 * Math.cos(AJ * DEG), 5.2 * Math.sin(AJ * DEG)],
      heliopause: [S[0] + (F[0] - S[0]) * ((121 - 9.54) / (172 - 9.54)), S[1] + (F[1] - S[1]) * ((121 - 9.54) / (172 - 9.54))]
    };
  })();
  var ORANGE = "#FF9F1C";

  // Voie lactée précalculée (vue de dessus) : Soleil sous le centre, à 26 000 al
  var VL_IMG = new Image(), vlPrete = false;
  VL_IMG.onload = function () { vlPrete = true; };
  VL_IMG.src = "assets/img/voie-lactee.webp";
  var VL_COTE = 1 / 0.0000092;          // côté de l'image en années-lumière (≈ 108 700 al)
  var VL_ROT = 60 * DEG;                // rotation qui place le Soleil au centre de l'écran
  var VL_PITCH = Math.tan(16 * DEG), VL_BARRE = 25 * DEG;
  function brasImage(theta0, r0, rr) { var th = theta0 + Math.log(rr / r0) / VL_PITCH; return [rr * Math.cos(th), rr * Math.sin(th)]; }
  var VL_REPERES = [   // positions dans l'image (al), données par le calcul de la galaxie
    { nom: "Barre centrale d'étoiles", p: [8954, 3173] },
    { nom: "Bras de l'Écu-Croix", p: [8822, -34902] },
    { nom: "Bras de Persée", p: [-25889, 30492] }
  ];

  // Univers observable : toile cosmique en 3D (unités : rayon = 1)
  var TOILE3D = (function () {
    var r = graine(77), nN = 900, noeuds = new Float32Array(nN * 3), i, j;
    for (i = 0; i < nN; i++) {
      var x, y, z;
      if (i === 0) { x = y = z = 0; }
      else { do { x = r() * 2 - 1; y = r() * 2 - 1; z = r() * 2 - 1; } while (x * x + y * y + z * z > 0.94); }
      noeuds[i * 3] = x; noeuds[i * 3 + 1] = y; noeuds[i * 3 + 2] = z;
    }
    var aretes = [], degre = new Uint8Array(nN);
    for (i = 0; i < nN; i++) {
      var best = [[9, -1], [9, -1], [9, -1]];
      for (j = 0; j < nN; j++) if (j !== i) {
        var dx = noeuds[j * 3] - noeuds[i * 3], dy = noeuds[j * 3 + 1] - noeuds[i * 3 + 1], dz = noeuds[j * 3 + 2] - noeuds[i * 3 + 2];
        var d = dx * dx + dy * dy + dz * dz;
        if (d < best[2][0]) { best[2] = [d, j]; best.sort(function (a, b) { return a[0] - b[0]; }); }
      }
      var k = r() < 0.55 ? 3 : 2;
      for (var q = 0; q < k; q++) if (best[q][1] > i || r() < 0.5) { aretes.push(i, best[q][1]); degre[i]++; degre[best[q][1]]++; }
    }
    var nP = 34000, pts = new Float32Array(nP * 3);
    for (i = 0; i < nP; i++) {
      var e = Math.floor(r() * aretes.length / 2) * 2, a = aretes[e], b = aretes[e + 1];
      var t = r(), sx = 0.011, amas = r() < 0.28;
      if (amas) { t = r() < 0.5 ? 0 : 1; sx = 0.016; }
      for (var c = 0; c < 3; c++) pts[i * 3 + c] = noeuds[a * 3 + c] + (noeuds[b * 3 + c] - noeuds[a * 3 + c]) * t + gauss(r) * sx;
    }
    var gros = [];
    for (i = 0; i < nN; i++) if (degre[i] >= 5) gros.push(i);
    return { noeuds: noeuds, aretes: aretes, pts: pts, gros: gros };
  })();
  var PROF_COULEURS = ["rgba(90,105,235,", "rgba(120,120,250,", "rgba(165,130,255,", "rgba(205,145,250,", "rgba(240,165,230,", "rgba(255,200,225,"];

  /* ---------- musique (désactivée au chargement) ---------- */
  var MUSIQUE_ID = "4y33h81phKU";   // Interstellar, thème principal (version piano), Patrik Pietschmann
  var DUREE_VOYAGE = 45;             // secondes : durée du voyage automatique
  var lecteur = null, lecteurPret = false, sonActif = false, boutonSon = null;

  /* ---------- hasard reproductible ---------- */
  function graine(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()); }

  /* ---------- données des objets (positions relatives à la Terre) ---------- */
  var SOLEIL = { x: -UA, y: 0, r: 696000 };
  var PLANETES = [
    { nom: "Mercure", a: 0.39, ang: 40, r: 2440, c: "#B9B2A8" },
    { nom: "Vénus", a: 0.72, ang: 150, r: 6052, c: "#E8CB8A" },
    { nom: "Terre", a: 1.0, ang: 0, r: 6371, c: "#5DA9FF" },
    { nom: "Mars", a: 1.52, ang: 220, r: 3390, c: "#E0714F" },
    { nom: "Jupiter", a: 5.2, ang: 120, r: 69911, c: "#D9B38C" },
    { nom: "Saturne", a: 9.54, ang: 300, r: 58232, c: "#E9D49B" },
    { nom: "Uranus", a: 19.2, ang: 30, r: 25362, c: "#9FE3E8" },
    { nom: "Neptune", a: 30.1, ang: 205, r: 24622, c: "#6E8CFF" }
  ];
  var ETOILES = [
    { nom: "Proxima du Centaure", d: 4.24, ang: 200, c: "#FF9B7A", etiq: true },
    { nom: "Alpha du Centaure", d: 4.37, ang: 204, c: "#FFF1C9", etiq: false },
    { nom: "Étoile de Barnard", d: 5.96, ang: 80, c: "#FF9B7A", etiq: true },
    { nom: "Wolf 359", d: 7.86, ang: 128, c: "#FF8F6E", etiq: false },
    { nom: "Sirius", d: 8.6, ang: 322, c: "#CFE0FF", etiq: true },
    { nom: "Epsilon Eridani", d: 10.5, ang: 18, c: "#FFD9A0", etiq: false },
    { nom: "Procyon", d: 11.46, ang: 292, c: "#F4F1FF", etiq: true },
    { nom: "Tau Ceti", d: 11.9, ang: 248, c: "#FFE7B5", etiq: false },
    { nom: "Ross 128", d: 11.0, ang: 160, c: "#FF8F6E", etiq: false },
    { nom: "Lalande 21185", d: 8.3, ang: 52, c: "#FF9B7A", etiq: false }
  ];

  // Voie lactée : centre à 26 000 al, vue de dessus. Un bras passe par le Soleil.
  var VL = { d: 26000, ang: 30 };
  VL.cx = VL.d * Math.cos(VL.ang * DEG);
  VL.cy = VL.d * Math.sin(VL.ang * DEG);
  var VL_POINTS = (function () {
    var r = graine(7), pts = [], pitch = Math.tan(13 * DEG);
    var versNous = Math.atan2(-VL.cy, -VL.cx);
    var decalage = versNous - Math.log(VL.d / 3000) / pitch;
    var i, rr, th, x, y, bras;
    for (i = 0; i < 6500; i++) {
      bras = i % 4;
      rr = 3000 * Math.exp(r() * Math.log(52000 / 3000));
      th = decalage + bras * Math.PI / 2 + Math.log(rr / 3000) / pitch;
      th += gauss(r) * (bras % 2 ? 0.2 : 0.12);
      var ep = gauss(r) * rr * 0.06;
      x = rr * Math.cos(th) + ep * Math.cos(th + Math.PI / 2);
      y = rr * Math.sin(th) + ep * Math.sin(th + Math.PI / 2);
      var couleur = r() < 0.06 ? 2 : r() < 0.25 ? 1 : 0;
      pts.push(x, y, couleur);
    }
    for (i = 0; i < 900; i++) { // bulbe et barre
      rr = Math.abs(gauss(r)) * 3200;
      th = r() * 2 * Math.PI;
      x = rr * Math.cos(th) * 1.7; y = rr * Math.sin(th) * 0.7;
      var c = Math.cos(25 * DEG), sn = Math.sin(25 * DEG);
      pts.push(x * c - y * sn, x * sn + y * c, 3);
    }
    for (i = 0; i < 1600; i++) { // disque diffus
      rr = -Math.log(r() + 1e-9) * 13000;
      if (rr > 55000) continue;
      th = r() * 2 * Math.PI;
      pts.push(rr * Math.cos(th), rr * Math.sin(th), 0);
    }
    return pts;
  })();
  var VL_COULEURS = ["rgba(176,198,255,", "rgba(232,236,255,", "rgba(255,120,145,", "rgba(255,200,130,"];

  function disqueIncline(seed, n, rayon, inclinaison, anglePos) {
    var r = graine(seed), pts = [], ci = Math.cos(inclinaison * DEG), ca = Math.cos(anglePos * DEG), sa = Math.sin(anglePos * DEG);
    for (var i = 0; i < n; i++) {
      var rr = -Math.log(r() + 1e-9) * rayon * 0.32;
      if (rr > rayon) continue;
      var th = r() * 2 * Math.PI + (i % 2) * 0.4 * Math.log(1 + rr / rayon * 6);
      var x = rr * Math.cos(th), y = rr * Math.sin(th) * ci;
      pts.push(x * ca - y * sa, x * sa + y * ca);
    }
    return pts;
  }
  var ANDROMEDE = { d: 2.5e6, ang: 40, pts: disqueIncline(11, 2600, 110000, 77, 38) };
  var TRIANGLE = { d: 2.73e6, ang: 52, pts: disqueIncline(12, 600, 30000, 55, -20) };
  var NUAGES = [
    { nom: "Grand Nuage de Magellan", d: 160000, ang: -100, pts: disqueIncline(13, 380, 7000, 30, 10) },
    { nom: "Petit Nuage de Magellan", d: 200000, ang: -112, pts: disqueIncline(14, 220, 4000, 40, 70) }
  ];
  [ANDROMEDE, TRIANGLE].concat(NUAGES).forEach(function (g) {
    g.x = g.d * Math.cos(g.ang * DEG); g.y = g.d * Math.sin(g.ang * DEG);
  });
  var GL_CENTRE = { x: 1.25e6 * Math.cos(40 * DEG), y: 1.25e6 * Math.sin(40 * DEG) };
  var NAINES = (function () {
    var r = graine(21), p = [];
    for (var i = 0; i < 46; i++) {
      var rr = Math.sqrt(r()) * 4.6e6, th = r() * 2 * Math.PI;
      p.push(GL_CENTRE.x + rr * Math.cos(th), GL_CENTRE.y + rr * Math.sin(th));
    }
    return p;
  })();

  // Toile de galaxies, en millions d'al
  function toile(seed, nNoeuds, rayon, nPoints, centre, jitter) {
    var r = graine(seed), noeuds = [], pts = [], i, j;
    for (i = 0; i < nNoeuds; i++) {
      var rr = Math.sqrt(r()) * rayon, th = r() * 2 * Math.PI;
      noeuds.push([centre.x + rr * Math.cos(th), centre.y + rr * Math.sin(th)]);
    }
    var aretes = [];
    for (i = 0; i < nNoeuds; i++) {
      var d = [];
      for (j = 0; j < nNoeuds; j++) if (j !== i) {
        var dx = noeuds[j][0] - noeuds[i][0], dy = noeuds[j][1] - noeuds[i][1];
        d.push([dx * dx + dy * dy, j]);
      }
      d.sort(function (a, b) { return a[0] - b[0]; });
      aretes.push([i, d[0][1]], [i, d[1][1]]);
      if (r() < 0.5) aretes.push([i, d[2][1]]);
    }
    for (i = 0; i < nPoints; i++) {
      var e = aretes[Math.floor(r() * aretes.length)];
      var a = noeuds[e[0]], b = noeuds[e[1]];
      var t = r(), L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      var jx = gauss(r) * L * jitter, jy = gauss(r) * L * jitter;
      if (r() < 0.25) { t = 0; jx = gauss(r) * L * jitter * 2.2; jy = gauss(r) * L * jitter * 2.2; }
      pts.push(a[0] + (b[0] - a[0]) * t + jx, a[1] + (b[1] - a[1]) * t + jy);
    }
    return pts;
  }
  var LANIAKEA = { x: 250 * Math.cos(200 * DEG), y: 250 * Math.sin(200 * DEG), r: 260 };
  var LANIAKEA_PTS = toile(31, 70, 560, 6500, LANIAKEA, 0.05);
  var UNIVERS_R = 46500; // millions d'al
  var UNIVERS_PTS = toile(41, 520, UNIVERS_R * 0.97, 11000, { x: 0, y: 0 }, 0.045);

  /* ---------- état ---------- */
  var canvas, ctx, W = 0, H = 0, dpr = 1;
  var s = NIVEAUX[0].s, anim = null, lecture = false, dernier = 0;
  var curseur, boutonsEtapes = [], boutonLecture, elNum, elNom, elTexte, elTaille, elLumiere, elEchelleBarre, elEchelleTexte;
  var reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function rampe(v, a, b) { var t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function vis(a, b, f) { f = f || 0.5; return rampe(s, a, a + f) * (1 - rampe(s, b - f, b)); }

  function texte(t, x, y, opt) {
    opt = opt || {};
    ctx.save();
    ctx.globalAlpha = opt.alpha == null ? 1 : opt.alpha;
    ctx.font = (opt.gras ? "700 " : "400 ") + (opt.taille || 13) + 'px "Atkinson Hyperlegible", "Segoe UI", sans-serif';
    ctx.textAlign = opt.align || "left";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(7,10,30,0.85)";
    ctx.strokeText(t, x, y);
    ctx.fillStyle = opt.couleur || "#ECE9F7";
    ctx.fillText(t, x, y);
    ctx.restore();
  }

  function dessiner() {
    var k = W / Math.pow(10, s); // pixels par km
    var kal = k * KM_AL;         // pixels par année-lumière
    var cx = W / 2, cy = H / 2;
    function px(x) { return cx + x * k; }
    function py(y) { return cy - y * k; }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#070A1E";
    ctx.fillRect(0, 0, W, H);

    // étoiles de fond, fixes
    var fond = graine(3);
    var TEINTES = ["rgba(170,195,255,", "rgba(235,238,255,", "rgba(255,236,190,", "rgba(255,190,150,", "rgba(255,160,170,"];
    for (var i = 0; i < 220; i++) {
      var bx0 = fond() * W, by0 = fond() * H, te = TEINTES[Math.floor(fond() * TEINTES.length)], ta = fond();
      ctx.fillStyle = te + (0.25 + 0.5 * ta) + ")";
      ctx.fillRect(bx0, by0, ta > 0.93 ? 2 : 1, ta > 0.93 ? 2 : 1);
    }

    var a, j, x, y;

    /* Univers observable */
    a = vis(22.55, 24.6, 0.55);
    if (a > 0) {
      var kM = kal * 1e6;
      var R = UNIVERS_R * kM;
      var g = ctx.createRadialGradient(cx, cy, R * 0.93, cx, cy, R * 1.03);
      g.addColorStop(0, "rgba(255,93,114,0)");
      g.addColorStop(0.6, "rgba(255,93,114," + (0.55 * a) + ")");
      g.addColorStop(1, "rgba(255,93,114,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.03, 0, 2 * Math.PI); ctx.fill();
      dessinerToile3D(a, R);
      texte("Limite de l'Univers observable", cx, Math.max(16, cy - R - 16), { align: "center", alpha: a, couleur: "#FF8FA0", gras: true });
      texte("Fond diffus : la lumière la plus ancienne", cx, Math.min(H - 16, cy + R + 16), { align: "center", alpha: a * 0.9, taille: 12, couleur: "#C9C6E4" });
    }

    /* Laniakea */
    a = vis(20.6, 23.4, 0.6);
    if (a > 0) {
      var km2 = kal * 1e6;
      ctx.globalCompositeOperation = "lighter";
      for (j = 0; j < LANIAKEA_PTS.length; j += 2) {
        var lx = LANIAKEA_PTS[j], ly = LANIAKEA_PTS[j + 1];
        var dedans = Math.hypot(lx - LANIAKEA.x, ly - LANIAKEA.y) < LANIAKEA.r * 1.05;
        var teinte = (j / 2) % 3;
        ctx.fillStyle = dedans
          ? (teinte === 0 ? "rgba(255,214,140," : teinte === 1 ? "rgba(255,150,190," : "rgba(255,240,215,") + (0.85 * a) + ")"
          : (teinte === 0 ? "rgba(120,140,255," : "rgba(170,130,255,") + (0.45 * a) + ")";
        ctx.fillRect(cx + lx * km2, cy - ly * km2, 1.3, 1.3);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.globalAlpha = a;
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "#FF5D72";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (j = 0; j <= 120; j++) {
        var th = j / 120 * 2 * Math.PI;
        var rr = LANIAKEA.r * (1 + 0.1 * Math.sin(3 * th + 0.5) + 0.06 * Math.sin(5 * th + 2));
        var X = cx + (LANIAKEA.x + rr * Math.cos(th)) * km2, Y = cy - (LANIAKEA.y + rr * Math.sin(th)) * km2;
        if (j === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      }
      ctx.stroke();
      ctx.restore();
      texte("Laniakea", cx + LANIAKEA.x * km2, cy - (LANIAKEA.y + LANIAKEA.r * 1.18) * km2, { align: "center", alpha: a, couleur: "#FF8FA0", gras: true, taille: 15 });
      texte("Grand Attracteur", cx + LANIAKEA.x * km2, cy - LANIAKEA.y * km2 + 14, { align: "center", alpha: a * 0.9, taille: 12 });
    }

    /* Amas de galaxies */
    a = vis(18.4, 22.0, 0.55);
    if (a > 0) {
      ctx.globalCompositeOperation = "lighter";
      function nuage(g, couleur, taille) {
        ctx.fillStyle = couleur;
        for (var q = 0; q < g.pts.length; q += 2) ctx.fillRect(cx + (g.x + g.pts[q]) * kal, cy - (g.y + g.pts[q + 1]) * kal, taille, taille);
      }
      function galaxieInclinee(g, diametre, inclinaison, anglePos) {
        var X = cx + g.x * kal, Y = cy - g.y * kal, cote = diametre * (VL_COTE / 100000) * kal;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(X, Y); ctx.rotate(-anglePos * DEG); ctx.scale(1, Math.cos(inclinaison * DEG));
        ctx.drawImage(VL_IMG, -cote / 2, -cote / 2, cote, cote); ctx.restore();
      }
      [[ANDROMEDE.x, ANDROMEDE.y, 16, "255,220,180"], [TRIANGLE.x, TRIANGLE.y, 9, "190,210,255"], [VL.cx, VL.cy, 13, "220,215,255"]].forEach(function (h) {
        var HX = cx + h[0] * kal, HY = cy - h[1] * kal;
        var hg = ctx.createRadialGradient(HX, HY, 0, HX, HY, h[2]);
        hg.addColorStop(0, "rgba(" + h[3] + "," + (0.55 * a) + ")"); hg.addColorStop(1, "rgba(" + h[3] + ",0)");
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(HX, HY, h[2], 0, 2 * Math.PI); ctx.fill();
      });
      if (vlPrete) {
        galaxieInclinee(ANDROMEDE, 220000, 77, 38);
        galaxieInclinee(TRIANGLE, 60000, 55, -20);
      } else {
        nuage(ANDROMEDE, "rgba(255,226,190," + (0.7 * a) + ")", 1.2);
        nuage(TRIANGLE, "rgba(190,210,255," + (0.7 * a) + ")", 1.1);
      }
      ctx.fillStyle = "rgba(220,220,255," + (0.85 * a) + ")";
      for (j = 0; j < NAINES.length; j += 2) ctx.fillRect(cx + NAINES[j] * kal - 1, cy - NAINES[j + 1] * kal - 1, 2, 2);
      ctx.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.globalAlpha = a * 0.6;
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = "#ABA8CC";
      ctx.beginPath(); ctx.arc(cx + GL_CENTRE.x * kal, cy - GL_CENTRE.y * kal, 5e6 * kal, 0, 2 * Math.PI); ctx.stroke();
      ctx.restore();
      var andX = cx + ANDROMEDE.x * kal, andY = cy - ANDROMEDE.y * kal;
      if (s < 21.2) texte("Galaxie d'Andromède", andX, andY - Math.max(14, 60000 * kal), { align: "center", alpha: a, gras: true });
      if (s < 21.2) texte("2,5 millions d'al", andX, andY + Math.max(16, 60000 * kal), { align: "center", alpha: a * 0.85, taille: 12, couleur: "#C9C6E4" });
      if (s < 21.2) texte("Galaxie du Triangle", cx + TRIANGLE.x * kal + 12, cy - TRIANGLE.y * kal - 12, { alpha: a * 0.9, taille: 12 });
      if (s > 19.2 && s < 21.2) texte("Amas de galaxies", cx + GL_CENTRE.x * kal, cy - (GL_CENTRE.y + 5e6) * kal - 12, { align: "center", alpha: a, couleur: "#ABA8CC", gras: true });
    }

    /* Nuages de Magellan */
    a = vis(17.6, 20.6, 0.5);
    if (a > 0) {
      ctx.globalCompositeOperation = "lighter";
      NUAGES.forEach(function (g) {
        ctx.fillStyle = "rgba(190,215,255," + (0.8 * a) + ")";
        for (var q = 0; q < g.pts.length; q += 2) ctx.fillRect(cx + (g.x + g.pts[q]) * kal, cy - (g.y + g.pts[q + 1]) * kal, 1.2, 1.2);
      });
      ctx.globalCompositeOperation = "source-over";
      if (s < 19.4) texte("Nuages de Magellan", cx + NUAGES[0].x * kal + 18, cy - NUAGES[0].y * kal, { alpha: a, taille: 12 });
    }

    /* Voie lactée */
    a = vis(16.1, 22.4, 0.7);
    if (a > 0) {
      ctx.globalCompositeOperation = "lighter";
      var gx = cx + VL.cx * kal, gy = cy - VL.cy * kal, cote = VL_COTE * kal;
      if (vlPrete) {
        ctx.save(); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = a; ctx.translate(gx, gy); ctx.rotate(VL_ROT);
        ctx.drawImage(VL_IMG, -cote / 2, -cote / 2, cote, cote);
        ctx.restore();
      }
      var tp = Math.min(2.2, Math.max(1, 900 * kal));
      for (j = 0; vlPrete ? false : j < VL_POINTS.length; j += 3) {
        ctx.fillStyle = VL_COULEURS[VL_POINTS[j + 2]] + ((VL_POINTS[j + 2] === 3 ? 0.4 : 0.75) * a) + ")";
        ctx.fillRect(cx + (VL.cx + VL_POINTS[j]) * kal, cy - (VL.cy + VL_POINTS[j + 1]) * kal, tp, tp);
      }
      ctx.globalCompositeOperation = "source-over";
      if (s < 19.2) {
        if (vlPrete && s > 17.2) {
          var cr = Math.cos(VL_ROT), sr = Math.sin(VL_ROT);
          VL_REPERES.forEach(function (rp, n) {
            var X = gx + (rp.p[0] * cr - rp.p[1] * sr) * kal, Y = gy + (rp.p[0] * sr + rp.p[1] * cr) * kal;
            ctx.save(); ctx.globalAlpha = a * 0.8; ctx.strokeStyle = "#ECE9F7"; ctx.lineWidth = 1;
            var LX = Math.max(95, Math.min(W - 95, X + (X < cx ? -30 : 30))), LY = Y - 30;
            ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(LX, LY + 8); ctx.stroke(); ctx.restore();
            texte(rp.nom, LX, LY, { alpha: a, gras: true, taille: 12, align: "center" });
          });
        } else if (!vlPrete) {
          texte("Centre de la Voie lactée", gx, gy + Math.max(26, 9000 * kal), { align: "center", alpha: a, taille: 12, couleur: "#FFE1A8" });
        }
        texte("Voie lactée", gx, gy - 56000 * kal, { align: "center", alpha: a, gras: true, taille: 15 });
      } else if (s < 20.9) {
        texte("Voie lactée", cx - 12, cy + 18, { align: "right", alpha: a, gras: true });
      }
    }

    /* Étoiles voisines */
    a = vis(12.6, 16.6, 0.6);
    if (a > 0) {
      ctx.save();
      ctx.globalAlpha = a * 0.5;
      ctx.setLineDash([2, 5]);
      ctx.strokeStyle = "#ABA8CC";
      [5, 10].forEach(function (d) {
        ctx.beginPath(); ctx.arc(cx, cy, d * kal, 0, 2 * Math.PI); ctx.stroke();
      });
      ctx.restore();
      if (5 * kal > 40) {
        texte("5 al", cx + 5 * kal * 0.71 + 6, cy - 5 * kal * 0.71 - 6, { alpha: a * 0.8, taille: 11, couleur: "#ABA8CC" });
        texte("10 al", cx + 10 * kal * 0.71 + 6, cy - 10 * kal * 0.71 - 6, { alpha: a * 0.8, taille: 11, couleur: "#ABA8CC" });
      }
      ETOILES.forEach(function (e) {
        var X = cx + e.d * Math.cos(e.ang * DEG) * kal, Y = cy - e.d * Math.sin(e.ang * DEG) * kal;
        var gr = ctx.createRadialGradient(X, Y, 0, X, Y, 7);
        gr.addColorStop(0, e.c); gr.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = a;
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(X, Y, 7, 0, 2 * Math.PI); ctx.fill();
        ctx.globalAlpha = 1;
        if (e.etiq && kal * 4 > 35) {
          var droite = Math.cos(e.ang * DEG) >= 0;
          texte(e.nom, X + (droite ? 10 : -10), Y - 2, { align: droite ? "left" : "right", alpha: a, gras: e.d < 4.5 });
          texte(String(e.d).replace(".", ",") + " al", X + (droite ? 10 : -10), Y + 13, { align: droite ? "left" : "right", alpha: a * 0.85, taille: 11, couleur: "#C9C6E4" });
        }
      });
      if (kal * 4 > 35) texte("Soleil", cx + 10, cy - 12, { alpha: a, couleur: "#F5C451", gras: true });
    }

    /* Système solaire */
    a = vis(7.4, 13.4, 0.6);
    if (a > 0) {
      var sx = px(SOLEIL.x), sy = py(SOLEIL.y);
      ctx.save();
      ctx.globalAlpha = a * 0.55;
      ctx.strokeStyle = "#5D6AB8";
      ctx.lineWidth = 1;
      PLANETES.forEach(function (p) {
        var R = p.a * UA * k;
        if (R < 2 || R > W * 30) return;
        ctx.beginPath(); ctx.arc(sx, sy, R, 0, 2 * Math.PI); ctx.stroke();
      });
      ctx.restore();
      PLANETES.forEach(function (p) {
        var R = p.a * UA * k;
        if (R < 3) return;
        var X = sx + R * Math.cos(p.ang * DEG), Y = sy - R * Math.sin(p.ang * DEG);
        if (X < -50 || X > W + 50 || Y < -50 || Y > H + 50) return;
        var rp = Math.max(2.2, p.r * k);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(X, Y, rp, 0, 2 * Math.PI); ctx.fill();
        ctx.globalAlpha = 1;
        if (R > 22 && p.nom !== "Terre") texte(p.nom, X + rp + 6, Y, { alpha: a, taille: 12 });
      });
      dessinerVoyager(a, k, sx, sy);
    }

    /* Soleil */
    a = vis(6.6, 14.2, 0.6);
    if (a > 0) {
      var SX = px(SOLEIL.x), SY = py(SOLEIL.y), rs = SOLEIL.r * k;
      if (SX > -W && SX < 2 * W) {
        var halo = Math.max(rs * 3, 14);
        var gs = ctx.createRadialGradient(SX, SY, 0, SX, SY, halo);
        gs.addColorStop(0, "rgba(255,236,170," + a + ")");
        gs.addColorStop(Math.min(0.9, Math.max(0.05, rs / halo)), "rgba(245,196,81," + (0.9 * a) + ")");
        gs.addColorStop(1, "rgba(245,150,60,0)");
        ctx.fillStyle = gs;
        ctx.beginPath(); ctx.arc(SX, SY, halo, 0, 2 * Math.PI); ctx.fill();
        if (s < 12.6) texte("Soleil", SX, SY + halo + 12, { align: "center", alpha: a, couleur: "#F5C451", gras: true });
      }
    }

    /* Lune */
    a = vis(4.9, 9.2, 0.5);
    if (a > 0) {
      var dl = 384400 * k;
      ctx.save();
      ctx.globalAlpha = a * 0.6;
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = "#7A85C9";
      ctx.beginPath(); ctx.arc(cx, cy, dl, 0, 2 * Math.PI); ctx.stroke();
      ctx.restore();
      var LX = cx + dl * Math.cos(35 * DEG), LY = cy - dl * Math.sin(35 * DEG);
      ctx.save(); ctx.globalAlpha = a * 0.5; ctx.strokeStyle = "#C9C6E4"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(LX, LY); ctx.stroke(); ctx.restore();
      var rl = Math.max(2, 1737 * k);
      ctx.globalAlpha = a;
      var gl = ctx.createRadialGradient(LX - rl * 0.3, LY - rl * 0.3, 0, LX, LY, rl);
      gl.addColorStop(0, "#F1EEE6"); gl.addColorStop(1, "#8D8A93");
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(LX, LY, rl, 0, 2 * Math.PI); ctx.fill();
      ctx.globalAlpha = 1;
      if (dl > 30) {
        texte("Lune", LX + rl + 8, LY, { alpha: a, gras: true });
        if (dl > 90) texte("384 400 km", cx + dl * 0.5 * Math.cos(35 * DEG) + 8, cy - dl * 0.5 * Math.sin(35 * DEG) - 10, { alpha: a * 0.85, taille: 12, couleur: "#C9C6E4" });
      }
    }

    /* Terre */
    var rt = 6371 * k;
    if (rt > 0.4) {
      if (rt > 3) {
        ctx.save();
        var atm = ctx.createRadialGradient(cx, cy, rt * 0.95, cx, cy, rt * 1.12);
        atm.addColorStop(0, "rgba(120,180,255,0.55)"); atm.addColorStop(1, "rgba(120,180,255,0)");
        ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(cx, cy, rt * 1.12, 0, 2 * Math.PI); ctx.fill();
        if (terrePrete) {
          var D = 2 * rt * TERRE_ECHELLE;
          ctx.drawImage(TERRE_IMG, cx - D / 2, cy - D / 2, D, D);
        } else {
          ctx.fillStyle = "#1E5AA8";
          ctx.beginPath(); ctx.arc(cx, cy, rt, 0, 2 * Math.PI); ctx.fill();
        }
        ctx.restore();
        if (terrePrete && rt > 60) {
          var D2 = 2 * rt * TERRE_ECHELLE;
          var fx = cx + (FRANCE[0] - 0.5) * D2, fy = cy + (FRANCE[1] - 0.5) * D2;
          ctx.save();
          ctx.strokeStyle = "#FF5D72"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(fx, fy, 7, 0, 2 * Math.PI); ctx.stroke();
          ctx.fillStyle = "#FF5D72"; ctx.beginPath(); ctx.arc(fx, fy, 2.5, 0, 2 * Math.PI); ctx.fill();
          ctx.beginPath(); ctx.moveTo(fx - 9, fy - 6); ctx.lineTo(fx - 60, fy - 40); ctx.stroke();
          ctx.restore();
          texte("Vous êtes ici : la France", fx - 64, fy - 48, { align: "right", gras: true, couleur: "#FF8FA0" });
        }
        if (s < 5.4) texte("La Terre", cx, cy + rt * 1.12 + 16, { align: "center", gras: true, taille: 15 });
      } else {
        ctx.fillStyle = "#5DA9FF";
        ctx.beginPath(); ctx.arc(cx, cy, Math.max(1.6, rt), 0, 2 * Math.PI); ctx.fill();
      }
    }

    /* Vous êtes ici */
    if (rt < 6) {
      var pulse = 10 + 2 * Math.sin(dernier / 400);
      ctx.save();
      ctx.strokeStyle = "#FF5D72";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, reduit ? 10 : pulse, 0, 2 * Math.PI); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy); ctx.lineTo(cx - 13, cy);
      ctx.moveTo(cx + 13, cy); ctx.lineTo(cx + 18, cy);
      ctx.moveTo(cx, cy - 18); ctx.lineTo(cx, cy - 13);
      ctx.moveTo(cx, cy + 13); ctx.lineTo(cx, cy + 18);
      ctx.stroke();
      ctx.restore();
      texte("Vous êtes ici", cx + 22, cy + 22, { couleur: "#FF8FA0", gras: true });
    }

    majEchelle(k);
  }

  /* ---------- toile cosmique 3D ---------- */
  function dessinerToile3D(a, Rpx) {
    var cx = W / 2, cy = H / 2;
    var ang = reduit ? 0.6 : 0.6 + dernier * 0.00007, tilt = 0.42;
    var ca = Math.cos(ang), sa = Math.sin(ang), ct = Math.cos(tilt), st = Math.sin(tilt);
    function proj(x, y, z, out) {
      var x1 = x * ca + z * sa, z1 = -x * sa + z * ca;
      var y1 = y * ct - z1 * st, z2 = y * st + z1 * ct;
      out[0] = cx + x1 * Rpx; out[1] = cy - y1 * Rpx; out[2] = z2;
    }
    var o = [0, 0, 0], o2 = [0, 0, 0], T = TOILE3D, i;
    ctx.globalCompositeOperation = "lighter";
    // filaments
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(150,140,255," + (0.07 * a) + ")";
    ctx.beginPath();
    for (i = 0; i < T.aretes.length; i += 2) {
      var A = T.aretes[i] * 3, B = T.aretes[i + 1] * 3;
      proj(T.noeuds[A], T.noeuds[A + 1], T.noeuds[A + 2], o);
      proj(T.noeuds[B], T.noeuds[B + 1], T.noeuds[B + 2], o2);
      ctx.moveTo(o[0], o[1]); ctx.lineTo(o2[0], o2[1]);
    }
    ctx.stroke();
    // galaxies, colorées selon la profondeur
    var cour = -1;
    for (i = 0; i < T.pts.length; i += 3) {
      proj(T.pts[i], T.pts[i + 1], T.pts[i + 2], o);
      var pr = (o[2] + 1) / 2;
      var bk = Math.max(0, Math.min(5, Math.floor(pr * 6)));
      if (bk !== cour) { ctx.fillStyle = PROF_COULEURS[bk] + ((0.25 + 0.6 * pr) * a) + ")"; cour = bk; }
      var tl = 0.8 + 1.1 * pr;
      ctx.fillRect(o[0], o[1], tl, tl);
    }
    // amas de galaxies aux noeuds
    for (i = 0; i < T.gros.length; i++) {
      var N3 = T.gros[i] * 3;
      proj(T.noeuds[N3], T.noeuds[N3 + 1], T.noeuds[N3 + 2], o);
      var pr2 = (o[2] + 1) / 2, rg = 2 + 4 * pr2;
      var gg = ctx.createRadialGradient(o[0], o[1], 0, o[0], o[1], rg);
      gg.addColorStop(0, "rgba(255,240,250," + (0.8 * a * (0.4 + 0.6 * pr2)) + ")");
      gg.addColorStop(1, "rgba(255,150,220,0)");
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(o[0], o[1], rg, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  /* ---------- Voyager 1 ---------- */
  function dessinerVoyager(a, k, sx, sy) {
    var ku = UA * k;
    function P(q) { return [sx + q[0] * ku, sy - q[1] * ku]; }
    var marge = 14;
    function dedans(q) { return q[0] > marge && q[0] < W - marge && q[1] > marge && q[1] < H - marge; }
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    VOYAGER.courbe.forEach(function (q, i) { var p = P(q); if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
    // ligne droite de Saturne jusqu'à aujourd'hui, coupée au bord du cadre
    var S = P(VOYAGER.saturne), F = P(VOYAGER.fin);
    var finVisible = dedans(F), bout = F;
    if (!finVisible) {
      var lo = 0, hi = 1;
      for (var n = 0; n < 30; n++) { var m = (lo + hi) / 2, q = [S[0] + (F[0] - S[0]) * m, S[1] + (F[1] - S[1]) * m]; if (dedans(q)) lo = m; else hi = m; }
      bout = [S[0] + (F[0] - S[0]) * lo, S[1] + (F[1] - S[1]) * lo];
    }
    ctx.lineTo(bout[0], bout[1]);
    ctx.stroke();

    var dx = F[0] - S[0], dy = F[1] - S[1], L = Math.hypot(dx, dy) || 1;
    var ux = dx / L, uy = dy / L;
    if (!finVisible) { // flèche vers l'extérieur du cadre
      ctx.fillStyle = ORANGE;
      ctx.beginPath();
      ctx.moveTo(bout[0], bout[1]);
      ctx.lineTo(bout[0] - ux * 12 - uy * 6, bout[1] - uy * 12 + ux * 6);
      ctx.lineTo(bout[0] - ux * 12 + uy * 6, bout[1] - uy * 12 - ux * 6);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = ORANGE;
      ctx.beginPath(); ctx.arc(F[0], F[1], 4.5, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.restore();

    // repères de la trajectoire
    var J = P(VOYAGER.jupiter), Sa = S;
    if (5.2 * ku > 45 && dedans(J)) { point(J); texte("Jupiter, 1979", J[0] + 8, J[1] - 10, { alpha: a, taille: 11, couleur: ORANGE }); }
    if (9.54 * ku > 45 && dedans(Sa)) { point(Sa); texte("Saturne, 1980", Sa[0] + 8, Sa[1] - 10, { alpha: a, taille: 11, couleur: ORANGE }); }
    var H2 = P(VOYAGER.heliopause);
    if (dedans(H2) && 121 * ku > 60) { point(H2); texte("2012 : sortie de l'héliosphère", H2[0] + 9, H2[1], { alpha: a, taille: 11, couleur: ORANGE }); }

    var cible = finVisible ? F : bout;
    var droite = ux >= 0;
    var lx = cible[0] + (droite ? -10 : 10) + (finVisible ? (droite ? 18 : -18) : 0);
    var ly = cible[1] + (uy < 0 ? 18 : -30);
    if (finVisible) { lx = F[0] + 10; ly = F[1] - 6; }
    var al = finVisible ? "left" : (droite ? "right" : "left");
    texte("Voyager 1", lx, ly, { alpha: a, gras: true, couleur: ORANGE, align: al });
    texte("aujourd'hui à environ 172 ua", lx, ly + 15, { alpha: a, taille: 11, couleur: "#FFD08A", align: al });

    function point(q) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(q[0], q[1], 3, 0, 2 * Math.PI); ctx.fill(); ctx.restore(); }
  }

  /* ---------- échelle ---------- */
  function nf(v) { return v.toLocaleString("fr-FR", { maximumFractionDigits: 2 }); }
  function formatKm(v) {
    if (v < 1e6) return nf(v) + " km";
    if (v < 1e9) { var m = v / 1e6; return nf(m) + (m >= 2 ? " millions" : " million") + " de km"; }
    var g = v / 1e9; return nf(g) + (g >= 2 ? " milliards" : " milliard") + " de km";
  }
  function formatAl(v) {
    if (v < 1e6) return nf(v) + " al";
    if (v < 1e9) { var m = v / 1e6; return nf(m) + (m >= 2 ? " millions" : " million") + " d'al"; }
    var g = v / 1e9; return nf(g) + (g >= 2 ? " milliards" : " milliard") + " d'al";
  }
  function arrondi(v) {
    var p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p;
    return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p;
  }
  function majEchelle(k) {
    var cibleKm = (W * 0.22) / k, val, txt, lpx;
    if (cibleKm < 0.3 * KM_AL) { val = arrondi(cibleKm); txt = formatKm(val); lpx = val * k; }
    else { val = arrondi(cibleKm / KM_AL); txt = formatAl(val); lpx = val * KM_AL * k; }
    elEchelleBarre.style.width = lpx.toFixed(1) + "px";
    elEchelleTexte.textContent = txt;
  }

  /* ---------- panneau ---------- */
  var niveauCourant = -1;
  function majPanneau() {
    var meilleur = 0, ecart = 1e9;
    NIVEAUX.forEach(function (n, i) { var e = Math.abs(n.s - s); if (e < ecart) { ecart = e; meilleur = i; } });
    if (meilleur === niveauCourant) return;
    niveauCourant = meilleur;
    var n = NIVEAUX[meilleur];
    elNum.textContent = "Étape " + (meilleur + 1) + " sur " + NIVEAUX.length;
    elNom.textContent = n.nom;
    elTexte.textContent = n.texte;
    elTaille.textContent = n.taille;
    elLumiere.textContent = n.lumiere;
    canvas.setAttribute("aria-label", "Vue à l'échelle : " + n.nom + ". " + n.texte);
    boutonsEtapes.forEach(function (b, i) { b.setAttribute("aria-current", i === meilleur ? "true" : "false"); });
  }

  /* ---------- animation ---------- */
  function boucle(t) {
    var dt = dernier ? Math.min(0.1, (t - dernier) / 1000) : 0;
    dernier = t;
    if (anim) {
      var p = Math.min(1, (t - anim.t0) / anim.duree);
      var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      s = anim.de + (anim.vers - anim.de) * e;
      if (p >= 1) anim = null;
      curseur.value = String(Math.round((s - S_MIN) / (S_MAX - S_MIN) * 1000));
    } else if (lecture) {
      s += (S_MAX - S_MIN) / DUREE_VOYAGE * dt;
      if (s >= S_MAX) { s = S_MAX; arreterLecture(); }
      curseur.value = String(Math.round((s - S_MIN) / (S_MAX - S_MIN) * 1000));
    }
    if (document.activeElement !== curseur) curseur.value = String(Math.round((s - S_MIN) / (S_MAX - S_MIN) * 1000));
    dessiner();
    majPanneau();
    requestAnimationFrame(boucle);
  }
  function allerA(cible) {
    arreterLecture();
    if (reduit) { s = cible; anim = null; return; }
    anim = { de: s, vers: cible, t0: performance.now(), duree: Math.min(3800, 500 + Math.abs(cible - s) * 380) };
  }
  function arreterLecture() {
    var etait = lecture;
    lecture = false;
    if (boutonLecture) boutonLecture.textContent = "Voyage automatique";
    if (etait && sonActif && lecteurPret) lecteur.pauseVideo();
  }

  function chargerLecteur(apres) {
    var zone = document.getElementById("musique");
    zone.hidden = false;
    if (lecteur) { if (lecteurPret) apres(); return; }
    function creer() {
      lecteur = new YT.Player("musique-lecteur", {
        host: "https://www.youtube-nocookie.com",
        videoId: MUSIQUE_ID,
        width: 200, height: 113,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: function () { lecteurPret = true; apres(); },
          onError: function () {
            document.getElementById("musique-etat").textContent = "La musique ne peut pas être lue ici. Elle fonctionne une fois le cours publié en ligne.";
          }
        }
      });
    }
    if (window.YT && window.YT.Player) { creer(); return; }
    var precedent = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { if (precedent) precedent(); creer(); };
    var sc = document.createElement("script");
    sc.src = "https://www.youtube.com/iframe_api";
    sc.onerror = function () { document.getElementById("musique-etat").textContent = "La musique n'a pas pu se charger (connexion ou réseau du collège)."; };
    document.head.appendChild(sc);
  }

  function basculerSon() {
    sonActif = !sonActif;
    boutonSon.setAttribute("aria-pressed", sonActif ? "true" : "false");
    boutonSon.textContent = sonActif ? "Son : activé" : "Son : coupé";
    if (sonActif) {
      chargerLecteur(function () {
        if (!sonActif) return;
        lecteur.playVideo();
      });
    } else {
      if (lecteurPret) lecteur.pauseVideo();
      document.getElementById("musique").hidden = true;
    }
  }

  function redimensionner() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }

  function initialiser() {
    canvas = document.getElementById("zoom");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    curseur = document.getElementById("zoom-curseur");
    elNum = document.getElementById("niveau-num");
    elNom = document.getElementById("niveau-nom");
    elTexte = document.getElementById("niveau-texte");
    elTaille = document.getElementById("mes-taille");
    elLumiere = document.getElementById("mes-lumiere");
    elEchelleBarre = document.getElementById("echelle-barre");
    elEchelleTexte = document.getElementById("echelle-texte");

    var etapes = document.getElementById("etapes");
    NIVEAUX.forEach(function (n, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = (i + 1) + ". " + n.court;
      b.addEventListener("click", function () { allerA(n.s); });
      etapes.appendChild(b);
      boutonsEtapes.push(b);
    });
    boutonLecture = document.createElement("button");
    boutonLecture.type = "button";
    boutonLecture.className = "lecture";
    boutonLecture.textContent = "Voyage automatique";
    boutonLecture.addEventListener("click", function () {
      if (lecture) { arreterLecture(); return; }
      anim = null;
      if (s >= S_MAX - 0.05) s = S_MIN;
      lecture = true;
      boutonLecture.textContent = "Pause";
      if (sonActif && lecteurPret) lecteur.playVideo();
    });
    var actions = document.createElement("div");
    actions.className = "etapes actions";
    etapes.parentNode.insertBefore(actions, etapes.nextSibling);
    actions.appendChild(boutonLecture);

    boutonSon = document.createElement("button");
    boutonSon.type = "button";
    boutonSon.className = "son";
    boutonSon.setAttribute("aria-pressed", "false");
    boutonSon.textContent = "Son : coupé";
    boutonSon.addEventListener("click", basculerSon);
    actions.appendChild(boutonSon);

    curseur.addEventListener("input", function () {
      arreterLecture(); anim = null;
      s = S_MIN + (Number(curseur.value) / 1000) * (S_MAX - S_MIN);
    });
    curseur.value = String(Math.round((s - S_MIN) / (S_MAX - S_MIN) * 1000));

    redimensionner();
    window.addEventListener("resize", redimensionner);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { niveauCourant = -1; });
    requestAnimationFrame(boucle);
  }

  document.addEventListener("DOMContentLoaded", initialiser);
})();
