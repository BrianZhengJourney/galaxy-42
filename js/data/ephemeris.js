/* Real planetary ephemerides.
   Keplerian elements + centennial rates from JPL's "Approximate Positions of
   the Planets" (Table 1, valid 1800–2050 AD). Given a Julian date this yields
   true heliocentric ecliptic positions — so when the HUD says 2026-07-02, the
   planets sit where they actually are. Display code compresses the radial
   distance but keeps the real angles and real radial *variation* (r/a). */

const DEG = Math.PI / 180;

/* [ a(AU), e, I(deg), L(deg), longPeri(deg), longNode(deg) ] and per-century rates */
const ELEMENTS = {
  MERCURY: { e0: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
             r:  [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081] },
  VENUS:   { e0: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
             r:  [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418] },
  EARTH:   { e0: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
             r:  [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0] },
  MARS:    { e0: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
             r:  [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343] },
  JUPITER: { e0: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
             r:  [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106] },
  SATURN:  { e0: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
             r:  [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794] },
  URANUS:  { e0: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503],
             r:  [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589] },
  NEPTUNE: { e0: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
             r:  [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664] }
};

export function julianDate(epochMs, simDays){
  return (epochMs / 86400000) + 2440587.5 + simDays;
}

function norm360(d){ d %= 360; return d < 0 ? d + 360 : d; }

/* Heliocentric ecliptic position at Julian date jd.
   Returns { x, y, z } in AU (ecliptic frame, x → vernal equinox),
   plus r (AU), a (AU) and lon (heliocentric longitude, deg). */
export function heliocentric(name, jd){
  const el = ELEMENTS[name];
  if (!el) return null;
  const T = (jd - 2451545.0) / 36525.0;
  const a  = el.e0[0] + el.r[0] * T;
  const e  = el.e0[1] + el.r[1] * T;
  const I  = (el.e0[2] + el.r[2] * T) * DEG;
  const L  = el.e0[3] + el.r[3] * T;
  const lp = el.e0[4] + el.r[4] * T;
  const ln = el.e0[5] + el.r[5] * T;

  const omega = (lp - ln) * DEG;          // argument of perihelion
  const node = ln * DEG;
  const M = norm360(L - lp) * DEG;        // mean anomaly

  // Kepler's equation, Newton iteration
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 8; k++)
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));

  // orbital-plane coordinates
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const r = Math.sqrt(xp * xp + yp * yp);

  // rotate to ecliptic frame: Rz(-node) · Rx(-I) · Rz(-omega)
  const co = Math.cos(omega), so = Math.sin(omega);
  const cn = Math.cos(node),  sn = Math.sin(node);
  const ci = Math.cos(I),     si = Math.sin(I);
  const x = (co * cn - so * sn * ci) * xp + (-so * cn - co * sn * ci) * yp;
  const y = (co * sn + so * cn * ci) * xp + (-so * sn + co * cn * ci) * yp;
  const z = (so * si) * xp + (co * si) * yp;

  return { x, y, z, r, a, lon: norm360(Math.atan2(y, x) / DEG) };
}

/* Display-space position: real direction + real r/a variation, compressed
   mean radius. three.js frame: X = ecliptic x, Z = -ecliptic y (so prograde
   motion is CCW seen from +Y / ecliptic north), Y = ecliptic z. */
export function displayPosition(name, jd, displayDist, out){
  const h = heliocentric(name, jd);
  const s = displayDist * (h.r / h.a) / Math.sqrt(h.x * h.x + h.y * h.y + h.z * h.z);
  out.set(h.x * s, h.z * s, -h.y * s);
  // (uniform scale: direction preserved, |pos| = displayDist · r/a)
  return out;
}
