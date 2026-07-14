/* Canonical display ephemerides for the three S-stars shown around
   Sagittarius A*.  These are intentionally display-compressed orbit sizes,
   but the eccentricities, periods and labels stay shared between every view. */

const TAU = Math.PI * 2;

function frozenInfo(info){
  return Object.freeze(info);
}

export const S_STAR_ORBITS = Object.freeze([
  Object.freeze({
    id: 'S2', period: 5862, e: 0.885, a: 30, incl: 0.35, node: 1.0, phase: 2.0,
    info: frozenInfo({
      'SPECTRAL CLASS': 'B0-2V',
      'ORBITAL PERIOD': '16.05 yr',
      'ECCENTRICITY': '0.885',
      'PERIAPSIS': '120 AU',
      'PERIAPSIS SPEED': '7,650 km/s',
      'DISCOVERED': '2002',
    }),
  }),
  Object.freeze({
    id: 'S38', period: 7013, e: 0.818, a: 34, incl: -0.5, node: 2.4, phase: 0.7,
    info: frozenInfo({
      'SPECTRAL CLASS': 'B-TYPE',
      'ORBITAL PERIOD': '19.2 yr',
      'ECCENTRICITY': '0.818',
      'PERIAPSIS': '230 AU',
      'PERIAPSIS SPEED': '~4,500 km/s',
      'DISCOVERED': '2004',
    }),
  }),
  Object.freeze({
    id: 'S55', period: 4675, e: 0.721, a: 26, incl: 0.8, node: 4.1, phase: 4.4,
    info: frozenInfo({
      'SPECTRAL CLASS': 'B-TYPE',
      'ORBITAL PERIOD': '12.8 yr',
      'ECCENTRICITY': '0.721',
      'PERIAPSIS': '~190 AU',
      'PERIAPSIS SPEED': '~4,900 km/s',
      'DISCOVERED': '2012',
    }),
  }),
]);

// Landmark seconds are accelerated into orbital days while retaining each
// star's real period ratio.  At elapsed=0 both Sagittarius A* views align.
export const S_STAR_DISPLAY_DAYS_PER_SECOND = 170;

export function solveKeplerEccentricAnomaly(meanAnomaly, eccentricity){
  const M = meanAnomaly % TAU;
  let E = M;
  for (let iteration = 0; iteration < 8; iteration++)
    E -= (E - eccentricity * Math.sin(E) - M)
      / (1 - eccentricity * Math.cos(E));
  return E;
}

function setPosition(target, x, y, z){
  if (typeof target.set === 'function') return target.set(x, y, z);
  target.x = x;
  target.y = y;
  target.z = z;
  return target;
}

export function keplerPositionAtEccentricAnomaly(config, eccentricAnomaly, out = {}){
  const x = config.a * (Math.cos(eccentricAnomaly) - config.e);
  const z = config.a * Math.sqrt(1 - config.e * config.e) * Math.sin(eccentricAnomaly);
  const cn = Math.cos(config.node), sn = Math.sin(config.node);
  const xr = x * cn - z * sn;
  const zr = x * sn + z * cn;
  const ci = Math.cos(config.incl), si = Math.sin(config.incl);
  return setPosition(out, xr, -zr * si, zr * ci);
}

export function sStarPositionAtDays(config, simDays, out = {}){
  const meanAnomaly = (config.phase + TAU * simDays / config.period) % TAU;
  const eccentricAnomaly = solveKeplerEccentricAnomaly(meanAnomaly, config.e);
  return keplerPositionAtEccentricAnomaly(config, eccentricAnomaly, out);
}
