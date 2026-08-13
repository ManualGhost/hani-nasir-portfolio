# Alche-inspired 3D portfolio starter

A from-scratch interactive portfolio starter using the same *kind* of open-web stack found on premium WebGL portfolio sites: **Astro + Three.js + GSAP/ScrollTrigger + Lenis + Swup**.

> This is not a clone of Alche Studio. It contains no Alche assets or source code. It recreates the interaction approach with original placeholder visuals.

## What is already built

- Fixed full-screen Three.js/WebGL scene
- Procedurally generated floating project cards (no image assets required)
- Animated wireframe 3D core with a custom GLSL shader
- Scroll-driven camera choreography
- GSAP ScrollTrigger section reveals
- Lenis smooth scrolling synchronized to ScrollTrigger
- Cursor-responsive 3D movement
- Grain/noise treatment
- Responsive mobile behavior + reduced-motion accessibility
- Astro site shell
- Swup page transition integration
- Home + Info pages
- GitHub Pages deployment workflow
- Central content config for easy edits

## 1. Install

You need **Node.js 22+** and npm.

```bash
npm install
```

## 2. Run locally

```bash
npm run dev
```

Open the local URL Astro prints in the terminal, normally `http://localhost:4321`.

## 3. Edit your name, email and project list

Open:

```text
src/config/site.js
```

That file controls the main portfolio text and selected-project rows.

## 4. Replace the generated 3D cards with your actual artwork

The current 3D cards are generated in:

```text
src/scripts/scene.js
```

Look for:

```js
function makeCardTexture(index) { ... }
```

For a real portfolio, put optimized `.webp` files in `public/assets/` and load them with `THREE.TextureLoader()`.

Example:

```js
const texture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/project-01.webp`)
texture.colorSpace = THREE.SRGBColorSpace
```

Keep each portfolio image around 1600–2200 px on the long edge and compress it so the site stays fast.

## 5. Build production files

```bash
npm run build
```

Astro writes the production site to:

```text
dist/
```

Test the production build with:

```bash
npm run preview
```

## GitHub setup

This ZIP already contains a GitHub Pages workflow at:

```text
.github/workflows/pages.yml
```

Create an empty GitHub repository, then from this project folder run:

```bash
git init
git add .
git commit -m "Initial interactive portfolio"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Then in GitHub:

1. Open **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` whenever you want to redeploy.

The Astro config automatically detects GitHub Actions and uses the repository name as the Pages base path, so project-site URLs such as `username.github.io/repository-name/` work without hand-editing the base path.

## Recommended next upgrades

1. Replace generated card art with your real project images/video frames.
2. Replace `YOUR NAME` and contact info.
3. Add individual case-study pages.
4. Add GLB/GLTF models exported from Blender.
5. Add video textures for motion projects.
6. Add a custom logo-loader sequence.
7. Add sound only if you provide an obvious mute control and keep it off by default.

## File map

```text
.
├── .github/workflows/pages.yml     # automatic GitHub Pages deploy
├── public/
│   ├── favicon.svg
│   └── assets/                     # your real portfolio media goes here
├── src/
│   ├── config/site.js              # easiest content editing
│   ├── layouts/Base.astro          # global page shell
│   ├── pages/index.astro           # portfolio homepage
│   ├── pages/about.astro           # info page
│   ├── scripts/scene.js            # Three.js + GSAP + Lenis logic
│   └── styles/global.css           # visual system
├── astro.config.mjs
├── INSPIRATION.md
├── package.json
└── README.md
```

## Performance notes

- Pixel ratio is capped automatically.
- Particle count and antialiasing are reduced on coarse/mobile pointers.
- `prefers-reduced-motion` is respected.
- Keep real textures compressed and avoid unnecessarily large GLB files.
- For a larger portfolio, lazy-load case-study media rather than putting everything in the first WebGL scene.

## License

Starter code in this repository may be modified for your own portfolio. Third-party libraries retain their respective licenses.
