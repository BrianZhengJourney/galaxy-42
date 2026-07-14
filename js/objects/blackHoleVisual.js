/* Relativistic black-hole visual shared by system stars and landmark exhibits.
   The accretion flow is real indexed geometry; the photon ring and secondary
   disk images are analytic. Nothing here depends on bloom or generated maps. */

import * as THREE from 'three';
import { TEX_TIER } from '../core/quality.js';

const TAU = Math.PI * 2;
const HIGH_TIER = TEX_TIER === 'high';
const FRAGMENT_PRECISION = HIGH_TIER ? 'highp' : 'mediump';

function deepFreeze(value){
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export const SAGITTARIUS_A_PROFILE = deepFreeze({
  id: 'sagittarius-a',
  label: 'Sagittarius A* · quiescent warm flow',
  science: {
    massRegime: 'supermassive', accretionState: 'quiescent',
    visualBasis: 'warm, optically thin inner accretion flow with relativistic lensing',
  },
  disk: {
    inner: 1.34, outer: 4.7, tilt: 1.16, yaw: -0.12,
    innerColor: 0xfff4d2, midColor: 0xffa34d, outerColor: 0x54160d,
    opacity: 0.92, bands: 24, spiral: 3.8, turbulence: 0.62,
    doppler: 0.48, dopplerAngle: 0.12, corrugation: 0.050, speed: 0.24,
  },
  lensing: {
    extent: 4.35, photonRadius: 1.115, photonWidth: 0.027,
    photonColor: 0xfff4d6, photonHotColor: 0xffffff, photonOpacity: 0.96,
    ringFloor: 0.25, warpHeight: 1.00, warpEdgeHeight: 0.26,
    warpThickness: 0.105, warpExtent: 3.72, warpOpacity: 0.62,
    warpInnerColor: 0xffe7b0, warpOuterColor: 0xc85b23,
    haloColor: 0xff9c4d, haloOpacity: 0.13,
  },
  light: { color: 0xffd0a0, intensity: 1.35 },
  jets: { recommended: false, openingAngle: 0.10, color: 0xffc27a },
});

export const M87_PROFILE = deepFreeze({
  id: 'm87',
  label: 'M87* · strong orange crescent',
  science: {
    massRegime: 'supermassive', accretionState: 'low-luminosity active nucleus',
    visualBasis: 'strong Doppler asymmetry and a jet-capable polar context',
  },
  disk: {
    inner: 1.30, outer: 4.35, tilt: 1.08, yaw: 0.10,
    innerColor: 0xffe3a0, midColor: 0xff7a22, outerColor: 0x4c0b06,
    opacity: 0.96, bands: 20, spiral: 4.6, turbulence: 0.72,
    doppler: 0.82, dopplerAngle: -0.28, corrugation: 0.065, speed: 0.18,
  },
  lensing: {
    extent: 4.15, photonRadius: 1.12, photonWidth: 0.035,
    photonColor: 0xffa13b, photonHotColor: 0xffffd0, photonOpacity: 0.98,
    ringFloor: 0.12, warpHeight: 1.02, warpEdgeHeight: 0.24,
    warpThickness: 0.125, warpExtent: 3.55, warpOpacity: 0.70,
    warpInnerColor: 0xffc253, warpOuterColor: 0x9e2810,
    haloColor: 0xff6a21, haloOpacity: 0.17,
  },
  light: { color: 0xff9b58, intensity: 1.22 },
  jets: { recommended: true, openingAngle: 0.075, color: 0xffc17c },
});

export const CYGNUS_X1_PROFILE = deepFreeze({
  id: 'cygnus-x1',
  label: 'Cygnus X-1 · compact hot flow',
  science: {
    massRegime: 'stellar', accretionState: 'companion-fed X-ray binary',
    visualBasis: 'compact, hot blue-white inner disk with rapid turbulent shear',
  },
  disk: {
    inner: 1.24, outer: 5.15, tilt: 1.22, yaw: 0.22,
    innerColor: 0xffffff, midColor: 0xb8ddff, outerColor: 0x315baf,
    opacity: 0.98, bands: 31, spiral: 5.8, turbulence: 0.76,
    doppler: 0.67, dopplerAngle: 0.42, corrugation: 0.042, speed: 0.62,
  },
  lensing: {
    extent: 4.55, photonRadius: 1.10, photonWidth: 0.024,
    photonColor: 0xd7ecff, photonHotColor: 0xffffff, photonOpacity: 1.0,
    ringFloor: 0.22, warpHeight: 0.96, warpEdgeHeight: 0.22,
    warpThickness: 0.085, warpExtent: 4.0, warpOpacity: 0.64,
    warpInnerColor: 0xf2f8ff, warpOuterColor: 0x6b9de5,
    haloColor: 0x78b5ff, haloOpacity: 0.11,
  },
  light: { color: 0xc7e1ff, intensity: 1.55 },
  jets: { recommended: false, openingAngle: 0.065, color: 0x9fcaff },
});

export const BINARY_VACUUM_PROFILE = deepFreeze({
  id: 'binary-vacuum',
  label: 'Vacuum black hole · nearly dark',
  science: {
    massRegime: 'stellar', accretionState: 'vacuum / merger context',
    visualBasis: 'near-dark horizon with only a restrained lensing trace',
  },
  disk: {
    inner: 1.58, outer: 3.5, tilt: 1.28, yaw: 0.0,
    innerColor: 0xaab8d8, midColor: 0x5b6378, outerColor: 0x171a22,
    opacity: 0.055, bands: 16, spiral: 2.8, turbulence: 0.42,
    doppler: 0.25, dopplerAngle: 0.0, corrugation: 0.018, speed: 0.10,
  },
  lensing: {
    extent: 3.5, photonRadius: 1.10, photonWidth: 0.018,
    photonColor: 0x8996b2, photonHotColor: 0xd8def0, photonOpacity: 0.46,
    ringFloor: 0.38, warpHeight: 0.94, warpEdgeHeight: 0.24,
    warpThickness: 0.060, warpExtent: 2.75, warpOpacity: 0.018,
    warpInnerColor: 0x8790a4, warpOuterColor: 0x303541,
    haloColor: 0x66718a, haloOpacity: 0.032,
  },
  light: { color: 0x8993ac, intensity: 0.025 },
  jets: { recommended: false, openingAngle: 0.06, color: 0x8090b0 },
});

export const BLACK_HOLE_PROFILES = Object.freeze({
  'sagittarius-a': SAGITTARIUS_A_PROFILE,
  m87: M87_PROFILE,
  'cygnus-x1': CYGNUS_X1_PROFILE,
  'binary-vacuum': BINARY_VACUUM_PROFILE,
});

const PROFILE_ALIASES = Object.freeze({
  sgr: 'sagittarius-a', 'sgr-a': 'sagittarius-a', 'sgr-a*': 'sagittarius-a',
  sagittarius: 'sagittarius-a', 'sagittarius-a*': 'sagittarius-a',
  'm87*': 'm87', powehi: 'm87', 'cyg-x1': 'cygnus-x1', cygnus: 'cygnus-x1',
  binary: 'binary-vacuum', vacuum: 'binary-vacuum', merger: 'binary-vacuum',
});

export function resolveBlackHoleProfile(value = 'sagittarius-a'){
  if (value && typeof value === 'object' && value.id){
    const key = normaliseProfileId(value.id);
    if (BLACK_HOLE_PROFILES[key] === value) return value;
    if (BLACK_HOLE_PROFILES[key]) return BLACK_HOLE_PROFILES[key];
  }
  const key = normaliseProfileId(value);
  return BLACK_HOLE_PROFILES[key] || SAGITTARIUS_A_PROFILE;
}

function normaliseProfileId(value){
  const key = String(value || '').trim().toLowerCase().replace(/_/g, '-');
  return PROFILE_ALIASES[key] || key;
}

function colorUniform(hex){
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
}

function finite(value, fallback){
  return Number.isFinite(value) ? value : fallback;
}

function indexedAnnulus(innerRadius, outerRadius, radialSegments, angularSegments){
  const columns = angularSegments + 1;
  const positions = [];
  const normals = [];
  const polar = [];
  const indices = [];

  for (let ring = 0; ring <= radialSegments; ring++){
    const radial = ring / radialSegments;
    const radius = THREE.MathUtils.lerp(innerRadius, outerRadius, radial);
    for (let segment = 0; segment <= angularSegments; segment++){
      const angle = segment / angularSegments * TAU;
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      normals.push(0, 0, 1);
      polar.push(radial, angle);
    }
  }
  for (let ring = 0; ring < radialSegments; ring++){
    for (let segment = 0; segment < angularSegments; segment++){
      const a = ring * columns + segment;
      const b = a + columns;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('aPolar', new THREE.Float32BufferAttribute(polar, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  geometry.userData.indexed = true;
  geometry.userData.role = 'turbulent-accretion-annulus';
  return geometry;
}

function createDiskMaterial(profile, radius, opacity){
  const disk = profile.disk;
  return new THREE.ShaderMaterial({
    name: 'BlackHole.AccretionFlowMaterial',
    precision: FRAGMENT_PRECISION,
    uniforms: {
      uTime: { value: 0 },
      uRadius: { value: radius },
      uInnerColor: { value: colorUniform(disk.innerColor) },
      uMidColor: { value: colorUniform(disk.midColor) },
      uOuterColor: { value: colorUniform(disk.outerColor) },
      uOpacity: { value: opacity },
      uBands: { value: disk.bands },
      uSpiral: { value: disk.spiral },
      uTurbulence: { value: disk.turbulence },
      uDoppler: { value: disk.doppler },
      uDopplerAngle: { value: disk.dopplerAngle },
      uCorrugation: { value: disk.corrugation },
    },
    vertexShader: `
      attribute vec2 aPolar;
      uniform float uTime;
      uniform float uRadius;
      uniform float uCorrugation;
      varying vec2 vPolar;

      void main(){
        vPolar = aPolar;
        vec3 displaced = position;
        float edgeGuard = sin(3.14159265 * aPolar.x);
        float waveA = sin(aPolar.y * 5.0 - uTime * 1.3 + aPolar.x * 15.0);
        float waveB = sin(aPolar.y * 11.0 + uTime * 0.7 - aPolar.x * 9.0);
        displaced.z += (waveA * 0.67 + waveB * 0.33)
          * edgeGuard * uCorrugation * uRadius;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }`,
    fragmentShader: `
      precision ${FRAGMENT_PRECISION} float;
      uniform float uTime;
      uniform vec3 uInnerColor;
      uniform vec3 uMidColor;
      uniform vec3 uOuterColor;
      uniform float uOpacity;
      uniform float uBands;
      uniform float uSpiral;
      uniform float uTurbulence;
      uniform float uDoppler;
      uniform float uDopplerAngle;
      varying vec2 vPolar;

      float hash21(vec2 p){
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float noise21(vec2 p){
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
                   mix(hash21(i + vec2(0.0, 1.0)), hash21(i + 1.0), f.x), f.y);
      }
      float fbm(vec2 p){
        float value = 0.0;
        float amplitude = 0.5;
        for (int octave = 0; octave < ${HIGH_TIER ? 4 : 2}; octave++){
          value += noise21(p) * amplitude;
          p = p * 2.03 + vec2(17.1, 9.2);
          amplitude *= 0.5;
        }
        return value;
      }

      void main(){
        float radius = vPolar.x;
        float angle = vPolar.y;
        vec2 seamFree = vec2(cos(angle), sin(angle)) * (2.4 + radius * 1.8);
        float turbulence = fbm(seamFree + vec2(radius * 8.0 - uTime * 0.18,
                                               radius * 3.0 + uTime * 0.11));
        float phase = angle * uSpiral + radius * uBands - uTime * 1.7
                    + (turbulence - 0.5) * 7.0 * uTurbulence;
        float narrowBand = pow(0.5 + 0.5 * sin(phase), 4.0);
        float broadBand = 0.5 + 0.5 * sin(phase * 0.43 + turbulence * 3.0);
        float flow = mix(0.30 + broadBand * 0.45, 0.38 + narrowBand * 0.92,
                         0.55 + uTurbulence * 0.25);
        flow *= mix(0.68, 1.22, turbulence);

        float edge = smoothstep(0.0, 0.035, radius)
                   * (1.0 - smoothstep(0.72, 1.0, radius));
        float midMix = smoothstep(0.0, 0.40, radius);
        vec3 color = mix(uInnerColor, uMidColor, midMix);
        color = mix(color, uOuterColor, smoothstep(0.38, 1.0, radius));
        float innerHeat = 1.0 + 0.72 * exp(-radius * 7.5);

        float approaching = pow(0.5 + 0.5 * cos(angle - uDopplerAngle), 1.6);
        float doppler = mix(1.0 - uDoppler * 0.58,
                            1.0 + uDoppler * 1.55, approaching);
        float alpha = edge * flow * uOpacity;
        if (alpha < 0.003) discard;
        gl_FragColor = vec4(color * innerHeat * doppler, alpha);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

function createLensingMaterial(profile, opacityScale){
  const lens = profile.lensing;
  return new THREE.ShaderMaterial({
    name: 'BlackHole.AnalyticLensingMaterial',
    precision: FRAGMENT_PRECISION,
    uniforms: {
      uTime: { value: 0 },
      uExtent: { value: lens.extent },
      uDiskAngle: { value: 0 },
      uDoppler: { value: profile.disk.doppler },
      uDopplerAngle: { value: profile.disk.dopplerAngle },
      uPhotonRadius: { value: lens.photonRadius },
      uPhotonWidth: { value: lens.photonWidth },
      uPhotonColor: { value: colorUniform(lens.photonColor) },
      uPhotonHotColor: { value: colorUniform(lens.photonHotColor) },
      uPhotonOpacity: { value: lens.photonOpacity * opacityScale },
      uRingFloor: { value: lens.ringFloor },
      uWarpHeight: { value: lens.warpHeight },
      uWarpEdgeHeight: { value: lens.warpEdgeHeight },
      uWarpThickness: { value: lens.warpThickness },
      uWarpExtent: { value: lens.warpExtent },
      uWarpOpacity: { value: lens.warpOpacity * opacityScale },
      uWarpInnerColor: { value: colorUniform(lens.warpInnerColor) },
      uWarpOuterColor: { value: colorUniform(lens.warpOuterColor) },
      uHaloColor: { value: colorUniform(lens.haloColor) },
      uHaloOpacity: { value: lens.haloOpacity * opacityScale },
    },
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      precision ${FRAGMENT_PRECISION} float;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uExtent;
      uniform float uDiskAngle;
      uniform float uDoppler;
      uniform float uDopplerAngle;
      uniform float uPhotonRadius;
      uniform float uPhotonWidth;
      uniform vec3 uPhotonColor;
      uniform vec3 uPhotonHotColor;
      uniform float uPhotonOpacity;
      uniform float uRingFloor;
      uniform float uWarpHeight;
      uniform float uWarpEdgeHeight;
      uniform float uWarpThickness;
      uniform float uWarpExtent;
      uniform float uWarpOpacity;
      uniform vec3 uWarpInnerColor;
      uniform vec3 uWarpOuterColor;
      uniform vec3 uHaloColor;
      uniform float uHaloOpacity;

      float hash21(vec2 p){
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float noise21(vec2 p){
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
                   mix(hash21(i + vec2(0.0, 1.0)), hash21(i + 1.0), f.x), f.y);
      }
      vec2 rotate2(vec2 p, float angle){
        float c = cos(angle), s = sin(angle);
        return vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
      }

      void main(){
        vec2 p = (vUv * 2.0 - 1.0) * uExtent;
        float radius = length(p);
        float polarAngle = atan(p.y, p.x);
        vec2 diskP = rotate2(p, uDiskAngle);

        float side = pow(0.5 + 0.5 * cos(polarAngle - uDiskAngle
                                       - uDopplerAngle), 1.7);
        float ringGain = mix(uRingFloor, 1.0 + uDoppler * 0.85, side);
        float ringDistance = abs(radius - uPhotonRadius);
        float ringCore = 1.0 - smoothstep(uPhotonWidth,
                                          uPhotonWidth * 2.35, ringDistance);
        float ringShoulder = 1.0 - smoothstep(uPhotonWidth * 1.5,
                                              uPhotonWidth * 8.0, ringDistance);
        float ringEnergy = (ringCore + ringShoulder * 0.22)
                         * ringGain * uPhotonOpacity;
        vec3 ringColor = mix(uPhotonColor, uPhotonHotColor, side);

        float xNorm = clamp(abs(diskP.x) / uWarpExtent, 0.0, 1.0);
        float curve = mix(uWarpHeight, uWarpEdgeHeight, xNorm * xNorm);
        float thickness = uWarpThickness * mix(1.0, 0.56, xNorm);
        float upper = 1.0 - smoothstep(thickness, thickness * 2.2,
                                      abs(diskP.y - curve));
        float lower = 1.0 - smoothstep(thickness, thickness * 2.2,
                                      abs(diskP.y + curve));
        float horizontalFade = 1.0 - smoothstep(uWarpExtent * 0.73,
                                                uWarpExtent, abs(diskP.x));
        float outsideShadow = smoothstep(0.92, 1.08, radius);
        float streakNoise = noise21(vec2(diskP.x * 2.7 - uTime * 0.17,
                                         abs(diskP.y) * 9.0 + uTime * 0.08));
        float striation = 0.58 + 0.42 * pow(0.5 + 0.5 *
          sin(diskP.x * 12.0 + streakNoise * 5.0 - uTime * 0.8), 3.0);
        float warp = (upper * 0.92 + lower * 0.58) * horizontalFade
                   * outsideShadow * striation;
        float warpSide = mix(0.62, 1.35 + uDoppler * 0.35,
                             smoothstep(-uWarpExtent, uWarpExtent, diskP.x));
        float warpEnergy = warp * warpSide * uWarpOpacity;
        vec3 warpColor = mix(uWarpInnerColor, uWarpOuterColor,
                             smoothstep(0.12, 1.0, xNorm));

        // An annular shoulder and thin equatorial sheen: never a circular blob.
        float annularHalo = (1.0 - smoothstep(0.10, 0.92,
          abs(radius - uPhotonRadius))) * smoothstep(0.68, 0.94, radius);
        float equatorialHalo = (1.0 - smoothstep(0.16, 0.74, abs(diskP.y)))
          * (1.0 - smoothstep(uWarpExtent * 0.48, uWarpExtent, abs(diskP.x)))
          * smoothstep(0.88, 1.22, radius);
        float haloEnergy = (annularHalo * 0.72 + equatorialHalo * 0.28)
                         * uHaloOpacity;

        float energy = ringEnergy + warpEnergy + haloEnergy;
        if (energy < 0.002) discard;
        vec3 color = (ringColor * ringEnergy + warpColor * warpEnergy
                     + uHaloColor * haloEnergy) / max(energy, 0.001);
        gl_FragColor = vec4(color, clamp(energy, 0.0, 1.0));
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

function layerMetadata(role, profile, quality){
  return {
    blackHoleLayer: role,
    profileId: profile.id,
    qualityTier: quality.textureTier,
    scienceRole: role,
  };
}

/* Options intentionally describe jet context without generating a jet. A
   landmark renderer can attach its own large-scale companion to group using
   group.userData.jetContext.localAxis. */
export function createBlackHoleVisual(options = {}){
  const profile = resolveBlackHoleProfile(options.profile || options.preset);
  const radius = Math.max(0.001, finite(options.radius, 8));
  const diskOpacity = THREE.MathUtils.clamp(
    finite(options.diskOpacity, profile.disk.opacity), 0, 1.5);
  const lensingOpacity = THREE.MathUtils.clamp(
    finite(options.lensingOpacity, 1), 0, 1.5);
  const horizonWidth = HIGH_TIER ? 64 : 40;
  const horizonHeight = HIGH_TIER ? 48 : 28;
  const radialSegments = HIGH_TIER ? 14 : 9;
  const angularSegments = HIGH_TIER ? 160 : 96;
  const quality = Object.freeze({
    textureTier: TEX_TIER,
    horizonSegments: Object.freeze([horizonWidth, horizonHeight]),
    annulusSegments: Object.freeze([radialSegments, angularSegments]),
    noiseOctaves: HIGH_TIER ? 4 : 2,
    textureFree: true,
    webgl: 'WebGL1-compatible GLSL',
  });

  const group = new THREE.Group();
  group.name = options.name || `BlackHoleVisual.${profile.id}`;
  group.userData.blackHoleVisual = true;
  group.userData.profileId = profile.id;
  group.userData.quality = quality;
  group.userData.science = Object.freeze({
    ...profile.science,
    model: 'qualitative relativistic visualization',
    horizon: 'opaque depth-writing event-horizon silhouette',
    lensing: 'analytic photon ring and secondary accretion-disk images',
    caveat: 'Display radii, flow speed, brightness, and colors are illustrative.',
  });

  const horizonMaterial = new THREE.MeshBasicMaterial({
    name: 'BlackHole.EventHorizonMaterial',
    color: 0x000000,
    transparent: false,
    opacity: 1,
    depthTest: true,
    depthWrite: true,
    side: THREE.FrontSide,
    toneMapped: false,
  });
  const horizon = new THREE.Mesh(
    new THREE.SphereGeometry(radius, horizonWidth, horizonHeight), horizonMaterial);
  horizon.name = 'BlackHole.EventHorizon';
  horizon.renderOrder = 1;
  Object.assign(horizon.userData, layerMetadata('event-horizon', profile, quality), {
    trueBlack: true, depthWriting: true,
  });
  group.add(horizon);

  const accretionGeometry = indexedAnnulus(
    profile.disk.inner * radius, profile.disk.outer * radius,
    radialSegments, angularSegments);
  const accretionMaterial = createDiskMaterial(profile, radius, diskOpacity);
  const accretion = new THREE.Mesh(accretionGeometry, accretionMaterial);
  accretion.name = 'BlackHole.AccretionAnnulus';
  accretion.rotation.x = finite(options.diskTilt, profile.disk.tilt);
  accretion.rotation.z = finite(options.diskYaw, profile.disk.yaw);
  accretion.renderOrder = 2;
  Object.assign(accretion.userData,
    layerMetadata('indexed-turbulent-accretion-annulus', profile, quality), {
      indexed: true, dopplerAsymmetry: true, polarBands: true,
    });
  group.add(accretion);

  const lensSize = radius * profile.lensing.extent * 2;
  const lensingMaterial = createLensingMaterial(profile, lensingOpacity);
  const lensing = new THREE.Mesh(
    new THREE.PlaneGeometry(lensSize, lensSize, 1, 1), lensingMaterial);
  lensing.name = 'BlackHole.AnalyticPhotonLensing';
  lensing.renderOrder = 3;
  lensing.frustumCulled = false;
  Object.assign(lensing.userData,
    layerMetadata('analytic-photon-ring-and-warped-disk-images', profile, quality), {
      cameraFacing: true, continuousPhotonRing: true,
      secondaryImages: Object.freeze(['upper-warped-disk', 'lower-warped-disk']),
      haloShape: 'annular-and-equatorial',
    });
  group.add(lensing);

  const pickRadius = Math.max(radius * 1.65, radius * profile.disk.inner);
  const pick = new THREE.Mesh(
    new THREE.SphereGeometry(pickRadius, 16, 10),
    new THREE.MeshBasicMaterial({
      name: 'BlackHole.PickMaterial', color: 0x000000,
      transparent: true, opacity: 0, depthTest: false, depthWrite: false,
    }));
  pick.name = 'BlackHole.PickTarget';
  pick.userData.pickTarget = true;
  pick.userData.body = options.pickBody || null;
  group.add(pick);

  const lightIntensity = Math.max(0,
    finite(options.lightIntensity, profile.light.intensity));
  const light = new THREE.PointLight(profile.light.color, lightIntensity, 0);
  light.name = 'BlackHole.AccretionLight';
  light.decay = 0;
  Object.assign(light.userData, layerMetadata('accretion-context-light', profile, quality), {
    bloomIndependent: true,
  });
  group.add(light);

  const diskNormal = new THREE.Vector3(0, 0, 1).applyEuler(accretion.rotation).normalize();
  const requestedJetContext = options.jetContext || options.jets || false;
  group.userData.jetContext = Object.freeze({
    requested: Boolean(requestedJetContext),
    recommended: profile.jets.recommended,
    externalOnly: true,
    localOrigin: Object.freeze([0, 0, 0]),
    localAxis: Object.freeze(diskNormal.toArray()),
    openingAngle: finite(requestedJetContext.openingAngle, profile.jets.openingAngle),
    color: requestedJetContext.color == null ? profile.jets.color : requestedJetContext.color,
  });

  let elapsed = finite(options.phase, 0);
  let disposed = false;
  const cameraWorld = new THREE.Quaternion();
  const parentWorld = new THREE.Quaternion();
  const diskWorld = new THREE.Quaternion();
  const localBillboard = new THREE.Quaternion();
  const cameraRight = new THREE.Vector3();
  const cameraUp = new THREE.Vector3();
  const diskRight = new THREE.Vector3();

  function update(dt, camera){
    if (disposed) return;
    const step = THREE.MathUtils.clamp(finite(dt, 0), 0, 0.1);
    elapsed = (elapsed + step * profile.disk.speed) % 4096;
    accretionMaterial.uniforms.uTime.value = elapsed;
    lensingMaterial.uniforms.uTime.value = elapsed;

    if (camera && camera.isCamera){
      camera.getWorldQuaternion(cameraWorld);
      group.getWorldQuaternion(parentWorld);
      localBillboard.copy(parentWorld).invert().multiply(cameraWorld);
      lensing.quaternion.copy(localBillboard);

      accretion.getWorldQuaternion(diskWorld);
      cameraRight.set(1, 0, 0).applyQuaternion(cameraWorld);
      cameraUp.set(0, 1, 0).applyQuaternion(cameraWorld);
      diskRight.set(1, 0, 0).applyQuaternion(diskWorld);
      lensingMaterial.uniforms.uDiskAngle.value = Math.atan2(
        diskRight.dot(cameraUp), diskRight.dot(cameraRight));
    }
  }

  function dispose(){
    if (disposed) return;
    disposed = true;
    group.userData.disposed = true;
    group.removeFromParent();
    accretionGeometry.dispose();
    accretionMaterial.dispose();
    lensing.geometry.dispose();
    lensingMaterial.dispose();
    horizon.geometry.dispose();
    horizonMaterial.dispose();
    pick.geometry.dispose();
    pick.material.dispose();
    group.clear();
  }

  const api = { group, horizon, pick, light, update, dispose };
  if (!pick.userData.body) pick.userData.body = api;
  update(0, options.camera);
  return api;
}
