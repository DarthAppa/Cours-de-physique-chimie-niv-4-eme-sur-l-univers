/* Partie 4 — L'année-lumière
   1. Calcul pas à pas de l'année-lumière.
   2. Convertisseur km <-> al.
   3. Machine à remonter le temps : regarder loin, c'est regarder dans le passé. */

(function () {
  "use strict";

  var KM_AL = 9.46e12; // km dans une année-lumière (valeur arrondie)
  var ANNEE = 2026;

  function nf(v, dec) { return v.toLocaleString("fr-FR", { maximumFractionDigits: dec == null ? 0 : dec }); }
  function enMots(km) {
    if (km < 1e6) return nf(km) + " km";
    if (km < 1e9) return nf(km / 1e6, 1) + " millions de km";
    if (km < 1e12) return nf(km / 1e9, 1) + " milliards de km";
    if (km < 1e18) return nf(km / 1e9, 0) + " milliards de km";
    return nf(km / 1e18, 1) + " milliards de milliards de km";
  }

  /* ---------- 1. Calcul pas à pas ---------- */
  function initEscalier() {
    var b = document.getElementById("esc-suivant");
    if (!b) return;
    var etapes = Array.prototype.slice.call(document.querySelectorAll("#escalier li"));
    var n = 0;
    b.addEventListener("click", function () {
      if (n >= etapes.length) {
        etapes.forEach(function (li) { li.hidden = true; });
        n = 0; b.textContent = "Commencer le calcul"; return;
      }
      etapes[n].hidden = false; n++;
      b.textContent = n >= etapes.length ? "Recommencer" : "Étape suivante (" + n + " / " + etapes.length + ")";
    });
  }

  /* ---------- 2. Convertisseur ---------- */
  function initConvertisseur() {
    var al = document.getElementById("conv-al"), km = document.getElementById("conv-km"), mots = document.getElementById("conv-mots");
    if (!al) return;
    function lire(v) { return Number(String(v).replace(/\s/g, "").replace(",", ".")); }
    function depuisAl() {
      var v = lire(al.value);
      if (!al.value || isNaN(v)) { km.value = ""; mots.textContent = ""; return; }
      var k = v * KM_AL;
      km.value = nf(k);
      mots.innerHTML = nf(v, 3) + " al = " + nf(v, 3) + " × 9 460 milliards de km ≈ <strong>" + enMots(k) + "</strong>";
    }
    function depuisKm() {
      var v = lire(km.value);
      if (!km.value || isNaN(v)) { al.value = ""; mots.textContent = ""; return; }
      var a = v / KM_AL;
      al.value = nf(a, a < 0.01 ? 8 : 3);
      mots.innerHTML = enMots(v) + " ÷ 9 460 milliards de km ≈ <strong>" + nf(a, a < 0.01 ? 8 : 3) + " al</strong>";
    }
    al.addEventListener("input", depuisAl);
    km.addEventListener("input", depuisKm);
    document.querySelectorAll("[data-al]").forEach(function (b) {
      b.addEventListener("click", function () { al.value = b.dataset.al.replace(".", ","); depuisAl(); });
    });
    al.value = "4,24"; depuisAl();
  }

  /* ---------- 3. Machine à remonter le temps ---------- */
  var OBJETS = [
    { nom: "La Lune", ans: 1.28 / 31557600, dist: "384 400 km", parti: "il y a 1,3 seconde", terre: "Tu viens de cligner des yeux : c'est presque en direct." },
    { nom: "Le Soleil", ans: 500 / 31557600, dist: "150 millions de km", parti: "il y a 8 minutes 20 secondes", terre: "Si le Soleil s'éteignait, on ne s'en apercevrait qu'au bout de 8 minutes." },
    { nom: "Proxima du Centaure", ans: 4.24, dist: "4,24 al", terre: "Tu étais à l'école primaire, en CM1 ou en CM2." },
    { nom: "Sirius", ans: 8.6, dist: "8,6 al", terre: "Tu entrais à peu près au CP." },
    { nom: "Véga", ans: 25, dist: "25 al", terre: "L'encyclopédie Wikipédia venait d'être créée (2001)." },
    { nom: "L'étoile Polaire", ans: 430, dist: "environ 430 al", terre: "Henri IV était roi de France." },
    { nom: "Bételgeuse", ans: 550, dist: "environ 550 al", terre: "Christophe Colomb n'avait pas encore traversé l'Atlantique (1492)." },
    { nom: "La nébuleuse d'Orion", ans: 1344, dist: "1 344 al", terre: "C'était le Moyen Âge, au temps des rois mérovingiens." },
    { nom: "Le centre de la Voie lactée", ans: 26000, dist: "26 000 al", terre: "Préhistoire : des humains peignaient la grotte Cosquer, près de Marseille." },
    { nom: "Le Grand Nuage de Magellan", ans: 160000, dist: "160 000 al", terre: "Homo sapiens vivait en Afrique et n'était pas encore arrivé en Europe." },
    { nom: "La galaxie d'Andromède", ans: 2.5e6, dist: "2,5 millions d'al", terre: "Les premiers humains du genre Homo apparaissaient en Afrique." },
    { nom: "Le fond diffus cosmologique", ans: 13.8e9, dist: "la plus vieille lumière de l'Univers", terre: "La Terre n'existait pas : ni étoiles ni galaxies, seulement un gaz chaud, 380 000 ans après le Big Bang." }
  ];
  function quand(o) {
    if (o.parti) return o.parti;
    if (o.ans < 2000) return "en " + Math.round(ANNEE - o.ans) + ", il y a " + nf(o.ans, o.ans < 10 ? 2 : 0) + " ans";
    if (o.ans < 1e6) return "il y a " + nf(o.ans) + " ans";
    if (o.ans < 1e9) return "il y a " + nf(o.ans / 1e6, 1) + " millions d'années";
    return "il y a " + nf(o.ans / 1e9, 1) + " milliards d'années";
  }
  function initMachine() {
    var liste = document.getElementById("machine-choix");
    if (!liste) return;
    var frise = document.getElementById("machine-frise");
    var LMIN = Math.log10(1 / 31557600), LMAX = Math.log10(13.8e9);
    function pos(ans) { return (Math.log10(ans) - LMIN) / (LMAX - LMIN) * 100; }
    // graduations
    [["1 s", 1 / 31557600], ["1 jour", 1 / 365.25], ["1 an", 1], ["100 ans", 100], ["10 000 ans", 1e4], ["1 million", 1e6], ["1 milliard", 1e9]].forEach(function (g) {
      var t = document.createElement("span"); t.className = "frise-grad"; t.style.left = pos(g[1]) + "%"; t.textContent = g[0]; frise.appendChild(t);
    });
    var points = OBJETS.map(function (o, k) {
      var p = document.createElement("span"); p.className = "frise-point"; p.style.left = pos(o.ans) + "%"; p.title = o.nom; frise.appendChild(p);
      var b = document.createElement("button"); b.type = "button"; b.textContent = o.nom;
      b.addEventListener("click", function () { choisir(k); });
      liste.appendChild(b);
      return p;
    });
    function choisir(k) {
      var o = OBJETS[k];
      document.getElementById("machine-nom").textContent = o.nom;
      document.getElementById("machine-distance").textContent = o.dist;
      document.getElementById("machine-depart").textContent = quand(o);
      document.getElementById("machine-terre").textContent = o.terre;
      document.getElementById("machine-phrase").textContent = "Tu reçois une lumière partie " + quand(o).replace(/^en \d+, /, "") + ".";
      var date;
      if (o.parti) date = o.parti.replace("il y a ", "");
      else if (o.ans < 2000) date = Math.round(ANNEE - o.ans) + " → " + ANNEE;
      else date = "− " + quand(o).replace("il y a ", "");
      document.getElementById("machine-date").textContent = date;
      points.forEach(function (p, i) { p.classList.toggle("actif", i === k); });
      liste.querySelectorAll("button").forEach(function (b, i) { b.setAttribute("aria-pressed", i === k ? "true" : "false"); });
    }
    choisir(2);
  }

  /* ---------- 4. Exercice ---------- */
  function initExercice() {
    var b = document.getElementById("ex-verifier");
    if (!b) return;
    var champ = document.getElementById("ex-reponse"), retour = document.getElementById("ex-retour");
    document.getElementById("ex-indice").addEventListener("click", function () { document.getElementById("ex-aide").hidden = false; });
    b.addEventListener("click", function () {
      var v = Number(String(champ.value).replace(/\s/g, "").replace(",", "."));
      if (!champ.value || isNaN(v)) { retour.textContent = "Écris un nombre de milliards de km."; retour.className = "ex-retour"; return; }
      if (v >= 79000 && v <= 83000) {
        retour.innerHTML = "<strong>Bravo !</strong> 8,6 × 9 460 ≈ 81 356, soit environ <strong>81 000 milliards de km</strong>. Tu comprends pourquoi on préfère dire « 8,6 al ».";
        retour.className = "ex-retour juste";
      } else if (v > 7900 && v < 8300) {
        retour.textContent = "Presque : vérifie la virgule. 8,6 × 9 460 donne un nombre à cinq chiffres.";
        retour.className = "ex-retour faux";
      } else {
        retour.textContent = "Pas tout à fait. Multiplie la distance en al par 9 460 pour obtenir des milliards de km.";
        retour.className = "ex-retour faux";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () { initEscalier(); initConvertisseur(); initMachine(); initExercice(); });
})();
