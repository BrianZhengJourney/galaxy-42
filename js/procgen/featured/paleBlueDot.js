/* Pale Blue Dot: six evidence-honest presentation states.  Observation files
   remain flat, unlit source plates.  Camera scatter in the 1990 frame is never
   mined for stars; a separate seeded star layer supplies scene dressing. */

import * as THREE from 'three';
import { mulberry, hashStr, gaussian } from '../../utils/rng.js';
import { dotTexture } from '../../objects/starfield.js';
import { makeGlowTexture } from '../../utils/textures.js';
import { loadTexture } from '../../utils/assets.js';
import { detectTier } from '../../core/quality.js';
import { ResourceScope } from './resourceScope.js';

const ASSETS = Object.freeze({
  earthMoon: 'images/pale-blue-dot/earth-moon-1977.jpg',
  original: 'images/pale-blue-dot/original-1990.jpg',
  revisited: 'images/pale-blue-dot/revisited-2020.jpg',
  heliopause: 'images/pale-blue-dot/heliopause-density-2012.jpg',
  voyager: 'models/pale-blue-dot/voyager.glb',
});

export const PALE_BLUE_DOT_STATES = Object.freeze({
  SPACECRAFT: 'voyager-spacecraft',
  EARTH_MOON: 'earth-moon-1977',
  ORIGINAL: 'pbd-original-1990',
  CAMERA_OFF: 'voyager-camera-shutdown',
  HELIOPAUSE: 'voyager-heliopause-2012',
  COMPARE: 'pbd-compare-1990-2020',
});

const TIER = detectTier().tier;
const QUALITY = Object.freeze(TIER === 'low' ? {
  decorativeStars: 180,
  pathSegments: 48,
  radialSegments: 4,
  anisotropy: 2,
} : {
  decorativeStars: 420,
  pathSegments: 96,
  radialSegments: 7,
  anisotropy: 6,
});

const HALF_PI = Math.PI / 2;
const IMAGE_CREDIT = 'Voyager observations, Pale Blue Dot processing and heliopause evidence: NASA/JPL-Caltech · Voyager 3D visualization model: NASA/JPL-Caltech';
const MODEL_CREDIT = 'Voyager 3D visualization model: NASA/JPL-Caltech';

function solidTexture(color){
  const value = new THREE.Color(color);
  const data = new Uint8Array([
    Math.round(value.r * 255), Math.round(value.g * 255),
    Math.round(value.b * 255), 255,
  ]);
  const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function canvasPanel(title, subtitle, width = 58, options = {}){
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = options.tall ? 360 : 170;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = options.background || 'rgba(3,8,17,.92)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = options.accent || 'rgba(91,225,255,.62)';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  ctx.fillStyle = options.titleColor || '#e2f9ff';
  ctx.font = options.tall ? '600 48px system-ui, sans-serif' : '600 34px system-ui, sans-serif';
  ctx.fillText(title, 34, options.tall ? 76 : 68);
  ctx.fillStyle = options.subtitleColor || '#8eb8c9';
  ctx.font = options.tall ? '29px system-ui, sans-serif' : '23px system-ui, sans-serif';
  const lines = Array.isArray(subtitle) ? subtitle : [subtitle];
  lines.forEach((line, index) => ctx.fillText(line, 34,
    (options.tall ? 140 : 122) + index * (options.tall ? 48 : 34)));
  if (options.tall){
    ctx.fillStyle = options.statusColor || '#ff6f64';
    ctx.font = '700 82px system-ui, sans-serif';
    ctx.fillText(options.status || 'OFF', 34, 310);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const height = width * canvas.height / canvas.width;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.renderOrder = 40;
  return mesh;
}

function addPanel(parent, panel, x, y, z = 3){
  panel.position.set(x, y, z);
  parent.add(panel);
  return panel;
}

/* Local broker prevents the single 1990 source from being decoded twice for
   its solo and comparison plates.  The global cache remains the texture owner. */
function makeTextureBroker(scope){
  const records = new Map();
  scope.defer(() => records.clear());
  return function request(path, callback, { pixelated = false } = {}){
    let record = records.get(path);
    if (record && record.texture){ callback(record.texture); return; }
    if (record){ record.callbacks.push(callback); return; }
    record = { callbacks: [callback], texture: null };
    records.set(path, record);
    loadTexture(path, texture => {
      if (scope.disposed){ records.delete(path); return; }
      if (pixelated) texture.magFilter = THREE.NearestFilter;
      texture.anisotropy = QUALITY.anisotropy;
      record.texture = texture;
      const callbacks = record.callbacks.splice(0);
      for (const ready of callbacks) ready(texture);
    });
  };
}

function observationPlate(scope, requestTexture, parent, {
  url, aspect, height, x = 0, y = 0, z = 0, pixelated = false,
  displayGain = 0xffffff,
}){
  const fallback = scope.own(solidTexture(0x03060a));
  const material = new THREE.MeshBasicMaterial({
    map: fallback,
    color: displayGain,
    // The opaque plate writes depth so both the dedicated and scene-level
    // decorative star fields remain behind the observation, never on top of it.
    depthWrite: true,
    depthTest: true,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  // Real-image textures are owned by utils/assets.js and evicted centrally.
  material.userData.keepMaps = true;
  const width = height * aspect;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, z);
  mesh.renderOrder = 20;
  parent.add(mesh);
  requestTexture(url, scope.guard(texture => {
    material.map = texture;
    material.needsUpdate = true;
    mesh.userData.observationReady = true;
  }), { pixelated });
  return { mesh, material, width, height };
}

function decorativeStarLayer(){
  const rnd = mulberry(hashStr('pale-blue-dot:decorative-stars'));
  const positions = new Float32Array(QUALITY.decorativeStars * 3);
  const colors = new Float32Array(QUALITY.decorativeStars * 3);
  const palette = [
    new THREE.Color(0x69baff), new THREE.Color(0xffc65c),
    new THREE.Color(0xb77aff), new THREE.Color(0xff8066),
  ];
  for (let i = 0; i < QUALITY.decorativeStars; i++){
    positions[i*3] = gaussian(rnd) * 92;
    positions[i*3+1] = gaussian(rnd) * 58;
    positions[i*3+2] = -28 - rnd() * 110;
    const color = palette[(rnd() * palette.length) | 0];
    const brightness = .48 + rnd() * rnd() * .52;
    colors[i*3] = color.r * brightness;
    colors[i*3+1] = color.g * brightness;
    colors[i*3+2] = color.b * brightness;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    map: dotTexture(),
    size: 1.6,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: false,
    alphaTest: .025,
    depthWrite: false,
    toneMapped: false,
  });
  const stars = new THREE.Points(geometry, material);
  stars.name = 'decorative-colored-stars-not-photo-data';
  stars.renderOrder = -30;
  stars.userData.decorativeOnly = true;
  return stars;
}

function stateRoot(group, state){
  const root = new THREE.Group();
  root.name = 'pale-blue-dot:' + state;
  root.userData.paleBlueDotState = state;
  root.visible = false;
  group.add(root);
  return root;
}

function buildSpacecraftState(root, glowMap){
  const modelSlot = new THREE.Group();
  modelSlot.position.set(0, 3, 0);
  root.add(modelSlot);

  // A restrained route and receding Sun give the spacecraft real visual
  // context without inventing another observation. The path is an explanatory
  // trajectory motif, while the loaded NASA model remains the hero object.
  const context = new THREE.Group();
  context.name = 'voyager-deep-space-trajectory-context';
  context.position.set(0, 0, -10);
  root.add(context);
  const route = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-58, -19, -4),
    new THREE.Vector3(-32, -10, 0),
    new THREE.Vector3(-7, -1, 2),
    new THREE.Vector3(24, 11, -1),
    new THREE.Vector3(58, 23, -8),
  ]);
  const routeMesh = new THREE.Mesh(
    new THREE.TubeGeometry(route, QUALITY.pathSegments, .11,
      QUALITY.radialSegments, false),
    new THREE.MeshBasicMaterial({
      color: 0x68cde2, transparent: true, opacity: .38,
      depthWrite: false, toneMapped: false,
    }),
  );
  routeMesh.name = 'voyager-explanatory-trajectory-line';
  context.add(routeMesh);
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowMap, color: 0xffc878, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  sun.position.set(-58, -19, -4);
  sun.scale.set(11, 11, 1);
  context.add(sun);
  for (let index = 0; index < 5; index++){
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(.23, 10, 7),
      new THREE.MeshBasicMaterial({ color: 0xa8ecff, toneMapped: false }),
    );
    marker.position.copy(route.getPoint(.16 + index * .16));
    marker.name = 'voyager-route-marker-' + (index + 1);
    context.add(marker);
  }
  const warmKey = new THREE.DirectionalLight(0xffd09b, 3.2);
  warmKey.position.set(-28, 24, 36);
  const coolRim = new THREE.DirectionalLight(0x62cfff, 2.4);
  coolRim.position.set(36, -12, -28);
  root.add(warmKey, coolRim);
  addPanel(root,
    canvasPanel('VOYAGER 1', '3D visualization model · not an observation', 64),
    0, -37, 4);
  return { modelSlot, context, sun };
}

function buildEarthMoonState(scope, requestTexture, root){
  const plate = observationPlate(scope, requestTexture, root, {
    url: ASSETS.earthMoon, aspect: 565 / 790, height: 76,
  });
  addPanel(root,
    canvasPanel('EARTH + MOON · 1977', 'Single observation frame · unlit source color', 61),
    0, -plate.height / 2 - 6, 3);
  return plate;
}

function buildOriginalState(scope, requestTexture, root){
  const plate = observationPlate(scope, requestTexture, root, {
    url: ASSETS.original, aspect: 453 / 614, height: 78, pixelated: true,
  });
  addPanel(root,
    canvasPanel('PALE BLUE DOT · 1990', 'Earth signal ≈ 0.12 camera pixel · rays are scattered sunlight', 72),
    0, -plate.height / 2 - 6, 3);
  return plate;
}

function buildCameraOffState(root){
  const modelSlot = new THREE.Group();
  modelSlot.position.set(-31, 5, 0);
  root.add(modelSlot);
  addPanel(root, canvasPanel('IMAGING SCIENCE SUBSYSTEM', [
    'Permanently powered down',
    '34 minutes after the final portrait',
    'No later Voyager photographs exist',
  ], 55, {
    tall: true,
    accent: 'rgba(255,102,92,.72)',
    status: 'CAMERA OFF',
    statusColor: '#ff776d',
  }), 31, 1, 4);
  addPanel(root,
    canvasPanel('VOYAGER VISUALIZATION MODEL', 'The shutdown state is mission context, not an image', 48),
    -31, -29, 4);
  return modelSlot;
}

function boundaryPatch(){
  const canvas = document.createElement('canvas');
  canvas.width = 192; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const horizontal = ctx.createLinearGradient(0, 0, canvas.width, 0);
  horizontal.addColorStop(0, 'rgba(55,205,238,0)');
  horizontal.addColorStop(.36, 'rgba(55,205,238,.08)');
  horizontal.addColorStop(.50, 'rgba(132,232,255,.42)');
  horizontal.addColorStop(.64, 'rgba(55,205,238,.08)');
  horizontal.addColorStop(1, 'rgba(55,205,238,0)');
  ctx.fillStyle = horizontal; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++){
    const edge = Math.sin(Math.PI * y / (canvas.height - 1));
    for (let x = 0; x < canvas.width; x++)
      pixels.data[(y * canvas.width + x) * 4 + 3] *= edge * edge;
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: 0x8feaff,
    transparent: true,
    opacity: .62,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(30, 34), material);
  patch.rotation.y = HALF_PI;
  patch.renderOrder = -2;
  patch.name = 'local-heliopause-crossing-patch-not-sphere';
  return patch;
}

function buildHeliopauseState(scope, requestTexture, root, glowMap){
  const route = new THREE.Group();
  route.position.y = 17;
  root.add(route);
  const crossingX = 9; // Sun at -52: 61 world units = approximately 122 AU.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-52, -2, 0),
    new THREE.Vector3(-31, 0, 1.5),
    new THREE.Vector3(-8, 2, -.8),
    new THREE.Vector3(crossingX, 3.5, 0),
    new THREE.Vector3(39, 8, 3.5),
  ]);
  const path = new THREE.Mesh(
    new THREE.TubeGeometry(curve, QUALITY.pathSegments, .24,
      QUALITY.radialSegments, false),
    new THREE.MeshBasicMaterial({ color: 0x66dbea, toneMapped: false }),
  );
  path.name = 'voyager-local-crossing-path-122-au';
  route.add(path);

  const sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowMap, color: 0xffd18b, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  sun.position.set(-52, -2, 0); sun.scale.set(8, 8, 1); route.add(sun);
  const patch = boundaryPatch();
  patch.position.set(crossingX, 3.5, 0); route.add(patch);
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(.9, 18, 12),
    new THREE.MeshBasicMaterial({ color: 0xffb466, toneMapped: false }),
  );
  marker.position.set(crossingX, 3.5, 0); route.add(marker);

  const modelSlot = new THREE.Group();
  modelSlot.position.set(crossingX + 1.4, 5.5, 2);
  route.add(modelSlot);
  addPanel(root,
    canvasPanel('HELIOPAUSE CROSSING · ≈122 AU', 'Local trajectory and boundary patch · not a universal sphere', 61),
    -26, -5, 4);

  observationPlate(scope, requestTexture, root, {
    url: ASSETS.heliopause, aspect: 1280 / 720, height: 24,
    x: 28, y: -10, z: 1, displayGain: 0x777777,
  });
  addPanel(root,
    canvasPanel('NASA/JPL DENSITY PROFILE', 'Source evidence/model graphic · display-dimmed', 48),
    28, 5, 4);
  return { modelSlot, marker };
}

function buildComparisonState(scope, requestTexture, root){
  const height = 62;
  const originalWidth = height * 453 / 614;
  const revisitedWidth = height * 4096 / 4053;
  const gap = 9;
  const total = originalWidth + gap + revisitedWidth;
  const originalX = -total / 2 + originalWidth / 2;
  const revisitedX = total / 2 - revisitedWidth / 2;
  const original = observationPlate(scope, requestTexture, root, {
    url: ASSETS.original, aspect: 453 / 614, height,
    x: originalX, pixelated: true,
  });
  const revisited = observationPlate(scope, requestTexture, root, {
    url: ASSETS.revisited, aspect: 4096 / 4053, height,
    x: revisitedX,
  });
  addPanel(root,
    canvasPanel('SAME 1990 SOURCE FRAMES', 'Side-by-side comparison · no assumed registration', 72),
    0, 39, 4);
  addPanel(root,
    canvasPanel('ORIGINAL RELEASE', 'Earth ≈ 0.12 camera pixel', 44),
    originalX, -38, 4);
  addPanel(root,
    canvasPanel('2020 FALSE-COLOR REPROCESSING', 'Same frames · no new spatial detail', 60),
    revisitedX, -38, 4);
  return { original, revisited };
}

function disposeDetachedObject(root){
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(object => {
    if (object.geometry && !geometries.has(object.geometry)){
      geometries.add(object.geometry); object.geometry.dispose();
    }
    const list = Array.isArray(object.material) ? object.material
      : object.material ? [object.material] : [];
    for (const material of list){
      if (materials.has(material)) continue;
      materials.add(material);
      for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap']){
        const texture = material[key];
        if (texture && !textures.has(texture)){ textures.add(texture); texture.dispose(); }
      }
      material.dispose();
    }
  });
}

function normalizedModel(source, targetSize, rotation){
  const clone = source.clone(true);
  clone.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(clone);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  clone.position.sub(center);
  const wrapper = new THREE.Group();
  wrapper.add(clone);
  wrapper.scale.setScalar(targetSize / Math.max(size.x, size.y, size.z, .001));
  wrapper.rotation.set(rotation[0], rotation[1], rotation[2]);
  return wrapper;
}

function loadVoyagerModel(scope, slots){
  import('three/addons/loaders/GLTFLoader.js').then(scope.guard(({ GLTFLoader }) => {
    new GLTFLoader().load(ASSETS.voyager, gltf => {
      if (scope.disposed){ disposeDetachedObject(gltf.scene); return; }
      // All displayed clones share this source asset's geometry/materials.
      // Owning the source makes direct and repeated delegate disposal safe;
      // LandmarkView's later traversal may harmlessly encounter them again.
      scope.defer(() => disposeDetachedObject(gltf.scene));
      gltf.scene.traverse(object => {
        const materials = Array.isArray(object.material) ? object.material
          : object.material ? [object.material] : [];
        for (const material of materials){
          if (material.map) material.map.anisotropy = QUALITY.anisotropy;
          material.needsUpdate = true;
        }
      });
      for (const slot of slots){
        const model = normalizedModel(gltf.scene, slot.size, slot.rotation);
        slot.root.add(model);
        slot.root.userData.model = model;
        slot.root.userData.visualizationModelLoaded = true;
      }
    }, undefined, () => {
      if (scope.disposed) return;
      for (const slot of slots) slot.root.userData.visualizationModelLoaded = false;
    });
  })).catch(() => {
    if (scope.disposed) return;
    for (const slot of slots) slot.root.userData.visualizationModelLoaded = false;
  });
}

function stateFromVisual(visual){
  const raw = typeof visual === 'string'
    ? visual
    : visual && (visual.state || visual.moment || visual.id);
  if (raw && Object.values(PALE_BLUE_DOT_STATES).includes(raw)) return raw;
  const value = String(raw || '').toLowerCase();
  if (/launch|spacecraft/.test(value)) return PALE_BLUE_DOT_STATES.SPACECRAFT;
  if (/earth.?moon|1977/.test(value)) return PALE_BLUE_DOT_STATES.EARTH_MOON;
  if (/camera|shutdown|off/.test(value)) return PALE_BLUE_DOT_STATES.CAMERA_OFF;
  if (/heliopause|interstellar|2012/.test(value)) return PALE_BLUE_DOT_STATES.HELIOPAUSE;
  if (/compare|reprocess|revisit|2020/.test(value)) return PALE_BLUE_DOT_STATES.COMPARE;
  if (/pale|earth|original|1990/.test(value)) return PALE_BLUE_DOT_STATES.ORIGINAL;
  return PALE_BLUE_DOT_STATES.ORIGINAL;
}

export function buildPaleBlueDotFeatured(){
  const scope = new ResourceScope('pale-blue-dot-featured');
  const group = new THREE.Group();
  group.add(decorativeStarLayer());
  const requestTexture = makeTextureBroker(scope);
  const glowMap = scope.own(
    makeGlowTexture('rgba(255,255,255,1)', 'rgba(255,184,104,.42)', 128));

  const states = new Map();
  for (const state of Object.values(PALE_BLUE_DOT_STATES))
    states.set(state, stateRoot(group, state));

  const spacecraft = buildSpacecraftState(
    states.get(PALE_BLUE_DOT_STATES.SPACECRAFT), glowMap);
  buildEarthMoonState(scope, requestTexture, states.get(PALE_BLUE_DOT_STATES.EARTH_MOON));
  buildOriginalState(scope, requestTexture, states.get(PALE_BLUE_DOT_STATES.ORIGINAL));
  const cameraSlot = buildCameraOffState(states.get(PALE_BLUE_DOT_STATES.CAMERA_OFF));
  const heliopause = buildHeliopauseState(
    scope, requestTexture, states.get(PALE_BLUE_DOT_STATES.HELIOPAUSE), glowMap);
  buildComparisonState(scope, requestTexture, states.get(PALE_BLUE_DOT_STATES.COMPARE));

  loadVoyagerModel(scope, [
    { root: spacecraft.modelSlot, size: 55, rotation: [.15, -.78, .05] },
    { root: cameraSlot, size: 36, rotation: [.10, -.72, .02] },
    { root: heliopause.modelSlot, size: 8, rotation: [.08, -.45, 0] },
  ]);

  let activeState = PALE_BLUE_DOT_STATES.ORIGINAL;
  let elapsed = 0;
  function selectState(next){
    const state = stateFromVisual(next);
    activeState = state;
    for (const [name, root] of states) root.visible = name === state;
    group.userData.paleBlueDotState = state;
  }
  selectState(activeState);
  group.userData.qualityBudget = QUALITY;
  group.userData.decorativeStarsSeparatedFromObservations = true;
  group.userData.observationPolicy = 'unlit-source-plates-no-star-extraction';
  group.userData.heroFidelity = {
    observationAnchor: 'unaltered mission source plates and explicitly labeled reprocessing',
    spatialHero: 'NASA/JPL Voyager visualization model with lit deep-space route context',
    comparison: 'flat observation and spacecraft remain separate in split presentation',
  };

  return {
    group,
    focusDist: 112,
    startTheta: 0,
    startPhi: HALF_PI,
    autoRotate: false,
    isImage: true,
    hasIR: false,
    imageCredit: IMAGE_CREDIT,
    modelCredit: MODEL_CREDIT,
    setMoment(visual){ if (!scope.disposed) selectState(visual); },
    update(dt){
      if (scope.disposed) return;
      elapsed += dt;
      if (activeState === PALE_BLUE_DOT_STATES.SPACECRAFT){
        if (spacecraft.modelSlot.userData.model)
          spacecraft.modelSlot.userData.model.rotation.y = -.78 + Math.sin(elapsed * .22) * .18;
        const pulse = 1 + Math.sin(elapsed * .72) * .06;
        spacecraft.sun.scale.set(11 * pulse, 11 * pulse, 1);
        spacecraft.context.rotation.z = Math.sin(elapsed * .08) * .012;
      }
      if (activeState === PALE_BLUE_DOT_STATES.HELIOPAUSE){
        const pulse = 1 + Math.sin(elapsed * 2.1) * .18;
        heliopause.marker.scale.setScalar(pulse);
      }
    },
    dispose(){ scope.dispose(); },
  };
}
