# Portfolio — Minh Dang

Portfolio one-page : un **grand carousel vertical infini** où chaque vidéo /
projet boucle. Inspiré de [antiantiart.com](https://www.antiantiart.com).

- **Title screen** façon jeu vidéo (`/`) : teaser muet en boucle, avertissement
  sonore + réglage du volume, un seul bouton « Enter our universe ». Les vidéos
  du portfolio se préchargent pendant ce temps.
- **Une seule URL.** Title screen, portfolio et langue sont des états de la même
  page : aucune navigation, aucun rechargement. Toutes les transitions passent
  par la même coupure glitch.
- Bilingue EN / Tiếng Việt, le switch vit **uniquement dans About**
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
site, lus par un lecteur `<video>` maison (pas de lecteur tiers embarqué), comme sur
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

Le bouton apparaît automatiquement dans le switch de la section About.

> La langue **n'est pas dans l'URL** : c'est un état client, mémorisé en
> `localStorage` (`lucid:locale`) et devinée depuis le navigateur à la première
> visite. Changer de langue ne recharge rien.

### 2bis. Infos non traduisibles → `src/config.ts`

Le **nom**, l'**email**, les liens **Instagram/Zalo** et le **rôle** (landing)
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
- **glisser-déposer** des vidéos (poster généré automatiquement) ;
- **réordonner** les projets (flèches ↑/↓) ;
- **éditer** titre / catégorie / client / année ;
- **supprimer** un projet.

Chaque ligne affiche le **poids** de sa vidéo, et l'en-tête le **total du
carousel** — le chiffre qui décide du temps de chargement. Au-delà de 8 Mo,
c'est signalé en orange.

---

## 🎬 Préréglage d'export (à donner à Minh)

> **C'est le réglage le plus important du site.** Le navigateur n'encode plus
> les vidéos : il vérifie seulement qu'elles sont prêtes pour le web et le dit
> si ce n'est pas le cas. La qualité dépend donc entièrement de l'export.

**Cible : MP4 / H.264, 1080p, ≤ 6 Mbps, sans audio, faststart.**

Pour une vidéo de 15 s, ça donne un fichier d'environ **11 Mo**.

### DaVinci Resolve — page Deliver

| Réglage | Valeur |
|---|---|
| Format | MP4 |
| Codec | H.264 |
| Resolution | 1920 × 1080 |
| Frame rate | celle du projet (24 / 25 / 30) |
| Quality | Restrict to **6000** Kb/s |
| Encoding profile | High |
| Key frames | Automatic |
| **Audio** | **décocher Export Audio** |

### Adobe Premiere — Media Encoder

Preset de base `H.264 → YouTube 1080p Full HD`, puis :

- **Bitrate Encoding** : VBR, 2 pass
- **Target Bitrate** : 5 Mbps · **Maximum** : 6 Mbps
- décocher **Export Audio**
- cocher **Fast Start** (dans Multiplexer)

### Pourquoi ces valeurs

**Pas d'audio** : les vidéos du carousel sont muettes par construction — c'est
la bande-son du site qu'on entend. Une piste audio embarquée serait téléchargée
pour rien.

**Faststart** place l'index du fichier au début : la lecture démarre pendant le
téléchargement au lieu d'attendre la fin. Sans lui, une vidéo de 11 Mo ne
s'affiche qu'une fois entièrement chargée.

**1080p et pas 4K** : les vignettes s'affichent en plein écran mais en boucle
courte, sur des écrans qui sont rarement en 4K. Une 4K pèse 4 fois plus pour
une différence invisible dans ce contexte — et c'est le poids, pas la
définition, qui fait fuir un client avant d'avoir vu le premier plan.

**Si un plan précis « bave »** (dégradés, fumée, grain, noir profond), monte le
bitrate pour *cette* vidéo plutôt que pour toutes : 8 Mbps sur un plan
difficile coûte moins cher que 8 Mbps partout.

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

> ⚠️ **Choix assumé : le SEO est en anglais uniquement.** Le site sert une seule
> URL et la langue est résolue côté client, donc il n'y a plus de page `/vi` à
> indexer. Les recherches en vietnamien ne remonteront pas le site. Pour
> récupérer ce trafic il faudrait réintroduire une vraie page vietnamienne
> servie côté serveur.

Ce qui reste en place :

- **Métadonnées** (titre, description, mots-clés) dans `src/app/page.tsx`.
- **Canonical** sur l'URL racine.
- **`sitemap.xml`** (une entrée) et **`robots.txt`** générés automatiquement
  (`/admin` et `/api` exclus du crawl).
- **Open Graph / Twitter Card** pour de jolis aperçus au partage.
- **Données structurées** schema.org `Organization` (domaines, pays VN, langues,
  réseaux) → aide Google à comprendre l'entité « Lucid ».
- **Redirections 301** de `/en` et `/vi` vers `/` (`next.config.mjs`) pour les
  anciens liens et les URLs déjà indexées.

### À régler (sinon le SEO est incomplet)

1. **`NEXT_PUBLIC_SITE_URL`** sur Vercel = ton vrai domaine (sinon canonical /
   sitemap utilisent l'URL Vercel par défaut).
2. **Vraies infos** : email, liens Instagram/Zalo dans `src/config.ts`
   (ils alimentent les données structurées `sameAs`).
3. **Mots-clés réels** : affine `keywords` dans `src/app/page.tsx` avec les
   termes que tape vraiment la cible.

### Hors-code (le plus important pour « apparaître haut »)

Le SEO technique est **nécessaire mais pas suffisant**. Pour vraiment monter :

- **Google Search Console** : ajouter le site, soumettre le `sitemap.xml`,
  définir le ciblage géographique.
- **Backlinks** : liens depuis Instagram, Zalo, presse, annuaires créatifs.
- **Contenu texte** : un portfolio « tout vidéo » a peu de texte → étoffer la
  bio (About), ajouter des descriptions de projets aide énormément.
- Cohérence **NAP** (nom/contact) sur tous les profils.
