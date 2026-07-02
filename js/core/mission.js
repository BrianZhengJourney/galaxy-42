/* Mission planning: a probe on a Hohmann-style transfer ellipse between two
   planets of the current system. The launch window is found numerically —
   the destination must sit where the probe will be after half a transfer
   ellipse — with the same scan + bisection approach as the event engine.
   Probe position is a pure function of simDays, so time reversal works. */

import * as THREE from 'three';
import { makeGlowTexture } from '../utils/textures.js';

const TAU = Math.PI * 2;
const _p = new THREE.Vector3();

function wrapPi(a){ return ((a + Math.PI) % TAU + TAU) % TAU - Math.PI; }

function displayAngle(planet, t){
  planet.positionAt(t, _p);
  return Math.atan2(_p.z, _p.x);
}

export function planMission(origin, dest, tNow){
  const r1 = origin.cfg.dist, r2 = dest.cfg.dist;
  const T1 = origin.cfg.period, T2 = dest.cfg.period;
  const a = (r1 + r2) / 2;
  const e = Math.abs(r2 - r1) / (r2 + r1);
  const outward = r2 > r1;
  // Kepler III anchored to the origin's orbit: T ∝ a^1.5
  const Tt = T1 * Math.pow(a / r1, 1.5) / 2;

  /* launch window: f(tl) = angle(dest at tl+Tt) − (angle(origin at tl) + π) → 0 */
  const f = tl => wrapPi(displayAngle(dest, tl + Tt) - displayAngle(origin, tl) - Math.PI);
  const synodic = 1 / Math.abs(1 / T1 - 1 / T2);
  const step = Math.max(0.2, synodic / 72);
  let tl = null, t0 = tNow, g0 = f(t0);
  for (let t = tNow + step; t < tNow + synodic * 2.2; t += step){
    const g1 = f(t);
    if (Math.sign(g1) !== Math.sign(g0 || 1e-9) && Math.abs(g0) + Math.abs(g1) < Math.PI){
      let lo = t0, hi = t, glo = g0;
      for (let k = 0; k < 36; k++){
        const mid = (lo + hi) / 2, gm = f(mid);
        if (Math.sign(gm) === Math.sign(glo)){ lo = mid; glo = gm; } else hi = mid;
      }
      tl = (lo + hi) / 2;
      break;
    }
    t0 = t; g0 = g1;
  }
  if (tl === null) return null;

  const thetaL = displayAngle(origin, tl);
  return { origin, dest, tl, Tt, a, e, r1, r2, outward, thetaL,
           arrival: tl + Tt };
}

/* probe position along the half transfer ellipse (or parked before/after) */
export function probePosition(m, t, out){
  if (t <= m.tl) return m.origin.positionAt(t, out);
  if (t >= m.arrival) return m.dest.positionAt(t, out);
  // mean anomaly sweeps half the ellipse over Tt; outward legs start at
  // perihelion (M 0→π), inward legs at aphelion (M π→2π)
  const u = (t - m.tl) / m.Tt;
  const M = m.outward ? u * Math.PI : Math.PI + u * Math.PI;
  let E = M;
  for (let k = 0; k < 8; k++)
    E = E - (E - m.e * Math.sin(E) - M) / (1 - m.e * Math.cos(E));
  const r = m.a * (1 - m.e * Math.cos(E));
  const nu = Math.atan2(Math.sqrt(1 - m.e * m.e) * Math.sin(E), Math.cos(E) - m.e);
  const ang = m.thetaL + (m.outward ? nu : nu - Math.PI);
  return out.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
}

export function missionState(m, t){
  if (t < m.tl) return 'COUNTDOWN';
  if (t < m.arrival) return 'IN TRANSIT';
  return 'ARRIVED';
}

/* scene objects: transfer arc + probe glow */
export function buildMissionVisuals(m){
  const seg = 128, pos = new Float32Array(seg * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < seg; i++){
    const t = m.tl + (i / (seg - 1)) * m.Tt;
    probePosition(m, t, v);
    pos[i*3] = v.x; pos[i*3+1] = v.y; pos[i*3+2] = v.z;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const arc = new THREE.Line(g, new THREE.LineBasicMaterial({
    color: 0xffb45e, transparent: true, opacity: 0.6,
    blending: THREE.AdditiveBlending, depthWrite: false }));

  const probe = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture('rgba(255,235,200,1)', 'rgba(255,180,94,.5)', 64),
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  probe.scale.set(1.6, 1.6, 1);
  return { arc, probe };
}
