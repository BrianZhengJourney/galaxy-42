#!/usr/bin/env node
/* Regenerates js/data/gen/* from real astronomical catalogs.
   Run once (outputs are committed); needs two source files:

     hyg.csv        HYG v4.1 — https://github.com/astronexus/HYG-Database
                    (raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv)
     conlines.json  d3-celestial constellation lines —
                    https://github.com/ofrohn/d3-celestial/blob/master/data/constellations.lines.json

   Usage: node tools/build-starcatalog.mjs <hyg.csv> <conlines.json>          */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const [, , hygPath, conPath] = process.argv;
if (!hygPath || !conPath){
  console.error('usage: node tools/build-starcatalog.mjs <hyg.csv> <conlines.json>');
  process.exit(1);
}

/* ---------- parse HYG ---------- */
const lines = readFileSync(hygPath, 'utf8').split('\n');
const header = lines[0].replace(/"/g, '').split(',');
const col = Object.fromEntries(header.map((h, i) => [h, i]));

function splitCsv(line){
  // HYG uses quotes only around fields with commas (rare); simple split works
  // for all rows we keep, but guard quoted commas anyway
  if (!line.includes('"')) return line.split(',');
  const out = []; let cur = '', q = false;
  for (const ch of line){
    if (ch === '"') q = !q;
    else if (ch === ',' && !q){ out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const stars = [];         // kept subset
const byProper = new Map(), byGl = new Map(), byHd = new Map(), byBayerCon = new Map(),
      byFlamCon = new Map();

for (let i = 1; i < lines.length; i++){
  if (!lines[i]) continue;
  const f = splitCsv(lines[i]);
  const id = f[col.id];
  if (id === '0') continue;                       // Sol — we render it ourselves
  const mag = parseFloat(f[col.mag]);
  const dist = parseFloat(f[col.dist]);           // parsecs; >=100000 → unknown
  const rec = {
    ra: parseFloat(f[col.ra]) * 15,               // hours → degrees
    dec: parseFloat(f[col.dec]),
    mag,
    ci: parseFloat(f[col.ci]) || 0.5,
    dist: dist >= 99999 ? -1 : dist,
    proper: f[col.proper] || ''
  };
  if (f[col.proper]) byProper.set(f[col.proper].toLowerCase(), rec);
  if (f[col.gl]) byGl.set(f[col.gl], rec);
  if (f[col.hd]) byHd.set(f[col.hd], rec);
  if (f[col.bayer] && f[col.con]) byBayerCon.set(f[col.bayer] + '|' + f[col.con], rec);
  if (f[col.flam] && f[col.con]) byFlamCon.set(f[col.flam] + '|' + f[col.con], rec);

  // keep: naked-eye stars, plus the true solar neighbourhood however dim
  if (mag <= 6.0 || (rec.dist > 0 && rec.dist <= 20 && mag <= 12)) stars.push(rec);
}
stars.sort((a, b) => a.mag - b.mag);
console.log('kept', stars.length, 'stars of', lines.length - 1);

/* ---------- pack bright-star arrays ---------- */
const r1 = n => Math.round(n * 1000) / 1000;
const packed = {
  ra: stars.map(s => r1(s.ra)),
  dec: stars.map(s => r1(s.dec)),
  mag: stars.map(s => Math.round(s.mag * 100) / 100),
  ci: stars.map(s => Math.round(s.ci * 100) / 100),
  dist: stars.map(s => s.dist < 0 ? -1 : Math.round(s.dist * 10) / 10)
};
const names = {};
stars.forEach((s, i) => { if (s.proper) names[i] = s.proper; });

/* ---------- real coordinates for the clickable catalog ---------- */
const WANT = {
  'PROXIMA CENTAURI': () => byProper.get('proxima centauri'),
  'ALPHA CENTAURI': () => byProper.get('rigil kentaurus') || byProper.get('alpha centauri'),
  "BARNARD'S STAR": () => byProper.get("barnard's star"),
  'WOLF 359': () => byGl.get('Gl 406') || byProper.get('wolf 359'),
  'SIRIUS': () => byProper.get('sirius'),
  'EPSILON ERIDANI': () => byProper.get('ran') || byBayerCon.get('Eps|Eri'),
  'TAU CETI': () => byBayerCon.get('Tau|Cet'),
  'PROCYON': () => byProper.get('procyon'),
  'ALTAIR': () => byProper.get('altair'),
  'VEGA': () => byProper.get('vega'),
  'FOMALHAUT': () => byProper.get('fomalhaut'),
  'POLLUX': () => byProper.get('pollux'),
  'ARCTURUS': () => byProper.get('arcturus'),
  'CAPELLA': () => byProper.get('capella'),
  'ALDEBARAN': () => byProper.get('aldebaran'),
  'CASTOR': () => byProper.get('castor'),
  'SPICA': () => byProper.get('spica'),
  'REGULUS': () => byProper.get('regulus'),
  'ANTARES': () => byProper.get('antares'),
  'BETELGEUSE': () => byProper.get('betelgeuse'),
  'RIGEL': () => byProper.get('rigel'),
  'DENEB': () => byProper.get('deneb'),
  'GLIESE 581': () => byGl.get('Gl 581'),
  '51 PEGASI': () => byProper.get('helvetios') || byFlamCon.get('51|Peg'),
  'HD 209458': () => byHd.get('209458'),
  'EPSILON INDI': () => byBayerCon.get('Eps|Ind')
};
/* not in HYG (too dim / not a star): literature values */
const HARDCODED = {
  'TRAPPIST-1':   { ra: 346.622, dec: -5.041,  dist: 12.47 },
  'KEPLER-186':   { ra: 298.653, dec: 43.955,  dist: 177 },
  'ZETA RETICULI':{ ra: 49.552,  dec: -62.508, dist: 12.0 },
  'PSR B1257+12': { ra: 195.013, dec: 12.683,  dist: 710 }
};
const real = {};
for (const [name, get] of Object.entries(WANT)){
  const s = get();
  if (s) real[name] = { ra: r1(s.ra), dec: r1(s.dec), dist: Math.round(s.dist * 100) / 100 };
  else console.warn('NOT FOUND in HYG:', name);
}
Object.assign(real, HARDCODED);
console.log('real positions:', Object.keys(real).length);

/* ---------- constellation lines ---------- */
const con = JSON.parse(readFileSync(conPath, 'utf8'));
const polylines = [];
for (const feat of con.features)
  for (const line of feat.geometry.coordinates)
    polylines.push(line.map(([ra, dec]) => [
      (Math.round(((ra + 360) % 360) * 10) / 10) % 360, Math.round(dec * 10) / 10
    ]));
console.log('constellation polylines:', polylines.length);

/* ---------- emit ---------- */
mkdirSync(new URL('../js/data/gen/', import.meta.url), { recursive: true });
const genDir = new URL('../js/data/gen/', import.meta.url).pathname;

writeFileSync(genDir + 'brightStars.js',
`/* GENERATED by tools/build-starcatalog.mjs from the HYG v4.1 database
   (https://github.com/astronexus/HYG-Database, CC BY-SA 4.0). Do not edit.
   ${stars.length} stars: everything to mag 6.0 plus the solar neighbourhood
   (dist ≤ 20 pc). ra/dec in degrees (J2000), dist in parsecs (-1 unknown). */
export const STARS = ${JSON.stringify(packed)};
export const STAR_NAMES = ${JSON.stringify(names)};
export const REAL_STARS = ${JSON.stringify(real, null, 0)};
`);

writeFileSync(genDir + 'constellations.js',
`/* GENERATED by tools/build-starcatalog.mjs from d3-celestial's constellation
   lineset (https://github.com/ofrohn/d3-celestial, BSD-3). Do not edit.
   ${polylines.length} polylines of [raDeg, decDeg] vertices (J2000). */
export const CONSTELLATION_LINES = ${JSON.stringify(polylines)};
`);

console.log('wrote js/data/gen/{brightStars,constellations}.js');
