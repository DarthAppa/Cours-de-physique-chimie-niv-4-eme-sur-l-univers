/* Partie 3 — La lumière, messagère du ciel
   1. L'orage : l'éclair (lumière) arrive presque instantanément, le tonnerre (son) à 340 m/s.
   2. Le voyage de la lumière : t = d / v vers la Lune, le Soleil, les planètes, Voyager 1, Proxima.
   3. Exercice guidé : Terre – Mars. */

(function () {
  "use strict";

  var V_LUM = 300000;   // km/s (valeur arrondie ; exacte : 299 792 km/s)
  var V_SON = 340;      // m/s dans l'air
  var reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function nf(v, dec) { return v.toLocaleString("fr-FR", { maximumFractionDigits: dec == null ? 0 : dec }); }
  function duree(s) {
    if (s < 60) return nf(s, s < 10 ? 2 : 1) + " s";
    if (s < 3600) { var m = Math.floor(s / 60); return m + " min " + Math.round(s - m * 60) + " s"; }
    if (s < 86400 * 2) { var h = Math.floor(s / 3600); return h + " h " + Math.round((s - h * 3600) / 60) + " min"; }
    if (s < 86400 * 365.25 * 2) return nf(s / 86400, 0) + " jours";
    return nf(s / (86400 * 365.25), 2) + " ans";
  }
  function distance(km) {
    if (km < 1e6) return nf(km) + " km";
    if (km < 1e9) return nf(km / 1e6, 1) + " millions de km";
    return nf(km / 1e9, 1) + " milliards de km";
  }

  /* ================= 1. L'orage ================= */
  var ctxAudio = null;
  function grondement(dureeS) {
    try {
      ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)();
      var n = Math.floor(ctxAudio.sampleRate * dureeS), buf = ctxAudio.createBuffer(1, n, ctxAudio.sampleRate), d = buf.getChannelData(0), last = 0;
      for (var i = 0; i < n; i++) { last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = last * 6 * Math.pow(1 - i / n, 1.6); }
      var src = ctxAudio.createBufferSource(); src.buffer = buf;
      var f = ctxAudio.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 280;
      src.connect(f); f.connect(ctxAudio.destination); src.start();
    } catch (e) { /* pas de son : on continue */ }
  }
  function initOrage() {
    var btn = document.getElementById("orage-lancer");
    if (!btn) return;
    var curseur = document.getElementById("orage-distance"), affD = document.getElementById("orage-d");
    var scene = document.getElementById("orage-scene"), eclair = document.getElementById("orage-eclair");
    var chrono = document.getElementById("orage-chrono"), msg = document.getElementById("orage-message");
    var son = document.getElementById("orage-son");
    var minuterie = null;
    function majD() { affD.textContent = nf(Number(curseur.value), 1) + " km"; }
    curseur.addEventListener("input", majD); majD();

    btn.addEventListener("click", function () {
      if (minuterie) return;
      var dKm = Number(curseur.value);
      var tSon = dKm * 1000 / V_SON, tLum = dKm / V_LUM, t0 = performance.now();
      btn.disabled = true; curseur.disabled = true;
      msg.innerHTML = "L'éclair est vu <strong>presque instantanément</strong> : sa lumière a mis " + nf(tLum * 1e6, 0) + " millionièmes de seconde. Compte les secondes jusqu'au tonnerre…";
      scene.classList.remove("tonnerre");
      eclair.classList.remove("flash"); void eclair.offsetWidth; eclair.classList.add("flash");
      scene.classList.add("eclaire");
      setTimeout(function () { scene.classList.remove("eclaire"); }, 380);
      minuterie = setInterval(function () {
        var t = (performance.now() - t0) / 1000;
        if (t >= tSon) {
          clearInterval(minuterie); minuterie = null;
          chrono.textContent = nf(tSon, 1) + " s";
          scene.classList.add("tonnerre");
          if (son.checked) grondement(2.4);
          msg.innerHTML = "<strong>Le tonnerre arrive après " + nf(tSon, 1) + " s.</strong> Le son a parcouru " + nf(dKm * 1000) +
            " m à 340 m/s : d = v × t = 340 × " + nf(tSon, 1) + " ≈ " + nf(V_SON * tSon) + " m. Astuce : <strong>3 secondes de retard ≈ 1 km</strong>.";
          btn.disabled = false; curseur.disabled = false;
          setTimeout(function () { scene.classList.remove("tonnerre"); }, 900);
        } else chrono.textContent = nf(t, 1) + " s";
      }, 50);
    });
  }

  /* ================= 2. Le voyage de la lumière ================= */
  var DESTINATIONS = [
    { vers: "à la Lune", nom: "La Lune", depart: "la Terre", km: 384400, c: "#D9D6E0" },
    { vers: "au Soleil", nom: "Le Soleil", depart: "la Terre", km: 150e6, c: "#F5C451" },
    { vers: "à Jupiter", nom: "Jupiter", depart: "le Soleil", km: 778e6, c: "#D9B38C" },
    { vers: "à Neptune", nom: "Neptune", depart: "le Soleil", km: 4.5e9, c: "#6E8CFF" },
    { vers: "à la sonde Voyager 1", nom: "Voyager 1", depart: "la Terre", km: 25.9e9, c: "#FF9F1C" },
    { vers: "à Proxima du Centaure", nom: "Proxima du Centaure", depart: "le Soleil", km: 4.01e13, c: "#FF9B7A" }
  ];
  function initVoyage() {
    var cv = document.getElementById("voyage");
    if (!cv) return;
    var ctx = cv.getContext("2d"), W, H, dpr = 1, choix = 1, depart = null, dureeAnim = 0;
    var boutons = document.getElementById("voyage-choix");
    DESTINATIONS.forEach(function (d, k) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = d.nom;
      b.addEventListener("click", function () { choix = k; lancer(); });
      boutons.appendChild(b);
    });
    function redim() {
      var r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    }
    function lancer() {
      var d = DESTINATIONS[choix], t = d.km / V_LUM;
      dureeAnim = reduit ? 0 : Math.min(t, 6);
      depart = performance.now();
      document.querySelectorAll("#voyage-choix button").forEach(function (b, k) { b.setAttribute("aria-pressed", k === choix ? "true" : "false"); });
      document.getElementById("voyage-calcul").innerHTML =
        (d.depart === "le Soleil" ? "Du Soleil " : "De la Terre ") + d.vers + " : d = " + distance(d.km) + ".<br>" +
        "t = d ÷ v = " + nf(d.km) + " km ÷ 300 000 km/s = <strong>" + nf(t, t < 10 ? 2 : 0) + " s</strong>" +
        (t >= 60 ? ", soit <strong>" + duree(t) + "</strong>" : "") + "." +
        (dureeAnim < t && dureeAnim > 0 ? "<br><span class=\"texte-doux\">Animation accélérée " + nf(t / dureeAnim, 0) + " fois.</span>" : "");
    }
    function dessiner(tps) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#070A1E"; ctx.fillRect(0, 0, W, H);
      var s = 3; for (var i = 0; i < 120; i++) { s = (s * 16807) % 2147483647; var x = s / 2147483647 * W; s = (s * 16807) % 2147483647; ctx.fillStyle = "rgba(210,215,255,0.35)"; ctx.fillRect(x, s / 2147483647 * H, 1, 1); }
      var d = DESTINATIONS[choix], g = 46, xa = g, xb = W - g, y = H / 2;
      // départ et arrivée
      var dep = d.depart === "la Terre" ? "#5DA9FF" : "#F5C451";
      disque(xa, y, 14, dep); disque(xb, y, 14, d.c);
      etiquette(d.depart === "la Terre" ? "Terre" : "Soleil", xa - 14, y + 30, "left");
      etiquette(d.nom, xb + 14, y + 30, "right");
      ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(xa + 18, y); ctx.lineTo(xb - 18, y); ctx.stroke(); ctx.setLineDash([]);
      // photon
      var t = d.km / V_LUM, avance = 1, ecoule = t;
      if (depart != null && dureeAnim > 0) { avance = Math.min(1, (tps - depart) / 1000 / dureeAnim); ecoule = avance * t; }
      var px = xa + 18 + (xb - xa - 36) * avance;
      var gr = ctx.createLinearGradient(px - 90, 0, px, 0);
      gr.addColorStop(0, "rgba(255,240,180,0)"); gr.addColorStop(1, "rgba(255,240,180,0.9)");
      ctx.strokeStyle = gr; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(Math.max(xa + 18, px - 90), y); ctx.lineTo(px, y); ctx.stroke();
      var gp = ctx.createRadialGradient(px, y, 0, px, y, 10); gp.addColorStop(0, "#fff"); gp.addColorStop(1, "rgba(255,230,150,0)");
      ctx.fillStyle = gp; ctx.beginPath(); ctx.arc(px, y, 10, 0, 2 * Math.PI); ctx.fill();
      ctx.font = '700 22px "Atkinson Hyperlegible", "Segoe UI", sans-serif'; ctx.textAlign = "center"; ctx.fillStyle = "#ECE9F7";
      ctx.fillText(duree(ecoule), W / 2, 40);
      ctx.font = '400 12px "Atkinson Hyperlegible", "Segoe UI", sans-serif'; ctx.fillStyle = "#ABA8CC";
      ctx.fillText("temps réel écoulé pour la lumière", W / 2, 58);
      requestAnimationFrame(dessiner);
      function disque(x, yy, r, c) { var g2 = ctx.createRadialGradient(x - r * 0.3, yy - r * 0.3, 0, x, yy, r); g2.addColorStop(0, "#fff"); g2.addColorStop(0.3, c); g2.addColorStop(1, "rgba(20,25,60,1)"); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, yy, r, 0, 2 * Math.PI); ctx.fill(); }
      function etiquette(t2, x, yy, al) { ctx.font = '700 13px "Atkinson Hyperlegible", "Segoe UI", sans-serif'; ctx.textAlign = al; ctx.fillStyle = "#ECE9F7"; ctx.fillText(t2, x, yy); }
    }
    redim(); window.addEventListener("resize", redim);
    lancer();
    requestAnimationFrame(dessiner);
  }

  /* ================= 3. Exercice guidé ================= */
  function initExercice() {
    var b = document.getElementById("ex-verifier");
    if (!b) return;
    var champ = document.getElementById("ex-reponse"), retour = document.getElementById("ex-retour");
    document.getElementById("ex-indice").addEventListener("click", function () {
      document.getElementById("ex-aide").hidden = false;
    });
    b.addEventListener("click", function () {
      var v = Number(String(champ.value).replace(",", ".").replace(/\s/g, ""));
      if (!champ.value || isNaN(v)) { retour.innerHTML = "Écris un nombre de secondes."; retour.className = "ex-retour"; return; }
      if (v >= 175 && v <= 190) {
        retour.innerHTML = "<strong>Bravo !</strong> t = 55 000 000 ÷ 300 000 ≈ 183 s, soit environ 3 minutes. Un robot sur Mars ne peut donc pas être piloté en direct : chaque ordre met au moins 3 minutes à arriver.";
        retour.className = "ex-retour juste";
      } else if (v > 2900 && v < 3300) {
        retour.innerHTML = "Tu as peut-être divisé par 300 000 avec un zéro de trop ou de moins. Vérifie le nombre de zéros de 55 000 000.";
        retour.className = "ex-retour faux";
      } else {
        retour.innerHTML = "Pas tout à fait. Utilise t = d ÷ v, avec d en km et v en km/s, et le résultat sera en secondes.";
        retour.className = "ex-retour faux";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () { initOrage(); initVoyage(); initExercice(); });
})();
