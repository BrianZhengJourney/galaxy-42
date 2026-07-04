/* Observational astronomy: sidereal time, coordinate frames, and geocentric
   positions of solar-system bodies — everything the night-sky view needs to
   put the real sky over an observer's head for the simulation date.

   Frames: "equatorial" vectors are (x → RA 0h on the equator, y → RA 6h,
   z → north celestial pole), J2000. The horizontal transform maps them to
   scene axes (x = east, y = zenith, z = south). */

import { heliocentric } from '../data/ephemeris.js';

const DEG = Math.PI / 180;
const OBLIQUITY = 23.4393 * DEG;          // mean obliquity of the ecliptic, J2000

export const OBSERVER = { lat: 37.4275, lon: -122.1697, name: 'STANFORD, CA' };

export function norm360(d){ d %= 360; return d < 0 ? d + 360 : d; }

/* Greenwich mean sidereal time (degrees) */
export function gmst(jd){
  return norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0));
}
/* local sidereal time (degrees), east longitude positive */
export function lst(jd, lonDeg){
  return norm360(gmst(jd) + lonDeg);
}

/* ecliptic xyz → equatorial xyz (same handedness, tilt about x) */
export function eclToEq(x, y, z){
  return {
    x,
    y: y * Math.cos(OBLIQUITY) - z * Math.sin(OBLIQUITY),
    z: y * Math.sin(OBLIQUITY) + z * Math.cos(OBLIQUITY)
  };
}
export function vecToRaDec(v){
  const r = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return { ra: norm360(Math.atan2(v.y, v.x) / DEG), dec: Math.asin(v.z / r) / DEG, r };
}
export function raDecToVec(raDeg, decDeg, r = 1){
  const cd = Math.cos(decDeg * DEG);
  return {
    x: cd * Math.cos(raDeg * DEG) * r,
    y: cd * Math.sin(raDeg * DEG) * r,
    z: Math.sin(decDeg * DEG) * r
  };
}

/* geocentric RA/Dec of a planet from the heliocentric ephemerides */
export function planetGeo(name, jd){
  const p = heliocentric(name, jd), e = heliocentric('EARTH', jd);
  const v = eclToEq(p.x - e.x, p.y - e.y, p.z - e.z);
  return vecToRaDec(v);
}
/* the Sun is minus Earth's heliocentric vector */
export function sunGeo(jd){
  const e = heliocentric('EARTH', jd);
  return vecToRaDec(eclToEq(-e.x, -e.y, -e.z));
}

/* Moon: Meeus' low-precision series (~0.3° — fine at sky-dome scale) */
export function moonGeo(jd){
  const d = jd - 2451545.0;
  const Lp = (218.316 + 13.176396 * d) * DEG;   // mean longitude
  const M  = (134.963 + 13.064993 * d) * DEG;   // mean anomaly
  const F  = (93.272 + 13.229350 * d) * DEG;    // argument of latitude
  const lam = Lp + 6.289 * DEG * Math.sin(M);
  const bet = 5.128 * DEG * Math.sin(F);
  const distKm = 385001 - 20905 * Math.cos(M);
  const cb = Math.cos(bet);
  const v = eclToEq(cb * Math.cos(lam), cb * Math.sin(lam), Math.sin(bet));
  const rd = vecToRaDec(v);
  rd.distKm = distKm;
  return rd;
}

/* rows of the equatorial→horizontal rotation for a given LST and latitude:
   scene x = east·p, scene y = zenith·p, scene z = −north·p */
export function horizontalBasis(lstDeg, latDeg){
  const th = lstDeg * DEG, ph = latDeg * DEG;
  const ct = Math.cos(th), st = Math.sin(th), cp = Math.cos(ph), sp = Math.sin(ph);
  return {
    east:  [-st, ct, 0],
    up:    [cp * ct, cp * st, sp],
    north: [-sp * ct, -sp * st, cp]
  };
}

/* altitude/azimuth (degrees; az from north through east) — via the same
   basis the renderer uses, so tests and display can never disagree */
export function altAz(raDeg, decDeg, lstDeg, latDeg){
  const p = raDecToVec(raDeg, decDeg);
  const b = horizontalBasis(lstDeg, latDeg);
  const dot = (a, v) => a[0] * v.x + a[1] * v.y + a[2] * v.z;
  const x = dot(b.east, p), y = dot(b.up, p), n = dot(b.north, p);
  return { alt: Math.asin(Math.max(-1, Math.min(1, y))) / DEG,
           az: norm360(Math.atan2(x, n) / DEG) };
}
