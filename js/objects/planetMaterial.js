/* NASA-Eyes-grade planet materials.
   Upgrades a MeshStandardMaterial with real relief (normal/bump), an ocean
   roughness mask, and — via onBeforeCompile — Earth's night-side city lights
   gated by the sun direction. Plus a Fresnel atmosphere limb shell. All
   optional per body; anything missing simply isn't applied. */

import * as THREE from 'three';
import { loadTexture } from '../utils/assets.js';
import { deriveNormalMap, invertToRoughness } from '../utils/normalmap.js';

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

/* inject Earth-style night city lights into a standard material */
function addNightLights(mat, nightTex){
  mat.defines = Object.assign({}, mat.defines, { FG_NIGHT: '' });
  mat.userData.sunViewDir = new THREE.Vector3(0, 0, 1);
  mat.onBeforeCompile = shader => {
    shader.uniforms.uNightTex = { value: nightTex };
    shader.uniforms.uSunViewDir = { value: mat.userData.sunViewDir };
    mat.userData.shader = shader;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>',
        '#include <common>\nuniform sampler2D uNightTex;\nuniform vec3 uSunViewDir;')
      .replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>
        #ifdef FG_NIGHT
          float fgNdl = dot(normalize(vNormal), uSunViewDir);
          float fgNight = smoothstep(0.08, -0.18, fgNdl);
          totalEmissiveRadiance += texture2D(uNightTex, vMapUv).rgb * fgNight * 2.6;
        #endif
      `);
  };
  mat.needsUpdate = true;
}

/* apply a real-imagery texture set to a planet's material + subobjects.
   set: { map, night, normal, bump, specular, deriveBump }  */
export function applyRealTextures(planet, set){
  const mat = planet.mat;

  loadTexture(set.map, tex => {
    mat.map = tex;
    mat.emissive.set(0x000000);
    planet.baseEmissive = 0;
    mat.emissiveIntensity = 0;
    mat.roughness = 0.92; mat.metalness = 0;
    mat.needsUpdate = true;
    // derive relief from the albedo when no dedicated map is supplied
    if (set.deriveBump && !set.normal && !set.bump){
      try{
        mat.normalMap = deriveNormalMap(tex.image, set.deriveBump);
        mat.normalScale = new THREE.Vector2(0.85, 0.85);
        mat.needsUpdate = true;
      }catch(e){ /* keep flat */ }
    }
  });

  if (set.normal)
    loadTexture(set.normal, tex => {
      mat.normalMap = tex;
      mat.normalScale = new THREE.Vector2(set.normalScale || 1, set.normalScale || 1);
      mat.needsUpdate = true;
    }, { srgb: false });

  if (set.bump)
    loadTexture(set.bump, tex => {
      mat.bumpMap = tex; mat.bumpScale = set.bumpScale || 0.04; mat.needsUpdate = true;
    }, { srgb: false });

  if (set.specular)
    loadTexture(set.specular, tex => {
      try{
        mat.roughnessMap = invertToRoughness(tex.image);
        mat.roughness = 1.0; mat.metalness = 0.08; mat.needsUpdate = true;
      }catch(e){ /* keep uniform roughness */ }
    }, { srgb: false });

  if (set.night)
    loadTexture(set.night, tex => addNightLights(mat, tex));
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
