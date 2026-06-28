# Portfolio — Minh Dang

Portfolio one-page : un **grand carousel vertical infini** où chaque vidéo /
projet boucle. Inspiré de [antiantiart.com](https://www.antiantiart.com).

- **Landing page de choix de langue** (`/`) qui précharge les vidéos pendant le choix
- Portfolio multilingue : `/en` (anglais), `/vi` (vietnamien) — extensible
- Logo en haut à gauche · **About** au centre · **Contact** à droite
- Vidéo en plein cadre, infos du projet en bas à gauche, HUD « caméra » en bas à droite
- Carousel vertical infini qui **défile lentement tout seul** (pause quand on
  scrolle/touche, reprend après un court instant)
- Lazy-load des vidéos (seules les vidéos proches du viewport se chargent)

Stack : **Next.js 16 + React 19 + TypeScript**. Aucune autre dépendance.
Le code (commentaires, variables, textes) est en **anglais**.

---

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000

Pour une version de production :

```bash
npm run build
npm start
```

---

## ✏️ Personnaliser (tout se passe dans 2 fichiers)

### 1. Les vidéos / projets → `src/data/projects.ts`

Les vidéos sont hébergées **en natif** : ce sont de vrais fichiers servis par le
site, lus par un lecteur `<video>` maison (pas d'iframe Vimeo/YouTube), comme sur
antiantiart.com. Zéro branding tiers, contrôle total de l'autoplay/boucle.

Chaque projet est un objet :

```ts
{
  client: "Réal. / Client",
  year: 2025,
  category: "Music Video",         // Commercial, Short Film, Fashion Film...
  src: "/videos/mon-film.mp4",     // fichier dans public/videos/
  poster: "/videos/mon-film.jpg",  // (optionnel) image avant chargement
  // title : optionnel — voir ci-dessous
}
```

**Le titre affiché est dérivé automatiquement du nom de fichier** (Title Case) :
`nuit-blanche.mp4` → « Nuit Blanche », `sur-le-fil.mp4` → « Sur Le Fil ».
Donc en général tu n'as **rien à écrire** pour le titre.
Ajoute un champ `title: "..."` seulement pour forcer une casse précise ou un
accent que le nom de fichier ne peut pas porter (ex. `title: "Échappée"`).

L'ordre des projets dans la liste = l'ordre dans le carousel.
Tu peux en mettre autant que tu veux (la boucle s'adapte).

> ⚠️ Les vidéos actuelles sont des **placeholders** (clips de démo libres),
> dans `public/videos/`. À remplacer par les vraies.

#### 📹 Mettre les vraies vidéos

1. **Compresser** chaque vidéo en boucle web légère (voir ci-dessous).
2. Déposer le `.mp4` (et idéalement un poster `.jpg`) dans `public/videos/`.
3. Mettre à jour `src` / `poster` / `title` / `client` / `year` / `category`.

##### Compression (ffmpeg)

Pour un portfolio, on veut des fichiers légers et fluides. Installer ffmpeg
(`brew install ffmpeg` sur Mac), puis :

```bash
# Vidéo web optimisée (1080p, H.264, qualité visuelle ~constante)
ffmpeg -i source.mov \
  -vf "scale=-2:1080" -c:v libx264 -crf 23 -preset slow \
  -movflags +faststart -an \
  public/videos/mon-film.mp4

#   -an              → enlève l'audio (les vidéos du carousel sont muettes)
#   -movflags +faststart → la vidéo démarre avant d'être entièrement chargée
#   -crf 23          → qualité (plus bas = mieux/plus lourd ; 20–26 = bon)

# Poster (image de la 1ʳᵉ frame, évite le flash noir)
ffmpeg -i public/videos/mon-film.mp4 -frames:v 1 -q:v 3 public/videos/mon-film.jpg
```

##### Où stocker les fichiers ?

- **Simple** : commiter les `.mp4` compressés dans `public/videos/`. Parfait tant
  que le total reste raisonnable (quelques dizaines de Mo).
  → retirer la ligne `/public/videos/*.mp4` du `.gitignore`, ou utiliser Git LFS.
- **À grande échelle** (beaucoup de vidéos / fichiers lourds) : héberger les
  fichiers sur un stockage objet (**Cloudflare R2**, S3, Bunny CDN) et mettre
  l'URL absolue dans `src`. Ça reste 100 % natif (toujours un `<video>`), mais le
  dépôt reste léger et la diffusion est plus rapide.

### 2. Les textes (traductions) → `src/i18n/`

Tous les textes traduisibles (menu, bio About, libellés Contact) vivent dans des
**dictionnaires par langue** :

- `src/i18n/dictionaries/en.ts` → anglais
- `src/i18n/dictionaries/vi.ts` → vietnamien

`en.ts` est la **référence de structure** : si tu ajoutes une clé, TypeScript te
forcera à la renseigner dans les autres langues.

#### ➕ Ajouter une langue

1. Ajoute son code dans `src/i18n/config.ts` (`locales` + `localeNames`).
2. Crée `src/i18n/dictionaries/<code>.ts` (copie de `en.ts`).
3. Enregistre-le dans `src/i18n/index.ts`.

La route `/<code>` et le bouton sur la landing page apparaissent automatiquement.

### 2bis. Infos non traduisibles → `src/config.ts`

Le **nom**, l'**email**, les liens **Instagram/Vimeo** et le **rôle** (landing)
sont les mêmes dans toutes les langues : ils sont centralisés dans `src/config.ts`.
Le titre de l'onglet est dans `src/app/layout.tsx`.

### 3. La navigation About / Contact

About et Contact sont des **sections cachées tout en bas du carousel**. Comme le
carousel boucle à l'infini sur les vidéos, on n'y accède jamais en scrollant :
un clic sur **About** ou **Contact** déclenche un **défilement très rapide** qui
traverse les vidéos et **atterrit** sur la section (comme si elle avait toujours
été là).

Une fois sur une section, le scroll est **verrouillé** : on reste dedans. Seul un
clic sur le **logo** (le nom) ramène au carousel vidéo. (On peut quand même passer
de About à Contact via les boutons du menu.)

Réglages dans `src/components/Carousel.tsx` (constantes en haut du fichier) :
- **nombre de slides qui défilent pendant la transition** → `COPIES`
  (nombre de répétitions de la liste vidéo ; ↑ = plus de slides traversés. Min 3.)
- vitesse du spin → `SPIN_MS_PER_SLIDE` (ms par slide), bornée par
  `SPIN_MIN_MS` / `SPIN_MAX_MS`
- courbe d'arrivée du spin → fonction `ease` (easeOutQuart par défaut)
- vitesse de l'auto-défilement → `AUTO_SECONDS_PER_SLIDE` (secondes pour qu'une
  vidéo traverse l'écran ; calé sur **15 s** = la durée des boucles vidéo). La
  vitesse s'adapte automatiquement à la hauteur de l'écran.
- durée d'inactivité avant reprise de l'auto-défilement → `2500` (ms)

---

## 🎨 Couleurs & style

Tout est dans `src/app/globals.css`. Les variables principales sont en haut :

```css
:root {
  --bg: #000;     /* fond */
  --fg: #fff;     /* texte */
}
```

Les textes utilisent `mix-blend-mode: difference` → ils restent lisibles
quelle que soit la vidéo derrière (clair ou sombre).

---

## 🔐 Espace admin (`/admin`)

Pour que Minh gère ses vidéos **sans toucher au code**, le site a une page admin
protégée par mot de passe : `tonsite.com/admin`.

Il peut y :
- **glisser-déposer** des vidéos (compressées + poster générés automatiquement
  dans le navigateur avant l'envoi) ;
- **réordonner** les projets (flèches ↑/↓) ;
- **éditer** titre / catégorie / client / année ;
- **supprimer** un projet.

### Comment ça marche (pour toi)

- La liste des projets n'est plus en dur : elle est stockée en JSON et lue par le
  site à chaque chargement. Deux back-ends, choisis automatiquement :
  - **en local (dev)** : fichier `data/projects.json` + vidéos dans `public/videos/` ;
  - **en prod (Vercel)** : **Vercel Blob** (le système de fichiers de Vercel est
    en lecture seule, on ne peut pas y écrire d'uploads).
- Le mot de passe est la variable d'environnement **`ADMIN_PASSWORD`**.
  En local : dans `.env.local` (voir `.env.example`). Défaut dev : `minhdang`.

---

## 🚀 Mettre en ligne (Vercel)

1. Pousser le projet sur un dépôt GitHub.
2. Sur [vercel.com](https://vercel.com) → « New Project » → importer le dépôt.
3. **Activer Vercel Blob** : onglet *Storage* du projet → *Create* → **Blob**.
   Vercel ajoute tout seul la variable `BLOB_READ_WRITE_TOKEN` (c'est ce qui
   bascule le stockage en mode Blob).
4. **Définir le mot de passe admin** : *Settings → Environment Variables* →
   ajouter `ADMIN_PASSWORD` = un mot de passe solide.
5. **Deploy.** 

> Au premier déploiement, le portfolio est **vide** (les vidéos de démo ne sont
> pas envoyées en prod) : Minh ajoute ses vidéos depuis `/admin` et elles
> apparaissent aussitôt sur le site.

---

## 🔎 SEO (référencement)

Le **SEO technique** est en place et localisé (Vietnam + international, axé
films de marque / films de mode) :

- **Métadonnées localisées** EN/VI (titre, description, mots-clés) — éditables
  dans `src/i18n/dictionaries/{en,vi}.ts` → clé `seo`.
- **hreflang** (`/en`, `/vi`, `x-default`) + **canonical** → Google sait gérer
  les deux langues sans contenu dupliqué.
- **`sitemap.xml`** et **`robots.txt`** générés automatiquement (`/admin` et
  `/api` exclus du crawl).
- **Open Graph / Twitter Card** pour de jolis aperçus au partage.
- **Données structurées** schema.org `Person` (métier, pays VN, langues,
  réseaux) → aide Google à comprendre l'entité « Minh Dang ».

### À régler (sinon le SEO est incomplet)

1. **`NEXT_PUBLIC_SITE_URL`** sur Vercel = ton vrai domaine (sinon canonical /
   sitemap utilisent l'URL Vercel par défaut).
2. **Vraies infos** : email, liens Instagram/Vimeo dans `src/config.ts`
   (ils alimentent les données structurées `sameAs`).
3. **Mots-clés réels** : affine la clé `seo` des dictionnaires avec les termes
   que tape vraiment la cible.

### Hors-code (le plus important pour « apparaître haut »)

Le SEO technique est **nécessaire mais pas suffisant**. Pour vraiment monter :

- **Google Search Console** : ajouter le site, soumettre le `sitemap.xml`,
  définir le ciblage géographique.
- **Backlinks** : liens depuis Instagram, Vimeo, presse, annuaires créatifs.
- **Contenu texte** : un portfolio « tout vidéo » a peu de texte → étoffer la
  bio (About), ajouter des descriptions de projets aide énormément.
- Cohérence **NAP** (nom/contact) sur tous les profils.
