/* Notre place dans l'Univers — script commun
   - liste des parties
   - progression enregistrée sur l'appareil de l'élève (localStorage, rien n'est envoyé)
   - barre du haut, mode projection
   - moteur de quiz */

(function () {
  "use strict";

  var PARTIES = [
    { n: 1, titre: "Notre adresse cosmique", question: "Où sommes-nous exactement dans l'Univers ?", fichier: "partie-1.html", prete: true },
    { n: 2, titre: "Le système solaire", question: "Qui tourne autour de qui, et à quelle distance ?", fichier: "partie-2.html", prete: true },
    { n: 3, titre: "La lumière, messagère du ciel", question: "Combien de temps la lumière met-elle pour nous parvenir ?", fichier: "partie-3.html", prete: true },
    { n: 4, titre: "L'année-lumière", question: "Pourquoi regarder loin, c'est regarder dans le passé ?", fichier: "partie-4.html", prete: true },
    { n: 5, titre: "L'histoire de l'Univers", question: "Que s'est-il passé depuis le Big Bang ?", fichier: "partie-5.html", prete: false },
    { n: 6, titre: "Poussières d'étoiles", question: "D'où viennent les atomes qui nous composent ?", fichier: "partie-6.html", prete: false },
    { n: 7, titre: "La naissance du système solaire", question: "Comment la Terre s'est-elle formée, et quand ?", fichier: "partie-7.html", prete: false },
    { n: 8, titre: "La gravitation universelle", question: "Quelle force tient les planètes sur leur orbite ?", fichier: "partie-8.html", prete: false },
    { n: 9, titre: "Masse et poids", question: "Pèse-t-on la même chose sur la Lune ?", fichier: "partie-9.html", prete: false }
  ];

  var CLE = "univers4e.v1";

  function lire() {
    try {
      var brut = window.localStorage.getItem(CLE);
      var d = brut ? JSON.parse(brut) : null;
      if (d && typeof d === "object") {
        d.parties = d.parties || {};
        return d;
      }
    } catch (e) { /* stockage indisponible : on continue sans */ }
    return { parties: {}, ville: "", projection: false };
  }
  function ecrire(d) {
    try { window.localStorage.setItem(CLE, JSON.stringify(d)); } catch (e) { /* rien */ }
  }

  var donnees = lire();

  function etatPartie(n) {
    var p = donnees.parties[n];
    if (p && typeof p.score === "number") return "fini";
    if (p && p.vu) return "encours";
    return "nouveau";
  }

  /* ---------- Mode projection ---------- */
  function appliquerProjection() {
    document.documentElement.classList.toggle("projection", !!donnees.projection);
    var b = document.querySelector(".bouton-projection");
    if (b) b.setAttribute("aria-pressed", donnees.projection ? "true" : "false");
  }

  /* ---------- Barre du haut ---------- */
  function construireBarre() {
    var cible = document.getElementById("barre");
    if (!cible) return;
    var finies = 0;
    var traits = PARTIES.map(function (p) {
      var e = etatPartie(p.n);
      if (e === "fini") finies++;
      var cls = e === "fini" ? "fini" : e === "encours" ? "vu" : "";
      return '<i class="' + cls + '"></i>';
    }).join("");

    cible.innerHTML =
      '<div class="barre-dedans large">' +
        '<a class="marque" href="index.html">Notre place dans l\'<span>Univers</span></a>' +
        '<a class="spectre-lien" href="index.html#sommaire" aria-label="Ta progression : ' + finies + ' parties terminées sur 9">' +
          '<span class="spectre" aria-hidden="true">' + traits + "</span>" +
          '<span class="spectre-texte">' + finies + " / 9 terminées</span>" +
        "</a>" +
        '<button type="button" class="bouton-projection" aria-pressed="false">Mode projection</button>' +
      "</div>";

    cible.querySelector(".bouton-projection").addEventListener("click", function () {
      donnees.projection = !donnees.projection;
      ecrire(donnees);
      appliquerProjection();
      window.dispatchEvent(new Event("resize"));
    });
    appliquerProjection();
  }

  /* ---------- Accueil : sommaire ---------- */
  function construireSommaire() {
    var liste = document.getElementById("liste-parties");
    if (!liste) return;
    liste.innerHTML = PARTIES.map(function (p) {
      var e = etatPartie(p.n);
      var etat;
      if (!p.prete) etat = '<span class="etat">En préparation</span>';
      else if (e === "fini") {
        var s = donnees.parties[p.n];
        etat = '<span class="etat fini">Terminée · ' + s.score + " / " + s.total + "</span>";
      } else if (e === "encours") etat = '<span class="etat encours">Commencée</span>';
      else etat = '<span class="etat ouvert">À découvrir</span>';

      var interieur =
        '<span class="partie-num">' + p.n + "</span>" +
        '<span><span class="partie-titre">' + p.titre + '</span><br><span class="partie-question">' + p.question + "</span></span>" +
        etat;
      return p.prete
        ? '<li><a class="partie" href="' + p.fichier + '">' + interieur + "</a></li>"
        : '<li><div class="partie" aria-disabled="true">' + interieur + "</div></li>";
    }).join("");
  }

  /* ---------- Accueil : adresse personnalisable ---------- */
  function construireAdresse() {
    var champ = document.getElementById("ville");
    if (!champ) return;
    champ.value = donnees.ville || "";
    champ.addEventListener("input", function () {
      donnees.ville = champ.value.slice(0, 60);
      ecrire(donnees);
    });
  }

  /* ---------- Page de partie ---------- */
  function marquerVu() {
    var n = Number(document.body.getAttribute("data-partie"));
    if (!n) return;
    donnees.parties[n] = donnees.parties[n] || {};
    donnees.parties[n].vu = true;
    ecrire(donnees);
  }

  /* ---------- Moteur de quiz ----------
     questions : [{ q, choix: [..], bonne: index, explication }] */
  function quiz(conteneurId, questions) {
    var conteneur = document.getElementById(conteneurId);
    if (!conteneur) return;
    var n = Number(document.body.getAttribute("data-partie"));

    var html = questions.map(function (item, i) {
      var options = item.choix.map(function (c, j) {
        var id = "q" + i + "c" + j;
        return '<label class="choix" for="' + id + '"><input type="radio" id="' + id + '" name="q' + i + '" value="' + j + '"><span>' + c + "</span></label>";
      }).join("");
      return '<div class="question"><fieldset><legend><span>' + (i + 1) + ".</span>" + item.q + "</legend>" + options +
        '<p class="explication" id="exp' + i + '" hidden></p></fieldset></div>';
    }).join("");

    var precedent = donnees.parties[n] && typeof donnees.parties[n].score === "number"
      ? "Meilleur score enregistré : " + donnees.parties[n].score + " / " + donnees.parties[n].total + "."
      : "Ton score est enregistré sur cet appareil.";

    conteneur.innerHTML =
      '<form class="quiz" novalidate>' + html +
      '<div class="quiz-pied"><button type="submit" class="bouton" id="valider">Valider mes réponses</button>' +
      '<button type="button" class="bouton discret" id="recommencer" hidden>Recommencer</button>' +
      '<p class="score" id="score" aria-live="polite"></p></div>' +
      '<p class="texte-doux" id="memo">' + precedent + "</p></form>";

    var form = conteneur.querySelector("form");
    var valider = conteneur.querySelector("#valider");
    var recommencer = conteneur.querySelector("#recommencer");
    var zoneScore = conteneur.querySelector("#score");
    var memo = conteneur.querySelector("#memo");

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var points = 0;
      var manque = 0;
      questions.forEach(function (item, i) {
        var coche = form.querySelector('input[name="q' + i + '"]:checked');
        if (!coche) manque++;
      });
      if (manque > 0) {
        zoneScore.innerHTML = '<small>Il te reste ' + manque + (manque > 1 ? " questions" : " question") + " sans réponse.</small>";
        return;
      }
      questions.forEach(function (item, i) {
        var coche = form.querySelector('input[name="q' + i + '"]:checked');
        var juste = Number(coche.value) === item.bonne;
        if (juste) points++;
        form.querySelectorAll('input[name="q' + i + '"]').forEach(function (inp) {
          inp.disabled = true;
          var lab = inp.closest(".choix");
          if (Number(inp.value) === item.bonne) lab.classList.add("juste");
          else if (inp.checked) lab.classList.add("faux");
        });
        var exp = form.querySelector("#exp" + i);
        exp.innerHTML = "<strong>" + (juste ? "Juste." : "Pas tout à fait.") + "</strong> " + item.explication;
        exp.hidden = false;
      });
      var total = questions.length;
      zoneScore.innerHTML = points + " / " + total + "<small>" +
        (points === total ? "Parfait." : points >= total - 1 ? "Très bien." : points >= total / 2 ? "Relis les explications, tu y es presque." : "Reprends le zoom puis réessaie.") + "</small>";
      valider.hidden = true;
      recommencer.hidden = false;

      var avant = donnees.parties[n] || {};
      var meilleur = typeof avant.score === "number" ? Math.max(avant.score, points) : points;
      donnees.parties[n] = { vu: true, score: meilleur, total: total };
      ecrire(donnees);
      memo.textContent = "Meilleur score enregistré : " + meilleur + " / " + total + ".";
      construireBarre();
    });

    recommencer.addEventListener("click", function () {
      form.reset();
      form.querySelectorAll("input").forEach(function (inp) { inp.disabled = false; });
      form.querySelectorAll(".choix").forEach(function (l) { l.classList.remove("juste", "faux"); });
      form.querySelectorAll(".explication").forEach(function (e) { e.hidden = true; });
      zoneScore.textContent = "";
      valider.hidden = false;
      recommencer.hidden = true;
      form.querySelector("input").focus();
    });
  }

  /* ---------- Prédiction ---------- */
  function prediction() {
    var bouton = document.getElementById("prediction-valider");
    if (!bouton) return;
    var champ = document.getElementById("prediction-champ");
    var reponse = document.getElementById("prediction-reponse");
    var cible = Number(bouton.getAttribute("data-cible"));
    bouton.addEventListener("click", function () {
      var v = Number(String(champ.value).replace(",", "."));
      var debut;
      if (!champ.value || isNaN(v)) debut = "Tu n'as pas donné de nombre, voici la réponse.";
      else {
        var ecart = Math.abs(v - cible) / cible;
        debut = ecart <= 0.15 ? "Excellente estimation !" : v < cible ? "C'est plus que ça." : "C'est moins que ça.";
      }
      reponse.querySelector(".debut").textContent = debut;
      reponse.hidden = false;
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    marquerVu();
    construireBarre();
    construireSommaire();
    construireAdresse();
    prediction();
  });

  window.Univers = { quiz: quiz, parties: PARTIES };
})();
