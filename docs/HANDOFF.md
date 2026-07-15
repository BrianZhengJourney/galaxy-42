# Handoff — Cosmic Landmarks, real imagery & galaxy markers

**State:** complete and pushed. **HEAD:** `4d16649` (`4d16649733accbb60663299db330aad1af0f1ffd`).
**Tests:** 19/19 passing — `npm test` (`node --test test/core.test.mjs`).
**Repo:** https://github.com/BrianZhengJourney/galaxy-42

This document summarizes the landmarks/imagery/markers work so another agent (or
future me) can pick it up cold.

---

## What shipped

### 1. Cosmic Landmarks catalog (commit `e73a159`)
A fourth navigation scale — `mode === 'landmark'` — presenting famous cosmic
objects & events as a curated museum.

- **47 entries** in `js/data/landmarks.js` (generated from a 6-agent research
  workflow; real J2000 RA/Dec, distances, dates, discovery stories). Six
  categories in `LANDMARK_CATEGORIES`: `NEBULA`, `SUPERNOVA`, `BLACK_HOLE`,
  `GALAXY`, `MILESTONE`, `SOLAR_EVENT`.
- **Procedural exhibits** in `js/procgen/exhibits.js` — one builder per
  `vizStyle`: `nebula`, `remnant`/`supernova`, `blackhole`, `lensing`, `gwave`,
  `galaxy`, `deepfield`, `probe`, `pulsar`, plus `buildAmbient` fallback.
  `buildExhibit(entry)` dispatches by style.
- **Scene:** `js/scenes/landmarkView.js` (star backdrop + exhibit + lights).
- **Story card + catalog panel:** DOM in `index.html` (`#landmarks`, `#lmCard`),
  styles in `css/main.css`, logic in `js/ui/hud.js`
  (`buildLandmarks`, `showLandmarkCard`, `setLandmarksVisible`).
- **Time-linked events:** `SOLAR_EVENT` entries show "▸ WITNESS IN SOL SYSTEM",
  which jumps the Sol clock to the real date (e.g. Shoemaker-Levy 9 →
  1994-07-16, then focuses Jupiter). See `_landmarkAction` / `_parseLandmarkDate`
  in `js/main.js` (ephemeris window 1800–2050).

### 2. Real imagery — production pass (commit `4d16649`)
Real photographs replace the procedural "wireframe" look where a good free image
exists.

- **34 images** in `images/` (~8.2 MB), sourced & license-verified by a 6-agent
  workflow (Hubble / JWST / EHT / ESO / NASA; public domain or CC).
- **Manifest:** `js/data/landmarkImages.js` (generated) maps `landmark id →
  { file, credit }`. `landmarkImage(id)` returns it or `null`.
- **Image plate:** `buildImagePlate(entry, url)` in `js/procgen/exhibits.js` —
  a large, camera-facing (billboarded) textured plane with a thin glowing frame
  and slow "breathing", on a starfield. `LandmarkView` chooses image plate vs.
  procedural via `landmarkImage(entry.id)`.
- **Card is image-first / less text:** name + meta + one-line `wow` + image
  credit always visible; the full `story` collapses behind a **MORE** toggle
  (`#lmCardStory.clip` in `css/main.css`).
- Landmarks with no image (e.g. Betelgeuse, Boötes Void) fall back to the
  procedural exhibit automatically.

### 3. Galaxy-map markers (commit `4d16649`)
The "where on a map" answer, without building a cosmic-scale map.

- **23 in-galaxy landmarks** (nebulae, SN remnants, Sgr A*, Cygnus X-1, the two
  pulsars) are plotted in the galaxy view at their real J2000 sky directions
  with log-compressed distance. See `_buildLandmarkMarkers()` +
  `parseLy()` in `js/scenes/galaxyView.js`.
- Markers are category-coloured sprites with violet `.lbl.landmark` labels,
  added to `pickTargets`; clicking one calls `enterLandmark()`
  (routed in `_onClick` galaxy branch, `js/main.js`).
- **Extragalactic landmarks** (galaxies, HUDF, GW events, Great Attractor,
  Boötes Void) are intentionally catalog-only — a full cosmic-scale map was
  deferred (see options below).

---

## Image credits

- Per-image credit strings: `js/data/landmarkImages.js` (rendered on each card as
  "IMAGE · …").
- Human-readable summary + licenses: **`images/CREDITS.md`**.
- Sol-system planet/texture credits (separate feature): `textures/CREDITS.md`.
- CC BY / CC BY-SA images require the visible on-card credit; do not strip it.

---

## Key files (quick map)

| Area | File |
|---|---|
| Catalog data (generated) | `js/data/landmarks.js` (47) |
| Image manifest (generated) | `js/data/landmarkImages.js` (34) |
| Procedural exhibits + image plate | `js/procgen/exhibits.js` |
| Landmark scene | `js/scenes/landmarkView.js` |
| Galaxy markers | `js/scenes/galaxyView.js` |
| Orchestration (enter/exit/step/action, click routing) | `js/main.js` |
| Card + catalog UI | `js/ui/hud.js`, `index.html`, `css/main.css` |
| Photos + credits | `images/` (34 jpg + `CREDITS.md`) |

Regenerate the two generated data files from their research workflows rather than
hand-editing (they were produced by the `cosmic-landmarks-catalog` and
`landmark-images` workflows).

---

## Verification done

- 8 exhibit `vizStyle`s render with zero console errors.
- Real image plate loads (Pillars 1280px), credit shown, story collapsed.
- Image-less entries fall back to procedural (Betelgeuse), image-having ones
  don't (GW150914 uses the LIGO figure).
- 23 galaxy markers placed and in `pickTargets`; clicking a marker enters the
  exhibit (verified with a dispatched click on the Pillars marker).
- SOLAR_EVENT date-jump enters Sol at the real date (SL9 → 1994-07-16).
- `evictTextures()` frees the plate image on exit; all four+ modes clean.
- 19/19 tests pass.

Preview note: this workspace's browser preview can't read the Desktop folder
(macOS TCC), so verification ran from a `/private/tmp/fg-serve` rsync mirror.
Locally, `npm start` (or any static server) → `http://localhost:8741/`;
hard-refresh to pull new images/textures.

---

## Exact remaining options (not yet built)

1. **Extragalactic landmark placement.** Give the ~9 extragalactic landmarks
   (Andromeda, Whirlpool, Sombrero, LMC/SMC, HUDF, M87*, Great Attractor, Boötes
   Void, GW events) a marker at a wider scale. Two sub-options:
   - (a) a lightweight "beyond the Milky Way" ring/shell of markers reachable by
     zooming the galaxy view all the way out (cheap), or
   - (b) a true **cosmic-scale map** (Local Group → observable universe, Milky
     Way as a dot). Bigger; deferred on purpose.
2. **Deep links for landmarks.** `#/landmark/<id>` currently resolves to
   `#/galaxy` (landmark mode isn't in `_setHash`). Add a route so exhibits are
   shareable; wire in `_setHash` and `_applyRoute` (`js/main.js`).
3. **"Famous Cosmos" guided tour.** Reuse the existing tour engine
   (`js/core/tour.js`, `js/data/tours.js`) to script a narrated walk through the
   best landmarks. Low effort, high showcase value.
4. **Fill remaining images.** 13 of 47 entries still use procedural exhibits
   (mostly abstract: CMB has an image; Betelgeuse, Boötes Void, Vela, Kepler's
   SN, Halley alt, milestone abstractions do not). Source a second image batch
   or accept procedural for the genuinely image-less ones.
5. **Richer exhibits for image-less entries.** e.g. Betelgeuse "will it go
   supernova" fast-forward animation; pulsar sweeping beams; a real eclipse
   set-piece.

## Next recommended tasks (in priority order)

1. **Landmark deep links (#2 above).** Small, makes the whole feature
   shareable/linkable — high value for an open-source demo. Do this first.
2. **"Famous Cosmos" tour (#3).** Cheap, ties the 47 landmarks into a guided
   experience; great for a README hero / first-run.
3. **Extragalactic markers, option 1(a) (#1a).** Zoom-out ring of the ~9
   extragalactic landmarks — modest effort, completes "everything is on a map"
   without committing to a full cosmic map.
4. Defer the full cosmic-scale map (#1b) unless a clear product reason emerges.

## Also worth knowing (prior work, still relevant)

- **Performance/scaling** (commits `8b8835d`, `026a4f1`): only Sol uses heavy 8K
  textures (~900 MB VRAM) and it's freed on system exit via `evictTextures()`;
  procedural systems are ~5 MB each. Device tiering (`js/core/quality.js`,
  `TEX_TIER`, `?tier=low|high`) loads 2K on weak/mobile GPUs; adaptive
  `QualityManager` drops DPR then bloom under load. Scaling to many systems was
  never the bottleneck.
- **Repo asset weight:** `images/` 8.2 MB, `textures/` 42 MB.
