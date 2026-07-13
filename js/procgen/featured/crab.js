/* Crab Nebula: an observation-led 3D exhibit.
   The 1999/2024 Hubble products share one registered presentation plane; Webb
   is a separate infrared wavelength view, never a time-morph target. NASA's
   X-ray-informed GLB is shown as a centered scientific representation rather
   than coordinate-aligned tomography. */

import * as THREE from 'three';
import { mulberry, hashStr, gaussian } from '../../utils/rng.js';
import { detectTier } from '../../core/quality.js';

const HUBBLE_1999 = 'images/crab/hubble-1999.jpg';
const HUBBLE_2024 = 'images/crab/hubble-2024.jpg';
const WEBB_2023 = 'images/crab/webb-2023.jpg';
const XRAY_MODEL = 'models/crab/crab-nebula.glb';
const DRACO_DECODER =
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/';

const HUBBLE_SIZE = 3864;
const WEBB_ASPECT = 4000 / 3483;
const PHOTO_HEIGHT = 80;
const HUBBLE_WIDTH = PHOTO_HEIGHT;
const WEBB_WIDTH = PHOTO_HEIGHT * WEBB_ASPECT;
const MODEL_CREDIT = '3D model: NASA/Francis J. Summers; NASA/Robert L. Hurt';
const IMAGE_CREDIT = 'Hubble 1999/2024: NASA, ESA, STScI, W. Blair; processing J. DePasquale · Webb: NASA, ESA, CSA, STScI, T. Temim · 3D: NASA/F. Summers, R. Hurt';

const STATES = Object.freeze({
  SUPERNOVA: 'crab.supernova-flash',
  DISCOVERY: 'crab.optical-discovery',
  BACKTRACE: 'crab.expansion-backtrace',
  PULSAR: 'crab.pulsar-engine',
  WEBB: 'crab.webb-infrared',
  EXPANSION: 'crab.hubble-expansion-1999-2024',
});

const PRESETS = Object.freeze({
  [STATES.SUPERNOVA]: {
    hubble: .05, webb: 0, epoch: 0, compare: 0, saturation: 1.04,
    exposure: .58, surfels: .28, stars: .10, webbStars: 0, backtrace: .72,
    filaments: .18, clouds: .82, flash: 1, engine: 0, model: 0,
  },
  [STATES.DISCOVERY]: {
    hubble: .92, webb: 0, epoch: 0, compare: 0, saturation: .76,
    exposure: .52, surfels: .24, stars: .46, webbStars: 0, backtrace: 0,
    filaments: .30, clouds: .46, flash: 0, engine: 0, model: 0,
  },
  [STATES.BACKTRACE]: {
    hubble: .96, webb: 0, epoch: 0, compare: 0, saturation: 1.02,
    exposure: .86, surfels: .88, stars: .66, webbStars: 0, backtrace: .78,
    filaments: .72, clouds: .62, flash: 0, engine: 0, model: 0,
  },
  [STATES.PULSAR]: {
    hubble: .24, webb: 0, epoch: .58, compare: 0, saturation: 1.08,
    exposure: .70, surfels: .42, stars: .28, webbStars: 0, backtrace: 0,
    filaments: .44, clouds: .48, flash: 0, engine: 1, model: 1,
  },
  [STATES.WEBB]: {
    hubble: 0, webb: 1, epoch: 1, compare: 0, saturation: 1.10,
    exposure: 1.02, surfels: .70, stars: 0, webbStars: .82, backtrace: 0,
    filaments: .86, clouds: .86, flash: 0, engine: .18, model: 0,
  },
  [STATES.EXPANSION]: {
    hubble: 1, webb: 0, epoch: .5, compare: 1, saturation: 1.08,
    exposure: .98, surfels: .80, stars: .82, webbStars: 0, backtrace: 0,
    filaments: .74, clouds: .64, flash: 0, engine: 0, model: 0,
  },
});

function damp(value, target, speed, dt){
  return THREE.MathUtils.lerp(value, target, 1 - Math.exp(-speed * dt));
}

function stateFromVisual(visual){
  const raw = typeof visual === 'string'
    ? visual
    : visual && (visual.state || visual.moment || visual.id);
  if (raw && Object.values(STATES).includes(raw)) return raw;
  const value = String(raw || '').toLowerCase();
  if (/1054|supernova|flash/.test(value)) return STATES.SUPERNOVA;
  if (/1731|found|discover|optical/.test(value)) return STATES.DISCOVERY;
  if (/1928|linked|backtrace|inference/.test(value)) return STATES.BACKTRACE;
  if (/1968|pulsar|engine/.test(value)) return STATES.PULSAR;
  if (/2023|webb|infrared/.test(value)) return STATES.WEBB;
  if (/2026|hubble|expansion|1999-2024/.test(value)) return STATES.EXPANSION;
  if (visual && visual.wavelength === 'infrared') return STATES.WEBB;
  return STATES.EXPANSION;
}

function solidTexture(color){
  const c = new THREE.Color(color);
  const data = new Uint8Array([
    Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255), 255,
  ]);
  const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function softTexture(){
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,.96)');
  gradient.addColorStop(.18, 'rgba(255,255,255,.64)');
  gradient.addColorStop(.52, 'rgba(255,255,255,.16)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function makeHubbleMaterial(texture1999, texture2024){
  return new THREE.ShaderMaterial({
    uniforms: {
      u1999: { value: texture1999 },
      u2024: { value: texture2024 },
      uReady1999: { value: 0 },
      uReady2024: { value: 0 },
      uEpoch: { value: .5 },
      uCompare: { value: 1 },
      uCurtain: { value: .5 },
      uSaturation: { value: 1 },
      uExposure: { value: 1 },
      uOpacity: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D u1999;
      uniform sampler2D u2024;
      uniform float uReady1999;
      uniform float uReady2024;
      uniform float uEpoch;
      uniform float uCompare;
      uniform float uCurtain;
      uniform float uSaturation;
      uniform float uExposure;
      uniform float uOpacity;
      varying vec2 vUv;
      void main(){
        vec3 earlier = texture2D(u1999, vUv).rgb;
        vec3 later = texture2D(u2024, vUv).rgb;
        if (uReady1999 < .5) earlier = later;
        if (uReady2024 < .5) later = earlier;
        float side = smoothstep(uCurtain-.006, uCurtain+.006, vUv.x);
        vec3 dissolved = mix(earlier, later, uEpoch);
        vec3 registered = mix(earlier, later, side);
        vec3 color = mix(dissolved, registered, uCompare);
        float light = dot(color, vec3(.2126, .7152, .0722));
        color = mix(vec3(light), color, uSaturation) * uExposure;
        gl_FragColor = vec4(color, uOpacity);
      }`,
  });
}

function makeWebbMaterial(texture){
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uReady: { value: 0 },
      uSaturation: { value: 1 },
      uExposure: { value: 1 },
      uOpacity: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uReady;
      uniform float uSaturation;
      uniform float uExposure;
      uniform float uOpacity;
      varying vec2 vUv;
      void main(){
        vec3 color = texture2D(uMap, vUv).rgb;
        float light = dot(color, vec3(.2126, .7152, .0722));
        color = mix(vec3(light), color, uSaturation) * uExposure;
        gl_FragColor = vec4(color, uOpacity * mix(.24, 1.0, uReady));
      }`,
  });
}

function imagePixels(image, width, height, blur = 0){
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (blur) ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(image, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height).data;
}

function textureSource(image, maxLongSide){
  const longest = Math.max(image.naturalWidth || image.width,
    image.naturalHeight || image.height);
  if (longest <= maxLongSide) return image;
  const scale = maxLongSide/longest;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth*scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight*scale));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function luminancePixels(pixels){
  const result = new Float32Array(pixels.length / 4);
  for (let i = 0; i < result.length; i++){
    const q = i * 4;
    result[i] = (.2126*pixels[q] + .7152*pixels[q+1] + .0722*pixels[q+2]) / 255;
  }
  return result;
}

function sampledColor(pixels, offset, saturationBoost = 1.18){
  let red = pixels[offset] / 255;
  let green = pixels[offset+1] / 255;
  let blue = pixels[offset+2] / 255;
  const light = .2126*red + .7152*green + .0722*blue;
  red = THREE.MathUtils.clamp(light + (red-light)*saturationBoost, 0, 1);
  green = THREE.MathUtils.clamp(light + (green-light)*saturationBoost, 0, 1);
  blue = THREE.MathUtils.clamp(light + (blue-light)*saturationBoost, 0, 1);
  return new THREE.Color(red, green, blue).convertSRGBToLinear();
}

function starCandidates(imageA, imageB, width, height){
  const sharpA = imagePixels(imageA, width, height);
  const sharpB = imagePixels(imageB || imageA, width, height);
  const softA = imagePixels(imageA, width, height, 3.2);
  const softB = imagePixels(imageB || imageA, width, height, 3.2);
  const lumA = luminancePixels(sharpA);
  const lumB = luminancePixels(sharpB);
  const blurA = luminancePixels(softA);
  const blurB = luminancePixels(softB);
  const candidates = [];

  for (let y = 2; y < height-2; y++){
    for (let x = 2; x < width-2; x++){
      const q = y*width+x;
      const lightA = lumA[q], lightB = lumB[q];
      const contrastA = lightA-blurA[q], contrastB = lightB-blurB[q];
      // Requiring a compact peak in both registered Hubble frames rejects
      // moving filament knots while keeping stable background stars.
      if (imageB && (Math.min(contrastA, contrastB) < .045 ||
          Math.min(lightA, lightB) < .26)) continue;
      if (!imageB && (contrastA < .075 || lightA < .34)) continue;
      const score = imageB
        ? Math.min(contrastA, contrastB) + Math.min(lightA, lightB)*.16
        : contrastA + lightA*.16;
      let localMax = true;
      const peak = imageB ? Math.min(lightA, lightB) : lightA;
      for (let dy = -2; dy <= 2 && localMax; dy++){
        for (let dx = -2; dx <= 2; dx++){
          if (!dx && !dy) continue;
          const n = (y+dy)*width+x+dx;
          const other = imageB ? Math.min(lumA[n], lumB[n]) : lumA[n];
          if (other > peak){ localMax = false; break; }
        }
      }
      if (localMax) candidates.push({ x, y, score });
    }
  }
  candidates.sort((a, b) => b.score-a.score);
  return { candidates, pixelsA: sharpA, pixelsB: sharpB };
}

function selectSeparated(candidates, limit, radiusSq){
  const selected = [];
  for (const candidate of candidates){
    if (selected.some(other => {
      const dx = candidate.x-other.x, dy = candidate.y-other.y;
      return dx*dx+dy*dy < radiusSq;
    })) continue;
    selected.push(candidate);
    if (selected.length >= limit) break;
  }
  return selected;
}

function buildRegisteredStars(root, image1999, image2024, budget, uniforms, seed){
  const width = budget.sample;
  const height = width;
  const sampled = starCandidates(image1999, image2024, width, height);
  const selected = selectSeparated(sampled.candidates, budget.stars, 13);
  if (!selected.length) return null;

  const rnd = mulberry(hashStr(seed));
  const positions = new Float32Array(selected.length*3);
  const colors1999 = new Float32Array(selected.length*3);
  const colors2024 = new Float32Array(selected.length*3);
  const sizes = new Float32Array(selected.length);
  const uvx = new Float32Array(selected.length);
  for (let i = 0; i < selected.length; i++){
    const star = selected[i];
    const u = star.x/(width-1), v = star.y/(height-1);
    positions[i*3] = (u-.5)*HUBBLE_WIDTH;
    positions[i*3+1] = (.5-v)*PHOTO_HEIGHT;
    positions[i*3+2] = -8-rnd()*50;
    const offset = (star.y*width+star.x)*4;
    const a = sampledColor(sampled.pixelsA, offset, 1.28);
    const b = sampledColor(sampled.pixelsB, offset, 1.28);
    colors1999.set([a.r, a.g, a.b], i*3);
    colors2024.set([b.r, b.g, b.b], i*3);
    sizes[i] = 2.3+Math.min(7.2, star.score*19);
    uvx[i] = u;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor1999', new THREE.BufferAttribute(colors1999, 3));
  geometry.setAttribute('aColor2024', new THREE.BufferAttribute(colors2024, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aUvX', new THREE.BufferAttribute(uvx, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uOrbit: uniforms.uOrbit,
      uOpacity: uniforms.uStarOpacity,
      uEpoch: uniforms.uEpoch,
      uCompare: uniforms.uCompare,
      uCurtain: uniforms.uCurtain,
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aColor1999;
      attribute vec3 aColor2024;
      attribute float aSize;
      attribute float aUvX;
      uniform float uOrbit;
      uniform float uOpacity;
      uniform float uEpoch;
      uniform float uCompare;
      uniform float uCurtain;
      varying vec3 vColor;
      varying float vOpacity;
      void main(){
        float side = smoothstep(uCurtain-.006, uCurtain+.006, aUvX);
        float epoch = mix(uEpoch, side, uCompare);
        vColor = mix(aColor1999, aColor2024, epoch);
        vOpacity = uOpacity * mix(.14, 1.0, uOrbit);
        vec3 p = position;
        p.z *= uOrbit;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * clamp(94.0/max(38.0, -mv.z), .72, 2.2);
      }`,
    fragmentShader: `
      varying vec3 vColor;
      varying float vOpacity;
      void main(){
        vec2 p = abs(gl_PointCoord*2.0-1.0);
        float r = length(p);
        if (r > 1.0) discard;
        float halo = pow(max(0.0, 1.0-r), 1.45);
        float core = pow(max(0.0, 1.0-r), 5.5);
        float rays = (exp(-p.x*22.0)*pow(1.0-p.y, 4.0) +
                      exp(-p.y*22.0)*pow(1.0-p.x, 4.0))*.17;
        vec3 color = vColor*(halo*.82+core*.72) + vec3(core*.10);
        gl_FragColor = vec4(color, vOpacity*(halo+rays));
      }`,
  });
  const stars = new THREE.Points(geometry, material);
  stars.name = 'registered-colored-hubble-stars';
  stars.renderOrder = 8;
  root.add(stars);
  return { stars, count: selected.length };
}

function buildWebbStars(root, image, budget, uniforms, seed){
  const width = budget.sample;
  const height = Math.max(2, Math.round(width/WEBB_ASPECT));
  const sampled = starCandidates(image, null, width, height);
  const selected = selectSeparated(sampled.candidates, budget.webbStars, 12);
  if (!selected.length) return null;

  const rnd = mulberry(hashStr(seed));
  const positions = new Float32Array(selected.length*3);
  const colors = new Float32Array(selected.length*3);
  const sizes = new Float32Array(selected.length);
  for (let i = 0; i < selected.length; i++){
    const star = selected[i];
    const u = star.x/(width-1), v = star.y/(height-1);
    positions[i*3] = (u-.5)*WEBB_WIDTH;
    positions[i*3+1] = (.5-v)*PHOTO_HEIGHT;
    positions[i*3+2] = -7-rnd()*48;
    const offset = (star.y*width+star.x)*4;
    const color = sampledColor(sampled.pixelsA, offset, 1.32);
    colors.set([color.r, color.g, color.b], i*3);
    sizes[i] = 2.2+Math.min(7.5, star.score*18);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uOrbit: uniforms.uOrbit, uOpacity: uniforms.uWebbStarOpacity },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    vertexShader: `
      attribute float aSize;
      uniform float uOrbit;
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vOpacity;
      void main(){
        vColor = color;
        vOpacity = uOpacity*mix(.14, 1.0, uOrbit);
        vec3 p = position;
        p.z *= uOrbit;
        vec4 mv = modelViewMatrix*vec4(p, 1.0);
        gl_Position = projectionMatrix*mv;
        gl_PointSize = aSize*clamp(94.0/max(38.0, -mv.z), .72, 2.2);
      }`,
    fragmentShader: `
      varying vec3 vColor;
      varying float vOpacity;
      void main(){
        vec2 p = abs(gl_PointCoord*2.0-1.0);
        float r = length(p);
        if (r > 1.0) discard;
        float halo = pow(max(0.0, 1.0-r), 1.4);
        float core = pow(max(0.0, 1.0-r), 5.0);
        float rays = (exp(-p.x*20.0)*pow(1.0-p.y, 4.0) +
                      exp(-p.y*20.0)*pow(1.0-p.x, 4.0))*.16;
        gl_FragColor = vec4(vColor*(halo+core*.58), vOpacity*(halo+rays));
      }`,
  });
  const stars = new THREE.Points(geometry, material);
  stars.name = 'aligned-colored-webb-stars';
  stars.renderOrder = 9;
  root.add(stars);
  return { stars, count: selected.length };
}

function buildHubbleSurfels(root, image1999, image2024, budget, uniforms, seed){
  const width = budget.surfelSample;
  const height = width;
  const pixels1999 = imagePixels(image1999, width, height);
  const pixels2024 = imagePixels(image2024, width, height);
  const lum = luminancePixels(pixels2024);
  const rnd = mulberry(hashStr(seed));
  const candidates = [];

  for (let y = 1; y < height-1; y++){
    for (let x = 1; x < width-1; x++){
      const q = y*width+x;
      const light = lum[q];
      if (light < .035) continue;
      const offset = q*4;
      const max = Math.max(pixels2024[offset], pixels2024[offset+1], pixels2024[offset+2]);
      const min = Math.min(pixels2024[offset], pixels2024[offset+1], pixels2024[offset+2]);
      const saturation = max ? (max-min)/max : 0;
      const edge = Math.abs(lum[q-1]-lum[q+1])+
        Math.abs(lum[q-width]-lum[q+width]);
      // Very bright neutral compact sources belong to the aligned star layer.
      if (light > .76 && saturation < .13 && edge > .16) continue;
      const score = edge*1.7+saturation*.38+Math.sqrt(light)*.24;
      if (score < .12) continue;
      candidates.push({ x, y, score: score*(.82+rnd()*.36) });
    }
  }
  candidates.sort((a, b) => b.score-a.score);
  const selected = candidates.slice(0, budget.surfels);
  if (!selected.length) return null;

  const positions = new Float32Array(selected.length*3);
  const colors1999 = new Float32Array(selected.length*3);
  const colors2024 = new Float32Array(selected.length*3);
  const sizes = new Float32Array(selected.length);
  const uvx = new Float32Array(selected.length);
  for (let i = 0; i < selected.length; i++){
    const point = selected[i];
    const u = point.x/(width-1), v = point.y/(height-1);
    const nx = u*2-1, ny = (1-v)*2-1;
    const radius = Math.min(1, Math.hypot(nx, ny));
    positions[i*3] = (u-.5)*HUBBLE_WIDTH;
    positions[i*3+1] = (.5-v)*PHOTO_HEIGHT;
    positions[i*3+2] = gaussian(rnd)*(4+14*(1-radius*.58));
    const offset = (point.y*width+point.x)*4;
    const a = sampledColor(pixels1999, offset, 1.22);
    const b = sampledColor(pixels2024, offset, 1.22);
    colors1999.set([a.r, a.g, a.b], i*3);
    colors2024.set([b.r, b.g, b.b], i*3);
    sizes[i] = .72+Math.min(2.8, point.score*2.5)+rnd()*.45;
    uvx[i] = u;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor1999', new THREE.BufferAttribute(colors1999, 3));
  geometry.setAttribute('aColor2024', new THREE.BufferAttribute(colors2024, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aUvX', new THREE.BufferAttribute(uvx, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uOrbit: uniforms.uOrbit,
      uOpacity: uniforms.uSurfelOpacity,
      uEpoch: uniforms.uEpoch,
      uCompare: uniforms.uCompare,
      uCurtain: uniforms.uCurtain,
      uBacktrace: uniforms.uBacktrace,
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aColor1999;
      attribute vec3 aColor2024;
      attribute float aSize;
      attribute float aUvX;
      uniform float uOrbit;
      uniform float uOpacity;
      uniform float uEpoch;
      uniform float uCompare;
      uniform float uCurtain;
      uniform float uBacktrace;
      varying vec3 vColor;
      varying float vOpacity;
      void main(){
        float side = smoothstep(uCurtain-.006, uCurtain+.006, aUvX);
        float epoch = mix(uEpoch, side, uCompare);
        vColor = mix(aColor1999, aColor2024, epoch);
        vOpacity = uOpacity*mix(.16, 1.0, uOrbit);
        vec3 p = position;
        p.xy *= mix(1.0, .70, uBacktrace);
        p.z *= mix(uOrbit, uOrbit*.35, uBacktrace);
        vec4 mv = modelViewMatrix*vec4(p, 1.0);
        gl_Position = projectionMatrix*mv;
        gl_PointSize = aSize*clamp(94.0/max(34.0, -mv.z), .74, 2.4);
      }`,
    fragmentShader: `
      varying vec3 vColor;
      varying float vOpacity;
      void main(){
        float r = length(gl_PointCoord*2.0-1.0);
        if (r > 1.0) discard;
        float alpha = pow(max(0.0, 1.0-r), 1.7);
        gl_FragColor = vec4(vColor*(.62+alpha*.55), vOpacity*alpha);
      }`,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'registered-hubble-filament-surfels';
  points.renderOrder = 5;
  root.add(points);
  return { points, count: selected.length };
}

function buildFilamentRibbons(root, rnd, count, uniforms){
  const positions = [], colorsHubble = [], colorsWebb = [];
  const phases = [], opacities = [], uvs = [], indices = [];
  const hubblePalette = [0x57cbd2, 0xf27782, 0xf4ad62, 0x9a74d8];
  const webbPalette = [0x4c6df2, 0xdc3f87, 0xf05c32, 0xf3a448];

  function appendStrip(points, width, colorHubble, colorWebb, phase, opacity, axis){
    const base = positions.length/3;
    for (let j = 0; j < points.length; j++){
      const t = j/(points.length-1);
      const taper = .16+.84*Math.pow(Math.sin(Math.PI*t), .46);
      for (let side = -1; side <= 1; side += 2){
        const point = points[j];
        positions.push(
          point.x+(axis === 0 ? side*width*taper : 0),
          point.y+(axis === 1 ? side*width*taper : 0),
          point.z+(axis === 2 ? side*width*taper : 0),
        );
        uvs.push(side < 0 ? 0 : 1, t);
        colorsHubble.push(colorHubble.r, colorHubble.g, colorHubble.b);
        colorsWebb.push(colorWebb.r, colorWebb.g, colorWebb.b);
        phases.push(phase);
        opacities.push(opacity);
      }
    }
    for (let j = 0; j < points.length-1; j++){
      const a = base+j*2, b = a+1, c = a+2, d = a+3;
      indices.push(a, b, c, b, d, c);
    }
  }

  for (let i = 0; i < count; i++){
    const angle = rnd()*Math.PI*2;
    const latitude = (rnd()-.5)*1.35;
    const phase = rnd()*Math.PI*2;
    const points = [];
    const steps = 20;
    const span = .42+rnd()*.72;
    const verticalSpan = 13+rnd()*18;
    for (let j = 0; j < steps; j++){
      const t = j/(steps-1)-.5;
      const a = angle+t*span+Math.sin(t*8+phase)*.035;
      const swell = 1+Math.sin(t*Math.PI+phase)*.08;
      points.push(new THREE.Vector3(
        Math.cos(a)*38*swell,
        latitude*34+t*verticalSpan+Math.sin(t*9+phase)*1.4,
        Math.sin(a)*22*swell+Math.cos(t*7+phase)*2.0,
      ));
    }
    const hubble = new THREE.Color(hubblePalette[i%hubblePalette.length]);
    const webb = new THREE.Color(webbPalette[(i+1)%webbPalette.length]);
    const width = .34+rnd()*.72;
    appendStrip(points, width, hubble, webb, phase, .13+rnd()*.14, i%3);
    appendStrip(points, width*.68, hubble, webb, phase+.8, .08+rnd()*.10, (i+1)%3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('aColorHubble', new THREE.Float32BufferAttribute(colorsHubble, 3));
  geometry.setAttribute('aColorWebb', new THREE.Float32BufferAttribute(colorsWebb, 3));
  geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
  geometry.setAttribute('aOpacity', new THREE.Float32BufferAttribute(opacities, 1));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: uniforms.uFilamentOpacity,
      uWebb: uniforms.uWebbMix,
      uTime: uniforms.uTime,
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aColorHubble;
      attribute vec3 aColorWebb;
      attribute float aPhase;
      attribute float aOpacity;
      varying vec2 vUv;
      varying vec3 vColorHubble;
      varying vec3 vColorWebb;
      varying float vPhase;
      varying float vOpacity;
      void main(){
        vUv = uv;
        vColorHubble = aColorHubble;
        vColorWebb = aColorWebb;
        vPhase = aPhase;
        vOpacity = aOpacity;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uOpacity;
      uniform float uWebb;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vColorHubble;
      varying vec3 vColorWebb;
      varying float vPhase;
      varying float vOpacity;
      float hash12(vec2 p){
        vec3 p3 = fract(vec3(p.xyx)*.1031);
        p3 += dot(p3, p3.yzx+33.33);
        return fract((p3.x+p3.y)*p3.z);
      }
      void main(){
        float edge = pow(max(0.0, sin(vUv.x*3.14159265)), .72);
        float ends = smoothstep(0.0, .075, vUv.y)*smoothstep(0.0, .075, 1.0-vUv.y);
        float flow = .58+.42*sin(vUv.y*42.0-uTime*.22+vPhase);
        float grain = hash12(floor(vUv*vec2(15.0, 72.0))+vPhase);
        float torn = .18+.82*smoothstep(.24, .80, grain+flow*.25);
        vec3 color = mix(vColorHubble, vColorWebb, uWebb)*(.64+flow*.58);
        gl_FragColor = vec4(color, uOpacity*vOpacity*edge*ends*torn);
      }`,
  });
  const ribbons = new THREE.Mesh(geometry, material);
  ribbons.name = 'colored-gas-filament-ribbons';
  ribbons.renderOrder = 4;
  root.add(ribbons);
  return { ribbons, material };
}

function buildAtmosphere(root, rnd, count, texture){
  const clouds = [];
  const hubbleColors = [0x183b7b, 0x7d294f, 0xb65f36, 0x246977, 0x5b347b];
  const webbColors = [0x243f9a, 0xa62174, 0xe34a2f, 0xec963c, 0x493284];
  for (let i = 0; i < count; i++){
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: hubbleColors[i%hubbleColors.length],
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(material);
    const radius = 13+Math.pow(rnd(), .62)*39;
    const angle = rnd()*Math.PI*2;
    sprite.position.set(
      Math.cos(angle)*radius+(rnd()-.5)*10,
      (rnd()-.5)*62,
      Math.sin(angle)*25+(rnd()-.5)*16,
    );
    const size = 13+rnd()*27;
    sprite.scale.set(size, size*(.58+rnd()*.62), 1);
    material.rotation = rnd()*Math.PI;
    clouds.push({
      sprite,
      material,
      opacity: .018+rnd()*.038,
      hubble: new THREE.Color(hubbleColors[i%hubbleColors.length]),
      webb: new THREE.Color(webbColors[(i+2)%webbColors.length]),
    });
    root.add(sprite);
  }
  return clouds;
}

function buildSupernova(root, rnd, count, glowTexture){
  const positions = new Float32Array(count*3);
  const colors = new Float32Array(count*3);
  const warm = new THREE.Color(0xffb45e);
  const cool = new THREE.Color(0x69bfff);
  for (let i = 0; i < count; i++){
    const u = rnd()*2-1, angle = rnd()*Math.PI*2;
    const s = Math.sqrt(1-u*u);
    const radius = .82+Math.pow(rnd(), 4)*.22;
    positions[i*3] = s*Math.cos(angle)*radius;
    positions[i*3+1] = u*radius;
    positions[i*3+2] = s*Math.sin(angle)*radius;
    const color = warm.clone().lerp(cool, rnd()*.52);
    colors.set([color.r, color.g, color.b], i*3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: .72,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    map: glowTexture,
    alphaTest: .015,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const shell = new THREE.Points(geometry, material);
  shell.name = 'illustrative-supernova-ejecta';
  root.add(shell);

  const shockMaterial = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color(0x5baee9) } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main(){
        vec4 mv = modelViewMatrix*vec4(position, 1.0);
        vNormal = normalize(normalMatrix*normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: `
      uniform float uOpacity;
      uniform vec3 uColor;
      varying vec3 vNormal;
      varying vec3 vView;
      void main(){
        float rim = pow(1.0-abs(dot(normalize(vNormal), normalize(vView))), 3.0);
        gl_FragColor = vec4(uColor*(.45+rim), uOpacity*rim);
      }`,
  });
  const shock = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 28), shockMaterial);
  shock.name = 'illustrative-shock-front';
  root.add(shock);

  const flashMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xffd9a2,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const flash = new THREE.Sprite(flashMaterial);
  flash.name = 'illustrative-supernova-flash';
  root.add(flash);
  return { shell, material, shock, shockMaterial, flash, flashMaterial };
}

function buildPulsarEngine(root, glowTexture){
  const group = new THREE.Group();
  group.name = 'pulsar-engine-context';
  group.rotation.set(.42, -.28, .12);
  root.add(group);
  const materials = [];

  function additiveMaterial(color, opacity){
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    material.userData.baseOpacity = opacity;
    materials.push(material);
    return material;
  }

  const torusMaterial = additiveMaterial(0x5c8fff, .64);
  const torus = new THREE.Mesh(new THREE.TorusGeometry(8.5, .34, 14, 128), torusMaterial);
  group.add(torus);
  const outerMaterial = additiveMaterial(0x9a62eb, .30);
  const outer = new THREE.Mesh(new THREE.TorusGeometry(13, .25, 12, 128), outerMaterial);
  outer.scale.y = .72;
  group.add(outer);

  const jetMaterial = additiveMaterial(0x54b9ff, .34);
  for (const direction of [-1, 1]){
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(.18, 1.25, 30, 24, 1, true), jetMaterial);
    jet.rotation.x = Math.PI/2;
    jet.position.z = direction*15;
    if (direction < 0) jet.rotation.y = Math.PI;
    group.add(jet);
  }

  const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xe9f3ff });
  coreMaterial.userData.baseOpacity = 1;
  coreMaterial.transparent = true;
  coreMaterial.opacity = 0;
  materials.push(coreMaterial);
  const core = new THREE.Mesh(new THREE.SphereGeometry(.75, 24, 16), coreMaterial);
  group.add(core);

  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0x7eb9ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  glowMaterial.userData.baseOpacity = .78;
  materials.push(glowMaterial);
  const glow = new THREE.Sprite(glowMaterial);
  glow.scale.set(9, 9, 1);
  group.add(glow);
  return { group, materials, core, torus, outer, glow };
}

function disposeMaterial(material){
  if (!material) return;
  const materials = Array.isArray(material) ? material : [material];
  for (const value of materials){
    for (const key of Object.keys(value)){
      const candidate = value[key];
      if (candidate && candidate.isTexture) candidate.dispose();
    }
    value.dispose();
  }
}

function disposeDetachedObject(root){
  if (!root) return;
  const geometries = new Set(), materials = new Set();
  root.traverse(object => {
    if (object.geometry && !geometries.has(object.geometry)){
      geometries.add(object.geometry);
      object.geometry.dispose();
    }
    const list = Array.isArray(object.material) ? object.material :
      (object.material ? [object.material] : []);
    for (const material of list){
      if (materials.has(material)) continue;
      materials.add(material);
      disposeMaterial(material);
    }
  });
}

export function buildCrabFeatured({ entry }){
  const group = new THREE.Group();
  group.name = 'crab-nebula-dedicated-exhibit';
  const tier = detectTier().tier;
  const low = tier === 'low';
  const budget = low
    ? { sample: 190, surfelSample: 150, stars: 70, webbStars: 85,
        surfels: 6200, filaments: 18, clouds: 24, ejecta: 900,
        textureLongSide: 2048 }
    : { sample: 310, surfelSample: 248, stars: 170, webbStars: 210,
        surfels: 16800, filaments: 42, clouds: 52, ejecta: 2400,
        textureLongSide: 4096 };
  const rnd = mulberry(hashStr('crab-dedicated:' + entry.id));
  let disposed = false;
  let modelGeneration = 0;
  let modelStarted = false;
  let modelRoot = null;
  let modelMaterial = null;
  let dracoLoader = null;
  let time = 0;
  let flashAge = 0;
  let activeState = STATES.EXPANSION;
  let previousNonWebbState = STATES.EXPANSION;

  const ownedTextures = new Set();
  const pendingImages = new Set();
  const hubble1999Fallback = solidTexture(0x39172a);
  const hubble2024Fallback = solidTexture(0x18324d);
  const webbFallback = solidTexture(0x341c4d);
  const glowTexture = softTexture();
  ownedTextures.add(hubble1999Fallback);
  ownedTextures.add(hubble2024Fallback);
  ownedTextures.add(webbFallback);

  const hubbleMaterial = makeHubbleMaterial(hubble1999Fallback, hubble2024Fallback);
  const webbMaterial = makeWebbMaterial(webbFallback);
  const hubblePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(HUBBLE_WIDTH, PHOTO_HEIGHT), hubbleMaterial);
  hubblePlane.name = 'registered-hubble-1999-2024-observation';
  hubblePlane.renderOrder = 1;
  group.add(hubblePlane);
  const webbPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(WEBB_WIDTH, PHOTO_HEIGHT), webbMaterial);
  webbPlane.name = 'webb-2023-infrared-observation';
  webbPlane.position.z = .025;
  webbPlane.renderOrder = 2;
  group.add(webbPlane);

  const sharedUniforms = {
    uOrbit: { value: 0 },
    uEpoch: hubbleMaterial.uniforms.uEpoch,
    uCompare: hubbleMaterial.uniforms.uCompare,
    uCurtain: hubbleMaterial.uniforms.uCurtain,
    uStarOpacity: { value: .82 },
    uWebbStarOpacity: { value: 0 },
    uSurfelOpacity: { value: .80 },
    uBacktrace: { value: 0 },
    uFilamentOpacity: { value: .74 },
    uWebbMix: { value: 0 },
    uTime: { value: 0 },
  };

  const clouds = buildAtmosphere(group, rnd, budget.clouds, glowTexture);
  const filaments = buildFilamentRibbons(group, rnd, budget.filaments, sharedUniforms);
  const supernova = buildSupernova(group, rnd, budget.ejecta, glowTexture);
  const engine = buildPulsarEngine(group, glowTexture);
  const modelAnchor = new THREE.Group();
  modelAnchor.name = 'official-xray-informed-model-anchor';
  group.add(modelAnchor);

  let hubble1999Image = null;
  let hubble2024Image = null;
  let hubbleLayersBuilt = false;
  let webbStarsBuilt = false;

  const current = { ...PRESETS[activeState] };
  let target = { ...current };

  group.userData.renderer = 'crab-observation-volume-v1';
  group.userData.activeState = activeState;
  group.userData.qualityTier = tier;
  group.userData.qualityBudget = { ...budget };
  group.userData.modelStatus = 'idle';
  group.userData.assets = {
    hubble1999: HUBBLE_1999,
    hubble2024: HUBBLE_2024,
    webb2023: WEBB_2023,
    xrayModel: XRAY_MODEL,
  };
  group.userData.scientificSemantics = {
    [STATES.SUPERNOVA]: 'Illustrative reconstruction; no telescope image of the 1054 event.',
    [STATES.DISCOVERY]: 'Later Hubble data used as an illustrative optical view, not a 1731 image.',
    [STATES.BACKTRACE]: 'Radial back-trace is an inference display, not recovered 1928 imagery.',
    [STATES.PULSAR]: 'NASA X-ray-informed 3D representation; not tomography or astrometric geometry.',
    [STATES.WEBB]: 'Infrared wavelength comparison; never interpolated as a time epoch.',
    [STATES.EXPANSION]: 'Registered matched-color 1999/2024 comparison; WFPC2 and WFC3 differ.',
  };
  group.userData.registration = {
    hubble: {
      temporal: true,
      dimensions: [HUBBLE_SIZE, HUBBLE_SIZE],
      method: 'Official matched presentation coordinates; stable stars share normalized pixels.',
      caveat: 'Different instruments: 1999 WFPC2 and 2024 WFC3.',
    },
    webb: {
      temporal: false,
      dimensions: [4000, 3483],
      method: 'Independent native-aspect observation plane with independently aligned stars.',
      caveat: 'Different wavelength bands and crop; not morphed into Hubble epochs.',
    },
    model: 'Centered and scaled for explanation only; not coordinate-aligned to either image.',
  };
  group.userData.pulsarAnimation =
    'Visual motion is deliberately slow; the physical ~30 Hz pulse is not flashed onscreen.';

  function noteAssetError(asset, error){
    const errors = group.userData.assetErrors || (group.userData.assetErrors = {});
    errors[asset] = error && error.message ? error.message : 'load failed';
  }

  function loadImageTexture(url, onLoad){
    const image = new Image();
    let settled = false;
    const cancel = () => {
      if (settled) return;
      settled = true;
      pendingImages.delete(cancel);
      image.onload = null;
      image.onerror = null;
      image.src = '';
    };
    pendingImages.add(cancel);
    image.decoding = 'async';
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (settled) return;
      settled = true;
      pendingImages.delete(cancel);
      image.onload = null;
      image.onerror = null;
      if (disposed) return;
      const texture = new THREE.Texture(textureSource(image, budget.textureLongSide));
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = low ? 4 : 8;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.needsUpdate = true;
      ownedTextures.add(texture);
      try{ onLoad(texture, image); }
      catch (error){ noteAssetError(url, error); }
    };
    image.onerror = () => {
      if (settled) return;
      settled = true;
      pendingImages.delete(cancel);
      image.onload = null;
      image.onerror = null;
      if (!disposed) noteAssetError(url, new Error('image load failed'));
    };
    image.src = url;
    return cancel;
  }

  function buildHubbleLayers(){
    if (disposed || hubbleLayersBuilt || !hubble1999Image || !hubble2024Image) return;
    hubbleLayersBuilt = true;
    const image1999 = hubble1999Image;
    const image2024 = hubble2024Image;
    group.userData.hubblePairDimensionsVerified =
      image1999.naturalWidth === HUBBLE_SIZE && image1999.naturalHeight === HUBBLE_SIZE &&
      image2024.naturalWidth === HUBBLE_SIZE && image2024.naturalHeight === HUBBLE_SIZE;
    try{
      const registered = buildRegisteredStars(group, image1999, image2024,
        budget, sharedUniforms, 'crab-registered-stars:' + entry.id);
      const surfels = buildHubbleSurfels(group, image1999, image2024,
        budget, sharedUniforms, 'crab-hubble-surfels:' + entry.id);
      group.userData.registeredHubbleStars = registered ? registered.count : 0;
      group.userData.hubbleSurfels = surfels ? surfels.count : 0;
      group.userData.hubbleRegistrationReady = true;
    }catch (error){
      group.userData.hubbleRegistrationReady = false;
      noteAssetError('hubble-derived-layers', error);
    }
    // Low-tier GPU textures use 2K canvas derivatives, so release the decoded
    // 4K HTML images after color sampling and registration data are built.
    hubble1999Image = null;
    hubble2024Image = null;
  }

  loadImageTexture(HUBBLE_1999, (texture, image) => {
    hubbleMaterial.uniforms.u1999.value = texture;
    hubbleMaterial.uniforms.uReady1999.value = 1;
    hubble1999Image = image;
    buildHubbleLayers();
  });
  loadImageTexture(HUBBLE_2024, (texture, image) => {
    hubbleMaterial.uniforms.u2024.value = texture;
    hubbleMaterial.uniforms.uReady2024.value = 1;
    hubble2024Image = image;
    buildHubbleLayers();
  });
  loadImageTexture(WEBB_2023, (texture, image) => {
    webbMaterial.uniforms.uMap.value = texture;
    webbMaterial.uniforms.uReady.value = 1;
    group.userData.webbDimensionsVerified =
      image.naturalWidth === 4000 && image.naturalHeight === 3483;
    if (!webbStarsBuilt){
      webbStarsBuilt = true;
      try{
        const stars = buildWebbStars(group, image, budget, sharedUniforms,
          'crab-webb-stars:' + entry.id);
        group.userData.alignedWebbStars = stars ? stars.count : 0;
        group.userData.webbAlignmentReady = true;
      }catch (error){
        group.userData.webbAlignmentReady = false;
        noteAssetError('webb-derived-stars', error);
      }
    }
  });

  function ensureModel(){
    if (disposed || modelStarted) return;
    modelStarted = true;
    const generation = ++modelGeneration;
    group.userData.modelStatus = 'loading';
    Promise.all([
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/loaders/DRACOLoader.js'),
    ]).then(([{ GLTFLoader }, { DRACOLoader }]) => {
      if (disposed || generation !== modelGeneration) return;
      dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(DRACO_DECODER);
      dracoLoader.preload();
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
      loader.load(XRAY_MODEL, gltf => {
        if (disposed || generation !== modelGeneration){
          disposeDetachedObject(gltf.scene);
          return;
        }
        modelRoot = gltf.scene;
        const originalMaterials = new Set();
        modelRoot.traverse(object => {
          if (!object.isMesh) return;
          const list = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of list) if (material) originalMaterials.add(material);
        });
        for (const material of originalMaterials) disposeMaterial(material);
        modelMaterial = new THREE.MeshStandardMaterial({
          color: 0x405dd8,
          emissive: 0x162d9a,
          emissiveIntensity: 1.45,
          roughness: .68,
          metalness: .08,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        modelRoot.traverse(object => {
          if (!object.isMesh) return;
          object.material = modelMaterial;
          object.renderOrder = 6;
        });
        let box = new THREE.Box3().setFromObject(modelRoot);
        const size = box.getSize(new THREE.Vector3());
        const scale = 56/Math.max(size.x, size.y, size.z, .001);
        modelRoot.scale.setScalar(scale);
        box = new THREE.Box3().setFromObject(modelRoot);
        const center = box.getCenter(new THREE.Vector3());
        modelRoot.position.set(-center.x, -center.y, -center.z);
        modelRoot.userData.scientificRole =
          'NASA X-ray-informed representation; centered/scaled, not tomography or image registration.';
        modelAnchor.add(modelRoot);
        group.userData.modelStatus = 'ready';
        if (dracoLoader){ dracoLoader.dispose(); dracoLoader = null; }
      }, undefined, error => {
        if (disposed || generation !== modelGeneration) return;
        group.userData.modelStatus = 'error';
        noteAssetError(XRAY_MODEL, error);
        if (dracoLoader){ dracoLoader.dispose(); dracoLoader = null; }
      });
    }).catch(error => {
      if (disposed || generation !== modelGeneration) return;
      group.userData.modelStatus = 'error';
      noteAssetError(XRAY_MODEL, error);
    });
  }

  function applyState(nextState){
    if (!PRESETS[nextState]) nextState = STATES.EXPANSION;
    if (nextState !== STATES.WEBB) previousNonWebbState = nextState;
    if (nextState === STATES.PULSAR) ensureModel();
    if (nextState === STATES.SUPERNOVA && activeState !== STATES.SUPERNOVA)
      flashAge = 0;
    activeState = nextState;
    target = { ...PRESETS[nextState] };
    group.userData.activeState = nextState;
    group.userData.activeComparison = nextState === STATES.WEBB
      ? 'wavelength'
      : nextState === STATES.EXPANSION ? 'registered-time-pair' : 'illustrative-context';
  }

  return {
    group,
    focusDist: 105,
    startTheta: 0,
    startPhi: 1.20,
    autoRotate: false,
    hasIR: true,
    isImage: true,
    imageCredit: IMAGE_CREDIT,
    modelCredit: MODEL_CREDIT,
    setMoment(visual){
      if (!disposed) applyState(stateFromVisual(visual));
    },
    setIR(on){
      if (disposed) return;
      applyState(on ? STATES.WEBB : previousNonWebbState);
    },
    update(dt, camera){
      if (disposed) return;
      dt = Math.min(Math.max(dt || 0, 0), .05);
      time += dt;
      if (activeState === STATES.SUPERNOVA) flashAge += dt;
      for (const key of Object.keys(current))
        current[key] = damp(current[key], target[key], 3.6, dt);

      let front = 1;
      if (camera){
        const length = Math.max(camera.position.length(), .001);
        front = camera.position.z/length;
      }
      const orbitTarget = 1-THREE.MathUtils.smoothstep(front, .45, .90);
      sharedUniforms.uOrbit.value = damp(sharedUniforms.uOrbit.value, orbitTarget, 4.5, dt);
      const frontVisibility = THREE.MathUtils.smoothstep(front, -.18, .88);
      const curtain = .5+Math.sin(time*.20)*.24;

      sharedUniforms.uEpoch.value = current.epoch;
      sharedUniforms.uCompare.value = current.compare;
      sharedUniforms.uCurtain.value = curtain;
      sharedUniforms.uStarOpacity.value = current.stars;
      sharedUniforms.uWebbStarOpacity.value = current.webbStars;
      sharedUniforms.uSurfelOpacity.value = current.surfels;
      sharedUniforms.uBacktrace.value = current.backtrace;
      sharedUniforms.uFilamentOpacity.value = current.filaments;
      sharedUniforms.uWebbMix.value = current.webb;
      sharedUniforms.uTime.value = time;

      hubbleMaterial.uniforms.uOpacity.value = current.hubble*(.10+.90*frontVisibility);
      hubbleMaterial.uniforms.uSaturation.value = current.saturation;
      hubbleMaterial.uniforms.uExposure.value = current.exposure;
      webbMaterial.uniforms.uOpacity.value = current.webb*(.10+.90*frontVisibility);
      webbMaterial.uniforms.uSaturation.value = current.saturation;
      webbMaterial.uniforms.uExposure.value = current.exposure;

      for (const cloud of clouds){
        cloud.material.color.copy(cloud.hubble).lerp(cloud.webb, current.webb);
        cloud.material.opacity = cloud.opacity*current.clouds*(.66+sharedUniforms.uOrbit.value*.48);
      }

      const flashPhase = (flashAge%7)/7;
      const flashRadius = 8+flashPhase*33;
      supernova.shell.scale.setScalar(flashRadius);
      supernova.shock.scale.setScalar(flashRadius*1.08);
      supernova.material.opacity = current.flash*(1-flashPhase)*.86;
      supernova.shockMaterial.uniforms.uOpacity.value = current.flash*(1-flashPhase)*.52;
      const slowPulse = .92+Math.sin(time*1.05)*.08;
      supernova.flash.scale.setScalar((13+flashPhase*12)*slowPulse);
      supernova.flashMaterial.opacity = current.flash*(.74-flashPhase*.34);

      engine.group.visible = current.engine > .004;
      for (const material of engine.materials)
        material.opacity = material.userData.baseOpacity*current.engine;
      engine.torus.rotation.z = time*.10;
      engine.outer.rotation.z = -time*.055;
      engine.core.scale.setScalar(1+Math.sin(time*1.12)*.07);
      engine.glow.scale.setScalar(9*(1+Math.sin(time*.78)*.055));

      if (modelMaterial) modelMaterial.opacity = current.model*.62;
      modelAnchor.visible = current.model > .004;
      modelAnchor.rotation.y = Math.sin(time*.075)*.08;
      group.userData.hubbleCurtain = curtain;
      group.userData.headOnAlignment = sharedUniforms.uOrbit.value < .025;
      group.userData.modelVisible = !!modelRoot && modelAnchor.visible;
      // Ribbons are mesh surfaces with torn emission, never wireframe lines.
      filaments.ribbons.visible = current.filaments > .003;
    },
    dispose(){
      if (disposed) return;
      disposed = true;
      modelGeneration += 1;
      group.userData.modelStatus = modelRoot ? 'disposed' : 'cancelled';
      for (const cancel of [...pendingImages]) cancel();
      pendingImages.clear();
      if (dracoLoader){ dracoLoader.dispose(); dracoLoader = null; }
      if (modelRoot){
        modelAnchor.remove(modelRoot);
        disposeDetachedObject(modelRoot);
        modelRoot = null;
        modelMaterial = null;
      }
      // Shader-uniform textures are invisible to LandmarkView's material.map
      // traversal, so the exhibit owns and releases them explicitly.
      for (const texture of ownedTextures) texture.dispose();
      ownedTextures.clear();
    },
  };
}
