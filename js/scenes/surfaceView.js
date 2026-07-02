/* Low orbit — the third scale. A displaced, vertex-colored terrain sphere
   generated from seeded fBm noise, with water shell, cloud layer and a
   rim-glow atmosphere shader, all keyed to the planet's type. */

import * as THREE from 'three';
import { makeNoise3D } from '../utils/noise.js';
import { hashStr, mulberry } from '../utils/rng.js';
import { buildStarSphere } from '../objects/starfield.js';
import { canvasTex } from '../utils/textures.js';

const R = 20;

/* height-color ramps per surface type: [t, hex] stops over normalized height */
const RAMPS = {
  rocky:    [[-1, '#4a443c'], [0, '#7a736a'], [0.5, '#9a938a'], [1, '#d8d2c8']],
  cratered: [[-1, '#403c36'], [0, '#6e6a62'], [0.5, '#8f8a84'], [1, '#c8c2b8']],
  mars:     [[-1, '#6e3018'], [0, '#a04a24'], [0.5, '#c46a3a'], [1, '#f0d8c8']],
  desert:   [[-1, '#7a5228'], [0, '#b08048'], [0.5, '#d0a868'], [1, '#f0e0b8']],
  lava:     [[-1, '#ff6a1a'], [-0.4, '#802a10'], [0.1, '#241210'], [1, '#4a3a34']],
  ocean:    [[-1, '#0c2c50'], [0, '#1a5a40'], [0.4, '#4a8a50'], [1, '#e8f0f4']],
  earth:    [[-1, '#0c2c50'], [0, '#2a6a3a'], [0.5, '#8a7a4c'], [1, '#f0f4f8']],
  ice:      [[-1, '#6898b8'], [0, '#a8ccd8'], [0.5, '#d8ecf2'], [1, '#ffffff']],
  toxic:    [[-1, '#405018'], [0, '#708028'], [0.5, '#a0a848'], [1, '#d8d890']],
  venus:    [[-1, '#805828'], [0, '#a87c3c'], [0.5, '#d0a860'], [1, '#f0d8a0']]
};
const ATMO = {
  earth: '#6ab8ff', ocean: '#6ab8ff', mars: '#e8a070', venus: '#e8d08a',
  toxic: '#b8d860', ice: '#a8d8e8', lava: '#ff7040', desert: '#e0b880',
  rocky: null, cratered: null
};
const HAS_WATER = { earth: 1, ocean: 1 };
const HAS_CLOUDS = { earth: 0.9, ocean: 0.95, toxic: 1, venus: 1 };
const AMP = { rocky: 1.7, cratered: 1.9, mars: 1.5, desert: 1.3, lava: 1.2,
              ocean: 1.1, earth: 1.3, ice: 0.9, toxic: 0.7, venus: 0.8 };

function rampColor(stops, t, out){
  let i = 0;
  while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
  const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
  const u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0 || 1)));
  out.set(c0).lerp(new THREE.Color(c1), u);
  return out;
}

export class SurfaceView {
  constructor(planet, starCfg){
    this.planet = planet;
    const type = RAMPS[planet.cfg.tex.type] ? planet.cfg.tex.type : 'rocky';
    this.scene = new THREE.Scene();
    this.scene.add(buildStarSphere('orbit:' + planet.name));

    this.spin = new THREE.Group();
    this.scene.add(this.spin);

    /* ---- displaced terrain ---- */
    const fbm = makeNoise3D(hashStr('terrain:' + planet.name));
    const geo = new THREE.SphereGeometry(R, 168, 112);
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3(), c = new THREE.Color();
    const amp = AMP[type];
    const water = HAS_WATER[type];
    for (let i = 0; i < pos.count; i++){
      v.fromBufferAttribute(pos, i).normalize();
      let h = (fbm(v.x * 2.6, v.y * 2.6, v.z * 2.6) - 0.5) * 2;      // -1..1
      h += (fbm(v.x * 9, v.y * 9, v.z * 9, 3) - 0.5) * 0.6;          // detail
      const polar = Math.pow(Math.abs(v.y), 6);                      // ice caps
      const land = water ? Math.max(h, -0.12) : h;
      pos.setXYZ(i, v.x * (R + land * amp), v.y * (R + land * amp), v.z * (R + land * amp));
      rampColor(RAMPS[type], h, c);
      if ((type === 'earth' || type === 'ice' || type === 'mars') && polar > 0.4)
        c.lerp(new THREE.Color('#f4f8fb'), Math.min(1, polar));
      col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    this.terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 1, metalness: 0,
      emissive: type === 'lava' ? new THREE.Color('#ff3a08') : new THREE.Color('#000000'),
      emissiveIntensity: type === 'lava' ? 0.28 : 0
    }));
    this.spin.add(this.terrain);

    /* ---- water shell ---- */
    if (water){
      this.spin.add(new THREE.Mesh(new THREE.SphereGeometry(R - 0.02, 96, 64),
        new THREE.MeshStandardMaterial({ color: 0x14406e, roughness: 0.35, metalness: 0,
          transparent: true, opacity: 0.92 })));
    }

    /* ---- cloud layer ---- */
    if (HAS_CLOUDS[type]){
      const rnd = mulberry(hashStr('clouds:' + planet.name));
      const cloudTex = canvasTex(512, 256, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.fillStyle = '#ffffff';
        for (let i = 0; i < 130; i++){
          g.globalAlpha = 0.06 + rnd() * 0.15;
          g.beginPath();
          g.ellipse(rnd() * w, rnd() * h, 10 + rnd() * 46, 4 + rnd() * 10, 0, 0, Math.PI * 2);
          g.fill();
        }
      });
      this.clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.025, 96, 64),
        new THREE.MeshLambertMaterial({ map: cloudTex, transparent: true,
          opacity: HAS_CLOUDS[type], depthWrite: false }));
      this.scene.add(this.clouds);
    }

    /* ---- atmosphere rim glow ---- */
    const atmo = ATMO[type];
    if (atmo){
      const ac = new THREE.Color(atmo);
      this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.07, 96, 64),
        new THREE.ShaderMaterial({
          uniforms: { atmoColor: { value: new THREE.Vector3(ac.r, ac.g, ac.b) } },
          vertexShader: `
            varying vec3 vN; varying vec3 vV;
            void main(){
              vN = normalize(normalMatrix * normal);
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vV = normalize(-mv.xyz);
              gl_Position = projectionMatrix * mv;
            }`,
          fragmentShader: `
            uniform vec3 atmoColor;
            varying vec3 vN; varying vec3 vV;
            void main(){
              float rim = pow(1.0 - abs(dot(vN, vV)), 2.6);
              gl_FragColor = vec4(atmoColor, rim * 0.85);
            }`,
          transparent: true, blending: THREE.AdditiveBlending,
          depthWrite: false, side: THREE.FrontSide
        })));
    }

    /* ---- key light (the star) + fill ---- */
    const key = new THREE.DirectionalLight(starCfg ? starCfg.color : 0xfff0d5, 2.4);
    key.position.set(80, 30, 50);
    this.scene.add(key);
    this.scene.add(new THREE.AmbientLight(0x243448, 0.7));

    this.pickTargets = [];
  }

  overviewDist(){ return R * 2.4; }
  minDist(){ return R * 1.22; }
  maxDist(){ return R * 5.2; }

  update(dt, simDays){
    this.spin.rotation.y = 2 * Math.PI * simDays / this.planet.cfg.rotP;
    if (this.clouds) this.clouds.rotation.y += dt * 0.01;
  }

  dispose(){
    this.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : []);
      for (const m of mats){ if (m.map) m.map.dispose(); m.dispose(); }
    });
    this.scene.clear();
  }
}

/* gas and ice giants have no surface to descend to */
export function canDescend(planet){
  const t = planet.cfg.tex.type;
  return t !== 'gas' && !(t === 'ice' && planet.r > 1.2);
}
