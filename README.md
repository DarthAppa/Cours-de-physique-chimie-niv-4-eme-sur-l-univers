# Cours de physique-chimie, 4e : l'Univers

Cours de physique-chimie de niveau 4e sur l'Univers, visuel et interactif, publié comme page web (GitHub Pages).

## Structure

```
index.html        page du cours (à venir)
assets/           images, scripts et styles du cours
Docs/
  Concept/        maquettes et pistes visuelles
  Reference/      contenus de référence (programme, sources)
  Decisions/      une fiche par décision prise
  Logs/           journal de session, un fichier par jour
```

## Règles de rangement

- Chaque fichier produit est rangé dans le dossier correspondant, après accord.
- Nom des fichiers de travail : `AAAA-MM-JJ_Sujet-court.ext`.
- Aucun fichier existant n'est écrasé : on ajoute `_v2`, `_v3`.

## Publication

Le cours est en ligne : https://darthappa.github.io/Univers-4eme/

Il se met à jour tout seul à chaque push sur `main` (GitHub Actions, fichier `.github/workflows/pages.yml`). Seuls les pages HTML et `assets/` sont publiés : `Docs/` reste privé au dépôt.
