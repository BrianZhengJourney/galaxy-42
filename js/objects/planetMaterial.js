/* NASA-Eyes-grade planet materials.
   Upgrades a MeshStandardMaterial with real relief (normal/bump), an ocean
   roughness mask, and — via onBeforeCompile — Earth's night-side city lights
   gated by the sun direction. Plus a Fresnel atmosphere limb shell. All
   optional per body; anything missing simply isn't applied. */

import * as THREE from 'three';
import { loadTexture } from '../utils/assets.js';
import { deriveNormalMap, invertToRoughness } from '../utils/normalmap.js';
import { getEarthEpochTexture } from '../utils/earthEpochTextures.js';

/* ---- atmospheric limb: a back-side sphere with a rim-fresnel glow ---- */
export function buildAtmosphere(radius, colorHex, strength = 1.0){
  const c = new THREE.Color(colorHex);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Vector3(c.r, c.g, c.b) },
      uStrength: { value: strength },
      uSunViewDir: { value: new THREE.Vector3(0, 0, 1) }
    },
    vertexShader: `
      varying vec3 vN; varying vec3 vView;
      void main(){
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uStrength; uniform vec3 uSunViewDir;
      varying vec3 vN; varying vec3 vView;
      void main(){
        float rim = pow(1.0 - abs(dot(vN, vView)), 2.8);
        float lit = clamp(dot(normalize(vN), uSunViewDir) * 0.5 + 0.6, 0.15, 1.0);
        gl_FragColor = vec4(uColor, rim * uStrength * lit);
      }`,
    transparent: true, blending: THREE.AdditiveBlending,
    side: THREE.BackSide, depthWrite: false
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 48), mat);
  mesh.userData.atmoMat = mat;
  return mesh;
}

/* Earth has two independent appearance layers:
   - a reconstructed palaeogeography map blended over the observed map
   - present-day artificial night lights, with an explicit strength uniform
   Keeping those uniforms separate is what lets geological time change the
   globe without touching the orbital clock. */
function installEarthShader(target){
  const mat = target.mat;
  if (mat.userData.epochUniforms) return mat.userData.epochUniforms;
  const uniforms = {
    epochMap: { value: null },
    epochBlend: { value: 0 },
    nightMap: { value: null },
    nightStrength: { value: 1 },
    sunViewDir: { value: new THREE.Vector3(0, 0, 1) },
  };
  mat.userData.epochUniforms = uniforms;
  mat.userData.sunViewDir = uniforms.sunViewDir.value;
  mat.onBeforeCompile = shader => {
    shader.uniforms.uEpochMap = uniforms.epochMap;
    shader.uniforms.uEpochBlend = uniforms.epochBlend;
    shader.uniforms.uNightTex = uniforms.nightMap;
    shader.uniforms.uNightStrength = uniforms.nightStrength;
    shader.uniforms.uSunViewDir = uniforms.sunViewDir;
    mat.userData.shader = shader;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uEpochMap;
        uniform float uEpochBlend;
        uniform sampler2D uNightTex;
        uniform float uNightStrength;
        uniform vec3 uSunViewDir;`)
      .replace('#include <map_fragment>', `
        #include <map_fragment>
        if (uEpochBlend > 0.001) {
          vec4 fgEpochColor = texture2D(uEpochMap, vMapUv);
          diffuseColor.rgb = mix(diffuseColor.rgb, fgEpochColor.rgb,
            clamp(uEpochBlend, 0.0, 1.0));
        }
      `)
      .replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>
        if (uNightStrength > 0.001) {
          float fgNdl = dot(normalize(vNormal), uSunViewDir);
          float fgNight = smoothstep(0.08, -0.18, fgNdl);
          totalEmissiveRadiance += texture2D(uNightTex, vMapUv).rgb
            * fgNight * 2.6 * uNightStrength;
        }
      `);
  };
  mat.customProgramCacheKey = () => 'fg-earth-epoch-v1';
  mat.needsUpdate = true;
  return uniforms;
}

function targetName(target){
  return target.name || (target.cfg && target.cfg.name) || '';
}

/* Capture mutable presentation values once. Re-running is intentional: real
   maps and cloud/ring meshes arrive at different times. */
export function installPlanetAppearance(target){
  if (!target || !target.mat) return null;
  const a = target._appearance || (target._appearance = {
    surface: 'present', epochBlend: 0, epochBlendTarget: 0,
    nightStrength: 1, nightStrengthTarget: 1,
  });
  if (targetName(target) === 'EARTH') installEarthShader(target);
  if (target.clouds && a.cloudOpacity == null){
    a.cloudOpacity = target.clouds.material.opacity;
    a.cloudOpacityTarget = a.cloudOpacity;
    a.baseCloudOpacity = a.cloudOpacity;
  }
  if (target.atmosphere && a.atmosphereStrength == null){
    const u = target.atmosphere.userData.atmoMat.uniforms;
    a.atmosphereStrength = u.uStrength.value;
    a.atmosphereStrengthTarget = a.atmosphereStrength;
    a.baseAtmosphereStrength = a.atmosphereStrength;
    a.baseAtmosphereColor = new THREE.Vector3().copy(u.uColor.value);
  }
  if (target.ringMat && a.ringOpacity == null){
    a.ringOpacity = target.ringMat.opacity;
    a.ringOpacityTarget = a.ringOpacity;
    a.baseRingOpacity = a.ringOpacity;
    a.baseRingColor = target.ringMat.color.clone();
    a.ringUncertain = false;
  }
  return a;
}

/* Apply a complete, resolved body appearance. Orbit/rotation fields never
   enter this function. */
export function setPlanetAppearance(target, spec){
  const a = installPlanetAppearance(target);
  if (!a || !spec) return;
  const mat = target.mat;
  const earth = targetName(target) === 'EARTH';
  const nextSurface = spec.surface || 'present';
  if (earth){
    const uniforms = installEarthShader(target);
    // Earth's observed albedo remains the shader's base even while a
    // reconstructed epoch is blended over it. This also makes an ancient
    // deep link safe when the real texture finishes loading asynchronously.
    if (target.presentMap) mat.map = target.presentMap;
    else if (target.fallbackMap) mat.map = target.fallbackMap;
    if (nextSurface === 'present'){
      a.epochBlendTarget = 0;
    } else {
      uniforms.epochMap.value = getEarthEpochTexture(nextSurface);
      // Past-to-past transitions briefly reveal the observed base, making the
      // continental rearrangement legible instead of popping between maps.
      if (a.surface !== nextSurface && a.epochBlend > 0.98) a.epochBlend = 0;
      a.epochBlendTarget = 1;
    }
    a.nightStrengthTarget = spec.nightStrength == null ? 1 : spec.nightStrength;
    uniforms.epochBlend.value = a.epochBlend;
    uniforms.nightStrength.value = a.nightStrength;
  }
  if (!earth && target.modelMap){
    mat.map = nextSurface === 'modeled-weather'
      ? target.modelMap : (target.presentMap || target.fallbackMap || mat.map);
  }
  a.surface = nextSurface;

  // Modern relief/specular masks do not align with reconstructed continents.
  if (nextSurface === 'present'){
    if (target.presentNormalMap) mat.normalMap = target.presentNormalMap;
    if (target.presentBumpMap) mat.bumpMap = target.presentBumpMap;
    if (target.presentRoughnessMap) mat.roughnessMap = target.presentRoughnessMap;
    mat.roughness = target.presentRoughness == null ? 0.92 : target.presentRoughness;
    mat.metalness = target.presentMetalness == null ? 0 : target.presentMetalness;
  } else {
    mat.normalMap = null; mat.bumpMap = null; mat.roughnessMap = null;
    mat.roughness = 0.94; mat.metalness = 0;
  }
  mat.needsUpdate = true;

  if (target.clouds){
    a.cloudOpacityTarget = spec.cloudOpacity == null ? a.baseCloudOpacity : spec.cloudOpacity;
    target.clouds.visible = a.cloudOpacityTarget > 0.001;
  }
  if (target.atmosphere){
    const u = target.atmosphere.userData.atmoMat.uniforms;
    a.atmosphereStrengthTarget = spec.atmosphereStrength == null
      ? a.baseAtmosphereStrength : spec.atmosphereStrength;
    if (spec.atmosphereColor){
      const c = new THREE.Color(spec.atmosphereColor);
      u.uColor.value.set(c.r, c.g, c.b);
    } else if (a.baseAtmosphereColor) u.uColor.value.copy(a.baseAtmosphereColor);
  }
  if (target.ring && target.ringMat){
    a.ringOpacityTarget = spec.ringVisible === false ? 0 : (spec.ringOpacity || 0);
    a.ringUncertain = !!spec.ringUncertain;
    target.ring.visible = a.ringOpacity > 0.002 || a.ringOpacityTarget > 0.002;
    target.ringMat.color.copy(a.baseRingColor);
    if (a.ringUncertain) target.ringMat.color.lerp(new THREE.Color(0xffbd72), 0.34);
  }
}

export function updatePlanetAppearance(target, dt, now = 0){
  const a = target && target._appearance;
  if (!a) return;
  const k = 1 - Math.exp(-Math.max(0, dt) * 5.2);
  const approach = (value, goal) => value + (goal - value) * k;
  if (targetName(target) === 'EARTH'){
    a.epochBlend = approach(a.epochBlend, a.epochBlendTarget);
    a.nightStrength = approach(a.nightStrength, a.nightStrengthTarget);
    const u = target.mat.userData.epochUniforms;
    u.epochBlend.value = a.epochBlend;
    u.nightStrength.value = a.nightStrength;
  }
  if (target.clouds && a.cloudOpacityTarget != null){
    a.cloudOpacity = approach(a.cloudOpacity, a.cloudOpacityTarget);
    target.clouds.material.opacity = a.cloudOpacity;
  }
  if (target.atmosphere && a.atmosphereStrengthTarget != null){
    a.atmosphereStrength = approach(a.atmosphereStrength, a.atmosphereStrengthTarget);
    target.atmosphere.userData.atmoMat.uniforms.uStrength.value = a.atmosphereStrength;
  }
  if (target.ring && target.ringMat && a.ringOpacityTarget != null){
    a.ringOpacity = approach(a.ringOpacity, a.ringOpacityTarget);
    const pulse = a.ringUncertain ? 0.88 + 0.12 * Math.sin(now * 1.7) : 1;
    target.ringMat.opacity = a.ringOpacity * pulse;
    target.ring.visible = a.ringOpacity > 0.002 || a.ringOpacityTarget > 0.002;
  }
}

/* Attach a city-light map without resetting the selected geological epoch. */
function addNightLights(target, nightTex){
  const uniforms = installEarthShader(target);
  uniforms.nightMap.value = nightTex;
}

/* apply a real-imagery texture set to a planet's material + subobjects.
   set: { map, night, normal, bump, specular, deriveBump }  */
export function applyRealTextures(planet, set){
  const mat = planet.mat;

  loadTexture(set.map, tex => {
    if (planet.fallbackMap && planet.fallbackMap !== tex &&
        !(planet.fallbackMap.userData && planet.fallbackMap.userData.shared))
      planet.fallbackMap.dispose();
    planet.fallbackMap = null;
    planet.presentMap = tex;
    const earth = targetName(planet) === 'EARTH';
    if (earth || !planet._appearance || planet._appearance.surface === 'present') mat.map = tex;
    mat.emissive.set(0x000000);
    planet.baseEmissive = 0;
    mat.emissiveIntensity = 0;
    planet.presentRoughness = 0.92; planet.presentMetalness = 0;
    if (!planet._appearance || planet._appearance.surface === 'present'){
      mat.roughness = planet.presentRoughness; mat.metalness = planet.presentMetalness;
    }
    mat.needsUpdate = true;
    // derive relief from the albedo when no dedicated map is supplied
    if (set.deriveBump && !set.normal && !set.bump){
      try{
        planet.presentNormalMap = deriveNormalMap(tex.image, set.deriveBump);
        if (!planet._appearance || planet._appearance.surface === 'present')
          mat.normalMap = planet.presentNormalMap;
        mat.normalScale = new THREE.Vector2(0.85, 0.85);
        mat.needsUpdate = true;
      }catch(e){ /* keep flat */ }
    }
  });

  if (set.normal)
    loadTexture(set.normal, tex => {
      planet.presentNormalMap = tex;
      if (!planet._appearance || planet._appearance.surface === 'present') mat.normalMap = tex;
      mat.normalScale = new THREE.Vector2(set.normalScale || 1, set.normalScale || 1);
      mat.needsUpdate = true;
    }, { srgb: false });

  if (set.bump)
    loadTexture(set.bump, tex => {
      planet.presentBumpMap = tex;
      if (!planet._appearance || planet._appearance.surface === 'present') mat.bumpMap = tex;
      mat.bumpScale = set.bumpScale || 0.04; mat.needsUpdate = true;
    }, { srgb: false });

  if (set.specular)
    loadTexture(set.specular, tex => {
      try{
        planet.presentRoughnessMap = invertToRoughness(tex.image);
        if (!planet._appearance || planet._appearance.surface === 'present')
          mat.roughnessMap = planet.presentRoughnessMap;
        planet.presentRoughness = 1.0; planet.presentMetalness = 0.08;
        if (!planet._appearance || planet._appearance.surface === 'present'){
          mat.roughness = planet.presentRoughness; mat.metalness = planet.presentMetalness;
        }
        mat.needsUpdate = true;
      }catch(e){ /* keep uniform roughness */ }
    }, { srgb: false });

  if (set.night)
    loadTexture(set.night, tex => addNightLights(planet, tex));
}

/* refresh sun-direction uniforms each frame (view space). sun is at origin. */
const _v = new THREE.Vector3();
export function updatePlanetSun(planet, camera){
  const mat = planet.mat;
  if (mat.userData && mat.userData.shader){
    _v.copy(planet.group.position).multiplyScalar(-1).normalize()   // planet→sun (world)
      .transformDirection(camera.matrixWorldInverse);                // → view space
    mat.userData.sunViewDir.copy(_v);
    mat.userData.shader.uniforms.uSunViewDir.value.copy(_v);
  }
  if (planet.atmosphere){
    _v.copy(planet.group.position).multiplyScalar(-1).normalize()
      .transformDirection(camera.matrixWorldInverse);
    planet.atmosphere.userData.atmoMat.uniforms.uSunViewDir.value.copy(_v);
  }
}
