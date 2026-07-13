/* Carina is a sequence of scientifically distinct views, not one photograph
   pushed through six filters.  The Hubble mosaic, Webb's Cosmic Cliffs and the
   Eta Carinae close-up are separate fields; switching moments is therefore a
   hard state change.  Only the Webb state turns its registered photograph into
   an orbitable, depth-assisted surfel field. */

import * as THREE from 'three';
import { mulberry, hashStr, gaussian } from '../../utils/rng.js';
import { loadTexture } from '../../utils/assets.js';
import { TEX_TIER } from '../../core/quality.js';
import { ResourceScope } from './resourceScope.js';

const ASSETS = Object.freeze({
  webb: TEX_TIER === 'low'
    ? 'images/carina-nebula.jpg'
    : 'images/carina/cosmic-cliffs-webb-nircam-miri.jpg',
  webbDepth: 'images/depth/carina-nebula.png',
  hubble: 'images/carina/carina-hubble-2007.jpg',
  etaUv: 'images/carina/eta-carinae-uv-2019.png',
  etaModel: 'models/carina/eta-carinae-homunculus.stl',
});

export const CARINA_STATES = Object.freeze({
  FORMATION: 'formation',
  LOCATOR: 'locator',
  ETA_ERUPTION: 'eta-eruption',
  HUBBLE: 'hubble-panorama',
  WEBB: 'webb-cliffs',
  FUTURE: 'future-erosion',
});

const BUDGET = Object.freeze(TEX_TIER === 'low' ? {
  photoLongSide: 176,
  alignedStars: 260,
  ambientPoints: 3600,
  sphereSegments: 24,
} : {
  photoLongSide: 320,
  alignedStars: 720,
  ambientPoints: 9200,
  sphereSegments: 40,
});

const PHOTO_WIDTH = 108;
const WEBB_ASPECT = 11264 / 3904;
const HUBBLE_ASPECT = 4000 / 1937;
const HALF_PI = Math.PI / 2;
const MODEL_CREDIT = 'Hubble panorama: NASA, ESA, N. Smith and the Hubble Heritage Team · CC BY 4.0 · Eta UV: NASA, ESA, N. Smith and J. Morse · 3D Homunculus model: Steffen, Teodoro, Madura et al. (2014)';

function clamp01(value){ return Math.max(0, Math.min(1, value)); }
function smoothstep(a, b, value){
  const t = clamp01((value - a) / (b - a));
  return t * t * (3 - 2 * t);
}

function makeSoftDisc(){
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(.22, 'rgba(255,255,255,.82)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 96, 96);
  return new THREE.CanvasTexture(canvas);
}

function makeFallbackTexture(color){
  const c = new THREE.Color(color);
  const data = new Uint8Array([
    Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255), 255,
  ]);
  const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeCaption(text, subtext, width = 54){
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 152;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(3,8,18,.88)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(91,225,255,.58)';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  ctx.fillStyle = '#ddf8ff';
  ctx.font = '600 34px system-ui, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText(text, 34, 61);
  ctx.fillStyle = '#8db8c9';
  ctx.font = '23px system-ui, sans-serif';
  ctx.fillText(subtext, 34, 111);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, width * 152 / 1024), material);
}

function makePhotoPlate(scope, parent, {
  url, aspect, width, x = 0, y = 0, z = 0, onTexture = null,
}){
  const fallback = scope.own(makeFallbackTexture(0x08101b));
  const material = new THREE.MeshBasicMaterial({
    map: fallback,
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  });
  // Loaded photographs belong to the global texture cache and are evicted by
  // the application, rather than by this scene traversal.
  material.userData.keepMaps = true;
  const height = width / aspect;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, z);
  mesh.renderOrder = 20;
  parent.add(mesh);
  loadTexture(url, scope.guard(texture => {
    material.map = texture;
    material.needsUpdate = true;
    mesh.userData.photoReady = true;
    if (onTexture) onTexture(texture);
  }));
  return { mesh, material, width, height };
}

function addCaption(parent, caption, x, y, z = 2){
  caption.position.set(x, y, z);
  caption.renderOrder = 24;
  parent.add(caption);
  return caption;
}

function makeColoredCloud(seed, count, softMap, { spread, palette, shell = false }){
  const rnd = mulberry(hashStr(seed));
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const tones = palette.map(value => new THREE.Color(value));
  for (let i = 0; i < count; i++){
    let x = gaussian(rnd), y = gaussian(rnd), z = gaussian(rnd);
    if (shell){
      const inv = 1 / Math.max(.001, Math.hypot(x, y, z));
      const radius = .68 + rnd() * .36;
      x *= inv * radius; y *= inv * radius; z *= inv * radius;
    }
    positions[i*3] = x * spread[0];
    positions[i*3+1] = y * spread[1];
    positions[i*3+2] = z * spread[2];
    const color = tones[(rnd() * tones.length) | 0].clone();
    const brightness = .34 + rnd() * .72;
    colors[i*3] = color.r * brightness;
    colors[i*3+1] = color.g * brightness;
    colors[i*3+2] = color.b * brightness;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    map: softMap,
    size: shell ? 1.05 : 1.35,
    vertexColors: true,
    transparent: true,
    opacity: shell ? .66 : .54,
    alphaTest: .018,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
}

function makeGlow(softMap, color, scale){
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softMap,
    color,
    transparent: true,
    opacity: .9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

function buildFormation(parent, softMap){
  const cloud = makeColoredCloud('carina:formation', BUDGET.ambientPoints, softMap, {
    spread: [43, 29, 32],
    palette: [0x2ac4c9, 0x2472ae, 0xc24e45, 0xf1a05e, 0x723d89],
    shell: true,
  });
  parent.add(cloud);
  const inner = makeColoredCloud('carina:formation:core', Math.round(BUDGET.ambientPoints * .38), softMap, {
    spread: [28, 18, 19],
    palette: [0x24a6b6, 0xe05d50, 0xf3bd79],
  });
  parent.add(inner);
  const rnd = mulberry(hashStr('carina:first-stars'));
  const stars = [];
  for (let i = 0; i < 7; i++){
    const star = makeGlow(softMap, i % 3 === 0 ? 0x9edcff : 0xffd5a1, 3 + rnd() * 4);
    star.position.set(gaussian(rnd) * 25, gaussian(rnd) * 14, gaussian(rnd) * 13);
    parent.add(star); stars.push(star);
  }
  addCaption(parent,
    makeCaption('RECONSTRUCTION', 'A procedural feedback bubble — not an observation', 60),
    0, -38, 9);
  return { cloud, inner, stars };
}

function buildLocator(parent){
  const canvas = document.createElement('canvas');
  canvas.width = 1280; canvas.height = 800;
  const ctx = canvas.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, '#03101c'); bg.addColorStop(.48, '#0a152c'); bg.addColorStop(1, '#12091f');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const nebula = ctx.createRadialGradient(742, 420, 12, 742, 420, 260);
  nebula.addColorStop(0, 'rgba(255,125,84,.32)');
  nebula.addColorStop(.35, 'rgba(72,202,211,.20)');
  nebula.addColorStop(1, 'rgba(20,60,108,0)');
  ctx.fillStyle = nebula; ctx.fillRect(0, 0, canvas.width, canvas.height);

  const rnd = mulberry(hashStr('carina:locator'));
  const starPalette = ['#b7ddff', '#fff1d5', '#ffd0ae', '#d4c5ff'];
  for (let i = 0; i < 360; i++){
    const x = rnd() * canvas.width, y = rnd() * canvas.height;
    const r = .5 + Math.pow(rnd(), 4) * 3.2;
    ctx.fillStyle = starPalette[(rnd() * starPalette.length) | 0];
    ctx.globalAlpha = .35 + rnd() * .65;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  const anchors = [
    [210, 610], [350, 510], [510, 565], [650, 430], [800, 465], [1005, 310],
  ];
  ctx.strokeStyle = 'rgba(103,221,242,.42)'; ctx.lineWidth = 3;
  ctx.beginPath();
  anchors.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
  for (const [x, y] of anchors){
    ctx.fillStyle = '#c6efff'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
  }
  const cx = 742, cy = 420;
  ctx.strokeStyle = '#ffb36f'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(cx, cy, 38, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 58, cy); ctx.lineTo(cx + 58, cy);
  ctx.moveTo(cx, cy - 58); ctx.lineTo(cx, cy + 58); ctx.stroke();
  ctx.fillStyle = '#f5fbff'; ctx.font = '600 44px system-ui, sans-serif';
  ctx.fillText('CARINA · NGC 3372', 784, 402);
  ctx.fillStyle = '#8eb8cb'; ctx.font = '27px system-ui, sans-serif';
  ctx.fillText('Modern schematic locator', 784, 444);
  ctx.fillStyle = '#67ddeb'; ctx.font = '600 30px system-ui, sans-serif';
  ctx.fillText('SOUTHERN SKY', 46, 66);
  ctx.fillStyle = '#7192a8'; ctx.font = '23px system-ui, sans-serif';
  ctx.fillText('Orientation guide — not Lacaille’s original drawing', 46, 108);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(100, 62.5), material);
  parent.add(plate);
  return { plate };
}

function addHomunculusFallback(holder, softMap){
  const root = new THREE.Group();
  const geometry = new THREE.SphereGeometry(1, BUDGET.sphereSegments, Math.round(BUDGET.sphereSegments * .66));
  const materials = [
    new THREE.MeshStandardMaterial({
      color: 0xe59b63, emissive: 0x34130b, roughness: .72,
      transparent: true, opacity: .72, side: THREE.DoubleSide,
    }),
    new THREE.MeshStandardMaterial({
      color: 0x77b9c5, emissive: 0x102939, roughness: .72,
      transparent: true, opacity: .66, side: THREE.DoubleSide,
    }),
  ];
  for (let i = 0; i < 2; i++){
    const lobe = new THREE.Mesh(geometry, materials[i]);
    lobe.scale.set(10.5, 17.5, 9.5);
    lobe.position.y = i ? 13 : -13;
    lobe.rotation.z = i ? -.11 : .11;
    root.add(lobe);
  }
  const equator = new THREE.Mesh(
    new THREE.TorusGeometry(10, 2.2, 16, 64),
    new THREE.MeshStandardMaterial({
      color: 0x8d4f58, emissive: 0x261016, roughness: .82,
      transparent: true, opacity: .62,
    }),
  );
  equator.rotation.x = HALF_PI;
  root.add(equator);
  const star = makeGlow(softMap, 0xffe4b2, 7.5);
  root.add(star);
  holder.add(root);
  return { root, star };
}

function colorizeHomunculus(geometry, majorAxis){
  const positions = geometry.attributes.position;
  const box = geometry.boundingBox;
  const min = box.min.getComponent(majorAxis);
  const span = Math.max(.0001, box.max.getComponent(majorAxis) - min);
  const colors = new Float32Array(positions.count * 3);
  const cool = new THREE.Color(0x62afbd);
  const waist = new THREE.Color(0xa95055);
  const warm = new THREE.Color(0xf0ac69);
  for (let i = 0; i < positions.count; i++){
    const component = majorAxis === 0 ? positions.getX(i)
      : majorAxis === 1 ? positions.getY(i)
      : positions.getZ(i);
    const t = (component - min) / span;
    const color = t < .5
      ? cool.clone().lerp(waist, t * 2)
      : waist.clone().lerp(warm, (t - .5) * 2);
    const brightness = .74 + Math.abs(t - .5) * .42;
    colors[i*3] = color.r * brightness;
    colors[i*3+1] = color.g * brightness;
    colors[i*3+2] = color.b * brightness;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function loadHomunculus(scope, holder, fallback, softMap){
  import('three/addons/loaders/STLLoader.js').then(scope.guard(({ STLLoader }) => {
    const loader = new STLLoader();
    loader.load(ASSETS.etaModel, geometry => {
      if (scope.disposed){ geometry.dispose(); return; }
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.center();
      geometry.computeBoundingBox();
      const size = geometry.boundingBox.getSize(new THREE.Vector3());
      const values = [size.x, size.y, size.z];
      const majorAxis = values.indexOf(Math.max(...values));
      colorizeHomunculus(geometry, majorAxis);

      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        emissive: 0x170b0d,
        roughness: .7,
        metalness: 0,
        transparent: true,
        opacity: .74,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      if (majorAxis === 0) mesh.rotation.z = HALF_PI;
      else if (majorAxis === 2) mesh.rotation.x = -HALF_PI;
      const scale = 52 / Math.max(...values);
      mesh.scale.setScalar(scale);

      const surfels = new THREE.Points(geometry, new THREE.PointsMaterial({
        map: softMap,
        size: TEX_TIER === 'low' ? .5 : .38,
        vertexColors: true,
        transparent: true,
        opacity: .44,
        alphaTest: .02,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      surfels.rotation.copy(mesh.rotation);
      surfels.scale.copy(mesh.scale);
      holder.add(mesh, surfels);
      fallback.root.visible = false;
      holder.userData.scientificModelLoaded = true;
    }, undefined, () => {
      if (!scope.disposed) holder.userData.scientificModelLoaded = false;
    });
  })).catch(() => {
    if (!scope.disposed) holder.userData.scientificModelLoaded = false;
  });
}

function buildEta(scope, parent, softMap){
  const modelHolder = new THREE.Group();
  modelHolder.position.x = -27;
  parent.add(modelHolder);
  const fallback = addHomunculusFallback(modelHolder, softMap);
  loadHomunculus(scope, modelHolder, fallback, softMap);

  const uv = makePhotoPlate(scope, parent, {
    url: ASSETS.etaUv, aspect: 1, width: 43, x: 30, y: 0, z: 0,
  });
  addCaption(parent,
    makeCaption('3D SHAPE MODEL', 'Spectroscopy-derived Homunculus geometry', 47),
    -27, -32, 4);
  addCaption(parent,
    makeCaption('2018 UV DATA', 'Separate Hubble observation — not texture registration', 47),
    30, -27, 4);
  return { modelHolder, fallback, uv };
}

function imagePixels(image, width, height){
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height).data;
}

function pixelLuma(data, index){
  return (.299 * data[index] + .587 * data[index+1] + .114 * data[index+2]) / 255;
}

/* A deliberately low-frequency Webb-derived colour field, not a second photo
   plate.  Coarse resampling plus feathered alpha leaves only the broad teal,
   rose and amber ambience behind the future concept surfels. */
function makeFutureColorAmbience(photo){
  const coarse = document.createElement('canvas');
  coarse.width = 24; coarse.height = Math.max(4, Math.round(24 / WEBB_ASPECT));
  const coarseCtx = coarse.getContext('2d');
  coarseCtx.drawImage(photo, 0, 0, coarse.width, coarse.height);

  const canvas = document.createElement('canvas');
  canvas.width = 192; canvas.height = Math.round(192 / WEBB_ASPECT);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(coarse, 0, 0, canvas.width, canvas.height);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++){
    for (let x = 0; x < canvas.width; x++){
      const edgeX = Math.min(x / (canvas.width * .14), (canvas.width - 1 - x) / (canvas.width * .14), 1);
      const edgeY = Math.min(y / (canvas.height * .26), (canvas.height - 1 - y) / (canvas.height * .26), 1);
      const fade = smoothstep(0, 1, Math.max(0, Math.min(edgeX, edgeY)));
      image.data[(y * canvas.width + x) * 4 + 3] = Math.round(255 * fade);
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    color: 0xffffff,
    transparent: true,
    opacity: .20,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  }));
  sprite.scale.set(PHOTO_WIDTH * 1.18, PHOTO_WIDTH / WEBB_ASPECT * 1.34, 1);
  sprite.position.z = -22;
  sprite.renderOrder = -8;
  return sprite;
}

function makePhotoDerivedGeometry(photo, depth, softMap, webbHolder, futureHolder){
  const iw = photo.width || 16, ih = photo.height || 9;
  const width = BUDGET.photoLongSide;
  const height = Math.max(2, Math.round(width * ih / iw));
  const pixels = imagePixels(photo, width, height);
  const depths = imagePixels(depth, width, height);
  const worldWidth = PHOTO_WIDTH, worldHeight = PHOTO_WIDTH / WEBB_ASPECT;
  const surfelPositions = [], surfelColors = [];
  const ambiencePositions = [], ambienceColors = [];
  const futurePositions = [], futureColors = [];
  const starCandidates = [];
  const webbRnd = mulberry(hashStr('carina:webb-orbit-volume'));
  const futureRnd = mulberry(hashStr('carina:future-surfels'));
  const cellX = worldWidth / width, cellY = worldHeight / height;

  for (let py = 1; py < height - 1; py++){
    for (let px = 1; px < width - 1; px++){
      const q = py * width + px, i = q * 4;
      const luma = pixelLuma(pixels, i);
      if (luma < .028) continue;
      let neighbourhood = 0;
      for (let oy = -1; oy <= 1; oy++)
        for (let ox = -1; ox <= 1; ox++)
          if (ox || oy) neighbourhood += pixelLuma(pixels, ((py + oy) * width + px + ox) * 4);
      neighbourhood /= 8;
      const contrast = luma - neighbourhood;
      const isStar = luma > .42 && contrast > .14;
      // Pixel-centre projection uses the same UV convention as the plate, so
      // extracted stars remain registered when the head-on image fades away.
      const x = ((px + .5) / width - .5) * worldWidth;
      const y = -((py + .5) / height - .5) * worldHeight;
      const depth01 = depths[i] / 255;
      const z = (depth01 - .5) * 34;
      const r = pixels[i] / 255, g = pixels[i+1] / 255, b = pixels[i+2] / 255;

      if (isStar){
        starCandidates.push({ x, y, z: z + .8, r, g, b, score: contrast * luma });
        continue;
      }

      // The canonical plate already owns the exact pixel grid.  Orbit mode
      // instead samples it into a genuinely thick cloud: stochastic thinning,
      // sub-cell x/y scatter and several z samples prevent visible rows,
      // columns and the former single depth-map sheet at oblique angles.
      if (webbRnd() < .40 + luma * .34){
        const copies = 1
          + (webbRnd() < .42 ? 1 : 0)
          + (luma > .45 && webbRnd() < .20 ? 1 : 0);
        const xyScatter = .88 + (1 - luma) * .68;
        const thickness = 2.8 + (1 - luma) * 4.8 + Math.abs(depth01 - .5) * 3.2;
        const sourceMean = (r + g + b) / 3;
        const orbitExposure = .64 + luma * .38;
        const orbitR = clamp01(sourceMean + (r - sourceMean) * 1.68) * orbitExposure;
        const orbitG = clamp01(sourceMean + (g - sourceMean) * 1.68) * orbitExposure;
        const orbitB = clamp01(sourceMean + (b - sourceMean) * 1.68) * orbitExposure;
        for (let copy = 0; copy < copies; copy++){
          surfelPositions.push(
            x + gaussian(webbRnd) * cellX * xyScatter,
            y + gaussian(webbRnd) * cellY * xyScatter,
            z + gaussian(webbRnd) * thickness,
          );
          const grain = .84 + webbRnd() * .30;
          surfelColors.push(orbitR * grain, orbitG * grain, orbitB * grain);
        }
      }

      // A few large, low-opacity samples carry the photograph's broad colour
      // through multiple depths. They are points, not another planar plate, so
      // they separate naturally under orbit without becoming repeated images.
      if (webbRnd() < .014 + luma * .010){
        ambiencePositions.push(
          x + gaussian(webbRnd) * cellX * 5.5,
          y + gaussian(webbRnd) * cellY * 5.5,
          z + gaussian(webbRnd) * 15,
        );
        const ambientMean = (r + g + b) / 3;
        const ambientR = clamp01(ambientMean + (r - ambientMean) * 1.85);
        const ambientG = clamp01(ambientMean + (g - ambientMean) * 1.85);
        const ambientB = clamp01(ambientMean + (b - ambientMean) * 1.85);
        const ambientGrain = .46 + webbRnd() * .22;
        ambienceColors.push(
          ambientR * ambientGrain,
          ambientG * ambientGrain,
          ambientB * ambientGrain,
        );
      }

      // Concept-only erosion: irregularly thin and scatter the observed field
      // so an oblique view reads as dusty gas, never a sampled pixel lattice.
      if (futureRnd() < .46 + luma * .28){
        const erosion = .035 + (1 - depth01) * .055;
        const scatter = .7 + (1 - luma) * .85;
        const copies = luma > .42 && futureRnd() < .22 ? 2 : 1;
        const photoMean = (r + g + b) / 3;
        const futureExposure = .62 + luma * .38;
        const fr = clamp01(photoMean + (r - photoMean) * 1.75) * futureExposure;
        const fg = clamp01(photoMean + (g - photoMean) * 1.75) * futureExposure;
        const fb = clamp01(photoMean + (b - photoMean) * 1.75) * futureExposure;
        for (let copy = 0; copy < copies; copy++){
          futurePositions.push(
            x * (1 + erosion) + gaussian(futureRnd) * cellX * scatter,
            y + (luma - .35) * 5.5 + gaussian(futureRnd) * cellY * scatter,
            z * 1.18 - 4 + gaussian(futureRnd) * (1.4 + erosion * 12),
          );
          const grain = .84 + futureRnd() * .28;
          futureColors.push(fr * grain, fg * grain, fb * grain);
        }
      }
    }
  }

  starCandidates.sort((a, b) => b.score - a.score);
  const stars = starCandidates.slice(0, BUDGET.alignedStars);
  const starPositions = new Float32Array(stars.length * 3);
  const starColors = new Float32Array(stars.length * 3);
  for (let i = 0; i < stars.length; i++){
    const star = stars[i];
    starPositions[i*3] = star.x; starPositions[i*3+1] = star.y; starPositions[i*3+2] = star.z;
    // Preserve and gently separate the sampled stellar hue instead of turning
    // every extracted point white under additive blending.
    const mean = (star.r + star.g + star.b) / 3;
    const red = clamp01(mean + (star.r - mean) * 2.25);
    const green = clamp01(mean + (star.g - mean) * 2.25);
    const blue = clamp01(mean + (star.b - mean) * 2.25);
    const max = Math.max(red, green, blue, .001);
    const exposure = 1 / max;
    starColors[i*3] = red * exposure;
    starColors[i*3+1] = green * exposure;
    starColors[i*3+2] = blue * exposure;
  }

  const surfelGeometry = new THREE.BufferGeometry();
  surfelGeometry.setAttribute('position', new THREE.Float32BufferAttribute(surfelPositions, 3));
  surfelGeometry.setAttribute('color', new THREE.Float32BufferAttribute(surfelColors, 3));
  const surfelMaterial = new THREE.PointsMaterial({
    map: softMap,
    size: TEX_TIER === 'low' ? 1.48 : 1.16,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    alphaTest: .018,
    blending: THREE.NormalBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const surfels = new THREE.Points(surfelGeometry, surfelMaterial);
  surfels.name = 'irregular-multi-depth-webb-surfels';

  const ambienceGeometry = new THREE.BufferGeometry();
  ambienceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ambiencePositions, 3));
  ambienceGeometry.setAttribute('color', new THREE.Float32BufferAttribute(ambienceColors, 3));
  const ambienceMaterial = new THREE.PointsMaterial({
    map: softMap,
    size: TEX_TIER === 'low' ? 7.2 : 8.8,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    alphaTest: .008,
    blending: THREE.NormalBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const ambience = new THREE.Points(ambienceGeometry, ambienceMaterial);
  ambience.name = 'depth-separated-webb-color-ambience';
  ambience.renderOrder = -2;
  webbHolder.add(ambience);
  webbHolder.add(surfels);

  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const starMaterial = new THREE.PointsMaterial({
    map: softMap,
    size: TEX_TIER === 'low' ? 2.0 : 1.55,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    alphaTest: .018,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const alignedStars = new THREE.Points(starGeometry, starMaterial);
  alignedStars.name = 'photo-aligned-colored-stars';
  webbHolder.add(alignedStars);

  const futureGeometry = new THREE.BufferGeometry();
  futureGeometry.setAttribute('position', new THREE.Float32BufferAttribute(futurePositions, 3));
  futureGeometry.setAttribute('color', new THREE.Float32BufferAttribute(futureColors, 3));
  const futureMaterial = new THREE.PointsMaterial({
    map: softMap,
    size: TEX_TIER === 'low' ? 1.62 : 1.30,
    vertexColors: true,
    transparent: true,
    opacity: .82,
    alphaTest: .018,
    blending: THREE.NormalBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const future = new THREE.Points(futureGeometry, futureMaterial);
  future.name = 'irregular-webb-palette-concept-surfels';
  futureHolder.add(makeFutureColorAmbience(photo));
  futureHolder.add(future);
  return { surfels, ambience, alignedStars, future };
}

function buildHubble(scope, parent){
  const plate = makePhotoPlate(scope, parent, {
    url: ASSETS.hubble, aspect: HUBBLE_ASPECT, width: PHOTO_WIDTH,
  });
  addCaption(parent,
    makeCaption('HUBBLE · 2007 RELEASE', 'Wide Carina mosaic — its own observed field', 64),
    0, -plate.height / 2 - 6, 3);
  return { plate };
}

function buildWebb(scope, parent, futureParent, softMap){
  const volume = new THREE.Group();
  parent.add(volume);
  const futureVolume = new THREE.Group();
  futureParent.add(futureVolume);
  let photo = null, depth = null, photoDerived = null;
  const finish = () => {
    if (!photoDerived && photo && depth)
      photoDerived = makePhotoDerivedGeometry(photo.image, depth.image, softMap, volume, futureVolume);
  };
  const plate = makePhotoPlate(scope, parent, {
    url: ASSETS.webb,
    aspect: WEBB_ASPECT,
    width: PHOTO_WIDTH,
    onTexture: texture => { photo = texture; finish(); },
  });
  addCaption(parent,
    makeCaption('WEBB · NIRCAM + MIRI', 'Exact head-on plate · orbit reveals inferred depth', 68),
    0, -plate.height / 2 - 6, 3);
  loadTexture(ASSETS.webbDepth, scope.guard(texture => { depth = texture; finish(); }), { srgb: false });

  addCaption(futureParent,
    makeCaption('CONCEPT / MODEL', 'Webb-derived palette · illustrative erosion · no forecast', 68),
    0, -30, 4);
  return {
    plate,
    volume,
    futureVolume,
    get photoDerived(){ return photoDerived; },
  };
}

function createStateRoot(group, state){
  const root = new THREE.Group();
  root.name = 'carina:' + state;
  root.userData.carinaState = state;
  root.visible = false;
  group.add(root);
  return root;
}

function canonicalHeadOn(camera){
  if (!camera) return 1;
  const length = camera.position.length();
  if (length < .001) return 1;
  return smoothstep(.94, .997, camera.position.z / length);
}

export function buildCarinaFeatured(){
  const scope = new ResourceScope('carina-featured');
  const group = new THREE.Group();
  const softMap = scope.own(makeSoftDisc());
  const states = new Map();
  for (const state of Object.values(CARINA_STATES))
    states.set(state, createStateRoot(group, state));

  const formation = buildFormation(states.get(CARINA_STATES.FORMATION), softMap);
  buildLocator(states.get(CARINA_STATES.LOCATOR));
  const eta = buildEta(scope, states.get(CARINA_STATES.ETA_ERUPTION), softMap);
  buildHubble(scope, states.get(CARINA_STATES.HUBBLE));
  const webb = buildWebb(
    scope,
    states.get(CARINA_STATES.WEBB),
    states.get(CARINA_STATES.FUTURE),
    softMap,
  );

  let activeState = CARINA_STATES.WEBB;
  let elapsed = 0;
  const aliases = new Map([
    ['formation', CARINA_STATES.FORMATION],
    ['locator', CARINA_STATES.LOCATOR],
    ['eta', CARINA_STATES.ETA_ERUPTION],
    ['eta-eruption', CARINA_STATES.ETA_ERUPTION],
    ['hubble', CARINA_STATES.HUBBLE],
    ['hubble-panorama', CARINA_STATES.HUBBLE],
    ['webb', CARINA_STATES.WEBB],
    ['webb-cliffs', CARINA_STATES.WEBB],
    ['future', CARINA_STATES.FUTURE],
    ['future-erosion', CARINA_STATES.FUTURE],
  ]);

  function selectState(requested){
    const state = aliases.get(requested) || requested;
    if (!states.has(state)) return;
    activeState = state;
    for (const [name, root] of states) root.visible = name === state;
    group.userData.carinaState = state;
  }
  selectState(activeState);
  group.userData.qualityBudget = BUDGET;
  group.userData.observationFields = 'separate-no-crossfade';

  return {
    group,
    focusDist: 108,
    startTheta: 0,
    startPhi: HALF_PI,
    autoRotate: false,
    hasIR: false,
    isImage: true,
    modelCredit: MODEL_CREDIT,
    setMoment(visual){
      if (!scope.disposed && visual && visual.state) selectState(visual.state);
    },
    update(dt, camera){
      if (scope.disposed) return;
      elapsed += dt;
      if (activeState === CARINA_STATES.FORMATION){
        formation.cloud.rotation.y += dt * .022;
        formation.inner.rotation.y -= dt * .014;
        for (let i = 0; i < formation.stars.length; i++){
          const pulse = 1 + Math.sin(elapsed * (1.1 + i * .09) + i) * .08;
          formation.stars[i].scale.setScalar((3.2 + (i % 3)) * pulse);
        }
      } else if (activeState === CARINA_STATES.ETA_ERUPTION){
        const pulse = 1 + Math.sin(elapsed * 1.6) * .08;
        eta.fallback.star.scale.setScalar(7.5 * pulse);
      } else if (activeState === CARINA_STATES.WEBB){
        const headOn = canonicalHeadOn(camera);
        webb.plate.material.opacity = headOn;
        const derived = webb.photoDerived;
        if (derived){
          derived.surfels.material.opacity = .82 * (1 - headOn);
          derived.ambience.material.opacity = .15 * (1 - headOn);
          derived.alignedStars.material.opacity = .98 * (1 - headOn);
        }
      } else if (activeState === CARINA_STATES.FUTURE){
        webb.futureVolume.rotation.y = Math.sin(elapsed * .08) * .16;
      }
    },
    dispose(){ scope.dispose(); },
  };
}
