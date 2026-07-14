/* Central star of a system: textured photosphere plus layered additive
   corona sprites tinted by the star's blackbody color. The sprite stack is
   the bloom substitute — it degrades to nothing worse than itself. */

import * as THREE from 'three';
import { makeStarTexture, makeGlowTexture } from '../utils/textures.js';
import { loadTexture } from '../utils/assets.js';
import { SUN_TEXTURE } from '../data/textureManifest.js';
import { createBlackHoleVisual } from './blackHoleVisual.js';

export class CentralStar {
  constructor(starCfg){
    this.cfg = starCfg;
    this.group = new THREE.Group();
    this.coronaSprites = [];

    if (starCfg.blackhole){ this._buildBlackHole(starCfg); return; }
    if (starCfg.pulsar) this._buildPulsarBeams(starCfg);

    const starMat = new THREE.MeshBasicMaterial({
      map: makeStarTexture(starCfg.bright, starCfg.deep, starCfg.name) });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(starCfg.coreRadius, 48, 32), starMat);
    this.group.add(this.mesh);
    if (starCfg.name === 'SOL')      // real photosphere imagery for the Sun
      loadTexture(SUN_TEXTURE, tex => { starMat.map = tex; starMat.needsUpdate = true; });

    const c = new THREE.Color(starCfg.color);
    const rgb = [Math.round(c.r*255), Math.round(c.g*255), Math.round(c.b*255)].join(',');
    const R = starCfg.coreRadius;
    const halos = [
      { tex: makeGlowTexture('rgba(255,250,235,1)', 'rgba(' + rgb + ',.55)'), s: R * 3.4 },
      { tex: makeGlowTexture('rgba(' + rgb + ',.8)', 'rgba(' + rgb + ',.22)'), s: R * 7.2 },
      { tex: makeGlowTexture('rgba(' + rgb + ',.35)', 'rgba(' + rgb + ',.08)'), s: R * 13 }
    ];
    for (const hd of halos){
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: hd.tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      sp.scale.set(hd.s, hd.s, 1);
      sp.userData.base = hd.s;
      this.coronaSprites.push(sp);
      this.group.add(sp);
    }

    this.pick = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.3, 12, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    this.pick.userData.body = this;
    this.isStar = true;
    this.name = starCfg.name;
    this.group.add(this.pick);

    this.light = new THREE.PointLight(starCfg.color, 2.7, 0);
    this.light.decay = 0;   // r155+ defaults to physical 1/d² falloff — planets would go black
    this.light.color.lerp(new THREE.Color(0xffffff), 0.55);   // keep planets readable
    this.group.add(this.light);
    this.baseLightIntensity = this.light.intensity;
    this.luminosityScale = 1;
  }

  /* ---- Sagittarius A*: shared camera-aware relativistic visualization ---- */
  _buildBlackHole(cfg){
    this.blackHoleVisual = createBlackHoleVisual({
      profile: 'sagittarius-a',
      radius: cfg.coreRadius,
      name: 'SagittariusA.SystemCore',
      pickBody: this,
    });
    this.mesh = this.blackHoleVisual.horizon;
    this.pick = this.blackHoleVisual.pick;
    this.light = this.blackHoleVisual.light;
    this.isStar = true;
    this.name = cfg.name;
    this.group.userData.blackHoleRenderer = 'black-hole-lensing-v1';
    this.group.add(this.blackHoleVisual.group);
  }

  /* ---- millisecond pulsar: sweeping polar beam cones ---- */
  _buildPulsarBeams(cfg){
    this.beams = new THREE.Group();
    this.beams.rotation.z = 0.45;                  // magnetic axis ≠ spin axis
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xbfe4ff, transparent: true,
      opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false,
      side: THREE.DoubleSide });
    for (const sign of [1, -1]){
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 26, 20, 1, true), beamMat);
      cone.position.y = sign * 13;
      cone.rotation.z = sign > 0 ? Math.PI : 0;
      this.beams.add(cone);
    }
    this.group.add(this.beams);
  }

  update(simDays, now, camera, dt){
    if (this.cfg.blackhole){
      this.blackHoleVisual.update(dt, camera);
      return;
    }
    this.mesh.rotation.y = 2 * Math.PI * simDays / this.cfg.rotP;
    if (this.beams) this.beams.rotation.y = now * 5;   // lighthouse sweep (visual rate)
    this.coronaSprites.forEach((sp, i) => {
      const s = sp.userData.base * (1 + 0.04 * Math.sin(now * (0.7 + i * 0.35) + i * 2));
      sp.scale.set(s, s, 1);
    });
  }
  setAppearance(spec){
    if (!spec || this.cfg.blackhole) return;
    this.luminosityScale = spec.luminosityScale == null ? 1 : spec.luminosityScale;
    if (this.light) this.light.intensity = this.baseLightIntensity * this.luminosityScale;
    for (const sprite of this.coronaSprites)
      sprite.material.opacity = 0.72 + this.luminosityScale * 0.28;
  }
  setHover(){ /* stars brighten via hover tag only */ }
}
