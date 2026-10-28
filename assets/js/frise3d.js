/* Partie 5 — La frise de l'Univers en 3D
   - Une frise fixe, non linéaire, en trois phases de temps ; un point montre où l'on en est.
   - Une scène Three.js par événement. Chaque scène est calculée dans une image intermédiaire,
     et le passage d'une scène à l'autre se fait par un zoom (avant ou arrière), comme le zoom cosmique de la partie 1.
   Dépend de : assets/vendor/three.min.js (r149) et de window.HistoireUnivers (histoire.js). */

(function () {
  "use strict";

  var HU = window.HistoireUnivers;
  if (!HU) return;
  var EV = HU.EVENEMENTS, AGE = HU.AGE, nf = HU.nf;
  var reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var IMG = "assets/img/planetes/";
  var DUREE = 14000;       // durée d'un événement en lecture automatique (ms) : ~11 s d'animation + 3 s pour lire la fin
  var DUREE_FIN = 24000;   // la dernière scène (aujourd'hui) : 21 s d'animation + 3 s
  function dureeEvt(k) { return k === EV.length - 1 ? DUREE_FIN : DUREE; }
  var TRANSITION = 2300;   // durée du zoom entre deux scènes (ms)

  // scène de chaque événement et sens du zoom pour y entrer
  var REG = {
    "Big Bang": { scene: "bigbang", entree: "avant" },
    "Premiers atomes": { scene: "atomes", entree: "avant" },
    "Premières étoiles": { scene: "etoiles", entree: "arriere" },
    "Premières galaxies": { scene: "galaxies", entree: "arriere" },
    "Voie lactée": { scene: "voielactee", entree: "avant" },
    "Soleil": { scene: "soleil", entree: "avant" },
    "Terre": { scene: "jeuneterre", entree: "avant" },
    "Lune": { scene: "lune", entree: "arriere" },
    "Vie": { scene: "vie", entree: "avant" },
    "Dinosaures": { scene: "dinosaures", entree: "avant" },
    "Fin des dinosaures": { scene: "extinction", entree: "arriere" },
    "Homo sapiens": { scene: "sapiens", entree: "avant" },
    "Aujourd'hui": { scene: "aujourdhui", entree: "arriere" }
  };

  function graine(a) { return function () { a = (a * 16807) % 2147483647; return a / 2147483647; }; }
  function lisse(x) { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); }
  function entre(x, a, b) { return lisse((x - a) / (b - a)); }
  function doux(x) { x = Math.min(1, Math.max(0, x)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()); }

  /* =========================================================
     1. LA FRISE FIXE EN TROIS PHASES
     ========================================================= */
  var PHASES = [
    { nom: "Les débuts", court: "Débuts", de: 0, a: 1.05e9, legende: "après le Big Bang",
      grads: [[0, "0"], [0.25e9, "250 M"], [0.5e9, "500 M"], [0.75e9, "750 M"], [1e9, "1 Md"]] },
    { nom: "La naissance du système solaire", court: "Système solaire", de: 9.05e9, a: 10.1e9, legende: "il y a…",
      grads: [[AGE - 4.7e9, "4,7 Md"], [AGE - 4.4e9, "4,4 Md"], [AGE - 4.1e9, "4,1 Md"], [AGE - 3.8e9, "3,8 Md"]] },
    { nom: "Les 300 derniers millions d'années", court: "300 derniers M", de: AGE - 3e8, a: AGE, legende: "il y a…",
      grads: [[AGE - 3e8, "300 M"], [AGE - 2e8, "200 M"], [AGE - 1e8, "100 M"], [AGE, "0"]] }
  ];
  // place chaque événement dans sa phase, avec un écart minimum pour rester lisible
  var PLACE = (function () {
    var res = [];
    PHASES.forEach(function (P, i) {
      var liste = [];
      EV.forEach(function (e, k) { if (e.t >= P.de && e.t <= P.a) liste.push({ k: k, f: (e.t - P.de) / (P.a - P.de) }); });
      var ecart = 0.09;
      for (var j = 1; j < liste.length; j++) liste[j].f = Math.max(liste[j].f, liste[j - 1].f + ecart);
      if (liste.length && liste[liste.length - 1].f > 1) {
        liste[liste.length - 1].f = 1;
        for (j = liste.length - 2; j >= 0; j--) liste[j].f = Math.min(liste[j].f, liste[j + 1].f - ecart);
      }
      liste.forEach(function (o) { res[o.k] = { phase: i, f: o.f }; });
    });
    return res;
  })();

  var frise = { cv: null, g: null, W: 0, H: 0, dpr: 1, cibles: [], point: 0 };
  function geometrie() {
    var marge = 12, G = frise.W < 600 ? 16 : 30, segW = (frise.W - 2 * marge - 2 * G) / 3;
    return { x0: function (i) { return marge + i * (segW + G); }, segW: segW, G: G };
  }
  function xEvt(k) { var o = PLACE[k], g = geometrie(); return g.x0(o.phase) + o.f * g.segW; }

  function dessinerFrise() {
    var g = frise.g, W = frise.W, H = frise.H, geo = geometrie(), petit = W < 600;
    g.setTransform(frise.dpr, 0, 0, frise.dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    var police = function (t, gras) { return (gras ? "700 " : "400 ") + t + 'px "Atkinson Hyperlegible", "Segoe UI", sans-serif'; };
    var ay = H - 38;
    var COUL = ["#FFB45C", "#8E7CFF", "#45D3C6"];
    PHASES.forEach(function (P, i) {
      var x0 = geo.x0(i), x1 = x0 + geo.segW;
      // titre de la phase
      g.font = police(petit ? 10 : 12, true); g.fillStyle = COUL[i]; g.textAlign = "left"; g.textBaseline = "top";
      g.fillText(petit ? P.court : P.nom, x0, 4);
      // axe
      g.fillStyle = COUL[i]; g.fillRect(x0, ay - 2, x1 - x0, 4);
      // graduations
      g.font = police(petit ? 9 : 10); g.textBaseline = "top";
      P.grads.forEach(function (gr, j) {
        var x = x0 + (gr[0] - P.de) / (P.a - P.de) * geo.segW;
        g.fillStyle = "rgba(236,233,247,0.45)"; g.fillRect(x - 0.5, ay + 3, 1, 5);
        if (petit && j % 2 === 1) return;
        g.fillStyle = "#9895BC"; g.textAlign = x - x0 < 12 ? "left" : x1 - x < 12 ? "right" : "center";
        g.fillText(gr[1], x, ay + 10);
      });
      g.font = police(9); g.fillStyle = "#6E6B93"; g.textAlign = "left"; g.fillText(P.legende, x0, ay + 24);
      // coupure entre deux phases
      if (i < 2) {
        var xc = x1 + geo.G / 2;
        g.strokeStyle = "#ECE9F7"; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(xc - 5, ay + 6); g.lineTo(xc - 1, ay - 6); g.moveTo(xc + 1, ay + 6); g.lineTo(xc + 5, ay - 6); g.stroke();
      }
    });
    // événements
    frise.cibles = [];
    var rangs = [[], []];
    var libre = function (r, a0, a1) { return rangs[r].every(function (iv) { return a1 + 5 < iv[0] || a0 > iv[1] + 5; }); };
    var ordre = EV.map(function (e, k) { return k; }).sort(function (p, q) { return (q === etat.k) - (p === etat.k) || p - q; });
    g.font = police(petit ? 10 : 11, true);
    ordre.forEach(function (k) {
      var e = EV[k], X = xEvt(k), actif = k === etat.k;
      var w = g.measureText(e.court).width + 10, gx = Math.min(W - w - 2, Math.max(2, X - w / 2));
      var r = -1;
      if (actif || !petit) { r = 0; while (r < 2 && !libre(r, gx, gx + w)) r++; if (r >= 2) r = actif ? 1 : -1; }
      if (r >= 0) {
        rangs[r].push([gx, gx + w]);
        var ly = ay - 19 - r * 20;
        g.strokeStyle = actif ? "#FF5D72" : "rgba(236,233,247,0.3)"; g.lineWidth = 1;
        g.beginPath(); g.moveTo(X, ay - 3); g.lineTo(X, ly + 8); g.stroke();
        g.fillStyle = actif ? "#D9304D" : "#111743"; g.strokeStyle = actif ? "#D9304D" : "#323C78";
        arrondi(g, gx, ly - 8, w, 16, 4); g.fill(); g.stroke();
        g.fillStyle = actif ? "#fff" : "#ECE9F7"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(e.court, gx + 5, ly);
        frise.cibles.push({ k: k, x0: gx, x1: gx + w, y0: ly - 9, y1: ly + 9 });
      }
      g.beginPath(); g.arc(X, ay, 4, 0, 2 * Math.PI); g.fillStyle = "#070A1E"; g.fill(); g.lineWidth = 1.5; g.strokeStyle = "#ECE9F7"; g.stroke();
      frise.cibles.push({ k: k, x0: X - 9, x1: X + 9, y0: ay - 10, y1: ay + 10 });
    });
    // le point qui avance
    var px = frise.point, halo = g.createRadialGradient(px, ay, 0, px, ay, 16);
    halo.addColorStop(0, "rgba(255,93,114,0.7)"); halo.addColorStop(1, "rgba(255,93,114,0)");
    g.fillStyle = halo; g.beginPath(); g.arc(px, ay, 16, 0, 2 * Math.PI); g.fill();
    g.beginPath(); g.arc(px, ay, 7, 0, 2 * Math.PI); g.fillStyle = "#FF5D72"; g.fill(); g.lineWidth = 2; g.strokeStyle = "#fff"; g.stroke();
  }
  function arrondi(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function redimFrise() {
    var r = frise.cv.getBoundingClientRect(); frise.dpr = Math.min(2, window.devicePixelRatio || 1);
    frise.W = r.width; frise.H = r.height; frise.cv.width = Math.round(frise.W * frise.dpr); frise.cv.height = Math.round(frise.H * frise.dpr);
  }

  /* =========================================================
     2. LE MOTEUR 3D ET LE COMPOSITEUR DE ZOOM
     ========================================================= */
  var T = window.THREE, ok3d = false;
  var R = { renderer: null, chargeur: null, textures: {}, etiquettes: null, rtA: null, rtB: null, compo: null, compoScene: null, compoCam: null };

  function texture(nom, couleur) {
    if (R.textures[nom]) return R.textures[nom];
    var t = R.chargeur.load(nom.indexOf("/") >= 0 ? nom : IMG + nom + ".webp");
    if (couleur) t.encoding = T.sRGBEncoding;
    t.anisotropy = 4; R.textures[nom] = t; return t;
  }
  var ROND = null, ETOILE = null;
  function rond() {
    if (ROND) return ROND;
    var c = document.createElement("canvas"); c.width = c.height = 64;
    var g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.22, "rgba(255,255,255,0.75)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); ROND = new T.CanvasTexture(c); return ROND;
  }
  function etoileTex() {
    if (ETOILE) return ETOILE;
    var c = document.createElement("canvas"); c.width = c.height = 128;
    var g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.08, "rgba(255,255,255,0.9)"); gr.addColorStop(0.3, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    g.globalCompositeOperation = "lighter";
    [0, Math.PI / 2].forEach(function (a) {
      g.save(); g.translate(64, 64); g.rotate(a);
      var l = g.createLinearGradient(-64, 0, 64, 0);
      l.addColorStop(0, "rgba(255,255,255,0)"); l.addColorStop(0.5, "rgba(255,255,255,0.85)"); l.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = l; g.fillRect(-64, -1.2, 128, 2.4); g.restore();
    });
    ETOILE = new T.CanvasTexture(c); return ETOILE;
  }
  var TRAIT = null;
  function traitTex() {
    if (TRAIT) return TRAIT;
    var c = document.createElement("canvas"); c.width = 128; c.height = 16;
    var g = c.getContext("2d"), l = g.createLinearGradient(0, 0, 128, 0);
    l.addColorStop(0, "rgba(255,255,255,0)"); l.addColorStop(0.85, "rgba(255,255,255,0.9)"); l.addColorStop(1, "rgba(255,255,255,1)");
    g.fillStyle = l; g.fillRect(0, 6, 128, 4);
    var v = g.createLinearGradient(0, 0, 0, 16); v.addColorStop(0, "rgba(0,0,0,1)"); v.addColorStop(0.5, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-out"; g.fillStyle = v; g.fillRect(0, 0, 128, 16);
    TRAIT = new T.CanvasTexture(c); return TRAIT;
  }
  function lueur(couleur, taille, opacite, tex) {
    var m = new T.SpriteMaterial({ map: tex || rond(), color: couleur, transparent: true, opacity: opacite == null ? 1 : opacite, blending: T.AdditiveBlending, depthWrite: false });
    var s = new T.Sprite(m); s.scale.set(taille, taille, 1); return s;
  }
  function nuage(n, remplir, taille, opts) {
    opts = opts || {};
    var pos = new Float32Array(n * 3), col = new Float32Array(n * 3), p = [0, 0, 0], c = [1, 1, 1];
    for (var i = 0; i < n; i++) { remplir(i, p, c); pos.set(p, i * 3); col.set(c, i * 3); }
    var geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    geo.setAttribute("color", new T.BufferAttribute(col, 3));
    var mat = new T.PointsMaterial({ size: taille, map: rond(), vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: opts.attenuation !== false, opacity: opts.opacite == null ? 1 : opts.opacite });
    return new T.Points(geo, mat);
  }
  function atmosphere(rayon, couleur, force) {
    var mat = new T.ShaderMaterial({
      uniforms: { couleur: { value: new T.Color(couleur) }, force: { value: force || 1 } },
      vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
      fragmentShader: "uniform vec3 couleur; uniform float force; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.6) * force; gl_FragColor = vec4(couleur * f, f); }",
      transparent: true, blending: T.AdditiveBlending, depthWrite: false
    });
    return new T.Mesh(new T.SphereGeometry(rayon * 1.035, 64, 48), mat);
  }
  function planete(rayon, mat, options) {
    options = options || {};
    var inclin = new T.Group(), rot = new T.Group(), sphere = new T.Mesh(new T.SphereGeometry(rayon, 96, 64), mat);
    rot.add(sphere); inclin.add(rot);
    if (options.atmo) inclin.add(atmosphere(rayon, options.atmo, options.atmoForce));
    return { groupe: inclin, rotation: rot, sphere: sphere, viser: function (lon, lat) { rot.rotation.y = -Math.PI / 2 - lon * Math.PI / 180; inclin.rotation.x = lat * Math.PI / 180; } };
  }
  function matTerre() { return new T.MeshStandardMaterial({ map: texture("terre-sol", true), roughness: 0.85, metalness: 0 }); }
  function nuagesTerre(rayon) { return new T.Mesh(new T.SphereGeometry(rayon * 1.012, 96, 64), new T.MeshStandardMaterial({ map: texture("terre-nuages", true), transparent: true, depthWrite: false, roughness: 1 })); }
  function matLune() { return new T.MeshStandardMaterial({ map: texture("lune", true), bumpMap: texture("lune-relief"), bumpScale: 0.035, roughness: 1, metalness: 0 }); }
  function matJeuneTerre() { return new T.MeshStandardMaterial({ map: texture("jeune-terre", true), emissiveMap: texture("jeune-terre-lave", true), emissive: new T.Color(1, 1, 1), emissiveIntensity: 1.2, roughness: 0.9 }); }
  function lumiere(x, y, z, force) { var l = new T.DirectionalLight(0xfff4e6, force || 2.4); l.position.set(x, y, z); return l; }
  // recule la caméra quand l'écran est étroit (téléphone), pour que les astres tiennent dans le cadre
  function cadre() { return Math.max(1, 1.5 / aspect()); }
  function lin(hex) { return new T.Color(hex).convertSRGBToLinear(); }

  // fond d'étoiles partagé (seulement à partir de l'époque des étoiles)
  var FOND = null;
  function cielEtoile(I, opacite) {
    if (!FOND) {
      var al = graine(99);
      var tmp = nuage(2600, function (i, p, c) {
        var u = al() * 2 - 1, th = al() * 2 * Math.PI, s = Math.sqrt(1 - u * u), d = 2500;
        p[0] = s * Math.cos(th) * d; p[1] = s * Math.sin(th) * d; p[2] = u * d;
        var q = al(); c[0] = 0.75 + 0.25 * q; c[1] = 0.78 + 0.15 * q; c[2] = 1 - 0.3 * q;
      }, 1.5, { attenuation: false, opacite: 0.8 });
      tmp.material.blending = T.NormalBlending; FOND = { geo: tmp.geometry, mat: tmp.material };
    }
    var f = new T.Points(FOND.geo, FOND.mat); f.userData.partage = true; I.scene.add(f); return f;
  }

  /* ---------- une instance de scène = sa propre scène Three.js et sa caméra ---------- */
  function creerInstance(nom) {
    var I = { scene: new T.Scene(), camera: new T.PerspectiveCamera(45, aspect(), 0.1, 6000), racine: new T.Group(), etiq: [], debut: performance.now() };
    I.scene.add(I.racine);
    I.scene.background = lin(0x000000);
    I.fond = function (c) { I.scene.background = c && c.isColor ? c : lin(c); };
    I.etiquette = function (texte, objet, dec, classe) {
      var el = document.createElement("span"); el.className = "etiq3d" + (classe ? " " + classe : ""); el.textContent = texte;
      R.etiquettes.appendChild(el);
      var e = { el: el, objet: objet, dec: dec || new T.Vector3(), opacite: 1 }; I.etiq.push(e); return e;
    };
    var s = SCENES[nom](I, I.racine) || {};
    I.maj = s.maj || function () {};
    return I;
  }
  function detruire(I) {
    if (!I) return;
    I.scene.traverse(function (o) {
      if (o.userData.partage) return;
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.dispose(); });
    });
    I.etiq.forEach(function (e) { e.el.remove(); });
  }
  function aspect() { var c = R.renderer && R.renderer.domElement; return c ? c.clientWidth / Math.max(1, c.clientHeight) : 16 / 10; }

  var COMPO_VS = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
  var COMPO_FS = [
    "uniform sampler2D tA; uniform sampler2D tB; uniform float zA; uniform float zB; uniform float m; uniform vec2 cA; uniform vec2 sA; uniform vec2 cB; uniform vec2 sB; varying vec2 vUv;",
    "vec3 sur(vec3 c){ c = max(c, vec3(0.0)); c = min(c, vec3(40.0)); return (c.r == c.r && c.g == c.g && c.b == c.b) ? c : vec3(0.0); }",
    "vec3 lire(sampler2D t, vec2 u){ u = clamp(u, vec2(0.0), vec2(1.0)); return sur(texture2D(t, u).rgb); }",
    // scène réduite : visible dans une ouverture ronde et floue (plus de rectangle)
    "float masque(vec2 u, float z){ if (z > 0.999) return 1.0; return 1.0 - smoothstep(0.35, 0.95, length((u - 0.5) * 2.0)); }",
    "void main(){",
    "  vec2 uA = (vUv - cA) / zA + sA, uB = (vUv - cB) / zB + sB;",
    "  float w = m;",
    "  if (zB < 0.999) w = m * masque(uB, zB);",
    "  else if (zA < 0.999) w = 1.0 - (1.0 - m) * masque(uA, zA);",
    "  gl_FragColor = vec4(mix(lire(tA, uA), lire(tB, uB), w), 1.0);",
    "}"
  ].join("\n");
  // halo lumineux (bloom) : on isole ce qui brille, on le floute à trois échelles et on l'ajoute à l'image
  var SEUIL_FS = "uniform sampler2D t; varying vec2 vUv; void main(){ vec3 c = min(max(texture2D(t, vUv).rgb, vec3(0.0)), vec3(12.0)); float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(0.75, 1.6, l), 1.0); }";
  var FLOU_FS = "uniform sampler2D t; uniform vec2 d; varying vec2 vUv; void main(){ vec3 s = texture2D(t, vUv).rgb * 0.2270; s += (texture2D(t, vUv + d * 1.3846).rgb + texture2D(t, vUv - d * 1.3846).rgb) * 0.3162; s += (texture2D(t, vUv + d * 3.2308).rgb + texture2D(t, vUv - d * 3.2308).rgb) * 0.0703; gl_FragColor = vec4(s, 1.0); }";
  var FINAL_FS = [
    "uniform sampler2D t; uniform sampler2D b1; uniform sampler2D b2; uniform sampler2D b3; uniform float force; varying vec2 vUv;",
    "vec3 aces(vec3 x){ x *= 0.66; return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }",
    "vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }",
    "void main(){ vec3 c = max(texture2D(t, vUv).rgb, vec3(0.0)) + force * (texture2D(b1, vUv).rgb * 0.45 + texture2D(b2, vUv).rgb * 0.6 + texture2D(b3, vUv).rgb * 0.8); c = clamp(c, 0.0, 60.0); gl_FragColor = vec4(srgb(aces(c)), 1.0); }"
  ].join("\n");
  function creerCompositeur() {
    var opts = { type: T.HalfFloatType, samples: 4 }, simple = { type: T.HalfFloatType, depthBuffer: false };
    R.rtA = new T.WebGLRenderTarget(4, 4, opts); R.rtB = new T.WebGLRenderTarget(4, 4, opts);
    R.rtM = new T.WebGLRenderTarget(4, 4, simple);
    R.halo = [0, 1, 2].map(function () { return [new T.WebGLRenderTarget(4, 4, simple), new T.WebGLRenderTarget(4, 4, simple)]; });
    R.compo = new T.ShaderMaterial({ uniforms: { tA: { value: R.rtA.texture }, tB: { value: R.rtB.texture }, zA: { value: 1 }, zB: { value: 1 }, m: { value: 1 }, cA: { value: new T.Vector2(0.5, 0.5) }, sA: { value: new T.Vector2(0.5, 0.5) }, cB: { value: new T.Vector2(0.5, 0.5) }, sB: { value: new T.Vector2(0.5, 0.5) } }, vertexShader: COMPO_VS, fragmentShader: COMPO_FS, depthTest: false, depthWrite: false });
    R.seuil = new T.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: COMPO_VS, fragmentShader: SEUIL_FS, depthTest: false, depthWrite: false });
    R.flou = new T.ShaderMaterial({ uniforms: { t: { value: null }, d: { value: new T.Vector2() } }, vertexShader: COMPO_VS, fragmentShader: FLOU_FS, depthTest: false, depthWrite: false });
    R.final = new T.ShaderMaterial({ uniforms: { t: { value: R.rtM.texture }, b1: { value: R.halo[0][0].texture }, b2: { value: R.halo[1][0].texture }, b3: { value: R.halo[2][0].texture }, force: { value: 0.55 } }, vertexShader: COMPO_VS, fragmentShader: FINAL_FS, depthTest: false, depthWrite: false });
    R.quad = new T.Mesh(new T.PlaneGeometry(2, 2), R.compo);
    R.compoScene = new T.Scene(); R.compoScene.add(R.quad);
    R.compoCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  function passe(mat, cible) { R.quad.material = mat; R.renderer.setRenderTarget(cible); R.renderer.render(R.compoScene, R.compoCam); }
  function composer() {
    passe(R.compo, R.rtM);
    R.seuil.uniforms.t.value = R.rtM.texture; passe(R.seuil, R.halo[0][1]);
    var src = R.halo[0][1];
    R.halo.forEach(function (H, i) {
      var w = H[0].width, h = H[0].height;
      R.flou.uniforms.t.value = src.texture; R.flou.uniforms.d.value.set(1 / w, 0); passe(R.flou, i === 0 ? H[0] : H[1]);
      var a = i === 0 ? H[0] : H[1], b = i === 0 ? H[1] : H[0];
      R.flou.uniforms.t.value = a.texture; R.flou.uniforms.d.value.set(0, 1 / h); passe(R.flou, b);
      if (b !== H[0]) { R.flou.uniforms.t.value = b.texture; R.flou.uniforms.d.value.set(1 / w, 0); passe(R.flou, H[0]); }
      src = H[0];
    });
    passe(R.final, null);
  }

  /* =========================================================
     3. LES SCÈNES
     ========================================================= */
  var SCENES = {

    /* ---- Le Big Bang : la matière jaillit en boule de feu (première version 3D, préférée) ---- */
    bigbang: function (I, r) {
      I.fond(0x000000);
      var n = 9000, al = graine(3), vit = new Float32Array(n), dirs = new Float32Array(n * 3);
      var pts = nuage(n, function (i, p, c) {
        var u = al() * 2 - 1, th = al() * 2 * Math.PI, s = Math.sqrt(1 - u * u);
        dirs.set([s * Math.cos(th), s * Math.sin(th), u], i * 3); vit[i] = 0.35 + Math.pow(al(), 0.6) * 0.65;
        p[0] = p[1] = p[2] = 0;
        var h = al(); c[0] = 1; c[1] = 0.75 + 0.25 * h; c[2] = 0.45 + 0.5 * h;
      }, 1.6);
      r.add(pts);
      var flash = lueur(0xffffff, 1, 1), boule = lueur(0xffb060, 1, 0.9);
      r.add(boule); r.add(flash);
      I.camera.position.set(0, 0, 90); I.camera.lookAt(0, 0, 0);
      var pos = pts.geometry.attributes.position.array, coul = new T.Color();
      return { maj: function (ts) {
        var Rr = 70 * (1 - Math.exp(-ts * 0.75)) + ts * 0.8;
        for (var i = 0; i < n; i++) { var k = Rr * vit[i]; pos[i * 3] = dirs[i * 3] * k; pos[i * 3 + 1] = dirs[i * 3 + 1] * k; pos[i * 3 + 2] = dirs[i * 3 + 2] * k; }
        pts.geometry.attributes.position.needsUpdate = true;
        coul.setHSL(0.12 - Math.min(0.1, ts * 0.018), 1, Math.max(0.55, 0.95 - ts * 0.06));
        pts.material.color.copy(coul);
        pts.material.size = Math.max(0.9, 2.4 - ts * 0.2);
        flash.scale.setScalar(4 + ts * 160); flash.material.opacity = Math.max(0, 1 - ts / 0.9);
        boule.scale.setScalar(10 + Rr * 1.6); boule.material.opacity = Math.max(0, 0.9 - ts * 0.11);
        pts.rotation.y = ts * 0.05;
        I.camera.position.z = 90 + ts * 3;
      } };
    },

    /* ---- Les premiers atomes : zoom dans la matière, les électrons se font capturer, la lumière se libère ---- */
    atomes: function (I, r) {
      var chaud = lin(0xC04A16), froid = lin(0x03040A), fond = new T.Color();
      var al = graine(8), NP = 900, NE = 1800;
      // particules libres : protons (rouges) et électrons (bleus)
      var base = [], tous = nuage(NP + NE, function (i, p, c) {
        p[0] = (al() - 0.5) * 160; p[1] = (al() - 0.5) * 100; p[2] = (al() - 0.5) * 120 - 40; base.push(p.slice());
        if (i < NP) { c[0] = 1.6; c[1] = 0.35; c[2] = 0.25; } else { c[0] = 0.35; c[1] = 0.7; c[2] = 1.8; }
      }, 1.1);
      r.add(tous);
      var cible = []; for (var i = 0; i < NE; i++) cible.push(i % NP);
      var brumes = []; for (var b = 0; b < 6; b++) { var s = lueur(0xff8a3c, 140 + al() * 80, 0.55); s.position.set((al() - 0.5) * 120, (al() - 0.5) * 70, -30 - al() * 40); r.add(s); brumes.push(s); }
      // deux atomes au premier plan
      var lum = new T.PointLight(0xffffff, 2.2, 0, 0); lum.position.set(10, 20, 40); r.add(lum); r.add(new T.AmbientLight(0x404050, 0.8));
      function boule(rayon, coul, emis) { return new T.Mesh(new T.SphereGeometry(rayon, 32, 24), new T.MeshStandardMaterial({ color: coul, emissive: coul, emissiveIntensity: emis || 0.35, roughness: 0.4 })); }
      function orbite(rayon) { var m = new T.Mesh(new T.TorusGeometry(rayon, 0.035, 8, 96), new T.MeshBasicMaterial({ color: lin(0x6fb6ff), transparent: true, opacity: 0, blending: T.AdditiveBlending })); return m; }
      var H = new T.Group(); H.position.set(-11, 1, 10); r.add(H);
      H.add(boule(1.1, 0xff4a3c));
      var oH = orbite(4.2); oH.rotation.x = 1.2; H.add(oH);
      var eH = boule(0.38, 0x5ab4ff, 1.2); H.add(eH);
      var He = new T.Group(); He.position.set(11, -1, 8); r.add(He);
      [[0.55, 0.3, 0, 0xff4a3c], [-0.55, -0.2, 0.2, 0xff4a3c], [0.1, -0.5, -0.5, 0xb8c0d0], [-0.1, 0.6, 0.45, 0xb8c0d0]].forEach(function (q) { var m = boule(0.75, q[3]); m.position.set(q[0], q[1], q[2]); He.add(m); });
      var oHe1 = orbite(4.6), oHe2 = orbite(4.6); oHe1.rotation.set(1.1, 0.3, 0); oHe2.rotation.set(0.4, -0.9, 0); He.add(oHe1); He.add(oHe2);
      var eHe1 = boule(0.38, 0x5ab4ff, 1.2), eHe2 = boule(0.38, 0x5ab4ff, 1.2); He.add(eHe1); He.add(eHe2);
      // photons : la lumière voyage enfin en ligne droite
      var photons = [];
      for (var f = 0; f < 40; f++) { var ph = lueur(0xffe9a0, 1.6, 0, traitTex()); ph.userData = { y: (al() - 0.5) * 70, z: (al() - 0.5) * 60 - 10, v: 40 + al() * 30, d: al() * 200 }; r.add(ph); photons.push(ph); }
      var eH1 = I.etiquette("Atome d'hydrogène", H, new T.Vector3(0, -6.2, 0)), eHe = I.etiquette("Atome d'hélium", He, new T.Vector3(0, -6.6, 0));
      var eLum = I.etiquette("La lumière se libère", r, new T.Vector3(0, 22, 0), "chaud");
      [eH1, eHe, eLum].forEach(function (x) { x.opacite = 0; });
      var pos = tous.geometry.attributes.position.array, v = new T.Vector3();
      function placerElectron(m, orb, ang, capt, depart) {
        v.set(Math.cos(ang) * orb.geometry.parameters.radius, Math.sin(ang) * orb.geometry.parameters.radius, 0).applyEuler(orb.rotation);
        m.position.copy(depart).lerp(v, capt);
      }
      var loinH = new T.Vector3(-14, 9, 6), loinHe1 = new T.Vector3(13, 10, -5), loinHe2 = new T.Vector3(-10, -9, 6);
      return { maj: function (ts) {
        var s = entre(ts, 1.5, 7.5);              // refroidissement
        fond.copy(chaud).lerp(froid, s); I.fond(fond);
        brumes.forEach(function (b) { b.material.opacity = 0.55 * (1 - s); });
        var capt = entre(ts, 3, 7);
        for (var i = 0; i < NP + NE; i++) {
          var b = base[i], x = b[0], y = b[1], z = b[2];
          if (i >= NP) {
            var p = base[cible[i - NP]], a = ts * 4 + i, o = 1.6;
            var lx = x + Math.sin(ts * 9 + i) * 2.5 * (1 - capt), ly = y + Math.cos(ts * 7 + i * 1.3) * 2.5 * (1 - capt);
            x = lx + (p[0] + Math.cos(a) * o - lx) * capt; y = ly + (p[1] + Math.sin(a) * o - ly) * capt; z = z + (p[2] - z) * capt;
          } else { x += Math.sin(ts * 2 + i) * 0.4 * (1 - capt); }
          pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
        }
        tous.geometry.attributes.position.needsUpdate = true;
        var c = doux(entre(ts, 2.5, 7));
        placerElectron(eH, oH, ts * 2.2, c, loinH);
        placerElectron(eHe1, oHe1, ts * 2.0, c, loinHe1); placerElectron(eHe2, oHe2, ts * 2.0 + Math.PI, c, loinHe2);
        [oH, oHe1, oHe2].forEach(function (o) { o.material.opacity = 0.6 * entre(ts, 5.5, 7.5); });
        H.rotation.y = ts * 0.2; He.rotation.y = -ts * 0.15;
        photons.forEach(function (ph) { var u = ph.userData; ph.material.opacity = entre(ts, 6, 7.5) * 0.9; ph.position.set(-100 + ((u.d + ts * u.v) % 200), u.y, u.z); ph.scale.set(9, 0.5, 1); });
        eH1.opacite = eHe.opacite = entre(ts, 6.5, 7.5); eLum.opacite = entre(ts, 6.8, 7.8) * (1 - entre(ts, 10, 11));
        // zoom avant doux dans la matière
        var d = 46 - 12 * doux(ts / 10); I.camera.position.set(Math.sin(ts * 0.05) * 6, 2, d); I.camera.lookAt(0, 0, 0);
      } };
    },

    /* ---- Les premières étoiles : le gaz se rassemble et s'allume ---- */
    etoiles: function (I, r) {
      I.fond(0x020308);
      var al = graine(11), NA = 16, attr = [];
      for (var a = 0; a < NA; a++) attr.push([(al() - 0.5) * 170, (al() - 0.5) * 100, (al() - 0.5) * 120, 0.35 + al() * 0.45]);
      var N = 14000, p0 = [], k = [];
      var gaz = nuage(N, function (i, p, c) {
        p[0] = (al() - 0.5) * 230; p[1] = (al() - 0.5) * 150; p[2] = (al() - 0.5) * 180; p0.push(p.slice());
        k.push(al() < 0.75 ? Math.floor(al() * NA) : -1);
        var q = al(); c[0] = 0.35 + 0.2 * q; c[1] = 0.32 + 0.15 * q; c[2] = 0.75; }, 1.3);
      r.add(gaz);
      var et = attr.map(function (A) {
        var s = lueur(0xcfe0ff, 1, 0, etoileTex()); s.material.color = lin(0xcfe0ff).multiplyScalar(2.2); s.position.set(A[0], A[1], A[2]); r.add(s);
        var h = lueur(0x6f8fff, 1, 0); h.position.copy(s.position); r.add(h);
        return { s: s, h: h, t: 4 + A[3] * 6 };
      });
      var pos = gaz.geometry.attributes.position.array, off = [];
      for (var i = 0; i < N; i++) off.push([gauss(al) * 4, gauss(al) * 4, gauss(al) * 4]);
      var e = I.etiquette("Les premières étoiles s'allument", r, new T.Vector3(0, 0, 0), "chaud"); e.opacite = 0;
      return { maj: function (ts) {
        for (var i = 0; i < N; i++) {
          var b = p0[i], j = k[i];
          if (j < 0) { pos[i * 3] = b[0]; pos[i * 3 + 1] = b[1]; pos[i * 3 + 2] = b[2]; continue; }
          var A = attr[j], s = entre(ts, 0.3, 4 + A[3] * 6), o = off[i], ser = 1 - 0.85 * s;
          pos[i * 3] = b[0] + (A[0] + o[0] * ser * 3 - b[0]) * s; pos[i * 3 + 1] = b[1] + (A[1] + o[1] * ser * 3 - b[1]) * s; pos[i * 3 + 2] = b[2] + (A[2] + o[2] * ser * 3 - b[2]) * s;
        }
        gaz.geometry.attributes.position.needsUpdate = true;
        var premiere = 99;
        et.forEach(function (o) {
          var a = entre(ts, o.t, o.t + 0.6), boum = Math.max(0, 1 - Math.abs(ts - o.t - 0.4) * 2);
          premiere = Math.min(premiere, o.t);
          o.s.material.opacity = a; o.s.scale.setScalar(a * (8 + boum * 12) * (1 + 0.05 * Math.sin(ts * 4 + o.t)));
          o.h.material.opacity = a * 0.35; o.h.scale.setScalar(a * 16);
        });
        e.opacite = entre(ts, premiere + 0.5, premiere + 1.3);
        var d = 120 + 70 * doux(ts / 11); I.camera.position.set(Math.sin(ts * 0.03) * 30, 10, d); I.camera.lookAt(0, 0, 0);
      } };
    },

    /* ---- Les premières galaxies : les étoiles se regroupent, tournent et fusionnent ---- */
    galaxies: function (I, r) {
      I.fond(0x020308); cielEtoile(I);
      var al = graine(13), NG = 16, G = [];
      for (var g = 0; g < NG; g++) {
        var ax = new T.Vector3(gauss(al), gauss(al), gauss(al)).normalize(), e1 = new T.Vector3(1, 0, 0).cross(ax).normalize(), e2 = ax.clone().cross(e1);
        G.push({ c: new T.Vector3((al() - 0.5) * 220, (al() - 0.5) * 130, (al() - 0.5) * 150), e1: e1, e2: e2, ax: ax, taille: 6 + al() * 7, w: 0.3 + al() * 0.5 });
      }
      // trois paires de galaxies qui fusionnent
      [[0, 1], [2, 3], [4, 5]].forEach(function (pr) { var m = G[pr[0]].c.clone().add(G[pr[1]].c).multiplyScalar(0.5); G[pr[1]].c.copy(G[pr[0]].c).add(new T.Vector3(24, 6, -8)); G[pr[0]].fus = G[pr[1]].fus = m; });
      var N = 22000, gi = [], rr = [], ph = [], hh = [];
      var etoiles = nuage(N, function (i, p, c) {
        var g = i % NG; gi.push(g); rr.push(Math.pow(al(), 1.3) * G[g].taille); ph.push(al() * 2 * Math.PI); hh.push(gauss(al) * 1.5);
        var cen = 1 - rr[i] / G[g].taille; c[0] = 0.75 + 0.6 * cen; c[1] = 0.8 + 0.35 * cen; c[2] = 1.4;
      }, 1.1);
      r.add(etoiles);
      var coeurs = G.map(function (g) { var s = lueur(0xffe2b0, g.taille * 1.6, 0.8); r.add(s); return s; });
      var pos = etoiles.geometry.attributes.position.array, cc = new T.Vector3(), q = new T.Vector3();
      var e = I.etiquette("Les étoiles se rassemblent en galaxies", r, new T.Vector3(0, 0, 0), "chaud"); e.opacite = 0;
      return { maj: function (ts) {
        var sF = entre(ts, 2, 9);
        G.forEach(function (g, j) {
          g.pos = g.pos || new T.Vector3();
          if (g.fus) { var a = ts * 0.8 * (j % 2 ? 1 : -1); g.pos.copy(g.c).lerp(g.fus, sF); g.pos.x += Math.cos(a) * 8 * (1 - sF); g.pos.y += Math.sin(a) * 8 * (1 - sF); }
          else g.pos.copy(g.c);
          coeurs[j].position.copy(g.pos); coeurs[j].material.opacity = 0.35 + 0.4 * entre(ts, 0, 3);
        });
        for (var i = 0; i < N; i++) {
          var g = G[gi[i]], a = ph[i] + ts * g.w * 2.4 / Math.sqrt(rr[i] + 1), aplat = 1 - 0.75 * entre(ts, 0, 8);
          q.copy(g.e1).multiplyScalar(Math.cos(a) * rr[i]).addScaledVector(g.e2, Math.sin(a) * rr[i]).addScaledVector(g.ax, hh[i] * aplat * 2);
          pos[i * 3] = g.pos.x + q.x; pos[i * 3 + 1] = g.pos.y + q.y; pos[i * 3 + 2] = g.pos.z + q.z;
        }
        etoiles.geometry.attributes.position.needsUpdate = true;
        e.opacite = entre(ts, 2, 3) * (1 - entre(ts, 9, 10));
        var d = 150 + 110 * doux(ts / 11); I.camera.position.set(Math.sin(ts * 0.03) * 40, 20, d); I.camera.lookAt(0, 0, 0);
      } };
    },

    /* ---- La Voie lactée : la danse des étoiles qui forment notre galaxie ---- */
    voielactee: function (I, r) {
      I.fond(0x020308); cielEtoile(I);
      var al = graine(17), NC = 8, C = [];
      for (var c = 0; c < NC; c++) C.push({ r0: 35 + al() * 45, a0: al() * 2 * Math.PI, z0: (al() - 0.5) * 50, s: 4 + al() * 6, w: 0.25 + al() * 0.15 });
      var N = 32000, ci = [], off = [], dr = [], da = [], dz = [], type = [];
      var pitch = Math.tan(14 * Math.PI / 180);
      var pts = nuage(N, function (i, p, c) {
        ci.push(i % NC); off.push([gauss(al) * C[i % NC].s, gauss(al) * C[i % NC].s, gauss(al) * C[i % NC].s]);
        var t = al(), rad, ang, z;
        if (t < 0.16) { rad = Math.abs(gauss(al)) * 4.5; ang = al() * 2 * Math.PI; z = gauss(al) * 2.2; type.push(0); c[0] = 2.0; c[1] = 1.55; c[2] = 0.9; }
        else {
          rad = 3 + Math.min(52, -Math.log(al() + 1e-6) * 14); var bras = i % 2;
          ang = bras * Math.PI + Math.log(rad / 3) / pitch + gauss(al) * (0.18 + 6 / (rad + 6)); z = gauss(al) * 0.9; type.push(1);
          var rose = al() < 0.05; c[0] = rose ? 2.0 : 0.95; c[1] = rose ? 0.6 : 1.05; c[2] = rose ? 1.0 : 1.6;
        }
        dr.push(rad); da.push(ang); dz.push(z);
      }, 0.9);
      r.add(pts);
      var bulbe = lueur(0xffd9a0, 16, 0); r.add(bulbe);
      var pos = pts.geometry.attributes.position.array;
      var e = I.etiquette("Des amas d'étoiles tournent et se rencontrent…", r, new T.Vector3(0, 30, 0), "chaud");
      var e2 = I.etiquette("… et forment la Voie lactée", r, new T.Vector3(0, -34, 0), "chaud"); e2.opacite = 0;
      var RS = 30, aS = Math.log(RS / 3) / pitch; I.ancre = new T.Vector3();   // un point du bras : le futur Soleil
      return { maj: function (ts) {
        var s = ts / 12, fus = entre(s, 0.05, 0.62), disque = entre(s, 0.42, 0.92);
        var centres = C.map(function (k) { var rad = k.r0 * (1 - fus), a = k.a0 + ts * k.w * (1 + 2.5 * fus); return [Math.cos(a) * rad, k.z0 * (1 - fus), Math.sin(a) * rad]; });
        for (var i = 0; i < N; i++) {
          var cc = centres[ci[i]], o = off[i], st = 1 - 0.4 * fus;
          var x1 = cc[0] + o[0] * st, y1 = cc[1] + o[1] * st, z1 = cc[2] + o[2] * st;
          var a = da[i] + ts * 1.1 / Math.sqrt(dr[i] + 2);
          var x2 = Math.cos(a) * dr[i], y2 = dz[i], z2 = Math.sin(a) * dr[i];
          pos[i * 3] = x1 + (x2 - x1) * disque; pos[i * 3 + 1] = y1 + (y2 - y1) * disque; pos[i * 3 + 2] = z1 + (z2 - z1) * disque;
        }
        pts.geometry.attributes.position.needsUpdate = true;
        var aa = aS + ts * 1.1 / Math.sqrt(RS + 2); I.ancre.set(Math.cos(aa) * RS, 0, Math.sin(aa) * RS);
        bulbe.material.opacity = 0.9 * disque; bulbe.scale.setScalar(10 + 10 * disque);
        e.opacite = entre(ts, 0.5, 1.5) * (1 - entre(ts, 6, 7)); e2.opacite = entre(ts, 9, 10);
        var a = 0.4 + ts * 0.04, d = 165 - 40 * disque, h = 70 + 30 * disque;
        I.camera.position.set(Math.sin(a) * d, h, Math.cos(a) * d);
        if (I.plonge != null) {   // on entre dans le bras, là où naîtra le Soleil
          var q = I.plonge, cam = I.camera.position, dir = cam.clone().sub(I.ancre).normalize();
          cam.lerp(I.ancre.clone().add(dir.multiplyScalar(2.5)), q);
          I.camera.lookAt(new T.Vector3().lerp(I.ancre, entre(q, 0, 0.35)));
        } else I.camera.lookAt(0, 0, 0);
      } };
    },

    /* ---- Le Soleil : nouveau plan, un nuage de gaz et de poussières s'effondre et s'allume ---- */
    soleil: function (I, r) {
      I.fond(0x010104); cielEtoile(I);
      var f = cadre(), al = graine(41);
      // grumeaux colorés du nuage (gaz rose, bleu, orangé)
      var B = []; for (var b = 0; b < 34; b++) { var u = al() * 2 - 1, th = al() * 2 * Math.PI, s = Math.sqrt(1 - u * u), d = 6 + Math.pow(al(), 0.7) * 26; B.push([s * Math.cos(th) * d, u * d * 0.7, s * Math.sin(th) * d, 3 + al() * 6]); }
      var PAL = [[1.5, 0.32, 0.6], [0.45, 0.5, 1.5], [1.6, 0.75, 0.3], [1.0, 0.45, 1.2], [0.4, 0.9, 1.3], [1.4, 0.5, 0.35]];
      function creer(n, taille, sombre) {
        var r0 = new Float32Array(n), a0 = new Float32Array(n), y0 = new Float32Array(n), rd = new Float32Array(n), yd = new Float32Array(n);
        var pts = nuage(n, function (i, p, c) {
          var g = B[Math.floor(al() * B.length)], x = g[0] + gauss(al) * g[3], y = g[1] + gauss(al) * g[3] * 0.8, z = g[2] + gauss(al) * g[3];
          r0[i] = Math.sqrt(x * x + z * z); a0[i] = Math.atan2(z, x); y0[i] = y;
          rd[i] = 2.6 + Math.pow(al(), 0.85) * 16; yd[i] = gauss(al) * (0.12 + rd[i] * 0.02);
          if (sombre) { c[0] = 1; c[1] = 1; c[2] = 1; }
          else { var k = PAL[Math.floor(al() * PAL.length)], q = 0.35 + 0.65 * al(); c[0] = k[0] * q; c[1] = k[1] * q; c[2] = k[2] * q; }
        }, taille);
        if (sombre) { pts.material.blending = T.NormalBlending; pts.material.color = lin(0x1a0e08); pts.material.opacity = 0.45; }
        r.add(pts);
        return { pts: pts, n: n, r0: r0, a0: a0, y0: y0, rd: rd, yd: yd, pos: pts.geometry.attributes.position.array };
      }
      var poussiere = creer(5000, 2.4, true), gaz = creer(26000, 0.6, false);
      // volutes : grands nuages doux et colorés qui suivent le même effondrement
      var vol = creer(260, 1, false); r.remove(vol.pts);
      var volutes = []; for (var v = 0; v < vol.n; v++) { var sp = lueur(0xffffff, 1, 0); var k2 = PAL[v % PAL.length]; sp.material.color.setRGB(k2[0] * 0.5, k2[1] * 0.5, k2[2] * 0.5); sp.userData.t = 7 + al() * 9; r.add(sp); volutes.push(sp); }
      function animer(C, col, plat, ts) {
        for (var i = 0; i < C.n; i++) {
          var rad = C.r0[i] + (C.rd[i] - C.r0[i]) * col;
          var a = C.a0[i] + ts * (0.04 + col * 1.9 / Math.sqrt(rad + 0.6));
          var y = C.y0[i] * (1 - 0.6 * col) * (1 - plat) + C.yd[i] * plat;
          C.pos[i * 3] = Math.cos(a) * rad; C.pos[i * 3 + 1] = y; C.pos[i * 3 + 2] = Math.sin(a) * rad;
        }
        C.pts.geometry.attributes.position.needsUpdate = true;
      }
      // la protoétoile puis le Soleil
      var coeur = new T.Mesh(new T.SphereGeometry(1, 48, 32), new T.MeshBasicMaterial({ color: new T.Color(0.3, 0.02, 0) }));
      r.add(coeur);
      var halo = lueur(0xffffff, 1, 0), couronne = lueur(0xffffff, 1, 0, etoileTex()), eclair = lueur(0xfff4d0, 1, 0);
      r.add(halo); r.add(couronne); r.add(eclair);
      var cR = new T.Color(0.35, 0.03, 0), cO = new T.Color(2.4, 0.75, 0.12), cS = new T.Color(4.2, 3.3, 1.9), cc = new T.Color();
      var e1 = I.etiquette("Un nuage de gaz et de poussières", r, new T.Vector3(0, 21, 0), "chaud");
      var e2 = I.etiquette("Il s'effondre, tourne et s'aplatit en disque", r, new T.Vector3(0, -14, 0), "chaud");
      var e3 = I.etiquette("La protoétoile chauffe…", coeur, new T.Vector3(0, 4, 0), "chaud");
      var e4 = I.etiquette("Le Soleil s'allume !", coeur, new T.Vector3(0, 7, 0), "chaud");
      var e5 = I.etiquette("Le disque où naîtront les planètes", r, new T.Vector3(0, -6, 17));
      [e2, e3, e4, e5].forEach(function (e) { e.opacite = 0; });
      return { maj: function (ts) {
        var col = entre(ts, 1.2, 7), plat = entre(ts, 3.5, 8.2), chauffe = entre(ts, 3.5, 8), allume = entre(ts, 8, 9);
        animer(gaz, col, plat, ts); animer(poussiere, col, plat, ts); animer(vol, col, plat, ts);
        volutes.forEach(function (sp, v) { sp.position.set(vol.pos[v * 3], vol.pos[v * 3 + 1], vol.pos[v * 3 + 2]); var tt = sp.userData.t * (1 - 0.55 * col); sp.scale.set(tt, tt * (1 - 0.7 * plat), 1); sp.material.opacity = 0.16 * (1 - 0.5 * allume); });
        gaz.pts.material.opacity = 0.9 - 0.25 * allume; poussiere.pts.material.opacity = 0.45 * (1 - 0.6 * allume);
        cc.copy(cR).lerp(cO, chauffe).lerp(cS, allume); coeur.material.color.copy(cc);
        coeur.scale.setScalar(0.3 + 1.3 * chauffe + 1.1 * allume);
        halo.material.color.copy(cc).multiplyScalar(0.5); halo.material.opacity = 0.2 + 0.6 * chauffe + 0.2 * allume; halo.scale.setScalar(3 + 7 * chauffe + 9 * allume);
        couronne.material.color.copy(cS).multiplyScalar(0.35); couronne.material.opacity = allume * (0.85 + 0.15 * Math.sin(ts * 3)); couronne.scale.setScalar(26 * allume + 0.01);
        var fl = ts > 8 ? Math.max(0, 1 - (ts - 8) / 1.6) : 0; eclair.material.opacity = fl; eclair.scale.setScalar(4 + (1 - fl) * 70);
        e1.opacite = entre(ts, 0.3, 1) * (1 - entre(ts, 3, 3.6)); e2.opacite = entre(ts, 3.6, 4.2) * (1 - entre(ts, 6.4, 7));
        e3.opacite = entre(ts, 6.2, 6.8) * (1 - entre(ts, 7.9, 8.2)); e4.opacite = entre(ts, 8.4, 8.9); e5.opacite = entre(ts, 9.4, 10);
        var d = doux(ts / 10.5); I.camera.position.set(0, (24 - 9 * d) * f, (78 - 30 * d) * f); I.camera.lookAt(0, -1, 0);
      } };
    },

    /* ---- La Terre : des roches et des poussières s'agglomèrent en une boule de roches en fusion ---- */
    jeuneterre: function (I, r) {
      I.fond(0x010205); cielEtoile(I);
      var f = cadre(), al = graine(29);
      var P = planete(10, matJeuneTerre(), { atmo: 0xff7a30, atmoForce: 1.1 });
      r.add(P.groupe); r.add(lumiere(-30, 12, 22, 1.8)); r.add(new T.AmbientLight(0x404040, 0.6));
      // poussières du disque qui tombent en spirale
      var N = 7000, r0 = new Float32Array(N), a0 = new Float32Array(N), y0 = new Float32Array(N), tf = new Float32Array(N);
      var pou = nuage(N, function (i, p, c) { r0[i] = 14 + al() * 34; a0[i] = al() * 2 * Math.PI; y0[i] = gauss(al) * 1.4; tf[i] = 0.8 + al() * 8.6; var q = al(); c[0] = 1 + 0.5 * q; c[1] = 0.55 + 0.35 * q; c[2] = 0.3 + 0.2 * q; }, 0.5);
      r.add(pou); var pp = pou.geometry.attributes.position.array;
      // des roches en relief
      var geo = new T.IcosahedronGeometry(1, 2), gp = geo.attributes.position, v = new T.Vector3();
      for (var j = 0; j < gp.count; j++) {
        v.fromBufferAttribute(gp, j);
        var h = Math.sin(v.x * 12.9 + v.y * 78.2 + v.z * 37.7) * 43758.5; h -= Math.floor(h);
        var h2 = Math.sin(v.x * 3.1 + v.y * 5.7 + v.z * 2.3) * 0.18;
        v.multiplyScalar(0.78 + 0.22 * h + h2); gp.setXYZ(j, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();
      var roches = [], eclairs = [];
      for (var k = 0; k < 40; k++) {
        var m = new T.Mesh(geo, new T.MeshStandardMaterial({ color: lin(al() < 0.5 ? 0x6b5a4e : 0x4d4540), emissive: new T.Color(1, 0.25, 0.04), emissiveIntensity: 0.15, roughness: 1, flatShading: true }));
        var t = 0.6 + al() * 8.4;
        m.userData = { r0: 16 + al() * 32, a0: al() * 2 * Math.PI, y0: gauss(al) * 2, ti: t, taille: 0.5 + al() * 1.3, rx: al() * 3, ry: al() * 3, fait: false };
        m.scale.setScalar(m.userData.taille); r.add(m); roches.push(m);
      }
      for (var q = 0; q < 8; q++) { var s = lueur(0xffa040, 1, 0); r.add(s); eclairs.push({ s: s, t0: -10 }); }
      var ie = 0;
      var e1 = I.etiquette("Roches et poussières s'agglomèrent…", r, new T.Vector3(0, 16, 0), "chaud");
      var e2 = I.etiquette("La jeune Terre, couverte de roches en fusion", P.groupe, new T.Vector3(0, -12.5, 0), "chaud"); e2.opacite = 0;
      return { maj: function (ts) {
        var g = entre(ts, 0, 9.4), echelle = 0.22 + 0.78 * g, Rc = 10 * echelle;
        P.groupe.scale.setScalar(echelle); P.rotation.rotation.y = ts * 0.12;
        P.sphere.material.emissiveIntensity = 1.0 + 0.5 * g + 0.2 * Math.sin(ts * 1.7);
        for (var i = 0; i < N; i++) {
          var p = Math.min(1, ts / tf[i]), rad = Rc * 0.95 + (r0[i] - Rc * 0.95) * (1 - p * p);
          if (p >= 1) rad = 0;
          var a = a0[i] + ts * 3 / Math.sqrt(rad + 1);
          pp[i * 3] = Math.cos(a) * rad; pp[i * 3 + 1] = y0[i] * (1 - p); pp[i * 3 + 2] = Math.sin(a) * rad;
        }
        pou.geometry.attributes.position.needsUpdate = true;
        roches.forEach(function (m) {
          var u = m.userData, p = Math.min(1, ts / u.ti), rad = Rc + (u.r0 - Rc) * (1 - p * p), a = u.a0 + ts * 2.6 / Math.sqrt(rad + 1);
          m.position.set(Math.cos(a) * rad, u.y0 * (1 - p), Math.sin(a) * rad);
          m.rotation.set(ts * u.rx, ts * u.ry, 0);
          m.material.emissiveIntensity = 0.15 + 1.4 * p * p * p;
          if (p >= 1 && !u.fait) { u.fait = true; m.visible = false; var e = eclairs[ie++ % eclairs.length]; e.t0 = ts; e.s.position.copy(m.position); }
          if (p < 1 && u.fait) { u.fait = false; m.visible = true; }
        });
        eclairs.forEach(function (e) { var dt = ts - e.t0, o = dt >= 0 && dt < 0.9 ? 1 - dt / 0.9 : 0; e.s.material.opacity = o; e.s.scale.setScalar(2 + dt * 9); });
        e1.opacite = entre(ts, 0.3, 1) * (1 - entre(ts, 7.5, 8.3)); e2.opacite = entre(ts, 8.6, 9.3);
        var d = doux(ts / 11); I.camera.position.set(0, (12 - 7 * d) * f, (50 - 14 * d) * f); I.camera.lookAt(0, 0, 0);
      } };
    },

    /* ---- La Lune : Théia percute la jeune Terre, les débris forment un anneau puis la Lune ---- */
    lune: function (I, r) {
      I.fond(0x010205); cielEtoile(I);
      var f = cadre(), al = graine(19);
      var Te = planete(10, matJeuneTerre(), { atmo: 0xff7a30, atmoForce: 1.1 }); r.add(Te.groupe);
      var Th = planete(5, new T.MeshStandardMaterial({ map: texture("theia", true), roughness: 1, emissive: new T.Color(1, 0.3, 0.05), emissiveIntensity: 0 }));
      r.add(Th.groupe);
      r.add(lumiere(-20, 22, 34, 2.4)); r.add(new T.AmbientLight(0x404040, 0.45));
      var n = new T.Vector3(-0.72, 0.5, 0.48).normalize(), impact = n.clone().multiplyScalar(10);
      var depart = new T.Vector3(-40, 13, 10), contact = n.clone().multiplyScalar(13.5);
      var mvt = contact.clone().sub(depart).normalize(), tang = mvt.clone().sub(n.clone().multiplyScalar(mvt.dot(n))).normalize();
      var flash = lueur(0xfff0d0, 1, 0), boule = lueur(0xff7a28, 1, 0); flash.position.copy(impact); boule.position.copy(impact); r.add(boule); r.add(flash);
      // débris : éjectés, puis en anneau, puis rassemblés en Lune
      var N = 9000, vel = new Float32Array(N * 3), rho = new Float32Array(N), the = new Float32Array(N), hy = new Float32Array(N), tc = new Float32Array(N), off = new Float32Array(N * 3);
      var deb = nuage(N, function (i, p, c) {
        var a = 0.3 + al() * 0.9, b = 0.6 + al() * 1.4;
        vel[i * 3] = n.x * a + tang.x * b + gauss(al) * 0.35; vel[i * 3 + 1] = n.y * a + tang.y * b + gauss(al) * 0.35; vel[i * 3 + 2] = n.z * a + tang.z * b + gauss(al) * 0.35;
        rho[i] = 15 + Math.pow(al(), 0.8) * 17; the[i] = al() * 2 * Math.PI; hy[i] = gauss(al) * 0.5; tc[i] = 6.8 + al() * 3;
        off[i * 3] = gauss(al); off[i * 3 + 1] = gauss(al); off[i * 3 + 2] = gauss(al);
        var q = al(); c[0] = 1; c[1] = 0.55 + 0.4 * q; c[2] = 0.25 + 0.35 * q;
        p[0] = impact.x; p[1] = impact.y; p[2] = impact.z;
      }, 0.55);
      deb.material.opacity = 0; r.add(deb); var dp = deb.geometry.attributes.position.array;
      var mL = matLune(); mL.emissive = new T.Color(1, 0.32, 0.08); mL.emissiveIntensity = 1.5;
      var L = planete(2.7, mL); L.groupe.scale.setScalar(0.001); r.add(L.groupe);
      var M = new T.Vector3(), chaud = new T.Color(1.7, 1.1, 0.65), froid = new T.Color(1.1, 0.55, 0.32);
      var eT = I.etiquette("Théia", Th.groupe, new T.Vector3(0, 7, 0), "chaud");
      var eTe = I.etiquette("La jeune Terre", Te.groupe, new T.Vector3(0, -12.5, 0));
      var eI = I.etiquette("Impact !", flash, new T.Vector3(-2, 5, 0), "chaud"); eI.opacite = 0;
      var eA = I.etiquette("Les débris forment un anneau", r, new T.Vector3(0, -6, 26), "chaud"); eA.opacite = 0;
      var eL = I.etiquette("Les débris s'agglomèrent : la Lune", L.groupe, new T.Vector3(-4, 5, 0), "chaud"); eL.opacite = 0;
      var TI = 3.4;
      return { maj: function (ts) {
        Te.rotation.rotation.y = ts * 0.1; Th.rotation.rotation.y = ts * 0.3;
        // approche puis fusion de Théia
        var p = Math.min(1, ts / TI), fu = entre(ts, TI, TI + 0.8);
        Th.groupe.position.copy(depart).lerp(contact, Math.pow(p, 1.7)).lerp(impact.clone().multiplyScalar(0.6), fu);
        Th.groupe.scale.setScalar(Math.max(0.001, 1 - fu)); Th.sphere.material.emissiveIntensity = 2 * entre(ts, TI - 0.5, TI + 0.3);
        var te = ts - TI;
        flash.material.opacity = te > 0 ? Math.max(0, 1 - te / 1.6) : 0; flash.scale.setScalar(6 + Math.max(0, te) * 55);
        boule.material.opacity = te > 0 ? 0.9 * Math.max(0, 1 - te / 3.5) : 0; boule.scale.setScalar(8 + Math.max(0, te) * 10);
        Te.sphere.material.emissiveIntensity = 1.1 + 1.6 * entre(ts, TI, TI + 0.6) * (1 - 0.6 * entre(ts, TI + 2, 11));
        // débris
        deb.material.opacity = entre(ts, TI, TI + 0.25);
        var k = 13 * (1 - Math.exp(-Math.max(0, te) * 1.3)), w1 = entre(ts, 4.6, 7.2);
        var phi = 0.3 + (ts - 10.5) * 0.22; M.set(Math.cos(phi) * 24, Math.sin(phi) * 24 * 0.12, Math.sin(phi) * 24);
        for (var i = 0; i < N; i++) {
          var bx = impact.x + vel[i * 3] * k, by = impact.y + vel[i * 3 + 1] * k, bz = impact.z + vel[i * 3 + 2] * k;
          var th = the[i] + ts * 0.22 * Math.pow(24 / rho[i], 1.5), ro = rho[i];
          var rx = Math.cos(th) * ro, ry = hy[i] + Math.sin(th) * ro * 0.12, rz = Math.sin(th) * ro;
          var x = bx + (rx - bx) * w1, y = by + (ry - by) * w1, z = bz + (rz - bz) * w1;
          var w2 = entre(ts, tc[i] - 1.6, tc[i]), sp = 0.9 * (1 - entre(ts, tc[i], tc[i] + 0.6)) + 0.2;
          x += (M.x + off[i * 3] * sp - x) * w2; y += (M.y + off[i * 3 + 1] * sp - y) * w2; z += (M.z + off[i * 3 + 2] * sp - z) * w2;
          dp[i * 3] = x; dp[i * 3 + 1] = y; dp[i * 3 + 2] = z;
        }
        deb.geometry.attributes.position.needsUpdate = true;
        deb.material.color.copy(chaud).lerp(froid, entre(ts, 5, 10));
        // la Lune grossit puis refroidit
        var gr = entre(ts, 6.8, 10.2); L.groupe.position.copy(M); L.groupe.scale.setScalar(Math.max(0.001, gr)); L.rotation.rotation.y = ts * 0.2;
        mL.emissiveIntensity = 1.6 * (1 - entre(ts, 8.5, 11.5)) + 0.05;
        eT.opacite = entre(ts, 0.4, 1) * (1 - entre(ts, TI - 0.2, TI)); eTe.opacite = 1 - entre(ts, TI, TI + 0.4);
        eI.opacite = entre(ts, TI, TI + 0.2) * (1 - entre(ts, TI + 1.4, TI + 1.9));
        eA.opacite = entre(ts, 5.8, 6.4) * (1 - entre(ts, 8.2, 8.7)); eL.opacite = entre(ts, 9.2, 9.8);
        var d = doux((ts - 3) / 6); I.camera.position.set(6 * f, (18 + 6 * d) * f, (66 + 10 * d) * f); I.camera.lookAt(-3 + 3 * d, 0, 0);
      } };
    },

    /* ---- La vie : plongée dans l'océan primitif, des cellules se forment et se divisent ---- */
    vie: function (I, r) {
      I.fond(0x010205); var ciel = cielEtoile(I);
      var f = cadre(), al = graine(51);
      // 1. la Terre primitive, couverte d'océans
      var terre = new T.Group(); r.add(terre);
      var mat = new T.MeshStandardMaterial({ color: lin(0x1c4f86), roughness: 0.35, metalness: 0 });
      var P = planete(10, mat, { atmo: 0x6fb3ff, atmoForce: 1.2 }), N = nuagesTerre(10); P.rotation.add(N); terre.add(P.groupe);
      terre.add(lumiere(-25, 12, 22, 2.6)); var amb = new T.AmbientLight(0x30364a, 0.5); terre.add(amb);
      // voile bleu collé à la caméra pour « entrer dans l'eau »
      I.scene.add(I.camera);
      var voile = new T.Mesh(new T.PlaneGeometry(4, 4), new T.MeshBasicMaterial({ color: lin(0x0e6a9a), transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
      voile.position.z = -0.5; voile.renderOrder = 999; I.camera.add(voile);
      // 2. sous l'eau
      var mer = new T.Group(); mer.visible = false; r.add(mer);
      mer.add(lumiere(0, 30, 10, 1.8)); mer.add(new T.AmbientLight(0x2a6a80, 0.9));
      var c = document.createElement("canvas"); c.width = 16; c.height = 128;
      var g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 16, 128);
      var bx = g.createLinearGradient(0, 0, 16, 0); bx.addColorStop(0, "rgba(0,0,0,1)"); bx.addColorStop(0.5, "rgba(0,0,0,0)"); bx.addColorStop(1, "rgba(0,0,0,1)");
      g.globalCompositeOperation = "destination-out"; g.fillStyle = bx; g.fillRect(0, 0, 16, 128);
      var rayTex = new T.CanvasTexture(c), rayons = [];
      for (var k = 0; k < 9; k++) {
        var rm = new T.Mesh(new T.PlaneGeometry(1.5 + al() * 3, 46), new T.MeshBasicMaterial({ map: rayTex, color: lin(0x7fe8ff), transparent: true, opacity: 0.07 + al() * 0.06, blending: T.AdditiveBlending, depthWrite: false }));
        rm.position.set(-22 + k * 5.5 + al() * 2, 8, -12 - al() * 6); rm.userData.a = -0.25 + al() * 0.1; rm.userData.p = al() * 6; mer.add(rm); rayons.push(rm);
      }
      var NS = 2500, neige = nuage(NS, function (i, p, cc) { p[0] = (al() - 0.5) * 70; p[1] = (al() - 0.5) * 44; p[2] = -20 + al() * 32; cc[0] = 0.6; cc[1] = 0.9; cc[2] = 1; }, 0.1);
      neige.material.opacity = 0.45; mer.add(neige); var np = neige.geometry.attributes.position.array;
      // molécules qui s'assemblent
      var NM = 1200, m0 = new Float32Array(NM * 3), m1 = new Float32Array(NM * 3);
      var mol = nuage(NM, function (i, p, cc) {
        var u = al() * 2 - 1, th = al() * 2 * Math.PI, s = Math.sqrt(1 - u * u), d = 6 + al() * 10;
        m0[i * 3] = s * Math.cos(th) * d; m0[i * 3 + 1] = u * d * 0.7; m0[i * 3 + 2] = s * Math.sin(th) * d;
        var u2 = al() * 2 - 1, t2 = al() * 2 * Math.PI, s2 = Math.sqrt(1 - u2 * u2);
        m1[i * 3] = s2 * Math.cos(t2) * 2; m1[i * 3 + 1] = s2 * Math.sin(t2) * 2; m1[i * 3 + 2] = u2 * 2;
        var q = al(); cc[0] = 0.6 + 0.6 * q; cc[1] = 2.0; cc[2] = 0.8 + 0.6 * (1 - q);
      }, 0.32);
      mer.add(mol); var mp = mol.geometry.attributes.position.array;
      // les cellules
      function cellule() {
        var gc = new T.Group();
        var corps = new T.Mesh(new T.SphereGeometry(2, 48, 32), new T.MeshStandardMaterial({ color: lin(0x3fb08a), emissive: lin(0x0e4a3a), transparent: true, opacity: 0.32, roughness: 0.3, depthWrite: false }));
        var noyau = new T.Mesh(new T.SphereGeometry(0.65, 32, 24), new T.MeshStandardMaterial({ color: lin(0x7a4cc0), emissive: lin(0x2a1450), roughness: 0.5, transparent: true, opacity: 0.85 }));
        noyau.position.set(0.3, 0.2, 0.2);
        var grains = nuage(90, function (i, p, cc) { var u = al() * 2 - 1, th = al() * 2 * Math.PI, s = Math.sqrt(1 - u * u), d = 0.6 + al() * 1.1; p[0] = s * Math.cos(th) * d; p[1] = s * Math.sin(th) * d; p[2] = u * d; cc[0] = 0.8; cc[1] = 1.3; cc[2] = 0.6; }, 0.12);
        gc.add(corps); gc.add(noyau); gc.add(grains); gc.add(atmosphere(2, 0x8dffcf, 1.5));
        gc.visible = false; mer.add(gc); return gc;
      }
      var cellules = [cellule(), cellule(), cellule(), cellule()];
      var e1 = I.etiquette("La Terre primitive, couverte d'océans", P.groupe, new T.Vector3(0, -12.5, 0));
      var e2 = I.etiquette("Dans l'océan, des molécules s'assemblent…", mer, new T.Vector3(0, 4.2, 0), "chaud");
      var e3 = I.etiquette("Les premières cellules vivantes", mer, new T.Vector3(0, -4, 0), "chaud");
      var e4 = I.etiquette("Elles se divisent : la vie se multiplie", mer, new T.Vector3(0, -6.8, 0), "chaud");
      [e2, e3, e4].forEach(function (e) { e.opacite = 0; });
      return { maj: function (ts) {
        var dans = ts > 3.1;
        terre.visible = !dans; mer.visible = dans; ciel.visible = !dans;
        I.fond(dans ? 0x03263a : 0x010205);
        voile.material.opacity = entre(ts, 2.2, 3.1) * (1 - entre(ts, 3.1, 4));
        if (!dans) {
          P.rotation.rotation.y = -1.2 + ts * 0.05; N.rotation.y = ts * 0.02;
          var d = doux(ts / 3.1); I.camera.position.set(0, 2 * (1 - d) * f, (33 * f) * (1 - d) + 10.6 * d); I.camera.lookAt(0, 0, 0);
          e1.opacite = 1 - entre(ts, 1.8, 2.3);
        } else {
          var te = ts - 3.1;
          for (var i = 0; i < NS; i++) { np[i * 3 + 1] -= 0.004; if (np[i * 3 + 1] < -22) np[i * 3 + 1] = 22; }
          neige.geometry.attributes.position.needsUpdate = true;
          rayons.forEach(function (rm) { rm.rotation.z = rm.userData.a + Math.sin(ts * 0.4 + rm.userData.p) * 0.05; });
          var ass = entre(ts, 3.6, 6);
          for (var j = 0; j < NM * 3; j += 3) {
            var tw = 1 + 0.15 * Math.sin(ts * 2 + j);
            mp[j] = (m0[j] + (m1[j] - m0[j]) * ass) * (ass < 1 ? 1 : tw); mp[j + 1] = m0[j + 1] + (m1[j + 1] - m0[j + 1]) * ass; mp[j + 2] = m0[j + 2] + (m1[j + 2] - m0[j + 2]) * ass;
          }
          mol.geometry.attributes.position.needsUpdate = true; mol.material.opacity = 1 - entre(ts, 5.6, 6.6);
          var nait = entre(ts, 5.2, 6.4), s1 = entre(ts, 6.8, 8.4), s2 = entre(ts, 9, 10.6);
          cellules.forEach(function (gc, i) {
            var sx = i < 2 ? -1 : 1, sy = i % 2 ? 1 : -1;
            gc.visible = i === 0 ? nait > 0.01 : (i === 2 ? s1 > 0.01 : (s2 > 0.01 && (i === 1 || i === 3)));
            var px = sx * 2.1 * s1, py = (i === 1 || i === 3) ? sy * 2.1 * s2 : (i === 0 || i === 2 ? -2.1 * s2 : 0);
            gc.position.set(px, py + 0.3 * Math.sin(ts * 0.8 + i), 0);
            var pinceX = 1 + 0.22 * Math.sin(Math.PI * s1) * (s2 < 0.01 ? 1 : 0), pinceY = 1 + 0.22 * Math.sin(Math.PI * s2);
            var taille = (i === 0 ? nait : 1) * (1 + 0.03 * Math.sin(ts * 2.2 + i));
            gc.scale.set(taille * pinceX, taille * pinceY, taille);
            gc.rotation.y = ts * 0.2 + i;
          });
          e2.opacite = entre(ts, 3.7, 4.2) * (1 - entre(ts, 5.6, 6)); e3.opacite = entre(ts, 6, 6.5) * (1 - entre(ts, 8.4, 8.8)); e4.opacite = entre(ts, 8.9, 9.4);
          I.camera.position.set(Math.sin(te * 0.08) * 3, 1, (13 + 6 * entre(ts, 6.5, 10.5)) * f); I.camera.lookAt(0, 0, 0);
        }
      } };
    },

    /* ---- Les dinosaures : zoom vers la surface de la Terre, puis la scène de vie (photo) ---- */
    dinosaures: function (I, r) {
      var s = sceneTerre(I, r, -30, 20, null), f = cadre();
      I.scene.add(I.camera);
      var A = aspect(), h = 2 * Math.tan(22.5 * Math.PI / 180), cote = Math.max(h * A, h) * 1.04;
      var photo = new T.Mesh(new T.PlaneGeometry(cote, cote), new T.MeshBasicMaterial({ map: texture("assets/img/dinosaures.jpg", true), color: new T.Color(1.55, 1.55, 1.55), transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
      photo.position.z = -1; photo.renderOrder = 999; I.camera.add(photo);
      var e1 = I.etiquette("La Terre au temps des dinosaures", r, new T.Vector3(0, -12.5, 0));
      return { maj: function (ts) {
        s.maj(ts);
        var d = doux(ts / 4.2); I.camera.position.set(0, 0, (33 * f) * (1 - d) + 11.5 * d); I.camera.lookAt(0, 0, 0);
        var v = entre(ts, 3.4, 4.8); photo.material.opacity = v; photo.scale.setScalar(1.12 - 0.1 * entre(ts, 3.4, 11));
        e1.opacite = 1 - entre(ts, 2.2, 2.8);
      } };
    },

    /* ---- Homo sapiens : l'Afrique de l'Est, berceau de notre espèce ---- */
    sapiens: function (I, r) {
      I.fond(0x010205); cielEtoile(I);
      var f = cadre();
      var P = planete(10, matTerre(), { atmo: 0x6fb3ff, atmoForce: 1.2 }), N = nuagesTerre(10); P.rotation.add(N); P.viser(38, 8);
      r.add(P.groupe); r.add(lumiere(-25, 12, 22, 2.6)); r.add(new T.AmbientLight(0x30364a, 0.5));
      P.groupe.updateMatrixWorld(true);
      var repere = new T.Group(); repere.position.copy(P.rotation.worldToLocal(new T.Vector3(0, 0, 10.08))); P.rotation.add(repere);
      var point = lueur(0xff4a3c, 0.9, 1), halo = lueur(0xff7a5c, 2, 0.6); repere.add(halo); repere.add(point);
      var e1 = I.etiquette("Afrique de l'Est : les premiers Homo sapiens", repere, new T.Vector3(0, 1.4, 0), "chaud"); e1.opacite = 0;
      var e2 = I.etiquette("… qui peupleront ensuite toute la Terre", P.groupe, new T.Vector3(0, -12.5, 0)); e2.opacite = 0;
      var base = P.rotation.rotation.y;
      return { maj: function (ts) {
        N.rotation.y = ts * 0.01;
        var d = doux(ts / 5), recul = doux((ts - 7) / 4);
        I.camera.position.set(0, 0, (33 * f) * (1 - d) + 21 * d + 10 * f * recul); I.camera.lookAt(0, 0, 0);
        P.rotation.rotation.y = base + 0.5 * recul;
        var pul = 0.5 + 0.5 * Math.sin(ts * 4); halo.scale.setScalar(1.5 + 1.5 * pul); halo.material.opacity = 0.35 + 0.4 * (1 - pul);
        point.material.opacity = entre(ts, 1.5, 2.2); halo.visible = ts > 1.5;
        e1.opacite = entre(ts, 2.4, 3) * (1 - entre(ts, 7, 7.5)); e2.opacite = entre(ts, 8, 8.6);
      } };
    },

    /* ---- La fin des dinosaures : l'astéroïde de Chicxulub et le nuage de poussières ---- */
    extinction: function (I, r) {
      I.fond(0x010205); cielEtoile(I);
      var f = cadre(), al = graine(61);
      var P = planete(10, matTerre(), { atmo: 0x6fb3ff, atmoForce: 1.2 }), N = nuagesTerre(10); P.rotation.add(N); P.viser(-89, 21);
      r.add(P.groupe); r.add(lumiere(-25, 12, 22, 2.6)); r.add(new T.AmbientLight(0x30364a, 0.5));
      var cible = new T.Vector3(0, 0, 10.05), TI = 3.2;
      var ast = planete(0.5, new T.MeshStandardMaterial({ map: texture("theia", true), roughness: 1, emissive: new T.Color(1, 0.4, 0.1), emissiveIntensity: 0.6 })); r.add(ast.groupe);
      var trainee = lueur(0xffa050, 3, 0.9); r.add(trainee);
      var flash = lueur(0xfff2c8, 1, 0); flash.position.copy(cible); r.add(flash);
      var onde = new T.Mesh(new T.RingGeometry(0.85, 1, 96), new T.MeshBasicMaterial({ color: new T.Color(2.2, 1.2, 0.5), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      onde.position.copy(cible); r.add(onde);
      var NP = 3000, dirs = new Float32Array(NP * 3);
      var panache = nuage(NP, function (i, p, c) { var u = al(), th = al() * 2 * Math.PI, s = Math.sqrt(1 - u * u); dirs[i * 3] = s * Math.cos(th); dirs[i * 3 + 1] = s * Math.sin(th); dirs[i * 3 + 2] = u; p[0] = cible.x; p[1] = cible.y; p[2] = cible.z; var q = al(); c[0] = 1; c[1] = 0.5 + 0.4 * q; c[2] = 0.2 + 0.2 * q; }, 0.3);
      panache.material.opacity = 0; r.add(panache); var pp = panache.geometry.attributes.position.array, vit = new Float32Array(NP); for (var i = 0; i < NP; i++) vit[i] = 0.4 + al() * 1.6;
      var poussiere = new T.Mesh(new T.SphereGeometry(10.35, 64, 48), new T.MeshStandardMaterial({ color: lin(0x5a4a3c), transparent: true, opacity: 0, roughness: 1, depthWrite: false }));
      r.add(poussiere);
      var dep = new T.Vector3(-10, 5, 12);
      var e1 = I.etiquette("Un astéroïde de 10 km", ast.groupe, new T.Vector3(0, 1.6, 0), "chaud");
      var e2 = I.etiquette("Impact au Mexique (Chicxulub)", flash, new T.Vector3(0, 3, 0), "chaud"); e2.opacite = 0;
      var e3 = I.etiquette("Les poussières cachent le Soleil : les dinosaures disparaissent", P.groupe, new T.Vector3(0, -12.5, 0), "chaud"); e3.opacite = 0;
      return { maj: function (ts) {
        N.rotation.y = ts * 0.01;
        var p = Math.min(1, ts / TI), te = ts - TI;
        ast.groupe.position.copy(dep).lerp(cible, Math.pow(p, 1.8)); ast.groupe.visible = p < 1; ast.rotation.rotation.y = ts;
        trainee.position.copy(ast.groupe.position); trainee.visible = p < 1; trainee.scale.setScalar(1.5 + 3 * p);
        flash.material.opacity = te > 0 ? Math.max(0, 1 - te / 1.8) : 0; flash.scale.setScalar(2 + Math.max(0, te) * 22);
        onde.material.opacity = te > 0 ? 0.8 * Math.max(0, 1 - te / 2.6) : 0; onde.scale.setScalar(0.2 + Math.max(0, te) * 1.6);
        var k = 7 * (1 - Math.exp(-Math.max(0, te) * 1.2));
        for (var i = 0; i < NP; i++) { var kk = k * vit[i]; pp[i * 3] = cible.x + dirs[i * 3] * kk; pp[i * 3 + 1] = cible.y + dirs[i * 3 + 1] * kk; pp[i * 3 + 2] = cible.z + dirs[i * 3 + 2] * kk * 0.6; }
        panache.geometry.attributes.position.needsUpdate = true; panache.material.opacity = te > 0 ? Math.max(0, 1 - te / 5) : 0;
        poussiere.material.opacity = 0.82 * entre(ts, 4.5, 8.5);
        e1.opacite = entre(ts, 0.3, 0.8) * (p < 1 ? 1 : 0); e2.opacite = entre(ts, TI, TI + 0.3) * (1 - entre(ts, TI + 2.2, TI + 2.8)); e3.opacite = entre(ts, 7, 7.6);
        var d = doux(ts / 11); I.camera.position.set(3 * d, 2, (30 + 6 * d) * f); I.camera.lookAt(0, 0, 0);
      } };
    },

    /* ---- Aujourd'hui : le grand dézoom, de la Terre jusqu'à la toile cosmique ---- */
    aujourdhui: function (I, r) {
      I.fond(0x010205);
      var f = cadre(), al = graine(23);
      // unité : rayon terrestre = 10
      var LUNE = 6034, UA = 234800, AL = 1.485e10, GAL = 5e4 * AL, SOL = new T.Vector3(-UA, 0, 0), CG = new T.Vector3(-UA - 2.6e4 * AL, 0, 0);
      var fondE = nuage(2600, function (i, p, c) { var u = al() * 2 - 1, th = al() * 2 * Math.PI, s = Math.sqrt(1 - u * u), d = 2500; p[0] = s * Math.cos(th) * d; p[1] = s * Math.sin(th) * d; p[2] = u * d; c[0] = c[1] = c[2] = 0.85; }, 1.5, { attenuation: false });
      fondE.material.blending = T.NormalBlending; I.scene.add(fondE);
      var P = planete(10, matTerre(), { atmo: 0x6fb3ff, atmoForce: 1.2 }), N = nuagesTerre(10); P.rotation.add(N); P.viser(10, 20); r.add(P.groupe);
      var Ls = planete(2.73, matLune()); Ls.groupe.position.set(5000, 400, -3400); r.add(Ls.groupe);
      var lum = new T.DirectionalLight(0xfff4e6, 2.6); lum.position.set(-1, 0.3, 0.6); r.add(lum); r.add(new T.AmbientLight(0x30364a, 0.5));
      var soleil = new T.Mesh(new T.SphereGeometry(1090, 32, 24), new T.MeshBasicMaterial({ color: new T.Color(4, 3.2, 2) })); soleil.position.copy(SOL); r.add(soleil);
      var halo = lueur(0xffd890, 9000, 0.9); halo.position.copy(SOL); r.add(halo);
      // orbites et planètes
      var orbites = new T.Group(); orbites.position.copy(SOL); orbites.rotation.x = 0.45; r.add(orbites);
      var PL = [[0.39, 0xb9b0a6], [0.72, 0xe8c27a], [1, 0x5fa8ff], [1.52, 0xd0643c], [5.2, 0xd8b48a], [9.5, 0xe6d29a], [19.2, 0x9fe0ea], [30, 0x5b7cf0]];
      var matOrb = new T.LineBasicMaterial({ color: lin(0x6f8cc8), transparent: true, opacity: 0 });
      var planetes = nuage(PL.length, function (i, p, c) { var a = 0.8 + i * 1.7, rr = PL[i][0] * UA; p[0] = i === 2 ? UA : Math.cos(a) * rr; p[1] = 0; p[2] = i === 2 ? 0 : Math.sin(a) * rr; var cc = new T.Color(PL[i][1]); c[0] = cc.r * 1.5; c[1] = cc.g * 1.5; c[2] = cc.b * 1.5; }, 5, { attenuation: false });
      planetes.material.opacity = 0; orbites.add(planetes);
      PL.forEach(function (q) { var pts = []; for (var a = 0; a <= 128; a++) pts.push(new T.Vector3(Math.cos(a / 128 * 2 * Math.PI) * q[0] * UA, 0, Math.sin(a / 128 * 2 * Math.PI) * q[0] * UA)); orbites.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), matOrb)); });
      // la Voie lactée
      var pitch = Math.tan(14 * Math.PI / 180);
      var gal = nuage(30000, function (i, p, c) {
        var t = al(), rad, ang, z;
        if (t < 0.15) { rad = Math.abs(gauss(al)) * 0.09; ang = al() * 2 * Math.PI; z = gauss(al) * 0.04; c[0] = 2; c[1] = 1.55; c[2] = 0.9; }
        else { rad = 0.06 + Math.min(1, -Math.log(al() + 1e-6) * 0.27); ang = (i % 2) * Math.PI + Math.log(rad / 0.06) / pitch + gauss(al) * (0.18 + 0.1 / (rad + 0.1)); z = gauss(al) * 0.015; var rose = al() < 0.05; c[0] = rose ? 2 : 0.95; c[1] = rose ? 0.6 : 1.05; c[2] = rose ? 1 : 1.6; }
        p[0] = Math.cos(ang) * rad * GAL; p[1] = z * GAL; p[2] = Math.sin(ang) * rad * GAL;
      }, 1.6, { attenuation: false });
      gal.position.copy(CG); gal.rotation.y = Math.PI; gal.rotation.x = 0.75; gal.material.opacity = 0; r.add(gal);
      // la toile cosmique (une galaxie = un point)
      // toile cosmique : des amas (nœuds) reliés par des filaments de galaxies
      var TOILE = 6000 * GAL / 300, NO = [], VO = [];
      for (var q = 0; q < 70; q++) { var u = al() * 2 - 1, th = al() * 2 * Math.PI, s = Math.sqrt(1 - u * u), d = 220 * Math.cbrt(al()); NO.push([s * Math.cos(th) * d, u * d, s * Math.sin(th) * d]); }
      NO.forEach(function (A, q) { VO.push(NO.map(function (B, j) { return [j, (A[0] - B[0]) * (A[0] - B[0]) + (A[1] - B[1]) * (A[1] - B[1]) + (A[2] - B[2]) * (A[2] - B[2])]; }).sort(function (x, y) { return x[1] - y[1]; }).slice(1, 4).map(function (x) { return x[0]; })); });
      var web = nuage(22000, function (i, p, c) {
        var q = Math.floor(al() * NO.length), A = NO[q], x, y, zz;
        if (al() < 0.3) { x = A[0] + gauss(al) * 7; y = A[1] + gauss(al) * 7; zz = A[2] + gauss(al) * 7; }
        else { var B = NO[VO[q][Math.floor(al() * 3)]], t2 = al(); x = A[0] + (B[0] - A[0]) * t2 + gauss(al) * 3; y = A[1] + (B[1] - A[1]) * t2 + gauss(al) * 3; zz = A[2] + (B[2] - A[2]) * t2 + gauss(al) * 3; }
        p[0] = x * TOILE; p[1] = y * TOILE; p[2] = zz * TOILE;
        var h = al(); c[0] = 0.6 + 0.5 * h; c[1] = 0.55 + 0.35 * h; c[2] = 1.1;
      }, 1.4, { attenuation: false });
      web.position.copy(CG); web.rotation.x = 0.45; web.material.opacity = 0; r.add(web);
      var ici = lueur(0xff4a3c, 1, 0); ici.position.copy(SOL); r.add(ici);
      var eT = I.etiquette("La Terre", P.groupe, new T.Vector3(0, -12.5, 0));
      var eL = I.etiquette("La Lune", Ls.groupe, new T.Vector3(0, 0, 0)); eL.dec = new T.Vector3(0, -1.8, 0);
      var eS = I.etiquette("Le système solaire", soleil, new T.Vector3(0, 0, 0));
      var eG = I.etiquette("La Voie lactée : nous sommes ici", ici, new T.Vector3(0, 1.6, 0), "chaud");
      var eW = I.etiquette("Des milliards de galaxies : l'Univers aujourd'hui", r, new T.Vector3(0, 0, 0), "chaud");
      [eL, eS, eG, eW].forEach(function (e) { e.opacite = 0; });
      var CLES = [[0, 0], [2.2, 0], [4.6, -2.4], [6.2, -2.5], [8.8, -5.5], [10.4, -5.6], [13.4, -13.65], [15.4, -13.8], [18.2, -17.2], [21, -17.4], [30, -17.5]];
      function zoomLog(ts) { for (var k = 0; k < CLES.length - 1; k++) { var a = CLES[k], b = CLES[k + 1]; if (ts <= b[0]) return a[1] + (b[1] - a[1]) * doux((ts - a[0]) / (b[0] - a[0])); } return CLES[CLES.length - 1][1]; }
      var foyer = new T.Vector3();
      I.camera.position.set(0, 6 * f, 30 * f); I.camera.lookAt(0, 0, 0);
      return { maj: function (ts) {
        P.rotation.rotation.y += 0; N.rotation.y = ts * 0.01;
        var lg = zoomLog(ts), z = Math.pow(10, lg), n = -lg;
        foyer.set(0, 0, 0).lerp(SOL, entre(n, 3.2, 5)).lerp(CG, entre(n, 9.5, 13));
        r.scale.setScalar(z); r.position.copy(foyer).multiplyScalar(-z);
        P.groupe.scale.setScalar(Math.max(1, 0.45 / (10 * z))); Ls.groupe.scale.setScalar(Math.max(1, 0.3 / (2.73 * z)));
        P.groupe.visible = n < 4.6; Ls.groupe.visible = n < 4;
        web.rotation.y = ts * 0.02;
        // un rayon apparent plancher, pour garder un point visible quand l'astre devient minuscule
        halo.scale.setScalar(Math.max(9000, 2.2 / z)); halo.material.opacity = 0.9 * (1 - entre(n, 7, 9));
        ici.scale.setScalar(1.4 / z); ici.material.opacity = entre(n, 9, 11) * (1 - entre(n, 14.5, 15.5));
        matOrb.opacity = 0.5 * entre(n, 3.6, 4.6) * (1 - entre(n, 7, 8.5)); planetes.material.opacity = entre(n, 3.8, 4.8) * (1 - entre(n, 7, 8.5));
        gal.material.opacity = entre(n, 9.5, 11.5) * (1 - 0.6 * entre(n, 16, 17.5)); web.material.opacity = entre(n, 14.6, 16.4);
        fondE.material.opacity = 1 - entre(n, 8, 11);
        eT.opacite = 1 - entre(ts, 2, 2.6); eL.opacite = entre(ts, 4.2, 4.7) * (1 - entre(ts, 6.2, 6.7));
        eS.opacite = entre(ts, 8.6, 9.1) * (1 - entre(ts, 10.6, 11.1)); eG.opacite = entre(ts, 13.3, 13.8) * (1 - entre(ts, 15.6, 16.1)); eW.opacite = entre(ts, 18.3, 19);
      } };
    }
  };

  function sceneTerre(I, r, lon, lat, legende) {
    I.fond(0x010205); cielEtoile(I);
    var P = planete(10, matTerre(), { atmo: 0x6fb3ff, atmoForce: 1.2 }), N = nuagesTerre(10); P.rotation.add(N); P.viser(lon, lat);
    r.add(P.groupe); r.add(lumiere(-25, 12, 22, 2.6)); r.add(new T.AmbientLight(0x30364a, 0.5));
    I.camera.position.set(0, 0, 33 * cadre()); I.camera.lookAt(0, 0, 0);
    if (legende) I.etiquette(legende, P.groupe, new T.Vector3(0, -12.5, 0));
    var base = P.rotation.rotation.y;
    return { maj: function (ts) { P.rotation.rotation.y = base + Math.sin(ts * 0.15) * 0.12; N.rotation.y = ts * 0.01; } };
  }

  /* =========================================================
     4. ÉTAT, BOUCLE, CONTRÔLES
     ========================================================= */
  var etat = { k: 0, inst: null, ancienne: null, trans: null, lecture: false, debutEvt: 0 };

  function majPanneau(k) {
    var e = EV[k];
    document.getElementById("film-nom").textContent = e.nom;
    document.getElementById("film-texte").textContent = e.texte;
    document.getElementById("film-apres").textContent = e.t === 0 ? "Le tout début" : HU.duree(e.t);
    document.getElementById("film-ilya").textContent = e.t >= AGE ? "Maintenant" : HU.duree(AGE - e.t);
    document.getElementById("film-calendrier").textContent = HU.calendrier(e.t);
    document.getElementById("film-num").textContent = "Événement " + (k + 1) + " sur " + EV.length;
    document.getElementById("scene-titre").textContent = e.nom;
    document.getElementById("scene-date").textContent = e.t >= AGE ? "Aujourd'hui" : "il y a " + HU.duree(AGE - e.t);
    document.querySelectorAll("#frise-choix button").forEach(function (b, j) { b.setAttribute("aria-current", j === k ? "true" : "false"); });
    if (ok3d) R.renderer.domElement.setAttribute("aria-label", e.nom + ". " + e.texte);
  }
  function aller(k, premier) {
    k = Math.max(0, Math.min(EV.length - 1, k));
    if (!premier && k === etat.k) return;
    var sens = k >= etat.k ? 1 : -1;
    var dir = REG[EV[k].court].entree;
    if (sens < 0) dir = dir === "avant" ? "arriere" : "avant";
    etat.k = k; etat.debutEvt = performance.now();
    majPanneau(k);
    if (!ok3d) return;
    var nouvelle = creerInstance(REG[EV[k].court].scene);
    if (etat.inst && !reduit && !premier) {
      if (etat.ancienne) detruire(etat.ancienne);
      etat.ancienne = etat.inst; etat.trans = { t0: performance.now(), dir: dir };
    } else { detruire(etat.inst); etat.ancienne = null; etat.trans = null; }
    etat.inst = nouvelle;
  }
  function majLecture() {
    var b = document.getElementById("frise-lecture");
    b.textContent = etat.lecture ? "Pause" : "Lecture automatique";
    b.setAttribute("aria-pressed", etat.lecture ? "true" : "false");
  }

  var vTmp = null;
  function majEtiquettes(I, visible) {
    var W = R.renderer.domElement.clientWidth, H = R.renderer.domElement.clientHeight;
    I.etiq.forEach(function (e) {
      vTmp.setFromMatrixPosition(e.objet.matrixWorld).add(e.dec).project(I.camera);
      var ok = visible > 0 && vTmp.z < 1 && Math.abs(vTmp.x) < 1.15 && Math.abs(vTmp.y) < 1.15;
      e.el.style.opacity = ok ? String(visible * e.opacite) : "0";
      e.el.style.transform = "translate(" + ((vTmp.x + 1) / 2 * W) + "px," + ((1 - vTmp.y) / 2 * H) + "px) translate(-50%,-50%)";
    });
  }
  var vAnc = null;
  function ancreEcran(I) {
    I.racine.updateMatrixWorld(); vAnc.copy(I.ancre).applyMatrix4(I.racine.matrixWorld).project(I.camera);
    return new T.Vector2(Math.min(0.9, Math.max(0.1, (vAnc.x + 1) / 2)), Math.min(0.9, Math.max(0.1, (vAnc.y + 1) / 2)));
  }
  function rendre(I, rt, ms) {
    var ts = (ms - I.debut) / 1000; if (reduit) ts = Math.max(ts, I === etat.inst && etat.k === EV.length - 1 ? 21 : 11);
    if (window.FriseTemps != null) ts = I === etat.ancienne && window.FriseTempsAncienne != null ? window.FriseTempsAncienne : window.FriseTemps;   // pour les vérifications automatiques
    I.maj(ts, ms);
    R.renderer.setRenderTarget(rt); R.renderer.render(I.scene, I.camera);
  }

  function boucle(ms) {
    // lecture automatique et point mobile
    var now = performance.now();
    if (etat.lecture && now - etat.debutEvt > dureeEvt(etat.k)) { if (etat.k < EV.length - 1) aller(etat.k + 1); else { etat.lecture = false; majLecture(); } }
    var xCible = xEvt(etat.k);
    if (etat.lecture && etat.k < EV.length - 1) xCible = xEvt(etat.k) + (xEvt(etat.k + 1) - xEvt(etat.k)) * Math.min(1, (now - etat.debutEvt) / dureeEvt(etat.k));
    frise.point += (xCible - frise.point) * (etat.lecture ? 0.35 : 0.15);
    dessinerFrise();

    if (ok3d) { var cvv = R.renderer.domElement; if (cvv.clientWidth + "x" + cvv.clientHeight !== tailleVue) redim3d(); }
    if (ok3d && etat.inst && R.rtM.width > 4) {
      var p = 1, zA = 1, zB = 1;
      if (etat.trans) {
        p = Math.min(1, (now - etat.trans.t0) / TRANSITION);
        if (window.FriseTransition != null) p = window.FriseTransition;   // pour les vérifications automatiques
        var e = doux(p);
        var plongeAv = etat.trans.dir === "avant" && etat.ancienne.ancre, plongeAr = etat.trans.dir !== "avant" && etat.inst.ancre;
        etat.ancienne.plonge = plongeAv ? e : null; etat.inst.plonge = plongeAr ? 1 - e : null;
        rendre(etat.ancienne, R.rtA, now);
        majEtiquettes(etat.ancienne, 0);
        if (p >= 1) { detruire(etat.ancienne); etat.ancienne = null; etat.trans = null; etat.inst.plonge = null; }
      }
      rendre(etat.inst, R.rtB, now);
      var U = R.compo.uniforms, mil = 0.5;
      U.cA.value.set(mil, mil); U.sA.value.set(mil, mil); U.cB.value.set(mil, mil); U.sB.value.set(mil, mil);
      if (etat.trans) {
        // zoom ciblé : vers un point précis de l'ancienne scène (avant) ou depuis un point de la nouvelle (arrière)
        var src = etat.trans.dir === "avant" ? etat.ancienne : etat.inst, anc = src && src.ancre ? ancreEcran(src) : null, force = anc ? 1.6 : 8;
        if (etat.trans.dir === "avant") {
          zA = Math.pow(force, e); zB = Math.pow(0.12, 1 - e);
          if (anc) { U.cA.value.copy(anc); U.sA.value.copy(anc); U.cB.value.set(anc.x + (mil - anc.x) * e, anc.y + (mil - anc.y) * e); }
        } else {
          zA = Math.pow(0.12, e); zB = Math.pow(force, 1 - e);
          if (anc) { U.cB.value.copy(anc); U.sB.value.copy(anc); U.cA.value.set(mil + (anc.x - mil) * e, mil + (anc.y - mil) * e); }
        }
      }
      R.compo.uniforms.zA.value = zA; R.compo.uniforms.zB.value = zB; R.compo.uniforms.m.value = etat.trans ? entre(p, 0.15, 0.85) : 1;
      composer();
      majEtiquettes(etat.inst, etat.trans ? entre(p, 0.85, 1) : 1);
    }
    requestAnimationFrame(boucle);
  }

  var tailleVue = "";
  function redim3d() {
    var cv = R.renderer.domElement;
    tailleVue = cv.clientWidth + "x" + cv.clientHeight;
    if (!cv.clientWidth || !cv.clientHeight) return;
    R.renderer.setSize(cv.clientWidth, cv.clientHeight, false);
    var b = new T.Vector2(); R.renderer.getDrawingBufferSize(b);
    R.rtA.setSize(b.x, b.y); R.rtB.setSize(b.x, b.y); R.rtM.setSize(b.x, b.y);
    R.halo.forEach(function (H, i) { var k = Math.pow(2, i + 1); H[0].setSize(Math.max(4, Math.round(b.x / k)), Math.max(4, Math.round(b.y / k))); H[1].setSize(Math.max(4, Math.round(b.x / k)), Math.max(4, Math.round(b.y / k))); });
    [etat.inst, etat.ancienne].forEach(function (I) { if (I) { I.camera.aspect = aspect(); I.camera.updateProjectionMatrix(); } });
  }

  function init() {
    var cv = document.getElementById("scene3d"), fcv = document.getElementById("frise-camera");
    if (!cv || !fcv) return;
    frise.cv = fcv; frise.g = fcv.getContext("2d"); redimFrise();
    try {
      if (!T) throw new Error("three absent");
      R.renderer = new T.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: "high-performance" });
      if (!R.renderer.capabilities.isWebGL2) throw new Error("WebGL2 requis");
      R.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      R.renderer.outputEncoding = T.LinearEncoding; R.renderer.toneMapping = T.NoToneMapping;
      R.chargeur = new T.TextureLoader();
      R.etiquettes = document.getElementById("scene-etiquettes");
      vTmp = new T.Vector3(); vAnc = new T.Vector3();
      creerCompositeur();
      ok3d = true;
      redim3d();
    } catch (err) {
      ok3d = false; document.getElementById("scene-erreur").hidden = false;
    }
    var liste = document.getElementById("frise-choix");
    EV.forEach(function (e, k) { var b = document.createElement("button"); b.type = "button"; b.textContent = e.court; b.addEventListener("click", function () { aller(k); }); liste.appendChild(b); });
    document.getElementById("frise-prec").addEventListener("click", function () { aller(etat.k - 1); });
    document.getElementById("frise-suiv").addEventListener("click", function () { aller(etat.k + 1); });
    document.getElementById("frise-lecture").addEventListener("click", function () {
      etat.lecture = !etat.lecture;
      if (etat.lecture) { if (etat.k === EV.length - 1) aller(0); else etat.debutEvt = performance.now(); }
      majLecture();
    });
    fcv.addEventListener("click", function (ev) {
      var r = fcv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
      var c = frise.cibles.filter(function (o) { return x >= o.x0 && x <= o.x1 && y >= o.y0 && y <= o.y1; })[0];
      if (c) aller(c.k);
    });
    fcv.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowRight") { aller(etat.k + 1); ev.preventDefault(); }
      if (ev.key === "ArrowLeft") { aller(etat.k - 1); ev.preventDefault(); }
    });
    window.addEventListener("resize", function () { redimFrise(); if (ok3d) redim3d(); });
    aller(0, true);
    frise.point = xEvt(0);
    requestAnimationFrame(boucle);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
